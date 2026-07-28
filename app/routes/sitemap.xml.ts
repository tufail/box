import type { Route } from "./+types/sitemap.xml";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_PAGE_SECTIONS, type PageSectionsData } from "~/graphql/pages";
import { buildCollectionPath } from "~/graphql/collection";
import { SITE_URL } from "~/lib/seo";

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

const STATIC_PATHS = ["", "/about", "/collections", "/brands", "/wishlist"];

function urlEntry(loc: string): string {
	return `<url><loc>${loc}</loc></url>`;
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const [collectionsResult, productsResult, pagesResult] = await Promise.allSettled([
		// Vendure's shop-api caps list-query `take` at 100 (unlike `search`, used
		// below for products, which allows more).
		graphqlRequest<SitemapCollectionsData>(env, SITEMAP_COLLECTIONS_QUERY, { options: { take: 100 } }, { request }),
		graphqlRequest<SitemapProductsData>(env, SITEMAP_PRODUCTS_QUERY, { input: { take: 1000, groupByProduct: true } }, { request }),
		graphqlRequest<PageSectionsData>(env, GET_PAGE_SECTIONS, undefined, { request }),
	]);

	const collections = collectionsResult.status === "fulfilled" ? collectionsResult.value.data.collections.items : [];
	const products = productsResult.status === "fulfilled" ? productsResult.value.data.search.items : [];
	const pageSections = pagesResult.status === "fulfilled" ? pagesResult.value.data.getPageSections.items : [];

	const urls = [
		...STATIC_PATHS.map((p) => `${SITE_URL}${p}`),
		...collections.map((c) => `${SITE_URL}${buildCollectionPath(c.breadcrumbs)}`),
		...products.map((p) => `${SITE_URL}/products/${p.slug}`),
		...pageSections.flatMap((s) => s.pages.map((p) => `${SITE_URL}/pages/${p.slug}`)),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(urlEntry).join("\n")}\n</urlset>`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
