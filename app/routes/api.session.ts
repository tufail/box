import type { Route } from "./+types/api.session";
import { graphqlRequest } from "workers/graphqlClient";
import { CART_COUNT_QUERY } from "~/graphql/order";
import { ACTIVE_CUSTOMER_QUERY, type ActiveCustomer } from "~/graphql/checkout";

// Per-visitor state the page shell needs (cart badge count + the signed-in customer), fetched by
// the browser after load -- see SessionContext. Never cacheable: it depends on the session cookie.
export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const [cartResult, customerResult] = await Promise.allSettled([
		graphqlRequest<{ activeOrder: { totalQuantity: number } | null }>(env, CART_COUNT_QUERY, undefined, { request }),
		graphqlRequest<{ activeCustomer: ActiveCustomer | null }>(env, ACTIVE_CUSTOMER_QUERY, undefined, { request }),
	]);

	return Response.json(
		{
			cartCount: cartResult.status === "fulfilled" ? (cartResult.value.data.activeOrder?.totalQuantity ?? 0) : 0,
			activeCustomer: customerResult.status === "fulfilled" ? (customerResult.value.data.activeCustomer ?? null) : null,
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
