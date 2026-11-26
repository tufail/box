import type { Route } from "./+types/ai-products.txt";
import { getLocaleFromPathname } from "~/lib/i18n";
import { SITE_NAME } from "~/lib/seo";
import { USAGE_NOTES, abs, catalogueEntries, fetchCatalogue, textResponse, withEdgeCache, type CatalogueEntry } from "~/lib/aiCatalogue";

// /ai-products.txt (and /ar/ai-products.txt): the same catalogue as
// /ai-products.json, as readable Markdown-style text grouped by category.

const L = {
	en: {
		title: `${SITE_NAME} — Product Catalogue`,
		intro: "Every product page listed at NutriBox Qatar (in stock and out of stock), grouped by category. Machine-readable version:",
		brand: "Brand", url: "URL", price: "Price", availability: "Availability", inStock: "In stock", outOfStock: "Out of stock",
		size: "Size", gtin: "GTIN", details: "Full details", uncategorised: "Other",
	},
	ar: {
		title: `${SITE_NAME} — كتالوج المنتجات`,
		intro: "جميع صفحات المنتجات المدرجة في نيوتري بوكس قطر (المتوفرة وغير المتوفرة)، مصنفة حسب الفئة. النسخة المقروءة آلياً:",
		brand: "العلامة التجارية", url: "الرابط", price: "السعر", availability: "التوفر", inStock: "متوفر", outOfStock: "غير متوفر",
		size: "الحجم", gtin: "الباركود", details: "التفاصيل الكاملة", uncategorised: "أخرى",
	},
};

function entryText(e: CatalogueEntry, t: (typeof L)["en"]): string {
	const lines = [`### ${e.name}`];
	if (e.brand) lines.push(`- ${t.brand}: ${e.brand}`);
	lines.push(`- ${t.url}: ${e.url}`);
	lines.push(`- ${t.price}: QAR ${e.price.toFixed(2)}`);
	lines.push(`- ${t.availability}: ${e.availability === "in_stock" ? t.inStock : t.outOfStock}`);
	for (const [k, v] of Object.entries(e.options)) lines.push(`- ${k}: ${v}`);
	if (e.size) lines.push(`- ${t.size}: ${e.size}`);
	for (const [k, v] of Object.entries(e.attributes)) lines.push(`- ${k}: ${v.join(", ")}`);
	if (e.gtin) lines.push(`- ${t.gtin}: ${e.gtin}`);
	lines.push(`- ${t.details}: ${e.data_url}`);
	return lines.join("\n");
}

export async function loader({ request, context }: Route.LoaderArgs) {
	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		const t = L[locale];
		try {
			const products = await fetchCatalogue(context.cloudflare.env, request);
			const entries = catalogueEntries(products, context.cloudflare.env, locale);
			const byCategory = new Map<string, CatalogueEntry[]>();
			for (const e of entries) {
				const key = e.category ?? t.uncategorised;
				byCategory.set(key, [...(byCategory.get(key) ?? []), e]);
			}
			const body = [
				`# ${t.title}`,
				`Generated: ${new Date().toISOString()}`,
				`${t.intro} ${abs("/ai-products.json", locale)}`,
				USAGE_NOTES[locale].map((n) => `- ${n}`).join("\n"),
				...[...byCategory.entries()].map(([cat, list]) => `## ${cat}\n\n${list.map((e) => entryText(e, t)).join("\n\n")}`),
			].join("\n\n");
			return textResponse(`${body}\n`);
		} catch (e) {
			console.error("[ai-products.txt] failed:", e);
			return new Response("Catalogue temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
		}
	});
}
