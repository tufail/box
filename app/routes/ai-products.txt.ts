import type { Route } from "./+types/ai-products.txt";
import { getLocaleFromPathname } from "~/lib/i18n";
import {
	TXT_LABELS,
	TXT_PAGE_SIZE,
	USAGE_NOTES,
	abs,
	catalogueEntries,
	categoryTxtUrl,
	directories,
	entryText,
	fetchCatalogue,
	textResponse,
	withEdgeCache,
} from "~/lib/aiCatalogue";

// /ai-products.txt (and /ar/ai-products.txt): a short readable INDEX of the
// catalogue -- every category with its product count and a link to its own
// text file (/ai-products/category/{slug}.txt, paged at TXT_PAGE_SIZE), plus
// the brand list. Kept short on purpose: AI tools reading a long page often
// only take in the start of it, so the product lists live in per-category files.
export async function loader({ request, context }: Route.LoaderArgs) {
	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		const t = TXT_LABELS[locale];
		try {
			const products = await fetchCatalogue(context.cloudflare.env, request);
			const entries = catalogueEntries(products, context.cloudflare.env, locale);
			const { categories, brands } = directories(products, locale);

			const categoryLines = categories.map((c) => {
				const pages = Math.ceil(c.variant_pages / TXT_PAGE_SIZE);
				const more = pages > 1 ? ` (?page=1…${pages})` : "";
				return `- ${c.path} — ${c.variant_pages} ${t.pages}: ${categoryTxtUrl(c.slug, locale)}${more}`;
			});
			const brandLines = brands.map((b) => `- ${b.name} — ${b.variant_pages} ${t.pages}: ${b.feed_url}`);
			// The few products in no category would otherwise appear in no text file.
			const uncategorised = entries.filter((e) => !e.category);

			const body = [
				`# ${t.title}`,
				`${t.generated}: ${new Date().toISOString()}`,
				`${t.intro} ${abs("/ai-products.json", locale)}`,
				USAGE_NOTES[locale].map((n) => `- ${n}`).join("\n"),
				`## ${t.categories}\n\n${categoryLines.join("\n")}`,
				`## ${t.brands}\n\n${brandLines.join("\n")}`,
				...(uncategorised.length ? [`## ${t.other}\n\n${uncategorised.map((e) => entryText(e, locale)).join("\n\n")}`] : []),
			].join("\n\n");
			return textResponse(`${body}\n`);
		} catch (e) {
			console.error("[ai-products.txt] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
