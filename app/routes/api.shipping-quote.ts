import type { Route } from "./+types/api.shipping-quote";
import { graphqlRequest } from "workers/graphqlClient";

// Live delivery fee for a map pin (ported from proteinhouse). Sent with the shopper's session
// so free-delivery rules can use their cart subtotal. Returns `{ quote: null }` when
// distance-based shipping isn't configured, so the map popup simply skips the check.
const SHIPPING_QUOTE_QUERY = `
  query QatarShippingQuote($latitude: Float!, $longitude: Float!) {
    qatarShippingQuote(latitude: $latitude, longitude: $longitude) {
      deliverable
      reason
      distanceKm
      price
      isFree
      freeReason
      maximumDistanceKm
    }
  }
`;

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const latitude = Number(url.searchParams.get("lat"));
	const longitude = Number(url.searchParams.get("lng"));
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return Response.json({ quote: null }, { status: 400 });
	}
	try {
		const { data } = await graphqlRequest<{ qatarShippingQuote: unknown }>(context.cloudflare.env, SHIPPING_QUOTE_QUERY, { latitude, longitude }, { request });
		return Response.json({ quote: data.qatarShippingQuote }, { headers: { "Cache-Control": "no-store" } });
	} catch {
		return Response.json({ quote: null });
	}
}
