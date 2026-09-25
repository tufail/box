// Curated "featured" brand set — used by the mega menu's Top Brands panel and
// the /brands page's Trending Brands carousel. Kept in sync by hand since
// there's no "featured" flag on the brand facet to drive this from data.
// `popular` marks the subset that also gets a "Popular in Qatar" badge —
// currently the three brands with dedicated editorial content authored
// (see CONTENT_BRAND_SLUGS in llms-full.txt.ts), as the closest available
// signal for "genuinely established here" rather than an arbitrary pick.
export interface TopBrand {
	name: string;
	code: string;
	popular?: boolean;
}

export const TOP_BRANDS: TopBrand[] = [
	{ name: "Optimum Nutrition", code: "optimum-nutrition", popular: true },
	{ name: "MuscleTech", code: "muscletech", popular: true },
	{ name: "Applied Nutrition", code: "applied-nutrition", popular: true },
	{ name: "Dymatize", code: "dymatize" },
	{ name: "EVLution Nutrition", code: "evlution-nutrition" },
	{ name: "Rule One Proteins", code: "rule-one-proteins" },
	{ name: "NOW Foods", code: "now-foods" },
	{ name: "Ghost", code: "ghost" },
	{ name: "Bloom", code: "bloom" },
	{ name: "Maryruth's Organics", code: "maryruths-organics" },
	{ name: "Life Extension", code: "life-extension" },
	{ name: "California Gold Nutrition", code: "california-gold-nutrition" },
];
