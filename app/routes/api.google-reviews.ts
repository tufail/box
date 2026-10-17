import type { Route } from "./+types/api.google-reviews";

// Live Google Business Profile reviews via the Places API (New). The API only
// ever returns up to 5 reviews per place, so after keeping the 5-star ones
// there may be fewer than that — the widget copes with any count (incl. 0).
// The key is a server-side secret; this route is the only thing that sees it.
//
// Google is called at most ~once a day for the WHOLE site: the result lives in
// a single KV entry (KV is global, unlike the per-datacenter Cache API, which
// would let every edge location make its own upstream call). Without the KV
// binding it falls back to the per-datacenter fetch cache.
const CACHE_SECONDS = 24 * 60 * 60;
// Failures are cached briefly so an outage/misconfig isn't retried on every page view.
const FAILURE_CACHE_SECONDS = 10 * 60;
const KV_KEY = "google-reviews:v1";

interface PlacesReview {
	rating?: number;
	text?: { text?: string };
	originalText?: { text?: string };
	publishTime?: string;
	authorAttribution?: { displayName?: string; photoUri?: string; uri?: string };
}

export interface GoogleReviewsPayload {
	rating: number | null;
	total: number | null;
	reviews: { author: string; photo: string | null; url: string | null; date: string | null; text: string }[];
}

const empty: GoogleReviewsPayload = { rating: null, total: null, reviews: [] };

// The API key is restricted to specific website referrers in Google Cloud (it
// can't be IP-restricted — Workers have no fixed IP). A server-side call has no
// browser to supply a referrer, so send the site's own origin ourselves; it must
// be on the key's allowed list (e.g. https://nutribox.qa/*, http://localhost:5173/*).
async function fetchFromGoogle(apiKey: string, placeId: string, referer: string): Promise<GoogleReviewsPayload | null> {
	const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
		headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "rating,userRatingCount,reviews", Referer: referer },
	});
	if (!res.ok) return null;

	const data = (await res.json()) as { rating?: number; userRatingCount?: number; reviews?: PlacesReview[] };
	return {
		rating: data.rating ?? null,
		total: data.userRatingCount ?? null,
		reviews: (data.reviews ?? [])
			.filter((r) => r.rating === 5 && (r.text?.text || r.originalText?.text))
			.map((r) => ({
				author: r.authorAttribution?.displayName ?? "Google user",
				photo: r.authorAttribution?.photoUri ?? null,
				url: r.authorAttribution?.uri ?? null,
				date: r.publishTime ?? null,
				text: (r.text?.text ?? r.originalText?.text ?? "").trim(),
			})),
	};
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env as unknown as { GOOGLE_PLACES_API_KEY?: string; GOOGLE_PLACE_ID?: string; GOOGLE_REVIEWS_KV?: KVNamespace };
	if (!env.GOOGLE_PLACES_API_KEY || !env.GOOGLE_PLACE_ID) return Response.json(empty);

	// Browsers/CDN may also hold it for an hour — the KV entry is the real daily cache.
	const headers = { "Cache-Control": "public, max-age=3600" };

	try {
		const cached = await env.GOOGLE_REVIEWS_KV?.get<GoogleReviewsPayload>(KV_KEY, "json");
		if (cached) return Response.json(cached, { headers });
	} catch {
		// KV hiccup — fall through to a live fetch rather than failing the widget.
	}

	let payload: GoogleReviewsPayload | null = null;
	try {
		payload = await fetchFromGoogle(env.GOOGLE_PLACES_API_KEY, env.GOOGLE_PLACE_ID, `${new URL(request.url).origin}/`);
	} catch {
		payload = null;
	}

	try {
		await env.GOOGLE_REVIEWS_KV?.put(KV_KEY, JSON.stringify(payload ?? empty), { expirationTtl: payload ? CACHE_SECONDS : FAILURE_CACHE_SECONDS });
	} catch {
		// Not being able to cache must not break the response.
	}

	return Response.json(payload ?? empty, payload ? { headers } : undefined);
}
