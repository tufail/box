// AI product catalogue (/ai-products.json, /ai-products.txt, per-product,
// category and brand feeds; EN + /ar). Built live from Vendure -- the same data
// the storefront shows -- so nothing is maintained by hand.
//
// Kept deliberately light: this account is on Cloudflare's Free plan (~10ms CPU
// per request), so the full-catalogue query carries only list-level fields
// (no descriptions / nutrition HTML / highlights), full detail comes from the
// per-product endpoint, and every built response is edge-cached (withEdgeCache).
//
// Built from the products() list, NOT the search index: the search index was
// found missing about half the catalogue (see lib/sitemapProducts.ts).
import { graphqlRequest, type VendureEnv } from "workers/graphqlClient";
import { buildCollectionPath } from "~/graphql/collection";
import { vendureImageUrl } from "~/components/VendureImage";
import { localizePath, type Locale } from "~/lib/i18n";
import { SITE_NAME, SITE_URL } from "~/lib/seo";

export const AI_SCHEMA_VERSION = "1.0";
const CACHE_SECONDS = 3600;
const PAGE_SIZE = 100; // Vendure's default shop-API list limit.

// ── Catalogue query (list-level fields only) ─────────────────────────────────

interface CatalogueFacetValue {
	name: string;
	code: string;
	facet: { name: string; code: string };
}
interface CatalogueCollection {
	name: string;
	slug: string;
	breadcrumbs: { name: string; slug: string }[];
}
interface CatalogueVariant {
	id: string;
	name: string;
	sku: string;
	priceWithTax: number;
	currencyCode: string;
	stockLevel: string;
	featuredAsset: { preview: string } | null;
	customFields: { slug: string | null; gtin12: string | null; sizeSpecifications: string | null } | null;
	options: { name: string; group: { name: string } }[];
}
export interface CatalogueProduct {
	id: string;
	name: string;
	slug: string;
	featuredAsset: { preview: string } | null;
	facetValues: CatalogueFacetValue[];
	collections: CatalogueCollection[];
	variants: CatalogueVariant[];
}

const CATALOGUE_QUERY = `
	query AiCatalogue($options: ProductListOptions) {
		products(options: $options) {
			totalItems
			items {
				id
				name
				slug
				featuredAsset { preview }
				facetValues { name code facet { name code } }
				collections { name slug breadcrumbs { name slug } }
				variants {
					id
					name
					sku
					priceWithTax
					currencyCode
					stockLevel
					featuredAsset { preview }
					customFields { slug gtin12 sizeSpecifications }
					options { name group { name } }
				}
			}
		}
	}
`;

export async function fetchCatalogue(env: VendureEnv, request: Request): Promise<CatalogueProduct[]> {
	const all: CatalogueProduct[] = [];
	for (let skip = 0; ; skip += PAGE_SIZE) {
		const { data } = await graphqlRequest<{ products: { totalItems: number; items: CatalogueProduct[] } }>(
			env,
			CATALOGUE_QUERY,
			{ options: { take: PAGE_SIZE, skip } },
			{ request, cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } },
		);
		all.push(...data.products.items);
		if (all.length >= data.products.totalItems || data.products.items.length === 0) break;
	}
	return all;
}

// ── Shared mapping helpers ───────────────────────────────────────────────────

export function availability(stockLevel: string): "in_stock" | "out_of_stock" {
	if (stockLevel === "OUT_OF_STOCK") return "out_of_stock";
	const n = Number(stockLevel);
	return Number.isNaN(n) || n > 0 ? "in_stock" : "out_of_stock";
}

export const abs = (path: string, locale: Locale) => `${SITE_URL}${localizePath(path, locale)}`;

// The page a variant lives at: its own slug when it has one, else the product's.
export const variantSlug = (product: { slug: string }, variant: { customFields?: { slug?: string | null } | null }) =>
	variant.customFields?.slug || product.slug;

export const dataUrl = (slug: string, locale: Locale) => abs(`/ai-products/${slug}.json`, locale);

const BRAND_FACET = "brands";
const SKIP_ATTRIBUTE_FACETS = /^(brands?|categor(y|ies)|flavou?rs?)$/i;

export function brandOf(facetValues: CatalogueFacetValue[], locale: Locale): { name: string; slug: string; url: string } | null {
	const b = facetValues.find((f) => f.facet.code === BRAND_FACET);
	return b ? { name: b.name, slug: b.code, url: abs(`/brands/${b.code}`, locale) } : null;
}

// Product-level filter values (Product Form, Certification and diet, Health
// Topics...) grouped by facet name. Brand/category/flavour are excluded --
// they're represented elsewhere (flavour per variant via options).
export function attributesOf(facetValues: CatalogueFacetValue[]): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	for (const f of facetValues) {
		if (SKIP_ATTRIBUTE_FACETS.test(f.facet.code)) continue;
		(out[f.facet.name] ??= []).push(f.name);
	}
	return out;
}

const realCrumbs = (c: CatalogueCollection) => c.breadcrumbs.filter((b) => b.name !== "__root_collection__");

export function categoriesOf(collections: CatalogueCollection[], locale: Locale) {
	return collections
		.filter((c) => realCrumbs(c).length > 0)
		.map((c) => ({ name: c.name, slug: c.slug, path: realCrumbs(c).map((b) => b.name).join(" > "), depth: realCrumbs(c).length, url: abs(buildCollectionPath(c.breadcrumbs), locale) }))
		.sort((a, b) => b.depth - a.depth || a.path.localeCompare(b.path));
}

export const optionsOf = (options: { name: string; group: { name: string } }[]) =>
	Object.fromEntries(options.map((o) => [o.group.name, o.name]));

export function imageUrl(preview: string | null | undefined, env: VendureEnv): string | null {
	if (!preview) return null;
	return vendureImageUrl(preview, env.VENDURE_SHOP_API ?? "", { preset: "large", format: "jpg" });
}

// One catalogue entry per variant page.
export interface CatalogueEntry {
	id: string;
	product_id: string;
	name: string;
	product_name: string;
	brand: string | null;
	brand_url: string | null;
	category: string | null;
	categories: string[];
	url: string;
	price: number;
	currency: string;
	availability: "in_stock" | "out_of_stock";
	size: string | null;
	options: Record<string, string>;
	attributes: Record<string, string[]>;
	sku: string;
	gtin: string | null;
	image: string | null;
	data_url: string;
	/** internal: for filtering category/brand feeds */
	_categorySlugs: string[];
	_brandSlug: string | null;
}

export function catalogueEntries(products: CatalogueProduct[], env: VendureEnv, locale: Locale): CatalogueEntry[] {
	const entries: CatalogueEntry[] = [];
	for (const p of products) {
		const brand = brandOf(p.facetValues, locale);
		const cats = categoriesOf(p.collections, locale);
		const attributes = attributesOf(p.facetValues);
		for (const v of p.variants) {
			const slug = variantSlug(p, v);
			entries.push({
				id: v.id,
				product_id: p.id,
				name: v.name || p.name,
				product_name: p.name,
				brand: brand?.name ?? null,
				brand_url: brand?.url ?? null,
				category: cats[0]?.path ?? null,
				categories: cats.map((c) => c.name),
				url: abs(`/products/${slug}`, locale),
				price: Number((v.priceWithTax / 100).toFixed(2)),
				currency: v.currencyCode || "QAR",
				availability: availability(v.stockLevel),
				size: v.customFields?.sizeSpecifications?.trim() || null,
				options: optionsOf(v.options),
				attributes,
				sku: v.sku,
				gtin: v.customFields?.gtin12?.trim() || null,
				image: imageUrl(v.featuredAsset?.preview ?? p.featuredAsset?.preview, env),
				data_url: dataUrl(slug, locale),
				_categorySlugs: p.collections.map((c) => c.slug),
				_brandSlug: brand?.slug ?? null,
			});
		}
	}
	return entries.sort((a, b) => (a.category ?? "~").localeCompare(b.category ?? "~") || a.name.localeCompare(b.name));
}

export const publicEntry = ({ _categorySlugs, _brandSlug, ...rest }: CatalogueEntry) => rest;

// Category + brand directories with variant-page counts and their feed URLs.
export function directories(products: CatalogueProduct[], locale: Locale) {
	const cats = new Map<string, { name: string; path: string; slug: string; url: string; feed_url: string; variant_pages: number }>();
	const brands = new Map<string, { name: string; slug: string; url: string; feed_url: string; variant_pages: number }>();
	for (const p of products) {
		const n = p.variants.length;
		for (const c of categoriesOf(p.collections, locale)) {
			const e = cats.get(c.slug) ?? { name: c.name, path: c.path, slug: c.slug, url: c.url, feed_url: abs(`/ai-products/category/${c.slug}.json`, locale), variant_pages: 0 };
			e.variant_pages += n;
			cats.set(c.slug, e);
		}
		const b = brandOf(p.facetValues, locale);
		if (b) {
			const e = brands.get(b.slug) ?? { name: b.name, slug: b.slug, url: b.url, feed_url: abs(`/ai-products/brand/${b.slug}.json`, locale), variant_pages: 0 };
			e.variant_pages += n;
			brands.set(b.slug, e);
		}
	}
	return {
		categories: [...cats.values()].sort((a, b) => a.path.localeCompare(b.path)),
		brands: [...brands.values()].sort((a, b) => a.name.localeCompare(b.name)),
	};
}

// For the category/brand feed routes: "creatine.json" -> "creatine"; null if not .json.
export const jsonSlug = (file: string | undefined) => (file && file.endsWith(".json") ? file.slice(0, -5) : null);
export const txtSlug = (file: string | undefined) => (file && file.endsWith(".txt") ? file.slice(0, -4) : null);

// ── Readable-text (.txt) formatting, shared by the index and category files ──

// Text files are split by category and then paged, so no single file grows
// past what AI tools reading a page will actually take in.
export const TXT_PAGE_SIZE = 100;

export const TXT_LABELS = {
	en: {
		title: `${SITE_NAME} — Product Catalogue`,
		intro: "Every product page listed at NutriBox Qatar (in stock and out of stock). Each category below has its own file with the full product list. Machine-readable version:",
		categories: "Categories", brands: "Brands", other: "Products not in a category",
		pages: "product pages", page: "Page", of: "of", generated: "Generated", next: "Next page", prev: "Previous page", index: "Catalogue index",
		brand: "Brand", url: "URL", price: "Price", availability: "Availability", inStock: "In stock", outOfStock: "Out of stock",
		size: "Size", gtin: "GTIN", details: "Full details",
	},
	ar: {
		title: `${SITE_NAME} — كتالوج المنتجات`,
		intro: "جميع صفحات المنتجات المدرجة في نيوتري بوكس قطر (المتوفرة وغير المتوفرة). لكل فئة أدناه ملف خاص بقائمة منتجاتها الكاملة. النسخة المقروءة آلياً:",
		categories: "الفئات", brands: "العلامات التجارية", other: "منتجات غير مصنفة",
		pages: "صفحة منتج", page: "صفحة", of: "من", generated: "تاريخ الإنشاء", next: "الصفحة التالية", prev: "الصفحة السابقة", index: "فهرس الكتالوج",
		brand: "العلامة التجارية", url: "الرابط", price: "السعر", availability: "التوفر", inStock: "متوفر", outOfStock: "غير متوفر",
		size: "الحجم", gtin: "الباركود", details: "التفاصيل الكاملة",
	},
};

export function entryText(e: CatalogueEntry, locale: Locale): string {
	const t = TXT_LABELS[locale];
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

export const categoryTxtUrl = (slug: string, locale: Locale, page = 1) =>
	`${abs(`/ai-products/category/${slug}.txt`, locale)}${page > 1 ? `?page=${page}` : ""}`;

// ── Store block + usage notes shared by the JSON/TXT outputs ─────────────────

export function storeInfo(locale: Locale) {
	return {
		name: SITE_NAME,
		url: abs("/", locale),
		country: "QA",
		currency: "QAR",
		languages: ["en", "ar"],
		language: locale,
		guide: `${SITE_URL}/llms.txt`,
		shipping_policy: abs("/pages/shipping-policy", locale),
		return_policy: abs("/pages/refund-and-return-policy", locale),
	};
}

export const USAGE_NOTES = {
	en: [
		"Generated live from the NutriBox Qatar catalogue; prices are in QAR and include tax.",
		"Prices and stock are refreshed at least hourly. For the exact current price and availability, use the product URL.",
		"Each entry is one variant page (a specific flavour/size). Link customers to its `url`, which is the canonical page.",
		"Full details (description, nutrition facts, highlights, other variants) are at each entry's `data_url`.",
		"Arabic version: replace /ai-products with /ar/ai-products.",
	],
	ar: [
		"يتم إنشاء هذا الملف مباشرة من كتالوج نيوتري بوكس قطر؛ الأسعار بالريال القطري وتشمل الضريبة.",
		"يتم تحديث الأسعار والمخزون كل ساعة على الأقل. للتحقق من السعر والتوفر الحاليين استخدم رابط المنتج.",
		"كل إدخال يمثل صفحة نوع محدد (نكهة/حجم). وجّه العملاء إلى `url` لأنه الرابط الأساسي للصفحة.",
		"التفاصيل الكاملة (الوصف، القيم الغذائية، المميزات، الأنواع الأخرى) متوفرة في `data_url` لكل إدخال.",
		"النسخة الإنجليزية: احذف /ar من الرابط.",
	],
};

// ── Responses + edge cache ───────────────────────────────────────────────────

const commonHeaders = {
	"Cache-Control": `public, max-age=${CACHE_SECONDS}`,
	// Data files for AI/agents, not pages to show in Google results.
	"X-Robots-Tag": "noindex",
	"Access-Control-Allow-Origin": "*",
};

export const jsonResponse = (body: unknown, status = 200) =>
	// Compact (not pretty-printed): ~30% smaller and less CPU on the Free plan.
	new Response(JSON.stringify(body), { status, headers: { ...commonHeaders, "Content-Type": "application/json; charset=utf-8" } });

export const textResponse = (body: string, status = 200) =>
	new Response(body, { status, headers: { ...commonHeaders, "Content-Type": "text/plain; charset=utf-8" } });

// Worker responses aren't cached by Cloudflare automatically -- store the built
// response in the edge cache so rebuilds happen at most hourly per location
// (important on the Free plan's CPU budget). Errors are never cached.
export async function withEdgeCache(request: Request, ctx: { waitUntil(p: Promise<unknown>): void } | undefined, build: () => Promise<Response>): Promise<Response> {
	const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
	const key = new Request(new URL(request.url).toString(), { method: "GET" });
	if (cache) {
		const hit = await cache.match(key);
		if (hit) return hit;
	}
	const res = await build();
	if (cache && res.status === 200) {
		const put = cache.put(key, res.clone());
		if (ctx) ctx.waitUntil(put);
		else await put;
	}
	return res;
}
