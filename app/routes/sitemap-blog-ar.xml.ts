import type { Route } from "./+types/sitemap-blog-ar.xml";
import { loadBlogSitemapPage } from "~/lib/sitemapBlog";

export async function loader({ context, request }: Route.LoaderArgs) {
	return loadBlogSitemapPage(context.cloudflare.env, request, "ar");
}
