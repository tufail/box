import type { Route } from "./+types/sitemap-brands-ar.xml";
import { loadBrandsSitemapPage } from "~/lib/sitemapBrands";

export async function loader({ context, request }: Route.LoaderArgs) {
	return loadBrandsSitemapPage(context.cloudflare.env, request, "ar");
}
