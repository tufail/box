import type { Route } from "./+types/sitemap-collections.xml";
import { graphqlRequest, fetchInPages, urlEntry, urlset, xmlResponse } from "~/lib/sitemap";
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

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	const collections = await fetchInPages<SitemapCollection>(
		async (skip, take) => {
			const result = await graphqlRequest<SitemapCollectionsData>(env, SITEMAP_COLLECTIONS_QUERY, { options: { take, skip } }, { request });
			return { items: result.data.collections.items, totalItems: result.data.collections.totalItems };
		},
		0,
		10000,
	);

	const entries = collections.map((c) =>
		urlEntry(
			SITE_URL,
			buildCollectionPath(c.breadcrumbs),
			c.updatedAt,
			c.featuredAsset?.preview ? [vendureImageUrl(c.featuredAsset.preview, vendureBase, { preset: "xlarge", format: "jpg" })] : [],
		),
	);

	return xmlResponse(urlset(entries));
}
