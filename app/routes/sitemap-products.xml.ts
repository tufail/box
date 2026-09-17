import type { LoaderFunctionArgs } from "react-router";
import { graphqlRequest, fetchInPages, urlEntry, urlset, xmlResponse } from "~/lib/sitemap";
import { SITE_URL } from "~/lib/seo";
import { vendureImageUrl } from "~/components/VendureImage";

// Registered at "sitemap-products-:page.xml" — see app/routes.ts. Page numbers
// are 1-based to match how they're listed from sitemap.xml (the index).
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

// `params` typed via the generic LoaderFunctionArgs rather than this route's
// auto-generated Route.LoaderArgs -- React Router's typed-routes inference
// only reliably parses a param that occupies a whole path segment on its own;
// here ":page" is embedded inside "sitemap-products-:page.xml" (a literal
// prefix/suffix in the same segment), which it types as `{}`. The pattern
// still works correctly at runtime (this is standard path-to-regexp syntax),
// this is purely a typegen limitation for this one route registration.
export async function loader({ context, request, params }: LoaderFunctionArgs) {
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	const page = Math.max(1, Number(params.page) || 1);
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
