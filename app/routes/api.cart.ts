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
      const { data, token } = await graphqlRequest<AdjustOrderLineResult, AdjustOrderLineVariables>(
        env,
        ADJUST_ORDER_LINE_MUTATION,
        { orderLineId: String(orderLineId), quantity: Number(quantity) },
        { request }
      );
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
        const { data, token: t } = await graphqlRequest<RemoveOrderLineResult, RemoveOrderLineVariables>(
          env,
          REMOVE_ORDER_LINE_MUTATION,
          { orderLineId: lineId },
          { request }
        );
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
    const { productVariantId, quantity } = body as unknown as AddToCartVariables;
    const { data, token } = await graphqlRequest<AddToCartResult, AddToCartVariables>(
      env,
      ADD_TO_CART_MUTATION,
      { productVariantId: String(productVariantId), quantity: Number(quantity) },
      { request }
    );
    return new Response(JSON.stringify({ addItemToOrder: data.addItemToOrder }), { headers: makeHeaders(token) });
  } catch (e) {
    return Response.json({ error: String(e) });
  }
}
