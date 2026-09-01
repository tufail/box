import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SEARCH_NEW_ARRIVALS,
  TOP_SELLERS_QUERY,
  mapTopSellerToSearchItem,
  GET_PRODUCT_VARIANT_ASSETS,
  type SearchProductsData,
  type SearchTopSellingVariables,
  type TopSellersData,
  type TopSellersVariables,
  type ProductVariantAssetsData,
  type ProductVariantAssetsVariables,
} from "~/graphql/product";
import {
  GET_BANNER_BY_SLUG,
  type BannerData,
  type BannerVariables,
} from "~/graphql/banner";
import {
  HOME_COLLECTIONS_QUERY,
  type HomeCollectionsResult,
} from "~/graphql/collection";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, hreflangTags } from "~/lib/i18n";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    title: "NutriBox Qatar — Premium Health & Quality Supplements",
    description: "Shop authentic protein powders, vitamins, and sports nutrition at NutriBox Qatar. 100% genuine products, fast delivery across Qatar.",
  },
  ar: {
    title: "NutriBox قطر — مكملات غذائية ورياضية عالية الجودة",
    description: "تسوّق بروتينات ومكملات وفيتامينات أصلية من NutriBox قطر. منتجات أصلية 100%، وتوصيل سريع لجميع أنحاء قطر.",
  },
} as const;

export function meta({ location }: Route.MetaArgs) {
  const locale = getLocaleFromPathname(location.pathname);
  const { title, description } = COPY[locale];
  const canonicalUrl = `${SITE_URL}${localizePath("/", locale)}`;
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link" as const, rel: "canonical", href: canonicalUrl },
    ...hreflangTags(SITE_URL, "/"),
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonicalUrl },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
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
  const [topSellingResult, newArrivalsResult, bannerResult, collectionsResult] = await Promise.allSettled([
    graphqlRequest<TopSellersData, TopSellersVariables>(
      env,
      TOP_SELLERS_QUERY,
      { limit: 200 },
      cacheOpts
    ),
    graphqlRequest<SearchProductsData, SearchTopSellingVariables>(
      env,
      SEARCH_NEW_ARRIVALS,
      { input: { take: 10, groupByProduct: false, inStock: true } },
      cacheOpts
    ),
    graphqlRequest<BannerData, BannerVariables>(
      env,
      GET_BANNER_BY_SLUG,
      { slug: "home-carousel" },
      cacheOpts
    ),
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
      cacheOpts
    ),
  ]);

  const bannerItems =
    bannerResult.status === "fulfilled"
      ? (bannerResult.value.data.getBannerBySlug?.items ?? [])
      : [];

  const homeCollections =
    collectionsResult.status === "fulfilled"
      ? collectionsResult.value.data.collections.items
      : [];

  const topSellers = topSellingResult.status === "fulfilled" ? topSellingResult.value.data.topSellers : [];

  // topSellers only returns the product-level image — batch-fetch each
  // variant's own photo in one follow-up request (by product id, not one
  // request per card) so "Best-Sellers Edition" shows the actual flavor/size
  // being listed instead of always the product's default image.
  const variantAssetPreviewById = new Map<string, string>();
  if (topSellers.length > 0) {
    const productIds = [...new Set(topSellers.map((t) => t.productId))];
    const variantAssetsResult = await graphqlRequest<ProductVariantAssetsData, ProductVariantAssetsVariables>(
      env,
      GET_PRODUCT_VARIANT_ASSETS,
      { ids: productIds },
      cacheOpts
    ).catch(() => null);
    for (const product of variantAssetsResult?.data.products.items ?? []) {
      for (const variant of product.variants) {
        if (variant.featuredAsset?.preview) variantAssetPreviewById.set(variant.id, variant.featuredAsset.preview);
      }
    }
  }

  return {
    products: topSellers
      .map((t) => mapTopSellerToSearchItem(t, variantAssetPreviewById.get(t.productVariantId) ?? null))
      .filter((p) => p.inStock)
      .slice(0, 12),
    newProducts: newArrivalsResult.status === "fulfilled" ? newArrivalsResult.value.data.search.items : [],
    vendureBase,
    carouselItems: bannerItems,
    homeCollections,
  };
}

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
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
      <Welcome
        products={loaderData.products}
        newProducts={loaderData.newProducts}
        vendureBase={loaderData.vendureBase}
        carouselItems={loaderData.carouselItems}
        collections={loaderData.homeCollections}
      />
    </>
  );
}
