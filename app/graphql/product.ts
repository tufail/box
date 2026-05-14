import { graphql, type ResultOf } from "./graphql";

export const GET_PRODUCTS = graphql(`
  query GetProducts($options: ProductListOptions) {
    products(options: $options) {
      totalItems
      items {
        id
        name
        slug
        featuredAsset {
          id
          preview
        }
      }
    }
  }
`);

export type ProductsResult = ResultOf<typeof GET_PRODUCTS>;
export type ProductItem = ProductsResult["products"]["items"][number];

// ─── Search / Top-selling ────────────────────────────────────────────────────
// Written as a plain string so gql.tada doesn't reject the custom plugin fields
// (inStock, customProductVariantMappings, sort.salesCount) that are not in the
// base Vendure schema snapshot. Re-run `npm run typecheck` after regenerating
// graphql-env.d.ts to optionally migrate to graphql().

export type SearchResultPrice =
  | { __typename: "PriceRange"; min: number; max: number }
  | { __typename: "SinglePrice"; value: number };

export interface SearchProductItem {
  productId: string;
  productName: string;
  slug: string;
  description: string;
  inStock: boolean;
  productAsset: { id: string; preview: string } | null;
  price: SearchResultPrice;
  customProductVariantMappings: {
    isOnSale: boolean;
    stockQty: number;
    discount: number;
  } | null;
}

export interface SearchProductsData {
  search: {
    totalItems: number;
    items: SearchProductItem[];
  };
}

export interface SearchTopSellingVariables {
  input: {
    take?: number;
    skip?: number;
    term?: string;
    groupByProduct?: boolean;
    sort?: {
      salesCount?: "ASC" | "DESC";
      name?: "ASC" | "DESC";
      price?: "ASC" | "DESC";
    };
  };
}

export const SEARCH_TOP_SELLING = `
  query GetTopSellingProducts($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productName
        slug
        description
        inStock
        productAsset {
          id
          preview
        }
        price {
          __typename
          ... on PriceRange {
            min
            max
          }
          ... on SinglePrice {
            value
          }
        }
        customProductVariantMappings {
          isOnSale
          stockQty
          discount
        }
      }
    }
  }
`;
