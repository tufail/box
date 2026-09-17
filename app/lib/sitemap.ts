// Shared helpers for the sitemap-*.xml routes. Split into a sitemap index
// (sitemap.xml) plus per-type sub-sitemaps rather than one file listing every
// entity, for two reasons: the sitemaps.org protocol caps a single file at
// 50,000 <url> entries (each of our paths already emits two, EN + AR, so that
// ceiling arrives twice as fast as the raw entity count suggests), and a
// single request that fetches the entire catalog in one shot is real, growing
// per-request cost — every additional product/collection/blog post makes that
// one file slower and more expensive to generate, forever, on every crawl.
// Splitting by type means each file's cost is bounded by that type's own
// count, and the products file (the one actually expected to grow without
// bound) is paginated on top of that.

import { graphqlRequest, type VendureEnv } from "workers/graphqlClient";
import { localizePath } from "~/lib/i18n";

export const SITEMAP_XML_HEADER = `<?xml version="1.0" encoding="UTF-8"?>\n`;

export function xmlResponse(body: string, maxAgeSeconds = 3600): Response {
	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": `public, max-age=${maxAgeSeconds}`,
		},
	});
}

// XML text content (not just attributes) requires "&" to be escaped -- a raw
// "&" in an image URL's query string (vendureImageUrl always appends at least
// "?preset=...", often "&format=...") reads to an XML parser as the start of
// an entity reference and breaks the whole document, not just that one entry.
function escapeXml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// One <url> entry per locale-free path, each carrying hreflang alternates to its
// English/Arabic counterparts (and x-default -> English) — this is what actually
// tells Google the two URLs are translations of the same page, not duplicate
// content or unrelated pages that happen to look similar. lastmod is omitted
// entirely when there's no real modification date for a path (Google treats an
// inaccurate/fabricated lastmod as a signal to trust the sitemap less, so this
// only ever reflects a genuine value from the backend).
export function urlEntry(siteUrl: string, path: string, lastmod?: string | null, images?: string[]): string {
	const enHref = escapeXml(`${siteUrl}${localizePath(path, "en")}`);
	const arHref = escapeXml(`${siteUrl}${localizePath(path, "ar")}`);
	const alternates = `<xhtml:link rel="alternate" hreflang="en" href="${enHref}"/><xhtml:link rel="alternate" hreflang="ar" href="${arHref}"/><xhtml:link rel="alternate" hreflang="x-default" href="${enHref}"/>`;
	const lastmodTag = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
	const imageTags = (images ?? []).map((src) => `<image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`).join("");
	return `<url><loc>${enHref}</loc>${lastmodTag}${alternates}${imageTags}</url>\n<url><loc>${arHref}</loc>${lastmodTag}${alternates}${imageTags}</url>`;
}

export function urlset(entries: string[]): string {
	return `${SITEMAP_XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.sitemaps.org/schemas/sitemap-image/1.1">\n${entries.join("\n")}\n</urlset>`;
}

export function sitemapIndex(siteUrl: string, sitemapPaths: string[]): string {
	const entries = sitemapPaths.map((path) => `<sitemap><loc>${siteUrl}${path}</loc></sitemap>`).join("\n");
	return `${SITEMAP_XML_HEADER}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
}

/**
 * The shop-api's query-complexity limit caps `take` at 100 on every list/search
 * query — asking for more in one shot doesn't return a partial page, it makes
 * the whole request error out (a past incident: `take: 1000` silently zeroed
 * out every product in the sitemap in production, since the thrown error just
 * made the caller's Promise.allSettled treat the whole fetch as failed).
 * Fetches `limit` items starting at `skip`, paging through in chunks of 100.
 */
export async function fetchInPages<TItem>(
	fetchPage: (skip: number, take: number) => Promise<{ items: TItem[]; totalItems: number }>,
	skip: number,
	limit: number,
): Promise<TItem[]> {
	const pageSize = 100;
	const items: TItem[] = [];
	let offset = skip;
	const end = skip + limit;
	while (offset < end) {
		const take = Math.min(pageSize, end - offset);
		const page = await fetchPage(offset, take);
		items.push(...page.items);
		offset += take;
		if (offset >= page.totalItems || page.items.length === 0) break;
	}
	return items;
}

export type { VendureEnv };
export { graphqlRequest };
