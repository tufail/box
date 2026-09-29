// Shared logic behind sitemap-collections-en.xml and sitemap-collections-ar.xml
// -- split into one file per locale (rather than one file emitting both EN and
// AR <url> tags per collection), matching the same reasoning as sitemapProducts.ts.
import { graphqlRequest, fetchInPages, urlEntryLocale, urlset, xmlResponse, type VendureEnv } from "~/lib/sitemap";
import { SITE_URL } from "~/lib/seo";
import { buildCollectionPath } from "~/graphql/collection";
import { vendureImageUrl } from "~/components/VendureImage";

interface SitemapCollection {
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
				slug
				breadcrumbs { name slug }
				updatedAt
				featuredAsset { preview }
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

	const entries = collections.map((c) =>
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
