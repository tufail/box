// Shared logic behind sitemap-collections-en.xml and sitemap-collections-ar.xml
// -- split into one file per locale (rather than one file emitting both EN and
// AR <url> tags per collection), matching the same reasoning as sitemapProducts.ts.
import { graphqlRequest, fetchInPages, filterInBatches, listingHasProducts, urlEntryLocale, urlset, xmlResponse, type VendureEnv } from "~/lib/sitemap";
import { SITE_URL } from "~/lib/seo";
import { buildCollectionPath } from "~/graphql/collection";
import { vendureImageUrl } from "~/components/VendureImage";

interface SitemapCollection {
	id: string;
	slug: string;
	breadcrumbs: { name: string; slug: string }[];
	updatedAt: string;
	featuredAsset: { preview: string } | null;
}

interface SitemapCollectionsData {
	collections: { totalItems: number; items: SitemapCollection[] };
}

const SITEMAP_COLLECTIONS_QUERY = `
	query SitemapCollections($options: CollectionListOptions) {
		collections(options: $options) {
			totalItems
			items {
				id
				slug
				breadcrumbs { name slug }
				updatedAt
				featuredAsset { preview }
			}
		}
	}
`;

// Collections that actually have products, from the same search index the collection
// page itself reads (groupByProduct: false, same as the page) -- so "listed here" and
// "indexable there" can't disagree. Empty collections render noindex, so they stay out
// of the sitemap.
interface SitemapCollectionCountsData {
	search: { collections: { count: number; collection: { id: string } }[] };
}

const SITEMAP_COLLECTION_COUNTS_QUERY = `
	query SitemapCollectionCounts($input: SearchInput!) {
		search(input: $input) {
			collections {
				count
				collection { id }
			}
		}
	}
`;

export async function loadCollectionsSitemapPage(env: VendureEnv, request: Request, locale: "en" | "ar"): Promise<Response> {
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	// Degrades to an empty (still valid) sitemap on a backend failure, matching
	// the original single-file sitemap's Promise.allSettled resilience — a
	// transient backend blip should never turn into a 500 shown to Googlebot.
	const collections = await fetchInPages<SitemapCollection>(
		async (skip, take) => {
			const result = await graphqlRequest<SitemapCollectionsData>(env, SITEMAP_COLLECTIONS_QUERY, { options: { take, skip } }, { request });
			return { items: result.data.collections.items, totalItems: result.data.collections.totalItems };
		},
		0,
		10000,
	).catch(() => []);

	// If the count lookup fails we can't tell which are empty, so keep everything rather than
	// emptying the sitemap on a transient backend blip.
	const counts = await graphqlRequest<SitemapCollectionCountsData>(env, SITEMAP_COLLECTION_COUNTS_QUERY, { input: { groupByProduct: false, take: 0 } }, { request }).catch(() => null);
	const nonEmptyIds = counts ? new Set(counts.data.search.collections.filter((c) => c.count > 0).map((c) => c.collection.id)) : null;

	let listed = collections.filter((c) => !nonEmptyIds || nonEmptyIds.has(c.id));
	// The Arabic page resolves its products by slug in Arabic, which can come back empty even
	// when the aggregate above says otherwise -- confirm each against what that page will show.
	if (locale === "ar") listed = await filterInBatches(listed, 8, (c) => listingHasProducts(env, request, "ar", { collectionSlug: c.slug }));

	const entries = listed.map((c) =>
		urlEntryLocale(
			SITE_URL,
			buildCollectionPath(c.breadcrumbs),
			locale,
			c.updatedAt,
			c.featuredAsset?.preview ? [vendureImageUrl(c.featuredAsset.preview, vendureBase, { preset: "xlarge", format: "jpg" })] : [],
		),
	);

	return xmlResponse(urlset(entries));
}
