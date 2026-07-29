import type { Locale } from "./i18n";

// Centralizes price display formatting so every price on the site (English
// and Arabic) goes through the same Intl.NumberFormat config — Arabic pages
// render with Eastern Arabic-Indic digits and "ر.ق.‏" per Intl's ar-QA
// convention, matching the site's locale-switching elsewhere. This is purely
// a DISPLAY concern — structured data (JSON-LD Offer.price) must stay plain
// machine-readable numbers regardless of locale and does NOT go through this.
export function formatPrice(cents: number, currencyCode: string, locale: Locale): string {
	return new Intl.NumberFormat(locale === "ar" ? "ar-QA" : "en", {
		style: "currency",
		currency: currencyCode,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(cents / 100);
}
