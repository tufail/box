import type { Route } from "./+types/blog.$slug.md";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_BLOG_POST_BY_SLUG, type BlogPostBySlugData } from "~/graphql/blog";
import { SITE_URL } from "~/lib/seo";
import { htmlToText, markdownResponse } from "~/lib/markdownPage";

// Plain-markdown mirror of /blog/:slug — see markdownPage.ts for the
// noindex/canonical/robots.txt safeguards that keep this from affecting the
// real article's search ranking.
export async function loader({ params, request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug as string;

	const result = await graphqlRequest<BlogPostBySlugData>(env, GET_BLOG_POST_BY_SLUG, { slug, languageCode: "en" }, { request, cf: { cacheTtl: 300, cacheEverything: true } });
	const post = result.data.blogPostBySlug;
	const canonicalUrl = `${SITE_URL}/blog/${slug}`;

	if (!post) {
		return new Response("Not Found", { status: 404 });
	}

	const meta = [post.authorName ? `By ${post.authorName}` : null, post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : null, post.category ? post.category.name : null]
		.filter(Boolean)
		.join(" · ");

	const body = `# ${post.title}\n\nSource: ${canonicalUrl}\n${meta ? `\n${meta}\n` : ""}\n${htmlToText(post.content)}\n`;

	return markdownResponse(body, canonicalUrl);
}
