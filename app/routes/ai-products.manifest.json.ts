import type { Route } from "./+types/ai-products.manifest.json";
import { getLocaleFromPathname } from "~/lib/i18n";
import { AI_SCHEMA_VERSION, abs, fetchCounts, jsonResponse, storeInfo, withEdgeCache, TXT_PAGE_SIZE } from "~/lib/aiCatalogue";

// /ai-products/manifest.json (and /ar/...): small "about this feed" file --
// generation time, counts, refresh interval and every endpoint, so a tool can
// check freshness and discover the feed without downloading the catalogue.
// Uses one cheap counts query (not the full catalogue) so it answers fast even
// on a cold cache. Variant-level counts live in /ai-products.json.
const CACHE_SECONDS = 3600;

export async function loader({ request, context }: Route.LoaderArgs) {
	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		try {
			const counts = await fetchCounts(context.cloudflare.env, request);
			return jsonResponse({
				schema_version: AI_SCHEMA_VERSION,
				generated_at: new Date().toISOString(),
				refresh: { max_age_seconds: CACHE_SECONDS, note: "Prices and stock in these files are at most this old. The product page is authoritative." },
				store: storeInfo(locale),
				counts: { ...counts, note: "Variant-page and in-stock counts are in catalogue_index." },
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
