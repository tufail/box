import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SEARCH_TOP_SELLING,
  type SearchProductsData,
  type SearchTopSellingVariables,
} from "~/graphql/product";

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

  try {
    const result = await graphqlRequest<SearchProductsData, SearchTopSellingVariables>(
      env,
      SEARCH_TOP_SELLING,
      { input: { take: 12, groupByProduct: true, sort: { salesCount: "DESC" } } },
      { request, cf: { cacheTtl: 300, cacheEverything: true } }
    );
    return { products: result.data.search.items, vendureBase };
  } catch {
    return { products: [], vendureBase };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome products={loaderData.products} vendureBase={loaderData.vendureBase} />;
}
