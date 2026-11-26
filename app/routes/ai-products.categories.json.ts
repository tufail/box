import type { Route } from "./+types/ai-products.categories.json";
import { getLocaleFromPathname } from "~/lib/i18n";
import { AI_SCHEMA_VERSION, abs, categoryTxtUrl, directories, fetchCatalogue, jsonResponse, storeInfo, withEdgeCache, TXT_PAGE_SIZE } from "~/lib/aiCatalogue";

// /ai-products/categories.json (and /ar/...): the category directory on its own,
// so tools can find a category without downloading the full catalogue.
export async function loader({ request, context }: Route.LoaderArgs) {
	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		try {
			const { categories } = directories(await fetchCatalogue(context.cloudflare.env, request), locale);
			return jsonResponse({
				schema_version: AI_SCHEMA_VERSION,
				generated_at: new Date().toISOString(),
				store: storeInfo(locale),
				catalogue_index: abs("/ai-products.json", locale),
				total_categories: categories.length,
				categories: categories.map((c) => ({
					...c,
					text_url: categoryTxtUrl(c.slug, locale),
					text_pages: Math.max(1, Math.ceil(c.variant_pages / TXT_PAGE_SIZE)),
				})),
			});
		} catch (e) {
			console.error("[ai-products/categories.json] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
