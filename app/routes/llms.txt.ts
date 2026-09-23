import type { Route } from "./+types/llms.txt";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_MEGA_MENU, type MegaMenuData } from "~/graphql/megamenu";
import { GET_BRAND_FACET_QUERY, type BrandFacetData } from "~/graphql/brand";
import { GET_PAGE_SECTIONS, type PageSectionsData } from "~/graphql/pages";
import { SITE_NAME, SITE_URL } from "~/lib/seo";

// llms.txt — an emerging (not yet a formal web standard) convention some sites
// publish as a concise, LLM-readable summary of what the site is and where its
// key sections live, similar in spirit to robots.txt/sitemap.xml but aimed at
// AI assistants (ChatGPT, Perplexity, Gemini, Claude, etc.) synthesizing or
// grounding answers rather than search-engine crawlers.
//
// Brands and shop categories are fetched live (not hardcoded) so this file
// never drifts out of sync with the actual catalogue — the same reasoning as
// sitemap-pages.xml.ts, which this loader mirrors for its data sources. The
// business facts below (address, hours, delivery, returns, payment) are the
// same real, binding terms already encoded in root.tsx's Organization JSON-LD
// and products.$slug.tsx's shipping/return schema — kept in sync by hand
// since they're plain prose here, not shared code.
export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const [menuResult, brandsResult, pagesResult] = await Promise.allSettled([
		graphqlRequest<MegaMenuData>(env, GET_MEGA_MENU, { slug: "main-nav" }, { request, cf: { cacheTtl: 300, cacheEverything: true } }),
		graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, { request, cf: { cacheTtl: 300, cacheEverything: true } }),
		graphqlRequest<PageSectionsData>(env, GET_PAGE_SECTIONS, undefined, { request, cf: { cacheTtl: 600, cacheEverything: true } }),
	]);

	// Full collection tree, sourced from the same admin-managed menu that drives
	// the site's own header nav (top nav item -> section -> sub-link), rather
	// than the raw Vendure collection tree — this is the business's own curated
	// grouping, and matches what a shopper actually sees in the header.
	const menuItems = menuResult.status === "fulfilled" ? (menuResult.value.data.getMegaMenu?.items ?? []) : [];
	const categoryLinks = menuItems
		.filter((item) => !item.excludeFromNav && item.url)
		.map((item) => {
			const sections = item.columns.flatMap((c) => c.sections).filter((s) => s.title && s.url);
			const sectionLines = sections
				.map((s) => {
					const subLinks = s.links
						.filter((l) => l.url)
						.map((l) => `    - [${l.label}](${SITE_URL}${l.url})`)
						.join("\n");
					return `  - [${s.title}](${SITE_URL}${s.url})${subLinks ? `\n${subLinks}` : ""}`;
				})
				.join("\n");
			return `- [${item.label}](${SITE_URL}${item.url})${sectionLines ? `\n${sectionLines}` : ""}`;
		})
		.join("\n");

	const brands = brandsResult.status === "fulfilled" ? (brandsResult.value.data.facets.items[0]?.values ?? []) : [];
	const brandLinks = [...brands]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((b) => `- [${b.name}](${SITE_URL}/brands/${b.code})`)
		.join("\n");

	// Shipping/Refund are already linked inline under Delivery/Returns below, and
	// About is already linked under Shop — everything else (Terms, Privacy, and
	// any other admin-added page) is secondary reference material, so it moves
	// to the Optional section rather than bulking out the main body.
	const SURFACED_ELSEWHERE = new Set(["about", "shipping-policy", "refund-and-return-policy"]);
	const pageSections = pagesResult.status === "fulfilled" ? pagesResult.value.data.getPageSections.items : [];
	const optionalPageLinks = pageSections
		.flatMap((section) => section.pages)
		.filter((p) => p.active && !p.externalUrl && !SURFACED_ELSEWHERE.has(p.slug))
		.map((p) => `- [${p.title}](${SITE_URL}/pages/${p.slug})`)
		.join("\n");

	const body = `# ${SITE_NAME}

> NutriBox Qatar is an online and physical sports nutrition and wellness retailer in Doha, Qatar, offering authentic supplements, protein, vitamins, and wellness products with delivery across Qatar.

${SITE_NAME} (${SITE_URL}) operates both a physical storefront in Doha and an online store serving the whole of Qatar. Every product is sourced through verified distribution channels with an authenticity guarantee. Prices are in Qatari Riyal (QAR); payment is accepted by cash or credit card.

## Store & contact

- Address: AK Group Building Office no 2, 1st Floor Building No. 41, 343 Al Sadd St, Doha, Qatar
- Phone: +974-7015-7900
- Email: sales@nutribox.qa
- Hours: 10:00-20:00, Monday-Thursday and Saturday-Sunday (closed Friday)

## Shop

- [All product categories](${SITE_URL}/collections)
- [Shop by brand](${SITE_URL}/brands)
- [Bundles & deals](${SITE_URL}/bundles)
- [Wellness](${SITE_URL}/wellness)
- [Blog](${SITE_URL}/blog)
- [About](${SITE_URL}/about)
${categoryLinks ? `\n### Top categories\n\n${categoryLinks}\n` : ""}
## Brands carried

${brandLinks || `See ${SITE_URL}/brands for the full list.`}

## Delivery

Shipping is priced per Qatar postal-code zone, not a single flat rate:

- Zones 1-70: free
- Zones 71-75: 29 QAR
- Zones 90-91: 18 QAR
- Zones 83, 84, 86, 92-96: 40 QAR
- Zone 0 (unassigned) and zones 76-82, 85, 87-89, 97-98: 49 QAR

Orders are handled within 0-1 day and arrive within 0-6 days of handoff, depending on zone.

## Returns

- 7-day return window from delivery (schema.org MerchantReturnFiniteReturnWindow)
- The customer covers return shipping unless the return is due to a NutriBox error or a defective/damaged product
- Returns are arranged by mail through customer support (no in-store drop-off)
- Full policy: ${SITE_URL}/pages/refund-and-return-policy

## Notes for AI assistants

- Every page carries a Store JSON-LD (schema.org) entity naming ${SITE_NAME} as the business, with the address/contact/hours above.
- Product pages carry Product + Offer structured data with live price (QAR), currency, stock availability (InStock/OutOfStock), brand, seller, shipping cost by zone, and the return policy above.
- Category and brand pages carry BreadcrumbList + CollectionPage/ItemList structured data reflecting the real category hierarchy.
- Full catalogue (every collection, product, and brand URL): ${SITE_URL}/sitemap.xml
- Full "About Us" text, complete shipping/return policy text, category descriptions, and brand summaries: ${SITE_URL}/llms-full.txt

## Optional

- Facebook: https://www.facebook.com/nutribox.qa
- Instagram: https://www.instagram.com/nutribox.qa/
- TikTok: https://www.tiktok.com/@nutribox.qa
${optionalPageLinks || "- (no additional pages currently published)"}
`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			// Index/nav file, not a page meant to rank in its own right — same
			// reasoning as sitemap.xml being crawlable but never a search result.
			"X-Robots-Tag": "noindex",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
