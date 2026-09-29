import type { Route } from "./+types/sitemap-products-en.xml";
import { loadProductsSitemapPage } from "~/lib/sitemapProducts";

export async function loader({ context, request }: Route.LoaderArgs) {
	return loadProductsSitemapPage(context.cloudflare.env, request, "en");
}
