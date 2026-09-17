import type { Route } from "./+types/sitemap-products.xml";
import { graphqlRequest, fetchInPages, urlEntry, urlset, xmlResponse } from "~/lib/sitemap";
import { SITE_URL } from "~/lib/seo";
import { vendureImageUrl } from "~/components/VendureImage";

// Registered at "sitemap-products.xml" (a static path, paginated via a
// ?page= query param) — see app/routes.ts. A dynamic path segment was tried
// first ("sitemap-products-:page.xml") and reverted: confirmed live that
// React Router's router doesn't match a param embedded inside a segment with
// a literal prefix/suffix ("No route matches URL /sitemap-products-1.xml"),
// only a param occupying a whole segment on its own. Query-param pagination
// sidesteps that entirely. Page numbers are 1-based to match how they're
// listed from sitemap.xml (the index).
export const PRODUCTS_PER_SITEMAP_PAGE = 2000;

type SitemapProductItem = { slug: string; productAsset: { preview: string } | null };

interface SitemapProductsData {
	search: { totalItems: number; items: SitemapProductItem[] };
}

const SITEMAP_PRODUCTS_QUERY = `
	query SitemapProducts($input: SearchInput!) {
		search(input: $input) {
			totalItems
			items { slug productAsset { preview } }
		}
	}
`;

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);
	const skip = (page - 1) * PRODUCTS_PER_SITEMAP_PAGE;

	const items = await fetchInPages<SitemapProductItem>(
		async (pageSkip, take) => {
			const result = await graphqlRequest<SitemapProductsData>(
				env,
				SITEMAP_PRODUCTS_QUERY,
				{ input: { take, skip: pageSkip, groupByProduct: true } },
				{ request },
			);
			return { items: result.data.search.items, totalItems: result.data.search.totalItems };
		},
		skip,
		PRODUCTS_PER_SITEMAP_PAGE,
	);

	const entries = items.map((p) =>
		urlEntry(SITE_URL, `/products/${p.slug}`, undefined, p.productAsset?.preview ? [vendureImageUrl(p.productAsset.preview, vendureBase, { preset: "xlarge", format: "jpg" })] : []),
	);

	return xmlResponse(urlset(entries));
}
