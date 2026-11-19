// Old product URLs that are still indexed or linked somewhere after a product was renamed
// or resized. A plain 404 on an old URL loses whatever ranking and links it had; a 301 to
// the current page carries them over. Shared by the product page and its /reviews page.

// Exact old slug -> current slug. Checked before any lookup, so the target must be live.
export const LEGACY_PRODUCT_SLUG_REDIRECTS: Record<string, string> = {
	"icy-blue-raz": "applied-nutrition-creatine-monohydrate-flavoured-250g-icy-blue-razz",
	"dragon-fruit-melon": "maryruths-liquid-morning-multivitamin-hair-growth-450ml-dragon-fruit-melon",
	"cola-blast": "applied-nutrition-creatine-gummies-3000mg-cola-blast",
	"cherry-chill": "applied-nutrition-creatine-gummies-3000mg-cherry-chill",
	// Single-variant product; the old long variant slug no longer exists.
	"ghost-bcaa-amino-acids-powder-7g-bcaa-kiwi-strawberry-30-servings": "ghost-bcaa",
	// Renamed from the 13 oz / 372 g size to 16 oz / 450 g.
	"thorne-creatine-13-oz-372-g-strawberry": "thorne-creatine-16-oz-450-g-strawberry",
};

// Renamed slug prefixes: [old prefix, new prefix]. Only tried after the requested slug has
// failed to resolve, and callers redirect only if the rewritten slug really exists, so a
// product that still legitimately carries the old prefix is never touched.
export const LEGACY_PRODUCT_SLUG_PREFIXES: [string, string][] = [
	// Rule 1 products were renamed "rule-1-proteins-..." -> "rule-1-...".
	["rule-1-proteins-", "rule-1-"],
	["rule-one-proteins-", "rule-1-"],
	// Thorne Creatine tub resized 13 oz / 372 g -> 16 oz / 450 g (all flavours).
	["thorne-creatine-13-oz-372-g-", "thorne-creatine-16-oz-450-g-"],
	// MaryRuth's Liquid Morning 887ml dropped; the 450ml is the live size (product + flavours).
	["maryruths-liquid-morning-multivitamin-hair-growth-887ml", "maryruths-liquid-morning-multivitamin-hair-growth-450ml"],
	// Bloom Greens slugs gained the "180g" size (all flavours).
	["bloom-greens-superfoods-30-servings", "bloom-greens-superfoods-180g-30-servings"],
];

// Pairs of slugs where either one may be the live one. Only consulted when the requested
// slug does NOT resolve, and callers redirect only if the other slug exists -- so both
// directions can be listed without a loop, and the entry stays correct whichever way the
// slug is set in Vendure. Use this when a rename is likely to be reverted.
const INTERCHANGEABLE_PRODUCT_SLUGS: [string, string][] = [
	// The ranked URL was "...-unflavored"; the variant was then renamed to
	// "...-unflavored-284-g-unflavoured" (also crawled). Intended to go back to the original.
	["vital-proteins-collagen-peptides-unflavored", "vital-proteins-collagen-peptides-unflavored-284-g-unflavoured"],
];

/** Slugs to try for an unresolved slug, in order (existence not checked -- callers must). */
export function legacyPrefixCandidates(slug: string): string[] {
	const out: string[] = [];
	for (const [a, b] of INTERCHANGEABLE_PRODUCT_SLUGS) {
		if (slug === a) out.push(b);
		else if (slug === b) out.push(a);
	}
	for (const [oldPrefix, newPrefix] of LEGACY_PRODUCT_SLUG_PREFIXES) {
		if (slug.startsWith(oldPrefix)) out.push(newPrefix + slug.slice(oldPrefix.length));
	}
	return out;
}
