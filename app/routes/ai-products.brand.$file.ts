import type { Route } from "./+types/ai-products.brand.$file";
import { getLocaleFromPathname } from "~/lib/i18n";
import { AI_SCHEMA_VERSION, abs, catalogueEntries, directories, fetchCatalogue, jsonResponse, jsonSlug, publicEntry, storeInfo, withEdgeCache } from "~/lib/aiCatalogue";

// /ai-products/brand/{slug}.json (and /ar/...): every variant page of one brand.
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const slug = jsonSlug(params.file);
	if (!slug) throw new Response("Not Found", { status: 404 });
	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		try {
			const products = await fetchCatalogue(context.cloudflare.env, request);
			const brand = directories(products, locale).brands.find((b) => b.slug === slug);
			if (!brand) return jsonResponse({ error: "not_found", slug }, 404);
			const entries = catalogueEntries(products, context.cloudflare.env, locale).filter((e) => e._brandSlug === slug);
			return jsonResponse({
				schema_version: AI_SCHEMA_VERSION,
				generated_at: new Date().toISOString(),
				store: storeInfo(locale),
				brand,
				catalogue_index: abs("/ai-products.json", locale),
				total_variant_pages: entries.length,
				products: entries.map(publicEntry),
			});
		} catch (e) {
			console.error("[ai-products/brand] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
