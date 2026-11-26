import type { Route } from "./+types/ai-products.json";
import { getLocaleFromPathname } from "~/lib/i18n";
import { AI_SCHEMA_VERSION, USAGE_NOTES, abs, catalogueEntries, directories, fetchCatalogue, jsonResponse, publicEntry, storeInfo, withEdgeCache } from "~/lib/aiCatalogue";

// /ai-products.json (and /ar/ai-products.json): the catalogue entry point for AI
// systems -- store info, category and brand directories, and one lightweight
// entry per variant page, each linking to its full record (data_url).
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
				store: storeInfo(locale),
				notes: USAGE_NOTES[locale],
				catalogue: {
					total_products: products.length,
					total_variant_pages: entries.length,
					in_stock_variant_pages: entries.filter((e) => e.availability === "in_stock").length,
					text_version: abs("/ai-products.txt", locale),
				},
				categories,
				brands,
				products: entries.map(publicEntry),
			});
		} catch (e) {
			console.error("[ai-products.json] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
