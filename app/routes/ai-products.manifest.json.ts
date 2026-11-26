import type { Route } from "./+types/ai-products.manifest.json";
import { getLocaleFromPathname } from "~/lib/i18n";
import { AI_SCHEMA_VERSION, abs, catalogueEntries, directories, fetchCatalogue, jsonResponse, storeInfo, withEdgeCache, TXT_PAGE_SIZE } from "~/lib/aiCatalogue";

// /ai-products/manifest.json (and /ar/...): small "about this feed" file --
// generation time, counts, refresh interval and every endpoint, so a tool can
// check freshness and discover the feed without downloading the catalogue.
const CACHE_SECONDS = 3600;

export async function loader({ request, context }: Route.LoaderArgs) {
	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		try {
			const products = await fetchCatalogue(context.cloudflare.env, request);
			const entries = catalogueEntries(products, context.cloudflare.env, locale);
			const { categories, brands } = directories(products, locale);
			return jsonResponse({
				schema_version: AI_SCHEMA_VERSION,
				generated_at: new Date().toISOString(),
				refresh: { max_age_seconds: CACHE_SECONDS, note: "Prices and stock in these files are at most this old. The product page is authoritative." },
				store: storeInfo(locale),
				counts: {
					products: products.length,
					variant_pages: entries.length,
					in_stock_variant_pages: entries.filter((e) => e.availability === "in_stock").length,
					categories: categories.length,
					brands: brands.length,
				},
				languages: {
					en: abs("/ai-products/manifest.json", "en"),
					ar: abs("/ai-products/manifest.json", "ar"),
				},
				endpoints: {
					catalogue_index: abs("/ai-products.json", locale),
					catalogue_text_index: abs("/ai-products.txt", locale),
					categories: abs("/ai-products/categories.json", locale),
					brands: abs("/ai-products/brands.json", locale),
					product: `${abs("/ai-products", locale)}/{product-slug}.json`,
					category: `${abs("/ai-products/category", locale)}/{category-slug}.json`,
					category_text: `${abs("/ai-products/category", locale)}/{category-slug}.txt?page={n}`,
					brand: `${abs("/ai-products/brand", locale)}/{brand-slug}.json`,
				},
				text_page_size: TXT_PAGE_SIZE,
				guide: storeInfo(locale).guide,
			});
		} catch (e) {
			console.error("[ai-products/manifest.json] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
