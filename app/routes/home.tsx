import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { graphqlRequest } from "workers/graphqlClient";
import { SEARCH_NEW_ARRIVALS, TOP_SELLERS_QUERY, mapTopSellerToSearchItem, GET_PRODUCT_VARIANT_ASSETS, type SearchProductsData, type SearchTopSellingVariables, type TopSellersData, type TopSellersVariables, type ProductVariantAssetsData, type ProductVariantAssetsVariables } from "~/graphql/product";
import { GET_BANNER_BY_SLUG, type BannerData, type BannerVariables } from "~/graphql/banner";
import { HOME_COLLECTIONS_QUERY, type HomeCollectionsResult } from "~/graphql/collection";
import { loadTopBrands } from "~/lib/topBrands";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, hreflangTags } from "~/lib/i18n";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "Qatar's Premium Protein & Supplements Store | NutriBox Qatar",
		description: "Premium protein, vitamins & sports nutrition delivered fast across Doha and all of Qatar. Buy whey protein, mass gainers & beauty products from NutriBox Qatar today.",
	},
	ar: {
		title: "متجر المكملات الغذائية والبروتين الفاخر في قطر | نوتري بوكس قطر",
		description: "بروتين ومكملات غذائية وتغذية رياضية بجودة عالية، مع توصيل سريع إلى الدوحة وجميع أنحاء قطر. أسعار تنافسية – تسوّق الآن من نوتري بوكس قطر.",
	},
} as const;

export function meta({ location }: Route.MetaArgs) {
	const locale = getLocaleFromPathname(location.pathname);
	const { title, description } = COPY[locale];
	const canonicalUrl = `${SITE_URL}${localizePath("/", locale)}`;
	return [{ title }, { name: "description", content: description }, { tagName: "link" as const, rel: "canonical", href: canonicalUrl }, ...hreflangTags(SITE_URL, "/"), { property: "og:type", content: "website" }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:url", content: canonicalUrl }, { property: "og:site_name", content: SITE_NAME }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: title }, { name: "twitter:description", content: description }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	const cacheOpts = { request, cf: { cacheTtl: 300, cacheEverything: true } } as const;

	// topSellers is a dedicated resolver with no inStock filter argument, so it's
	// over-fetched and filtered to inStock below instead. Stock is thin enough
	// in practice that only ~20 of the ~134 total ranked products are ever in
	// stock at once (the 12th in-stock one can rank as low as #118), so the
	// over-fetch window needs to cover effectively the whole ranked list, not
	// just the top few dozen. The search index's SearchInput does support
	// inStock directly (used below), so new arrivals doesn't need this treatment.
	const [topSellingResult, newArrivalsResult, bannerResult, collectionsResult, brandCountsResult] = await Promise.allSettled([
		graphqlRequest<TopSellersData, TopSellersVariables>(env, TOP_SELLERS_QUERY, { limit: 200 }, cacheOpts),
		graphqlRequest<SearchProductsData, SearchTopSellingVariables>(env, SEARCH_NEW_ARRIVALS, { input: { take: 10, groupByProduct: false, inStock: true } }, cacheOpts),
		graphqlRequest<BannerData, BannerVariables>(env, GET_BANNER_BY_SLUG, { slug: "home-carousel" }, cacheOpts),
		graphqlRequest<HomeCollectionsResult>(
			env,
			HOME_COLLECTIONS_QUERY,
			{
				options: {
					take: 50,
					filter: { showOnHomepage: { eq: true } },
					sort: { homepageOrder: "ASC" },
				},
			},
			cacheOpts,
		),
		// Feeds the 'Top Brands' links in the About block: brands ranked by how many items their own
		// page lists, so every link lands on a page with products (see loadTopBrands).
		loadTopBrands(env, cacheOpts),
	]);

	const bannerItems = bannerResult.status === "fulfilled" ? (bannerResult.value.data.getBannerBySlug?.items ?? []) : [];

	const homeCollections = collectionsResult.status === "fulfilled" ? collectionsResult.value.data.collections.items : [];

	const topSellers = topSellingResult.status === "fulfilled" ? topSellingResult.value.data.topSellers : [];
	// A few spare candidates beyond the 12 shown: a card whose product turns out to have no
	// purchasable variant at all is dropped below, and the spares backfill that slot.
	const inStockTopSellers = topSellers.filter((t) => t.inStock).slice(0, 16);

	// topSellers only returns the product-level image — batch-fetch each
	// variant's own photo in one follow-up request (by product id, not one
	// request per card) so "Best-Sellers Edition" shows the actual flavor/size
	// being listed instead of always the product's default image. Scoped to
	// the already-filtered candidates, not the full over-fetch candidate set --
	// the products list query silently caps at its default page size (100),
	// so requesting it for all ~130+ candidates was dropping some products
	// entirely and leaving their cards on the (sometimes wrong) generic asset.
	const variantsByProductId = new Map<string, ProductVariantAssetsData["products"]["items"][number]["variants"]>();
	if (inStockTopSellers.length > 0) {
		const productIds = [...new Set(inStockTopSellers.map((t) => t.productId))];
		const variantAssetsResult = await graphqlRequest<ProductVariantAssetsData, ProductVariantAssetsVariables>(env, GET_PRODUCT_VARIANT_ASSETS, { ids: productIds }, cacheOpts).catch(() => null);
		for (const product of variantAssetsResult?.data.products.items ?? []) variantsByProductId.set(product.id, product.variants);
	}

	// topSellers has one row per product, naming its best-selling variant -- but its `inStock`
	// flag is product-level (any variant in stock), so that named variant can itself be sold
	// out (e.g. Gold Standard's top seller, Double Rich Chocolate) while a sibling flavor is
	// available. Linking the sold-out one sent customers to an Out of stock page; instead swap
	// the card to the first purchasable variant. Falls back to the row as-is when the variant
	// lookup failed, so a failed lookup never empties the section.
	const resolved = inStockTopSellers.flatMap((t) => {
		const variants = variantsByProductId.get(t.productId);
		if (!variants) return [{ t, preview: null as string | null }];
		const isAvailable = (v: (typeof variants)[number]) => v.stockLevel !== "OUT_OF_STOCK";
		const listed = variants.find((v) => v.id === t.productVariantId);
		const pick = listed && isAvailable(listed) ? listed : (variants.find((v) => isAvailable(v) && v.stockQty > 0) ?? variants.find(isAvailable));
		if (!pick) return [];
		if (pick === listed) return [{ t, preview: pick.featuredAsset?.preview ?? null }];
		return [
			{
				t: { ...t, productVariantId: pick.id, productVariantName: pick.name, variantSlug: pick.customFields?.slug ?? null, priceWithTax: { min: pick.priceWithTax, max: pick.priceWithTax }, stockQty: pick.stockQty },
				preview: pick.featuredAsset?.preview ?? null,
			},
		];
	});

	return {
		products: resolved.slice(0, 12).map(({ t, preview }) => mapTopSellerToSearchItem(t, preview)),
		newProducts: newArrivalsResult.status === "fulfilled" ? newArrivalsResult.value.data.search.items : [],
		vendureBase,
		carouselItems: bannerItems,
		homeCollections,
		topBrands: brandCountsResult.status === "fulfilled" ? brandCountsResult.value : [],
	};
}

const WEBSITE_JSON_LD = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	// Google's "site name" (the brand line above the URL in search results) is read from this
	// homepage markup: `name` is the preferred form, `alternateName` the shorter/other-language
	// forms it may fall back to. Keep them consistent with <title>, og:site_name and the
	// application-name meta tag.
	name: SITE_NAME,
	alternateName: ["NutriBox", "نوتري بوكس"],
	url: `${SITE_URL}/`,
	potentialAction: {
		"@type": "SearchAction",
		target: `${SITE_URL}/search?q={search_term_string}`,
		"query-input": "required name=search_term_string",
	},
};

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />
			<Welcome products={loaderData.products} newProducts={loaderData.newProducts} vendureBase={loaderData.vendureBase} carouselItems={loaderData.carouselItems} collections={loaderData.homeCollections} />
		</>
	);
}
