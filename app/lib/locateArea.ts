// Turns the neighbourhood names a reverse-geocoder returns for a GPS position into the
// storefront's own delivery areas (the ~780 named areas the shipping fees are keyed on).
// Pure functions, no I/O -- the route (api.locate-area.ts) does the geocoding.

// Rough bounding box of Qatar (with a little sea margin). A position outside it is almost
// certainly a VPN / wrong device location, and shouldn't be reverse-geocoded at all.
export const QATAR_BOUNDS = { minLat: 24.35, maxLat: 26.3, minLng: 50.6, maxLng: 51.8 };

export function isInsideQatar(lat: number, lng: number): boolean {
	return Number.isFinite(lat) && Number.isFinite(lng) && lat >= QATAR_BOUNDS.minLat && lat <= QATAR_BOUNDS.maxLat && lng >= QATAR_BOUNDS.minLng && lng <= QATAR_BOUNDS.maxLng;
}

const ARTICLE_PREFIX = /^(al|ad|ar|as|ash|ath|an|az|el)[\s-]+/;

// Area names are transliterated inconsistently between sources ("Al Wakra" / "Al Wakrah" /
// "Wakra", "As Sadd" / "Al Sadd", "Lusail City" / "Lusail"), so names are compared on a
// reduced key: lower-case letters only, without the Arabic article, generic suffix words,
// or a trailing "h".
export function normalizeAreaName(raw: string): string {
	let s = raw
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/['’`.]/g, "")
		.replace(/[^a-z\s-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	s = s.replace(ARTICLE_PREFIX, "");
	s = s.replace(/\b(city|area|district|zone|municipality|neighbourhood|neighborhood)\b/g, "");
	s = s.replace(/[\s-]+/g, "");
	return s.replace(/h$/, "");
}

export interface MatchableArea {
	id: string;
	zoneNumber: number;
	nameEn: string;
}

// Popular / commercial place names that maps return but that are not what the delivery-area
// list calls them. Keys are matched through normalizeAreaName; values are the list's own
// (official) area names. Only add entries verified against the live area list.
const ALIASES: Record<string, string> = {
	"west bay": "Al Dafna",
	"costa malaz": "The Pearl Island",
	"porto arabia": "The Pearl Island",
	"pearl qatar": "The Pearl Island",
	"the pearl qatar": "The Pearl Island",
	"the pearl": "The Pearl Island",
	"medina centrale": "The Pearl Island",
	"qanat quartier": "The Pearl Island",
	"viva bahriya": "The Pearl Island",
};
const ALIAS_BY_KEY = new Map(Object.entries(ALIASES).map(([alias, official]) => [normalizeAreaName(alias), normalizeAreaName(official)]));

// Shortest name (normalized) allowed to match by prefix -- keeps "doha"-like city names from
// matching arbitrary areas.
const MIN_PARTIAL_KEY_LENGTH = 5;

// `names` must be ordered most-specific first (neighbourhood before suburb before city).
// For each name in turn: a known alias, then an exact match on the reduced name; the first
// name that hits wins, so a precise neighbourhood beats a coarse city. Only if no name hits
// at all does a conservative prefix match run ("pearl" -> "The Pearl Island"-style names).
// Several areas can share one name across zones (e.g. "Al Sadd" exists in zones 38 and 39) --
// all of them are returned, and the caller asks the customer to confirm which.
export function matchAreas<T extends MatchableArea>(names: string[], areas: T[]): { matches: T[]; matchedName: string | null } {
	const byKey = new Map<string, T[]>();
	for (const area of areas) {
		const key = normalizeAreaName(area.nameEn);
		if (!key) continue;
		const list = byKey.get(key);
		if (list) list.push(area);
		else byKey.set(key, [area]);
	}
	const sorted = (list: T[]) => [...list].sort((a, b) => a.zoneNumber - b.zoneNumber);

	for (const name of names) {
		const key = normalizeAreaName(name);
		if (!key) continue;
		const hit = byKey.get(ALIAS_BY_KEY.get(key) ?? key);
		if (hit && hit.length > 0) return { matches: sorted(hit), matchedName: name };
	}

	for (const name of names) {
		const key = normalizeAreaName(name);
		if (key.length < MIN_PARTIAL_KEY_LENGTH) continue;
		const partial: T[] = [];
		for (const [areaKey, list] of byKey) {
			if (areaKey.length >= MIN_PARTIAL_KEY_LENGTH && (areaKey.startsWith(key) || key.startsWith(areaKey))) partial.push(...list);
		}
		if (partial.length > 0) return { matches: sorted(partial), matchedName: name };
	}
	return { matches: [], matchedName: null };
}