import type { Route } from "./+types/api.cart";
import { graphqlRequest } from "workers/graphqlClient";
import {
  ACTIVE_ORDER_QUERY,
  ADD_TO_CART_MUTATION,
  ADJUST_ORDER_LINE_MUTATION,
  REMOVE_ORDER_LINE_MUTATION,
  type ActiveOrderData,
  type AddToCartResult,
  type AddToCartVariables,
  type AdjustOrderLineResult,
  type AdjustOrderLineVariables,
  type RemoveOrderLineResult,
  type RemoveOrderLineVariables,
} from "~/graphql/order";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  try {
    const { data } = await graphqlRequest<ActiveOrderData>(
      env,
      ACTIVE_ORDER_QUERY,
      undefined,
      { request }
    );
    return Response.json({ activeOrder: data.activeOrder });
  } catch {
    return Response.json({ activeOrder: null });
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
      return new Response(JSON.stringify({ adjustOrderLine: data.adjustOrderLine }), { headers: makeHeaders(token) });
    }

    if (intent === "remove") {
      const { orderLineId } = body as unknown as RemoveOrderLineVariables & { _intent: string };
      const { data, token } = await graphqlRequest<RemoveOrderLineResult, RemoveOrderLineVariables>(
        env,
        REMOVE_ORDER_LINE_MUTATION,
        { orderLineId: String(orderLineId) },
        { request }
      );
      return new Response(JSON.stringify({ removeOrderLine: data.removeOrderLine }), { headers: makeHeaders(token) });
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
  } catch {
    return Response.json({ error: "Cart operation failed" }, { status: 500 });
  }
}
