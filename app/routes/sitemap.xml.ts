import type { Route } from "./+types/sitemap.xml";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_PAGE_SECTIONS, type PageSectionsData } from "~/graphql/pages";
import { buildCollectionPath } from "~/graphql/collection";
import { GET_BRAND_FACET_QUERY, type BrandFacetData } from "~/graphql/brand";
import { SITE_URL } from "~/lib/seo";
import { localizePath } from "~/lib/i18n";

interface SitemapCollection {
	slug: string;
	breadcrumbs: { name: string; slug: string }[];
}

interface SitemapCollectionsData {
	collections: { items: SitemapCollection[] };
}

const SITEMAP_COLLECTIONS_QUERY = `
	query SitemapCollections($options: CollectionListOptions) {
		collections(options: $options) {
			items {
				slug
				breadcrumbs { name slug }
			}
		}
	}
`;

interface SitemapProductsData {
	search: { items: { slug: string }[] };
}

const SITEMAP_PRODUCTS_QUERY = `
	query SitemapProducts($input: SearchInput!) {
		search(input: $input) {
			items { slug }
		}
	}
`;

// Locale-free canonical paths only — /wishlist is intentionally excluded (it's
// noindex; Google's own guidance is not to list noindex pages in a sitemap).
const STATIC_PATHS = ["/", "/about", "/collections", "/brands"];

// One <url> entry per locale-free path, each carrying hreflang alternates to its
// English/Arabic counterparts (and x-default -> English) — this is what actually
// tells Google the two URLs are translations of the same page, not duplicate
// content or unrelated pages that happen to look similar.
function urlEntry(path: string): string {
	const enHref = `${SITE_URL}${localizePath(path, "en")}`;
	const arHref = `${SITE_URL}${localizePath(path, "ar")}`;
	const alternates = `<xhtml:link rel="alternate" hreflang="en" href="${enHref}"/><xhtml:link rel="alternate" hreflang="ar" href="${arHref}"/><xhtml:link rel="alternate" hreflang="x-default" href="${enHref}"/>`;
	return `<url><loc>${enHref}</loc>${alternates}</url>\n<url><loc>${arHref}</loc>${alternates}</url>`;
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const [collectionsResult, productsResult, pagesResult, brandsResult] = await Promise.allSettled([
		// Vendure's shop-api caps list-query `take` at 100 (unlike `search`, used
		// below for products, which allows more).
		graphqlRequest<SitemapCollectionsData>(env, SITEMAP_COLLECTIONS_QUERY, { options: { take: 100 } }, { request }),
		graphqlRequest<SitemapProductsData>(env, SITEMAP_PRODUCTS_QUERY, { input: { take: 1000, groupByProduct: true } }, { request }),
		graphqlRequest<PageSectionsData>(env, GET_PAGE_SECTIONS, undefined, { request }),
		graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, { request }),
	]);

	const collections = collectionsResult.status === "fulfilled" ? collectionsResult.value.data.collections.items : [];
	const products = productsResult.status === "fulfilled" ? productsResult.value.data.search.items : [];
	const pageSections = pagesResult.status === "fulfilled" ? pagesResult.value.data.getPageSections.items : [];
	const brands = brandsResult.status === "fulfilled" ? (brandsResult.value.data.facets.items[0]?.values ?? []) : [];

	const paths = [
		...STATIC_PATHS,
		...collections.map((c) => buildCollectionPath(c.breadcrumbs)),
		...products.map((p) => `/products/${p.slug}`),
		...pageSections.flatMap((s) => s.pages.map((p) => `/pages/${p.slug}`)),
		...brands.map((b) => `/brands/${b.code}`),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${paths.map(urlEntry).join("\n")}\n</urlset>`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
