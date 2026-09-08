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
	updatedAt: string;
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
				updatedAt
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

interface SitemapBlogPost {
	slug: string;
	publishedAt: string | null;
}

interface SitemapBlogPostsData {
	blogPosts: { items: SitemapBlogPost[] };
}

const SITEMAP_BLOG_POSTS_QUERY = `
	query SitemapBlogPosts($options: ShopBlogPostListOptions) {
		blogPosts(options: $options) {
			items { slug publishedAt }
		}
	}
`;

// Locale-free canonical paths only — /wishlist is intentionally excluded (it's
// noindex; Google's own guidance is not to list noindex pages in a sitemap).
const STATIC_PATHS = ["/", "/about", "/collections", "/brands", "/blog"];

// CMS pages (fetched below via getPageSections) are admin-authored and can end
// up with a slug that collides with one of the app's own dedicated routes —
// e.g. a leftover "blog" CMS page from before /blog existed as a real route,
// which would otherwise sitemap as the wrong URL (/pages/blog instead of the
// actual /blog). Skip any CMS page whose slug shadows a real route.
const RESERVED_PAGE_SLUGS = new Set(["blog"]);

// One <url> entry per locale-free path, each carrying hreflang alternates to its
// English/Arabic counterparts (and x-default -> English) — this is what actually
// tells Google the two URLs are translations of the same page, not duplicate
// content or unrelated pages that happen to look similar. lastmod is omitted
// entirely when there's no real modification date for a path (Google treats an
// inaccurate/fabricated lastmod as a signal to trust the sitemap less, so this
// only ever reflects a genuine value from the backend).
function urlEntry(path: string, lastmod?: string | null): string {
	const enHref = `${SITE_URL}${localizePath(path, "en")}`;
	const arHref = `${SITE_URL}${localizePath(path, "ar")}`;
	const alternates = `<xhtml:link rel="alternate" hreflang="en" href="${enHref}"/><xhtml:link rel="alternate" hreflang="ar" href="${arHref}"/><xhtml:link rel="alternate" hreflang="x-default" href="${enHref}"/>`;
	const lastmodTag = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
	return `<url><loc>${enHref}</loc>${lastmodTag}${alternates}</url>\n<url><loc>${arHref}</loc>${lastmodTag}${alternates}</url>`;
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const [collectionsResult, productsResult, pagesResult, brandsResult, blogPostsResult] = await Promise.allSettled([
		// Vendure's shop-api caps list-query `take` at 100 (unlike `search`, used
		// below for products, which allows more).
		graphqlRequest<SitemapCollectionsData>(env, SITEMAP_COLLECTIONS_QUERY, { options: { take: 100 } }, { request }),
		graphqlRequest<SitemapProductsData>(env, SITEMAP_PRODUCTS_QUERY, { input: { take: 1000, groupByProduct: true } }, { request }),
		graphqlRequest<PageSectionsData>(env, GET_PAGE_SECTIONS, undefined, { request }),
		graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, { request }),
		graphqlRequest<SitemapBlogPostsData>(env, SITEMAP_BLOG_POSTS_QUERY, { options: { limit: 1000 } }, { request }),
	]);

	const collections = collectionsResult.status === "fulfilled" ? collectionsResult.value.data.collections.items : [];
	const products = productsResult.status === "fulfilled" ? productsResult.value.data.search.items : [];
	const pageSections = pagesResult.status === "fulfilled" ? pagesResult.value.data.getPageSections.items : [];
	const brands = brandsResult.status === "fulfilled" ? (brandsResult.value.data.facets.items[0]?.values ?? []) : [];
	const blogPosts = blogPostsResult.status === "fulfilled" ? blogPostsResult.value.data.blogPosts.items : [];

	const entries: { path: string; lastmod?: string | null }[] = [
		...STATIC_PATHS.map((path) => ({ path })),
		...collections.map((c) => ({ path: buildCollectionPath(c.breadcrumbs), lastmod: c.updatedAt })),
		...products.map((p) => ({ path: `/products/${p.slug}` })),
		...pageSections
			.flatMap((s) => s.pages)
			.filter((p) => !RESERVED_PAGE_SLUGS.has(p.slug))
			.map((p) => ({ path: `/pages/${p.slug}` })),
		...brands.map((b) => ({ path: `/brands/${b.code}` })),
		...blogPosts.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.publishedAt })),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.map((e) => urlEntry(e.path, e.lastmod)).join("\n")}\n</urlset>`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
