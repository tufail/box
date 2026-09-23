import type { Route } from "./+types/llms-full.txt";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_BRAND_FACET_QUERY, GET_BRAND_PAGE_CONTENT_QUERY, type BrandFacetData, type BrandPageContentData } from "~/graphql/brand";
import { GET_CMS_PAGE_BY_SLUG, type CmsPageData } from "~/graphql/pages";
import { GET_COLLECTIONS, type CollectionsResult } from "~/graphql/collection";
import { SITE_NAME, SITE_URL } from "~/lib/seo";

// llms-full.txt — the "everything in one fetch" companion to /llms.txt, per the
// llms.txt convention (llms.txt stays a short curated index; llms-full.txt
// expands it with the actual page content an AI assistant would otherwise have
// to crawl multiple URLs to piece together).
//
// Brand deep-content (the editorial description + FAQ some brand pages carry)
// is NOT fetched for every brand here — there's no bulk query for it, only a
// per-brand one (GET_BRAND_PAGE_CONTENT_QUERY), and fanning that out across
// all ~65 brands on every request would be a real reliability risk on a
// Cloudflare Worker (subrequest limits, backend load, request latency) for
// content most brands don't even have yet. CONTENT_BRAND_SLUGS is a small,
// hand-maintained list of brands known to have that content; add a slug here
// once it's authored in the CMS. If/when most brands end up with content, this
// should become a proper bulk backend query instead of growing this list.
const CONTENT_BRAND_SLUGS = ["optimum-nutrition", "applied-nutrition", "muscletech"];

function htmlToText(html: string): string {
	return html
		.replace(/<h[1-6][^>]*>/gi, "\n\n### ")
		.replace(/<\/h[1-6]>/gi, "\n")
		.replace(/<li[^>]*>/gi, "\n- ")
		.replace(/<\/li>/gi, "")
		.replace(/<\/(td|th)>/gi, " | ")
		.replace(/<\/tr>/gi, "\n")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div)>/gi, "\n\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&#0?39;/gi, "'")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

interface FlatCollection {
	id: string;
	name: string;
	slug: string;
	description: string;
	parentId: string;
}

// Vendure's collections() query, despite each item independently carrying its
// own (depth-limited, redundant) nested `children`, returns `items` as a FLAT
// list of every collection in the channel — confirmed live (totalItems ===
// items.length). Root-level collections don't have a null parentId either;
// they point at a hidden internal root collection that isn't itself in the
// fetched list. So "is this a root" is determined here as "its parentId isn't
// the id of anything else we fetched" — building the tree from parentId
// pointers (rather than trusting the query's own nested children) also means
// no depth limit, unlike the 3-levels-deep shape GET_COLLECTIONS's own
// selection set has.
function renderCollectionTree(items: FlatCollection[]): string {
	const idSet = new Set(items.map((i) => i.id));
	const byParent = new Map<string, FlatCollection[]>();
	for (const item of items) {
		const siblings = byParent.get(item.parentId) ?? [];
		siblings.push(item);
		byParent.set(item.parentId, siblings);
	}
	const roots = items.filter((i) => !idSet.has(i.parentId));

	function render(item: FlatCollection, path: string, depth: number): string {
		const indent = "  ".repeat(depth);
		const heading = `${indent}- [${item.name}](${SITE_URL}${path})`;
		const desc = item.description?.trim() ? `\n${indent}  ${htmlToText(item.description).replace(/\n/g, " ")}` : "";
		const children = (byParent.get(item.id) ?? []).map((child) => render(child, `${path}/${child.slug}`, depth + 1)).join("\n");
		return [heading + desc, children].filter(Boolean).join("\n");
	}

	return roots.map((r) => render(r, `/c/${r.slug}`, 0)).join("\n");
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;

	const [aboutResult, shippingResult, returnsResult, collectionsResult, brandsResult, ...brandContentResults] = await Promise.allSettled([
		graphqlRequest<CmsPageData>(env, GET_CMS_PAGE_BY_SLUG, { slug: "about", languageCode: "en" }, { request, cf: { cacheTtl: 600, cacheEverything: true } }),
		graphqlRequest<CmsPageData>(env, GET_CMS_PAGE_BY_SLUG, { slug: "shipping-policy", languageCode: "en" }, { request, cf: { cacheTtl: 600, cacheEverything: true } }),
		graphqlRequest<CmsPageData>(env, GET_CMS_PAGE_BY_SLUG, { slug: "refund-and-return-policy", languageCode: "en" }, { request, cf: { cacheTtl: 600, cacheEverything: true } }),
		graphqlRequest<CollectionsResult>(env, GET_COLLECTIONS, { options: { take: 100 } }, { request, cf: { cacheTtl: 600, cacheEverything: true } }),
		graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, { request, cf: { cacheTtl: 300, cacheEverything: true } }),
		...CONTENT_BRAND_SLUGS.map((slug) =>
			graphqlRequest<BrandPageContentData>(env, GET_BRAND_PAGE_CONTENT_QUERY, { facetValueCode: slug, languageCode: "en" }, { request, cf: { cacheTtl: 600, cacheEverything: true } }),
		),
	]);

	const about = aboutResult.status === "fulfilled" ? aboutResult.value.data.getCmsPageBySlug : null;
	const shipping = shippingResult.status === "fulfilled" ? shippingResult.value.data.getCmsPageBySlug : null;
	const returns = returnsResult.status === "fulfilled" ? returnsResult.value.data.getCmsPageBySlug : null;

	const allCollections = collectionsResult.status === "fulfilled" ? collectionsResult.value.data.collections.items : [];
	const categoryText = renderCollectionTree(allCollections);

	const brands = brandsResult.status === "fulfilled" ? (brandsResult.value.data.facets.items[0]?.values ?? []) : [];
	const brandLinks = [...brands]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((b) => `- [${b.name}](${SITE_URL}/brands/${b.code})`)
		.join("\n");

	const brandSummaries = brandContentResults
		.map((result, i) => {
			const content = result.status === "fulfilled" ? result.value.data.brandPageContent : null;
			if (!content) return null;
			const slug = CONTENT_BRAND_SLUGS[i];
			const faqText = content.faq.slice(0, 5).map((f) => `- Q: ${f.question}\n  A: ${f.answer}`).join("\n");
			return `### ${content.title.split("|")[0].trim()}\n\n${content.metaDescription ?? ""}\n\nMore: ${SITE_URL}/brands/${slug}${faqText ? `\n\n${faqText}` : ""}`;
		})
		.filter((s): s is string => s !== null)
		.join("\n\n");

	// "--------" section separators + a "Source:" line under each heading, so a
	// model reading this in one fetch can still tell sections apart and cite the
	// live page each one came from — this file is a small number of hand-composed
	// reference sections (About/Categories/Brands/Policies), not a page-by-page
	// dump of the whole site, so there's no per-page nav/header/footer chrome to
	// strip here in the first place (that's a real problem for sites that build
	// llms-full.txt by concatenating rendered HTML page-by-page; this one is
	// assembled straight from CMS/catalogue data, so it was never in the file).
	const sections = [
		{ heading: `About ${SITE_NAME}`, source: `${SITE_URL}/about`, body: about?.description ? htmlToText(about.description) : `See ${SITE_URL}/about.` },
		{
			heading: "Categories",
			source: `${SITE_URL}/collections`,
			body: `Each category below links to its live product listing and includes NutriBox's own description of what it covers.\n\n${categoryText || `See ${SITE_URL}/collections.`}`,
		},
		{
			heading: "Brands carried",
			source: `${SITE_URL}/brands`,
			body: `${brandLinks || `See ${SITE_URL}/brands.`}\n${brandSummaries ? `\n### Brand summaries\n\nEditorial summaries are available for the following brands (more are added over time as content is authored):\n\n${brandSummaries}` : ""}`,
		},
		{ heading: "Shipping policy (full text)", source: `${SITE_URL}/pages/shipping-policy`, body: shipping?.description ? htmlToText(shipping.description) : `See ${SITE_URL}/pages/shipping-policy.` },
		{ heading: "Return policy (full text)", source: `${SITE_URL}/pages/refund-and-return-policy`, body: returns?.description ? htmlToText(returns.description) : `See ${SITE_URL}/pages/refund-and-return-policy.` },
	];

	const sectionText = sections.map((s) => `## ${s.heading}\n\nSource: ${s.source}\n\n${s.body}`).join("\n\n--------------------------------------------------------------------------------\n\n");

	const body = `# ${SITE_NAME} — Full Reference

> Companion to ${SITE_URL}/llms.txt with the complete "About Us" text, full shipping and return policy text, category descriptions, and available brand summaries, for AI assistants that want richer context in a single fetch. Start with /llms.txt for a short index; this file has the detail behind it.

--------------------------------------------------------------------------------

${sectionText}

--------------------------------------------------------------------------------

## Notes for AI assistants

- This file is generated from the same live data as the site itself (categories, brands, and CMS policy pages), so it should not drift out of sync with what a shopper actually sees.
- For store address, contact, hours, delivery pricing by zone, and a concise site index, see ${SITE_URL}/llms.txt.
- Full catalogue (every collection, product, and brand URL): ${SITE_URL}/sitemap.xml
`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
