// Shared SEO constants — keeping these in one place avoids each route
// re-deriving the same site facts.
export const SITE_URL = "https://nutribox.qa";
// Includes "Qatar" (not just the brand mark) deliberately — this is the actual
// public-facing business name (confirmed on the live nutribox.qa site's own
// "Company Name" field) and reinforces local SEO for a single-country, .qa business.
// Used for title suffixes, og:site_name, and JSON-LD name fields; the visual
// header/footer brand lockup stays plain "NutriBox" since that's the logo mark.
export const SITE_NAME = "NutriBox Qatar";

// Truncates to the last whole word within maxLen instead of cutting mid-word --
// used for meta descriptions so a long dynamic value (product/collection/brand
// name) can't push fixed trailing copy (e.g. trust badges) past the limit and
// chop it in half.
export function truncateAtWord(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str;
	const cut = str.slice(0, maxLen);
	const lastSpace = cut.lastIndexOf(" ");
	// Keep the space itself (rather than cut.slice(0, lastSpace)) so a truncated
	// lead concatenated directly with trailing copy (e.g. badges) still has a
	// single space between the two instead of running the words together.
	return lastSpace > 0 ? cut.slice(0, lastSpace + 1) : cut;
}
