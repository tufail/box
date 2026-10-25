import type { Route } from "./+types/api.locate-area";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_QATAR_SHIPPING_AREAS_WITH_PRICE_QUERY, type QatarShippingAreasWithPriceData } from "~/graphql/qatarShippingAreas";
import { isInsideQatar, matchAreas } from "~/lib/locateArea";

// "Use my location": the browser's geolocation gives lat/lng, this route turns that into the
// delivery area(s) it falls in. The coordinates are sent in a POST body (not a URL, so they
// don't end up in access logs), rounded to ~110 m, used for one reverse-geocoding call, and
// never stored or logged.
//
// Reverse geocoder: Google's Geocoding API when GOOGLE_GEOCODING_API_KEY is set (the right
// choice for production -- accurate neighbourhood names, no usage-policy limits), otherwise
// OpenStreetMap's Nominatim as a keyless fallback (fine for a low-volume, user-initiated,
// edge-cached lookup like this one, but has its own fair-use limits).

export type LocateAreaResponse =
	| { status: "ok"; matchedName: string; areaIds: string[] }
	| { status: "outside-qatar" | "no-match" | "unavailable" };

interface GeoEnv {
	GOOGLE_GEOCODING_API_KEY?: string;
}

const NOMINATIM_KEYS = ["neighbourhood", "suburb", "quarter", "city_district", "village", "town", "hamlet", "city"];
const GOOGLE_TYPE_PRIORITY = ["neighborhood", "sublocality_level_2", "sublocality_level_1", "sublocality", "locality", "administrative_area_level_3", "administrative_area_level_2"];

async function namesFromGoogle(key: string, lat: number, lng: number): Promise<string[] | null> {
	const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&region=qa&key=${key}`;
	const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit);
	if (!res.ok) return null;
	const data = (await res.json()) as { status: string; results?: { address_components: { long_name: string; types: string[] }[] }[] };
	if (data.status !== "OK" || !data.results) return null;
	const names: string[] = [];
	for (const type of GOOGLE_TYPE_PRIORITY) {
		for (const result of data.results.slice(0, 4)) {
			for (const c of result.address_components) if (c.types.includes(type) && !names.includes(c.long_name)) names.push(c.long_name);
		}
	}
	return names;
}

async function namesFromNominatim(lat: number, lng: number): Promise<string[] | null> {
	const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=16&addressdetails=1&accept-language=en`;
	const res = await fetch(url, {
		// Nominatim's usage policy requires an identifying User-Agent.
		headers: { "User-Agent": "NutriBoxQatar-Storefront/1.0 (sales@nutribox.qa)" },
		cf: { cacheTtl: 86400, cacheEverything: true },
	} as RequestInit);
	if (!res.ok) return null;
	const data = (await res.json()) as { address?: Record<string, string> };
	if (!data.address) return null;
	return NOMINATIM_KEYS.map((k) => data.address?.[k]).filter((n): n is string => !!n);
}

export async function action({ request, context }: Route.ActionArgs) {
	if (request.method !== "POST") return Response.json({ status: "unavailable" } satisfies LocateAreaResponse, { status: 405 });
	const env = context.cloudflare.env as unknown as GeoEnv;

	let body: { lat?: unknown; lng?: unknown };
	try {
		body = (await request.json()) as { lat?: unknown; lng?: unknown };
	} catch {
		return Response.json({ status: "unavailable" } satisfies LocateAreaResponse, { status: 400 });
	}
	const lat = Number(body.lat);
	const lng = Number(body.lng);
	if (!isInsideQatar(lat, lng)) return Response.json({ status: "outside-qatar" } satisfies LocateAreaResponse);

	// ~110 m precision: plenty for a neighbourhood, and lets identical nearby lookups share a cache entry.
	const rLat = Math.round(lat * 1000) / 1000;
	const rLng = Math.round(lng * 1000) / 1000;

	try {
		const [names, areasResult] = await Promise.all([
			env.GOOGLE_GEOCODING_API_KEY ? namesFromGoogle(env.GOOGLE_GEOCODING_API_KEY, rLat, rLng) : namesFromNominatim(rLat, rLng),
			graphqlRequest<QatarShippingAreasWithPriceData>(context.cloudflare.env, GET_QATAR_SHIPPING_AREAS_WITH_PRICE_QUERY, undefined, { request, cf: { cacheTtl: 60, cacheEverything: true } }),
		]);
		if (!names) return Response.json({ status: "unavailable" } satisfies LocateAreaResponse);

		const { matches, matchedName } = matchAreas(names, areasResult.data.qatarShippingAreas);
		if (matches.length === 0 || !matchedName) return Response.json({ status: "no-match" } satisfies LocateAreaResponse);
		return Response.json({ status: "ok", matchedName, areaIds: matches.map((m) => m.id) } satisfies LocateAreaResponse);
	} catch {
		return Response.json({ status: "unavailable" } satisfies LocateAreaResponse);
	}
}
