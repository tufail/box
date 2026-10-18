// Shared SEO constants — keeping these in one place avoids each route
// re-deriving the same site facts.
export const SITE_URL = "https://nutribox.qa";
// Includes "Qatar" (not just the brand mark) deliberately — this is the actual
// public-facing business name (confirmed on the live nutribox.qa site's own
// "Company Name" field) and reinforces local SEO for a single-country, .qa business.
// Used for title suffixes, og:site_name, and JSON-LD name fields; the visual
// header/footer brand lockup stays plain "NutriBox" since that's the logo mark.
export const SITE_NAME = "NutriBox Qatar";

// Adds "Page N" to a listing title from page 2 on, so paginated pages don't all share
// page 1's exact title. The label goes right after the main title (before the first
// " | " segment, or before the trailing " - SITE_NAME"), e.g.
//   "Whey Protein | Quick Delivery | NutriBox"  ->  "Whey Protein - Page 2 | Quick Delivery | NutriBox"
//   "Creatine - NutriBox Qatar"                 ->  "Creatine - Page 2 - NutriBox Qatar"
// Page 1 is returned untouched.
export function withPageSuffix(title: string, page: number, locale: "en" | "ar"): string {
  if (page <= 1) return title;
  const label = `${locale === "ar" ? "صفحة" : "Page"} ${page}`;
  const parts = title.split(/\s*\|\s*/).map((part) => part.trim());
  if (parts.length > 1) {
    parts[0] = `${parts[0]} - ${label}`;
    return parts.join(" | ");
  }
  const siteSuffix = ` - ${SITE_NAME}`;
  return title.endsWith(siteSuffix) ? `${title.slice(0, -siteSuffix.length)} - ${label}${siteSuffix}` : `${title} - ${label}`;
}
