import type { Route } from "./+types/ai-products.brands.json";
import { getLocaleFromPathname } from "~/lib/i18n";
import { AI_SCHEMA_VERSION, abs, directories, fetchCatalogue, jsonResponse, storeInfo, withEdgeCache } from "~/lib/aiCatalogue";

// /ai-products/brands.json (and /ar/...): the brand directory on its own.
export async function loader({ request, context }: Route.LoaderArgs) {
	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		try {
			const { brands } = directories(await fetchCatalogue(context.cloudflare.env, request), locale);
			return jsonResponse({
				schema_version: AI_SCHEMA_VERSION,
				generated_at: new Date().toISOString(),
				store: storeInfo(locale),
				catalogue_index: abs("/ai-products.json", locale),
				total_brands: brands.length,
				brands,
			});
		} catch (e) {
			console.error("[ai-products/brands.json] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
