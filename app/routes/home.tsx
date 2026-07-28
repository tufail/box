import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SEARCH_TOP_SELLING,
  SEARCH_NEW_ARRIVALS,
  type SearchProductsData,
  type SearchTopSellingVariables,
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

const HOME_TITLE = "NutriBox — Premium Health & Quality Supplements";
const HOME_DESCRIPTION = "Shop authentic protein powders, vitamins, and sports nutrition at NutriBox. 100% genuine products, fast delivery in Qatar.";

export function meta({}: Route.MetaArgs) {
  return [
    { title: HOME_TITLE },
    { name: "description", content: HOME_DESCRIPTION },
    { tagName: "link" as const, rel: "canonical", href: SITE_URL },
    { property: "og:type", content: "website" },
    { property: "og:title", content: HOME_TITLE },
    { property: "og:description", content: HOME_DESCRIPTION },
    { property: "og:url", content: SITE_URL },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: HOME_TITLE },
    { name: "twitter:description", content: HOME_DESCRIPTION },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

  const cacheOpts = { request, cf: { cacheTtl: 300, cacheEverything: true } } as const;

  const [topSellingResult, newArrivalsResult, bannerResult, collectionsResult] = await Promise.allSettled([
    graphqlRequest<SearchProductsData, SearchTopSellingVariables>(
      env,
      SEARCH_TOP_SELLING,
      { input: { take: 12, groupByProduct: true, sort: { salesCount: "DESC" } } },
      cacheOpts
    ),
    graphqlRequest<SearchProductsData, SearchTopSellingVariables>(
      env,
      SEARCH_NEW_ARRIVALS,
      { input: { take: 12, groupByProduct: true } },
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
      { options: { take: 50 } },
      cacheOpts
    ),
  ]);

  const bannerItems =
    bannerResult.status === "fulfilled"
      ? (bannerResult.value.data.getBannerBySlug?.items ?? [])
      : [];

  const rawCollections =
    collectionsResult.status === "fulfilled"
      ? collectionsResult.value.data.collections.items
      : [];

  const collectionIds = new Set(rawCollections.map((c) => c.id));
  const topLevel = rawCollections.filter((c) => !collectionIds.has(c.parentId ?? ""));
  const subLevel = rawCollections.filter((c) => collectionIds.has(c.parentId ?? ""));

  return {
    products: topSellingResult.status === "fulfilled" ? topSellingResult.value.data.search.items : [],
    newProducts: newArrivalsResult.status === "fulfilled" ? newArrivalsResult.value.data.search.items : [],
    vendureBase,
    carouselItems: bannerItems,
    topLevelCollections: topLevel,
    subCollections: subLevel,
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
        topLevelCollections={loaderData.topLevelCollections}
        subCollections={loaderData.subCollections}
      />
    </>
  );
}
