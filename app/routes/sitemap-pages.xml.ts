import type { Route } from "./+types/sitemap-pages.xml";
import { graphqlRequest, urlEntry, urlset, xmlResponse } from "~/lib/sitemap";
import { GET_PAGE_SECTIONS, type PageSectionsData } from "~/graphql/pages";
import { SITE_URL } from "~/lib/seo";

// /about is deliberately absent: it 301s to the CMS About page (/pages/about, listed below).
// Locale-free canonical paths only — /wishlist is intentionally excluded (it's
// noindex; Google's own guidance is not to list noindex pages in a sitemap).
const STATIC_PATHS = ["/", "/contact-us", "/collections", "/brands", "/blog", "/bundles", "/wellness"];

// CMS pages (fetched below via getPageSections) are admin-authored and can end
// up with a slug that collides with one of the app's own dedicated routes —
// e.g. a leftover "blog" CMS page from before /blog existed as a real route,
// which would otherwise sitemap as the wrong URL (/pages/blog instead of the
// actual /blog). Skip any CMS page whose slug shadows a real route.
const RESERVED_PAGE_SLUGS = new Set(["blog"]);

// Everything here (static paths, CMS pages) is small and not expected to
// individually grow past a sitemap's URL cap any time soon — bundled into one
// file rather than one-route-per-type, unlike products (paginated separately
// per locale in sitemap-products-en/-ar.xml.ts), collections, brands, and blog
// posts (all locale-split the same way as products).
export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const pagesResult = await graphqlRequest<PageSectionsData>(env, GET_PAGE_SECTIONS, undefined, { request }).catch(() => null);
	const pageSections = pagesResult?.data.getPageSections.items ?? [];

	const entries = [
		...STATIC_PATHS.map((path) => urlEntry(SITE_URL, path)),
		...pageSections
			.flatMap((s) => s.pages)
			// Only real, indexable /pages/<slug> URLs: skip inactive pages, external-link entries
			// (e.g. the Blog menu item), and pages the CMS flags noindex (legal pages) -- listing
			// noindex pages in a sitemap sends Google contradictory signals.
			.filter((p) => p.active && !p.externalUrl && !p.noIndex && !RESERVED_PAGE_SLUGS.has(p.slug))
			.map((p) => urlEntry(SITE_URL, `/pages/${p.slug}`)),
	];

	return xmlResponse(urlset(entries));
}
