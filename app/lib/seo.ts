// Shared SEO constants — keeping these in one place avoids each route
// re-deriving the same site facts.
export const SITE_URL = "https://nutribox.qa";
// Includes "Qatar" (not just the brand mark) deliberately — this is the actual
// public-facing business name (confirmed on the live nutribox.qa site's own
// "Company Name" field) and reinforces local SEO for a single-country, .qa business.
// Used for title suffixes, og:site_name, and JSON-LD name fields; the visual
// header/footer brand lockup stays plain "NutriBox" since that's the logo mark.
export const SITE_NAME = "NutriBox Qatar";
