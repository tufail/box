import type { Route } from "./+types/ai-products.category.$file";
import { getLocaleFromPathname } from "~/lib/i18n";
import {
	AI_SCHEMA_VERSION,
	TXT_LABELS,
	TXT_PAGE_SIZE,
	abs,
	catalogueEntries,
	categoryTxtUrl,
	directories,
	entryText,
	fetchCatalogue,
	jsonResponse,
	jsonSlug,
	publicEntry,
	storeInfo,
	textResponse,
	txtSlug,
	withEdgeCache,
} from "~/lib/aiCatalogue";

// /ai-products/category/{slug}.json -- every variant page in one category
// (including its sub-categories), as in /ai-products.json.
// /ai-products/category/{slug}.txt  -- the same as readable text, paged at
// TXT_PAGE_SIZE (?page=2, ...) so big categories stay readable. /ar mirrors both.
export async function loader({ request, params, context }: Route.LoaderArgs) {
	const jsonCat = jsonSlug(params.file);
	const txtCat = txtSlug(params.file);
	const slug = jsonCat ?? txtCat;
	if (!slug) throw new Response("Not Found", { status: 404 });

	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const url = new URL(request.url);
		const locale = getLocaleFromPathname(url.pathname);
		try {
			const products = await fetchCatalogue(context.cloudflare.env, request);
			const category = directories(products, locale).categories.find((c) => c.slug === slug);
			const notFound = () => (txtCat ? textResponse("Not found\n", 404) : jsonResponse({ error: "not_found", slug }, 404));
			if (!category) return notFound();
			const entries = catalogueEntries(products, context.cloudflare.env, locale).filter((e) => e._categorySlugs.includes(slug));

			if (jsonCat) {
				return jsonResponse({
					schema_version: AI_SCHEMA_VERSION,
					generated_at: new Date().toISOString(),
					store: storeInfo(locale),
					category,
					catalogue_index: abs("/ai-products.json", locale),
					text_version: categoryTxtUrl(slug, locale),
					total_variant_pages: entries.length,
					products: entries.map(publicEntry),
				});
			}

			const t = TXT_LABELS[locale];
			const pages = Math.max(1, Math.ceil(entries.length / TXT_PAGE_SIZE));
			const page = Number(url.searchParams.get("page") ?? "1");
			if (!Number.isInteger(page) || page < 1 || page > pages) return notFound();
			const slice = entries.slice((page - 1) * TXT_PAGE_SIZE, page * TXT_PAGE_SIZE);
			const nav = [
				`- ${t.index}: ${abs("/ai-products.txt", locale)}`,
				...(page > 1 ? [`- ${t.prev}: ${categoryTxtUrl(slug, locale, page - 1)}`] : []),
				...(page < pages ? [`- ${t.next}: ${categoryTxtUrl(slug, locale, page + 1)}`] : []),
			].join("\n");
			const body = [
				`# ${category.path} — ${t.title}`,
				`${entries.length} ${t.pages}. ${t.page} ${page} ${t.of} ${pages}. ${t.generated}: ${new Date().toISOString()}`,
				`${category.url}`,
				nav,
				slice.map((e) => entryText(e, locale)).join("\n\n"),
				nav,
			].join("\n\n");
			return textResponse(`${body}\n`);
		} catch (e) {
			console.error("[ai-products/category] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
