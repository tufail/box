import type { Route } from "./+types/sitemap.xml";
import { graphqlRequest, sitemapIndex, xmlResponse } from "~/lib/sitemap";
import { SITE_URL } from "~/lib/seo";
import { PRODUCTS_PER_SITEMAP_PAGE } from "./sitemap-products.xml";

// The root sitemap.xml is now a sitemap *index* (per the sitemaps.org protocol)
// rather than one file listing every entity directly — see app/lib/sitemap.ts
// for the full reasoning. It points at sitemap-pages.xml, sitemap-collections.xml,
// and however many ?page=N pages of sitemap-products.xml the current product
// count needs.
interface ProductCountData {
	search: { totalItems: number };
}

const PRODUCT_COUNT_QUERY = `
	query SitemapProductCount {
		search(input: { take: 0, groupByProduct: true }) {
			totalItems
		}
	}
`;

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const countResult = await graphqlRequest<ProductCountData>(env, PRODUCT_COUNT_QUERY, undefined, { request }).catch(() => null);
	const totalProducts = countResult?.data.search.totalItems ?? 0;
	const productSitemapCount = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_SITEMAP_PAGE));

	const sitemapPaths = [
		"/sitemap-pages.xml",
		"/sitemap-collections.xml",
		...Array.from({ length: productSitemapCount }, (_, i) => `/sitemap-products.xml?page=${i + 1}`),
	];

	return xmlResponse(sitemapIndex(SITE_URL, sitemapPaths));
}
