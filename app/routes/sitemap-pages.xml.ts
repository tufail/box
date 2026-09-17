import type { Route } from "./+types/sitemap-pages.xml";
import { graphqlRequest, urlEntry, urlset, xmlResponse } from "~/lib/sitemap";
import { GET_PAGE_SECTIONS, type PageSectionsData } from "~/graphql/pages";
import { GET_BRAND_FACET_QUERY, type BrandFacetData } from "~/graphql/brand";
import { SITE_URL } from "~/lib/seo";

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

// Everything here (static paths, CMS pages, brands, blog posts) is small and
// not expected to individually grow past a sitemap's URL cap any time soon —
// bundled into one file rather than one-route-per-type, unlike products
// (paginated separately in sitemap-products.xml.ts) and collections.
export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const [pagesResult, brandsResult, blogPostsResult] = await Promise.allSettled([
		graphqlRequest<PageSectionsData>(env, GET_PAGE_SECTIONS, undefined, { request }),
		graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, { request }),
		graphqlRequest<SitemapBlogPostsData>(env, SITEMAP_BLOG_POSTS_QUERY, { options: { limit: 1000 } }, { request }),
	]);

	const pageSections = pagesResult.status === "fulfilled" ? pagesResult.value.data.getPageSections.items : [];
	const brands = brandsResult.status === "fulfilled" ? (brandsResult.value.data.facets.items[0]?.values ?? []) : [];
	const blogPosts = blogPostsResult.status === "fulfilled" ? blogPostsResult.value.data.blogPosts.items : [];

	const entries = [
		...STATIC_PATHS.map((path) => urlEntry(SITE_URL, path)),
		...pageSections
			.flatMap((s) => s.pages)
			.filter((p) => !RESERVED_PAGE_SLUGS.has(p.slug))
			.map((p) => urlEntry(SITE_URL, `/pages/${p.slug}`)),
		...brands.map((b) => urlEntry(SITE_URL, `/brands/${b.code}`)),
		...blogPosts.map((p) => urlEntry(SITE_URL, `/blog/${p.slug}`, p.publishedAt)),
	];

	return xmlResponse(urlset(entries));
}
