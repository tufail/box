// Shared logic behind sitemap-brands-en.xml and sitemap-brands-ar.xml -- split
// into one file per locale (rather than one file emitting both EN and AR <url>
// tags per brand), matching the same reasoning as sitemapProducts.ts. Brands
// used to live bundled inside sitemap-pages.xml alongside static paths/CMS
// pages/blog posts; pulled out on its own so it can be locale-split like
// products and collections are.
import { graphqlRequest, urlEntryLocale, urlset, xmlResponse, type VendureEnv } from "~/lib/sitemap";
import {
	GET_BRAND_FACET_QUERY,
	BRAND_CATEGORIES_QUERY,
	MIN_INDEXABLE_BRAND_CATEGORY_PRODUCTS,
	brandCategoryPath,
	type BrandFacetData,
	type BrandCategoriesData,
} from "~/graphql/brand";
import { SITE_URL } from "~/lib/seo";

const CONCURRENCY = 8;

export async function loadBrandsSitemapPage(env: VendureEnv, request: Request, locale: "en" | "ar"): Promise<Response> {
	// Degrades to an empty (still valid) sitemap on a backend failure, matching
	// the original single-file sitemap's Promise.allSettled resilience — a
	// transient backend blip should never turn into a 500 shown to Googlebot.
	const result = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, { request }).catch(() => null);
	const brands = result?.data.facets.items[0]?.values ?? [];

	// One aggregate lookup per brand: tells us whether the brand has any products at
	// all (an empty brand page renders noindex, so it stays out of the sitemap) and
	// which categories have enough products to be worth a brand x category landing
	// page. A failed lookup yields null -- we can't tell, so the plain brand URL is
	// kept (a transient backend blip shouldn't empty the sitemap) and its categories dropped.
	const perBrand: (BrandCategoriesData | null)[] = [];
	for (let i = 0; i < brands.length; i += CONCURRENCY) {
		const batch = brands.slice(i, i + CONCURRENCY);
		const results = await Promise.all(
			batch.map((b) =>
				graphqlRequest<BrandCategoriesData>(
					env,
					BRAND_CATEGORIES_QUERY,
					{ input: { facetValueIds: [b.id], groupByProduct: true, take: 0 } },
					{ request },
				).catch(() => null),
			),
		);
		perBrand.push(...results.map((r) => r?.data ?? null));
	}

	const entries: ReturnType<typeof urlEntryLocale>[] = [];
	brands.forEach((b, i) => {
		const data = perBrand[i];
		if (data && data.search.totalItems === 0) return;
		entries.push(urlEntryLocale(SITE_URL, `/brands/${b.code}`, locale));
		// Brand x category landing pages (/brands/:slug/:category) -- only the
		// combinations with enough products to be worth indexing.
		for (const c of data?.search.collections ?? []) {
			if (c.collection.name === "__root_collection__" || c.count < MIN_INDEXABLE_BRAND_CATEGORY_PRODUCTS) continue;
			entries.push(urlEntryLocale(SITE_URL, brandCategoryPath(b.code, c.collection.slug), locale));
		}
	});
	return xmlResponse(urlset(entries));
}
