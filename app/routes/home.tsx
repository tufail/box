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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PHQ — Premium Health & Quality Supplements" },
    {
      name: "description",
      content:
        "Shop authentic protein powders, vitamins, and sports nutrition at PHQ. 100% genuine products, fast delivery in Qatar.",
    },
    { property: "og:title", content: "PHQ — Premium Health & Quality Supplements" },
    {
      property: "og:description",
      content: "Shop authentic protein powders, vitamins, and sports nutrition at PHQ.",
    },
    { property: "og:type", content: "website" },
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
      { input: { take: 12, groupByProduct: true, sort: { name: "ASC" } } },
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

  // Top-level = collections whose parentId doesn't match any id in the returned list
  // (their parent is the root, which the API doesn't return)
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

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <Welcome
      products={loaderData.products}
      newProducts={loaderData.newProducts}
      vendureBase={loaderData.vendureBase}
      carouselItems={loaderData.carouselItems}
topLevelCollections={loaderData.topLevelCollections}
      subCollections={loaderData.subCollections}
    />
  );
}
