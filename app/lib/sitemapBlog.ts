// Shared logic behind sitemap-blog-en.xml and sitemap-blog-ar.xml -- split into
// one file per locale (rather than one file emitting both EN and AR <url> tags
// per post), matching the same reasoning as sitemapProducts.ts. Blog posts used
// to live bundled inside sitemap-pages.xml alongside static paths/CMS pages;
// pulled out on its own so it can be locale-split like products, collections,
// and brands are.
import { graphqlRequest, urlEntryLocale, urlset, xmlResponse, type VendureEnv } from "~/lib/sitemap";
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

export async function loadBlogSitemapPage(env: VendureEnv, request: Request, locale: "en" | "ar"): Promise<Response> {
	// Degrades to an empty (still valid) sitemap on a backend failure, matching
	// the original single-file sitemap's Promise.allSettled resilience — a
	// transient backend blip should never turn into a 500 shown to Googlebot.
	const result = await graphqlRequest<SitemapBlogPostsData>(env, SITEMAP_BLOG_POSTS_QUERY, { options: { limit: 1000 } }, { request }).catch(() => null);
	const blogPosts = result?.data.blogPosts.items ?? [];

	const entries = blogPosts.map((p) => urlEntryLocale(SITE_URL, `/blog/${p.slug}`, locale, p.publishedAt));

	return xmlResponse(urlset(entries));
}
