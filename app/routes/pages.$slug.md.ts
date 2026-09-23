import type { Route } from "./+types/pages.$slug.md";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CMS_PAGE_BY_SLUG, type CmsPageData } from "~/graphql/pages";
import { SITE_URL } from "~/lib/seo";
import { htmlToText, markdownResponse } from "~/lib/markdownPage";

// Plain-markdown mirror of /pages/:slug (see markdownPage.ts for why this is
// safe to publish alongside the HTML page without affecting search rankings:
// noindex + rel=canonical back to the real page, and robots.txt blocks
// regular search engines from even crawling *.md).
export async function loader({ params, request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug as string;

	const result = await graphqlRequest<CmsPageData>(env, GET_CMS_PAGE_BY_SLUG, { slug, languageCode: "en" }, { request, cf: { cacheTtl: 300, cacheEverything: true } });
	const page = result.data.getCmsPageBySlug;
	const canonicalUrl = `${SITE_URL}/pages/${slug}`;

	// A CMS page marked noindex (or one that doesn't exist) has no business
	// being served here either -- the .md variant follows the same indexing
	// intent as the page it mirrors.
	if (!page || page.noIndex) {
		return new Response("Not Found", { status: 404 });
	}

	const body = `# ${page.title}\n\nSource: ${canonicalUrl}\n\n${page.description ? htmlToText(page.description) : ""}\n`;

	return markdownResponse(body, canonicalUrl);
}
