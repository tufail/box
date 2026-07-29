// Shared i18n helpers. URL scheme: English is unprefixed (existing URLs untouched),
// Arabic lives under an /ar/* prefix — e.g. /products/x (en) vs /ar/products/x (ar).
// This is the single source of truth for locale detection/path rewriting so every
// route and component agrees on the same rules.

export type Locale = "en" | "ar";

export const LOCALES: Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";

// Vendure resolves the request's translation language from a `languageCode` query
// string parameter on the shop-api HTTP request itself (not a GraphQL arg, not a
// header) — see RequestContextService.getLanguageCode in @vendure/core. This maps
// our locale straight onto that value.
export function localeToLanguageCode(locale: Locale): string {
	return locale;
}

// Detects locale from a pathname — "/ar" or "/ar/..." is Arabic, anything else is
// English (the default, unprefixed).
export function getLocaleFromPathname(pathname: string): Locale {
	return pathname === "/ar" || pathname.startsWith("/ar/") ? "ar" : "en";
}

// Strips the "/ar" prefix (if present) so callers get the canonical, locale-free
// shape of a path — e.g. "/ar/c/whey" -> "/c/whey", "/c/whey" -> "/c/whey".
export function stripLocalePrefix(pathname: string): string {
	if (pathname === "/ar") return "/";
	if (pathname.startsWith("/ar/")) return pathname.slice(3) || "/";
	return pathname;
}

// Prefixes a locale-free path for the given locale — the inverse of stripLocalePrefix.
// `path` must start with "/". English gets no prefix (matches existing URLs).
export function localizePath(path: string, locale: Locale): string {
	if (locale === "en") return path;
	if (path === "/") return "/ar";
	return `/ar${path}`;
}

// Absolute URL for the site's homepage in the given locale — the common case for
// a breadcrumb/JSON-LD "Home" entry, where "/" would otherwise need locale
// handling spelled out at every call site.
export function localeHomeUrl(siteUrl: string, locale: Locale): string {
	return locale === "en" ? siteUrl : `${siteUrl}/ar`;
}

// Swaps a path from one locale to the other, preserving query string.
export function toggleLocalePath(pathname: string, search: string, targetLocale: Locale): string {
	const bare = stripLocalePrefix(pathname);
	return `${localizePath(bare, targetLocale)}${search}`;
}

// hreflang <link> tags for a locale-free canonical path — pairs the en/ar versions
// and points x-default at English (the unprefixed, default-language version).
// `siteUrl` should be the origin only (no trailing slash), e.g. "https://nutribox.qa".
export function hreflangTags(siteUrl: string, canonicalPath: string) {
	return [
		{ tagName: "link" as const, rel: "alternate", hrefLang: "en", href: `${siteUrl}${localizePath(canonicalPath, "en")}` },
		{ tagName: "link" as const, rel: "alternate", hrefLang: "ar", href: `${siteUrl}${localizePath(canonicalPath, "ar")}` },
		{ tagName: "link" as const, rel: "alternate", hrefLang: "x-default", href: `${siteUrl}${localizePath(canonicalPath, "en")}` },
	];
}
