import type { Route } from "./+types/sitemap.xml";
import { graphqlRequest, sitemapIndex, xmlResponse } from "~/lib/sitemap";
import { SITE_URL } from "~/lib/seo";
import { PRODUCTS_PER_SITEMAP_PAGE } from "~/lib/sitemapProducts";

// The root sitemap.xml is now a sitemap *index* (per the sitemaps.org protocol)
// rather than one file listing every entity directly — see app/lib/sitemap.ts
// for the full reasoning. It points at sitemap-pages.xml, the locale-split
// sitemap-collections-en/-ar.xml, sitemap-brands-en/-ar.xml, and
// sitemap-blog-en/-ar.xml, and however many ?page=N pages each of
// sitemap-products-en.xml/-ar.xml the current product count needs -- split one
// file per locale (rather than one file emitting both languages' <url> tags)
// so each page's <url> count is just PRODUCTS_PER_SITEMAP_PAGE, not double that.
interface ProductCountData {
	search: { totalItems: number };
}

// groupByProduct: false to match sitemap-products-en/-ar's own query mode --
// those routes emit one entry per distinct *variant* slug (not per product),
// so the page count here has to be sized off the same ungrouped total or the
// last page(s) of variant entries would silently never get listed in the index.
const PRODUCT_COUNT_QUERY = `
	query SitemapProductCount {
		search(input: { take: 100, groupByProduct: false }) {
			totalItems
		}
	}
`;

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const countResult = await graphqlRequest<ProductCountData>(env, PRODUCT_COUNT_QUERY, undefined, { request }).catch(() => null);
	const totalProducts = countResult?.data.search.totalItems ?? 0;
	const productSitemapCount = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_SITEMAP_PAGE));
	const productPageNumbers = Array.from({ length: productSitemapCount }, (_, i) => i + 1);

	const sitemapPaths = [
		"/sitemap-pages.xml",
		"/sitemap-collections-en.xml",
		"/sitemap-collections-ar.xml",
		"/sitemap-brands-en.xml",
		"/sitemap-brands-ar.xml",
		"/sitemap-blog-en.xml",
		"/sitemap-blog-ar.xml",
		...productPageNumbers.map((n) => `/sitemap-products-en.xml?page=${n}`),
		...productPageNumbers.map((n) => `/sitemap-products-ar.xml?page=${n}`),
	];

	return xmlResponse(sitemapIndex(SITE_URL, sitemapPaths));
}
