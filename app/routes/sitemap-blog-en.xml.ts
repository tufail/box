import type { Route } from "./+types/sitemap-blog-en.xml";
import { loadBlogSitemapPage } from "~/lib/sitemapBlog";

export async function loader({ context, request }: Route.LoaderArgs) {
	return loadBlogSitemapPage(context.cloudflare.env, request, "en");
}
