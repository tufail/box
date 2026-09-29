import type { Route } from "./+types/sitemap-collections-en.xml";
import { loadCollectionsSitemapPage } from "~/lib/sitemapCollections";

export async function loader({ context, request }: Route.LoaderArgs) {
	return loadCollectionsSitemapPage(context.cloudflare.env, request, "en");
}
