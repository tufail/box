import type { Route } from "./+types/ai-products.$file";
import { graphqlRequest } from "workers/graphqlClient";
import {
	PRODUCT_DETAIL_BY_VARIANT_SLUG_QUERY,
	PRODUCT_DETAIL_QUERY,
	type ProductDetailByVariantSlugData,
	type ProductDetailData,
	type ProductDetailItem,
} from "~/graphql/product";
import { getLocaleFromPathname } from "~/lib/i18n";
import { htmlToText } from "~/lib/markdownPage";
import {
	AI_SCHEMA_VERSION,
	abs,
	attributesOf,
	availability,
	brandOf,
	categoriesOf,
	dataUrl,
	imageUrl,
	jsonResponse,
	jsonSlug,
	optionsOf,
	storeInfo,
	variantSlug,
	withEdgeCache,
} from "~/lib/aiCatalogue";

// /ai-products/{slug}.json (and /ar/...): the complete record for ONE variant
// page -- the same data its product page shows (variant description, nutrition
// facts, highlights, price, stock, barcode) plus the product's other variants.
// {slug} is the variant page's slug (or the product slug for variants without
// their own page), exactly as in /products/{slug}.

const plain = (html: string | null | undefined) => htmlToText(html ?? "").replace(/\n{3,}/g, "\n\n").trim();
const oneLine = (html: string | null | undefined) => plain(html).replace(/\s+/g, " ");

async function loadProduct(env: Route.LoaderArgs["context"]["cloudflare"]["env"], request: Request, slug: string): Promise<ProductDetailItem | null> {
	const opts = { request, cf: { cacheTtl: 3600, cacheEverything: true } };
	// Most pages are variant pages, so try the variant slug first.
	const byVariant = await graphqlRequest<ProductDetailByVariantSlugData>(env, PRODUCT_DETAIL_BY_VARIANT_SLUG_QUERY, { slug }, opts).catch(() => null);
	if (byVariant?.data.productVariantBySlug?.product) return byVariant.data.productVariantBySlug.product;
	const byProduct = await graphqlRequest<ProductDetailData>(env, PRODUCT_DETAIL_QUERY, { slug }, opts).catch(() => null);
	return byProduct?.data.product ?? null;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const slug = jsonSlug(params.file);
	if (!slug) throw new Response("Not Found", { status: 404 });

	return withEdgeCache(request, context.cloudflare.ctx, async () => {
		const env = context.cloudflare.env;
		const locale = getLocaleFromPathname(new URL(request.url).pathname);
		const product = await loadProduct(env, request, slug);
		if (!product || product.variants.length === 0) return jsonResponse({ error: "not_found", slug }, 404);

		const variant = product.variants.find((v) => v.customFields?.slug === slug) ?? product.variants[0];
		const brand = brandOf(product.facetValues, locale);

		// Highlights: "Protein per serving: 25g", "Vegan: yes"... one per label.
		const seen = new Set<string>();
		const highlights = (variant.highlights ?? [])
			.filter((h) => {
				const key = h.highlightType.label.trim().toLowerCase();
				return seen.has(key) ? false : (seen.add(key), true);
			})
			.map((h) =>
				h.highlightType.valueType === "BOOLEAN"
					? { label: h.highlightType.label, value: !!h.booleanValue }
					: { label: h.highlightType.label, value: `${h.textValue ?? ""}${h.highlightType.unit ?? ""}`.trim() },
			)
			.filter((h) => h.value !== "");

		const description =
			oneLine(variant.customFields?.additionalInfo) ||
			product.customFields?.aiOverview?.trim() ||
			product.customFields?.metaDescription?.trim() ||
			oneLine(product.description);
		const overview = product.customFields?.aiOverview?.trim();

		return jsonResponse({
			schema_version: AI_SCHEMA_VERSION,
			generated_at: new Date().toISOString(),
			language: locale,
			store: storeInfo(locale),
			id: variant.id,
			product_id: product.id,
			name: variant.name || product.name,
			product_name: product.name,
			url: abs(`/products/${variantSlug(product, variant)}`, locale),
			brand,
			categories: categoriesOf(product.collections, locale).map(({ name, path, url }) => ({ name, path, url })),
			description,
			...(overview && overview !== description ? { overview } : {}),
			price: Number((variant.priceWithTax / 100).toFixed(2)),
			currency: variant.currencyCode || "QAR",
			availability: availability(variant.stockLevel),
			sku: variant.sku,
			gtin: variant.customFields?.gtin12?.trim() || null,
			size: variant.customFields?.sizeSpecifications?.trim() || null,
			options: optionsOf(variant.options),
			attributes: attributesOf(product.facetValues),
			highlights,
			nutrition_facts: plain(variant.customFields?.keyInfo) || null,
			images: [variant.featuredAsset?.preview, ...variant.assets.map((a) => a.preview), product.featuredAsset?.preview]
				.filter((p, i, all): p is string => !!p && all.indexOf(p) === i)
				.slice(0, 6)
				.map((p) => imageUrl(p, env)),
			other_variants: product.variants
				.filter((v) => v.id !== variant.id)
				.map((v) => ({
					name: v.name,
					url: abs(`/products/${variantSlug(product, v)}`, locale),
					price: Number((v.priceWithTax / 100).toFixed(2)),
					availability: availability(v.stockLevel),
					options: optionsOf(v.options),
					data_url: dataUrl(variantSlug(product, v), locale),
				})),
			disclaimer: oneLine(product.customFields?.disclaimer) || null,
		});
	});
}
