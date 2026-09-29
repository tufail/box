// Shared logic behind sitemap-brands-en.xml and sitemap-brands-ar.xml -- split
// into one file per locale (rather than one file emitting both EN and AR <url>
// tags per brand), matching the same reasoning as sitemapProducts.ts. Brands
// used to live bundled inside sitemap-pages.xml alongside static paths/CMS
// pages/blog posts; pulled out on its own so it can be locale-split like
// products and collections are.
import { graphqlRequest, urlEntryLocale, urlset, xmlResponse, type VendureEnv } from "~/lib/sitemap";
import { GET_BRAND_FACET_QUERY, type BrandFacetData } from "~/graphql/brand";
import { SITE_URL } from "~/lib/seo";

export async function loadBrandsSitemapPage(env: VendureEnv, request: Request, locale: "en" | "ar"): Promise<Response> {
	// Degrades to an empty (still valid) sitemap on a backend failure, matching
	// the original single-file sitemap's Promise.allSettled resilience — a
	// transient backend blip should never turn into a 500 shown to Googlebot.
	const result = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, { request }).catch(() => null);
	const brands = result?.data.facets.items[0]?.values ?? [];

	const entries = brands.map((b) => urlEntryLocale(SITE_URL, `/brands/${b.code}`, locale));

	return xmlResponse(urlset(entries));
}
