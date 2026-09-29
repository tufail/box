// Shared logic behind sitemap-products-en.xml and sitemap-products-ar.xml --
// split into one file per locale (rather than one file emitting both EN and AR
// <url> tags per product) so each page's <url> count is simple to reason about:
// PRODUCTS_PER_SITEMAP_PAGE products in, that many <url> tags out, no doubling.
import { graphqlRequest, fetchInPages, urlEntryLocale, urlset, xmlResponse, type VendureEnv } from "~/lib/sitemap";
import { SITE_URL } from "~/lib/seo";
import { vendureImageUrl } from "~/components/VendureImage";

// Registered at static paths ("sitemap-products-en.xml" / "-ar.xml"), paginated
// via a ?page= query param — see app/routes.ts. A dynamic path segment for the
// page number was tried first ("sitemap-products-:page.xml") and reverted:
// confirmed live that React Router's router doesn't match a param embedded
// inside a segment with a literal prefix/suffix ("No route matches URL
// /sitemap-products-1.xml"), only a param occupying a whole segment on its
// own. Query-param pagination sidesteps that entirely. Page numbers are
// 1-based to match how they're listed from sitemap.xml (the index).
export const PRODUCTS_PER_SITEMAP_PAGE = 50;

type SitemapProductItem = {
	slug: string;
	productName: string;
	productVariantName: string;
	// The variant's own dedicated page slug (customFields.slug on the variant) --
	// distinct from `slug` above (the base product's page) whenever a specific
	// flavor/size has its own indexable URL, e.g. a "Black Cherry Limeade" variant
	// living at /products/rule-1-proteins-prelift-pre-workout-black-cherry-limeade
	// rather than the plain product page. Falls back to the base product slug for
	// variants that don't have their own.
	customProductVariantMappings: { slug: string | null } | null;
	productAsset: { preview: string } | null;
};

interface SitemapProductsData {
	search: { totalItems: number; items: SitemapProductItem[] };
}

const SITEMAP_PRODUCTS_QUERY = `
	query SitemapProducts($input: SearchInput!) {
		search(input: $input) {
			totalItems
			items {
				slug
				productName
				productVariantName
				customProductVariantMappings { slug }
				productAsset { preview }
			}
		}
	}
`;

export async function loadProductsSitemapPage(env: VendureEnv, request: Request, locale: "en" | "ar"): Promise<Response> {
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);
	const skip = (page - 1) * PRODUCTS_PER_SITEMAP_PAGE;

	// Degrades to an empty (still valid) sitemap on a backend failure, matching
	// the original single-file sitemap's Promise.allSettled resilience — a
	// transient backend blip should never turn into a 500 shown to Googlebot.
	// groupByProduct: false -- a product's individual variants (flavors, sizes)
	// can each have their own dedicated page via customFields.slug, so this needs
	// every variant row, not one collapsed row per product. Deduped by the
	// *resolved* slug below (falling back to the base product slug for variants
	// without one of their own), not by product, so distinct variant pages each
	// still get exactly one entry. (Separately confirmed live that grouped and
	// ungrouped search both cap out at the same ~104 of the real ~198-product
	// catalog either way -- the search index itself is missing about half the
	// catalog, which is a backend reindex issue, not something this query can fix.)
	const items = await fetchInPages<SitemapProductItem>(
		async (pageSkip, take) => {
			const result = await graphqlRequest<SitemapProductsData>(
				env,
				SITEMAP_PRODUCTS_QUERY,
				{ input: { take, skip: pageSkip, groupByProduct: false } },
				{ request },
			);
			return { items: result.data.search.items, totalItems: result.data.search.totalItems };
		},
		skip,
		PRODUCTS_PER_SITEMAP_PAGE,
	).catch(() => []);

	// Each distinct variant slug gets its own <url> entry (its own indexable page,
	// own title) -- only variants that share the plain base product slug (no
	// customFields.slug of their own) collapse down to that one shared entry.
	const seenSlugs = new Set<string>();
	const entries = items
		.map((p) => ({ resolvedSlug: p.customProductVariantMappings?.slug || p.slug, title: p.productVariantName || p.productName, image: p.productAsset?.preview }))
		.filter((p) => (seenSlugs.has(p.resolvedSlug) ? false : (seenSlugs.add(p.resolvedSlug), true)))
		.map((p) =>
			urlEntryLocale(SITE_URL, `/products/${p.resolvedSlug}`, locale, undefined, p.image ? [{ src: vendureImageUrl(p.image, vendureBase, { preset: "xlarge", format: "jpg" }), title: p.title }] : []),
		);

	return xmlResponse(urlset(entries));
}
