import type { Route } from "./+types/api.trending";
import { graphqlRequest } from "workers/graphqlClient";
import {
  TRENDING_PRODUCTS_QUERY,
  mapTrendingToSearchItem,
  GET_PRODUCT_VARIANT_ASSETS,
  type TrendingProductsData,
  type TrendingProductsVariables,
  type ProductVariantAssetsData,
  type ProductVariantAssetsVariables,
  type SearchProductItem,
} from "~/graphql/product";

// Deliberately client-fetched (not part of the home loader's SSR payload) --
// "trending" is meant to reflect live view activity, not a snapshot baked into
// the page's own edge cache (home.tsx's loader runs under a 5-minute Cloudflare
// cache, which would otherwise freeze trending at whatever it was when that
// cache entry was generated).
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";

  try {
    const { data } = await graphqlRequest<TrendingProductsData, TrendingProductsVariables>(
      env,
      TRENDING_PRODUCTS_QUERY,
      { limit: 10, days: 7, inStock: true },
      { request, locale }
    );
    const trending = data.trendingProducts;

    const variantAssetPreviewById = new Map<string, string>();
    if (trending.length > 0) {
      const productIds = [...new Set(trending.map((t) => t.productId))];
      const variantAssetsResult = await graphqlRequest<ProductVariantAssetsData, ProductVariantAssetsVariables>(
        env,
        GET_PRODUCT_VARIANT_ASSETS,
        { ids: productIds },
        { request }
      ).catch(() => null);
      for (const product of variantAssetsResult?.data.products.items ?? []) {
        for (const variant of product.variants) {
          if (variant.featuredAsset?.preview) variantAssetPreviewById.set(variant.id, variant.featuredAsset.preview);
        }
      }
    }

    const items: SearchProductItem[] = trending.map((t) => mapTrendingToSearchItem(t, variantAssetPreviewById.get(t.productVariantId) ?? null));
    return Response.json({ items });
  } catch {
    return Response.json({ items: [] });
  }
}
