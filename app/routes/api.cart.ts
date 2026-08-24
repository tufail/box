import type { Route } from "./+types/api.cart";
import { graphqlRequest } from "workers/graphqlClient";
import {
  ACTIVE_ORDER_QUERY,
  ADD_TO_CART_MUTATION,
  ADJUST_ORDER_LINE_MUTATION,
  REMOVE_CART_ITEM_MUTATION,
  REMOVE_ORDER_LINE_MUTATION,
  type ActiveOrderData,
  type AddToCartResult,
  type AddToCartVariables,
  type AdjustOrderLineResult,
  type AdjustOrderLineVariables,
  type RemoveCartItemResult,
  type RemoveCartItemVariables,
  type RemoveOrderLineResult,
  type RemoveOrderLineVariables,
} from "~/graphql/order";
import {
  ACTIVE_ORDER_BUNDLES_QUERY,
  VALIDATE_ORDER_BUNDLES_MUTATION,
  type ActiveOrderBundlesData,
  type ValidateOrderBundlesResult,
} from "~/graphql/bundle";
import { TRANSITION_ORDER_TO_STATE_MUTATION } from "~/graphql/checkout";

// A customer who started checkout (order now locked in ArrangingPayment), then came
// back and tried to change their cart from somewhere else -- the side panel, a
// product page -- hits Vendure's OrderModificationError. Vendure's own default order
// process already allows ArrangingPayment -> AddingItems (see @vendure/core's
// default-order-process.ts), so this reopens it and lets the caller retry once,
// transparently, instead of surfacing "Order contents may only be modified..." for
// what's actually a completely routine action.
// Success is NOT the same thing as "a new token came back" -- when the session's
// existing token is already valid, Vendure doesn't need to rotate it, so `token`
// is empty even on a fully successful transition. Callers should retry whenever
// `success` is true, falling back to the request's own cookie (still valid) when
// `token` is empty rather than treating that as a failure.
async function reopenIfLocked(env: Env, request: Request): Promise<{ success: boolean; token?: string }> {
  try {
    const { data, token } = await graphqlRequest<{ transitionOrderToState: { __typename: string } }>(
      env,
      TRANSITION_ORDER_TO_STATE_MUTATION,
      { state: "AddingItems" },
      { request }
    );
    return { success: data.transitionOrderToState.__typename === "Order", token: token ?? undefined };
  } catch {
    return { success: false };
  }
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  try {
    const [orderResult, bundleResult] = await Promise.allSettled([
      graphqlRequest<ActiveOrderData>(env, ACTIVE_ORDER_QUERY, undefined, { request }),
      graphqlRequest<ActiveOrderBundlesData>(env, ACTIVE_ORDER_BUNDLES_QUERY, undefined, { request }),
    ]);

    const activeOrder = orderResult.status === "fulfilled" ? orderResult.value.data.activeOrder : null;
    const bundleGroups = bundleResult.status === "fulfilled" ? bundleResult.value.data.activeOrderBundles : [];

    return Response.json({ activeOrder, bundleGroups: bundleGroups ?? [] });
  } catch {
    return Response.json({ activeOrder: null, bundleGroups: [] });
  }
}

function makeHeaders(token: string | null | undefined): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
  }
  return headers;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  try {
    const body = await request.json() as Record<string, unknown>;
    const intent = body._intent as string | undefined;

    if (intent === "adjust") {
      const { orderLineId, quantity } = body as unknown as AdjustOrderLineVariables & { _intent: string };
      const adjustVars = { orderLineId: String(orderLineId), quantity: Number(quantity) };
      let { data, token } = await graphqlRequest<AdjustOrderLineResult, AdjustOrderLineVariables>(
        env,
        ADJUST_ORDER_LINE_MUTATION,
        adjustVars,
        { request }
      );
      if (data.adjustOrderLine.__typename === "OrderModificationError") {
        const reopen = await reopenIfLocked(env, request);
        if (reopen.success) {
          ({ data, token } = await graphqlRequest<AdjustOrderLineResult, AdjustOrderLineVariables>(
            env,
            ADJUST_ORDER_LINE_MUTATION,
            adjustVars,
            { request, ...(reopen.token ? { authToken: reopen.token } : {}) }
          ));
        }
      }
      let bundleGroups: ActiveOrderBundlesData["activeOrderBundles"] = [];
      try {
        const { data: vd } = await graphqlRequest<ValidateOrderBundlesResult>(env, VALIDATE_ORDER_BUNDLES_MUTATION, undefined, { request });
        bundleGroups = vd.validateOrderBundles ?? [];
      } catch { /* non-critical */ }

      return new Response(
        JSON.stringify({ adjustOrderLine: data.adjustOrderLine, bundleGroups }),
        { headers: makeHeaders(token) }
      );
    }

    if (intent === "remove") {
      const lineId = String((body as Record<string, unknown>).lineId ?? "");
      let token: string | null | undefined = null;
      let bundleCascaded = false;

      // Try bundle-aware mutation first; fall back to standard removeOrderLine
      try {
        const { data, token: t } = await graphqlRequest<RemoveCartItemResult, RemoveCartItemVariables>(
          env,
          REMOVE_CART_ITEM_MUTATION,
          { lineId },
          { request }
        );
        token = t;
        bundleCascaded = data.removeCartItem?.bundleCascaded ?? false;
      } catch {
        // removeCartItem not available — fall back to removeOrderLine
        let { data, token: t } = await graphqlRequest<RemoveOrderLineResult, RemoveOrderLineVariables>(
          env,
          REMOVE_ORDER_LINE_MUTATION,
          { orderLineId: lineId },
          { request }
        );
        if (data.removeOrderLine.__typename === "OrderModificationError") {
          const reopen = await reopenIfLocked(env, request);
          if (reopen.success) {
            ({ data, token: t } = await graphqlRequest<RemoveOrderLineResult, RemoveOrderLineVariables>(
              env,
              REMOVE_ORDER_LINE_MUTATION,
              { orderLineId: lineId },
              { request, ...(reopen.token ? { authToken: reopen.token } : {}) }
            ));
          }
        }
        token = t;
        if (data.removeOrderLine.__typename !== "Order") {
          const err = data.removeOrderLine as { message?: string };
          return Response.json({ error: err.message ?? "Could not remove item" });
        }
      }

      let bundleGroups: ActiveOrderBundlesData["activeOrderBundles"] = [];
      try {
        const { data: vd } = await graphqlRequest<ValidateOrderBundlesResult>(env, VALIDATE_ORDER_BUNDLES_MUTATION, undefined, { request });
        bundleGroups = vd.validateOrderBundles ?? [];
      } catch { /* non-critical */ }

      return new Response(
        JSON.stringify({ removeCartItem: { success: true, bundleCascaded }, bundleGroups }),
        { headers: makeHeaders(token) }
      );
    }

    // Default: add to cart
    const { productVariantId, quantity, subscriptionPlanId } = body as unknown as AddToCartVariables & { subscriptionPlanId?: string };
    const addVars = {
      productVariantId: String(productVariantId),
      quantity: Number(quantity),
      customFields: subscriptionPlanId ? { subscriptionPlanId: String(subscriptionPlanId) } : undefined,
    };
    let { data, token } = await graphqlRequest<AddToCartResult, AddToCartVariables>(env, ADD_TO_CART_MUTATION, addVars, { request });
    if (data.addItemToOrder.__typename === "OrderModificationError") {
      const reopen = await reopenIfLocked(env, request);
      if (reopen.success) {
        ({ data, token } = await graphqlRequest<AddToCartResult, AddToCartVariables>(env, ADD_TO_CART_MUTATION, addVars, { request, ...(reopen.token ? { authToken: reopen.token } : {}) }));
      }
    }
    return new Response(JSON.stringify({ addItemToOrder: data.addItemToOrder }), { headers: makeHeaders(token) });
  } catch (e) {
    return Response.json({ error: String(e) });
  }
}
