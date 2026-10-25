import type { Route } from "./+types/api.shipping-areas";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_QATAR_SHIPPING_AREAS_WITH_PRICE_QUERY, type QatarShippingAreaWithPrice, type QatarShippingAreasWithPriceData } from "~/graphql/qatarShippingAreas";

// Delivery areas with their per-area fee, for the product page's delivery estimate. Fetched
// client-side (lazily) rather than in the PDP loader: it's ~780 rows that most visitors
// never need unless they open the area picker. Fees must track what the admin sets (checkout charges the live
// price), so the cache is deliberately short -- a minute, just to absorb bursts.
export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	try {
		const { data } = await graphqlRequest<QatarShippingAreasWithPriceData>(env, GET_QATAR_SHIPPING_AREAS_WITH_PRICE_QUERY, undefined, {
			request,
			cf: { cacheTtl: 60, cacheEverything: true },
		});
		return Response.json(data.qatarShippingAreas, { headers: { "Cache-Control": "public, max-age=60" } });
	} catch {
		return Response.json([] as QatarShippingAreaWithPrice[]);
	}
}
