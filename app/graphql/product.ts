import { graphql, type ResultOf } from "./graphql";

// ─── Product detail ──────────────────────────────────────────────────────────

export interface ProductDetailVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: string;
  featuredAsset: { preview: string } | null;
  assets: { preview: string }[];
  customFields: { rrp: number | null; additionalInfo: string | null } | null;
  options: { code: string; name: string; group: { code: string; name: string } }[];
}

export interface ProductDetailItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset: { preview: string } | null;
  assets: { preview: string }[];
  customFields: {
    isFeatured: boolean | null;
    metaTitle: string | null;
    metaDescription: string | null;
    videoUrl: string | null;
    displayType: string | null;
    additionalInfo: string | null;
    salesCount: number | null;
  } | null;
  variants: ProductDetailVariant[];
  facetValues: { name: string; facet: { name: string } }[];
  collections: { id: string; name: string; slug: string }[];
}

export interface ProductDetailData {
  product: ProductDetailItem | null;
}

export const PRODUCT_DETAIL_QUERY = `
  query ProductDetail($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset { preview }
      assets { preview }
      customFields {
        isFeatured
        metaTitle
        metaDescription
        videoUrl
        displayType
        additionalInfo
        salesCount
      }
      variants {
        id
        name
        sku
        price
        priceWithTax
        currencyCode
        stockLevel
        featuredAsset { preview }
        assets { preview }
        customFields { rrp additionalInfo }
        options { code name group { code name } }
      }
      facetValues { name facet { name } }
      collections { id name slug }
    }
  }
`;

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
  productVariantId: string;
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
  customProductMappings: {
    variantCount: number;
    salesCount: number;
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
    collectionSlug?: string;
    collectionId?: string;
    groupByProduct?: boolean;
    sort?: {
      salesCount?: "ASC" | "DESC";
      name?: "ASC" | "DESC";
      price?: "ASC" | "DESC";
    };
  };
}

// ─── Search page ────────────────────────────────────────────────────────────

export interface SearchPageFacetValue {
  count: number;
  facetValue: { id: string; name: string; facet: { id: string; name: string } };
}

export interface SearchPageCollection {
  count: number;
  collection: { id: string; name: string; slug: string };
}

export interface SearchPageData {
  search: {
    totalItems: number;
    items: SearchProductItem[];
    facetValues: SearchPageFacetValue[];
    collections: SearchPageCollection[];
  };
}

export type SortKey = "sales_desc" | "name_asc" | "price_asc" | "price_desc";

export interface SearchPageVariables {
  input: {
    term?: string;
    groupByProduct?: boolean;
    take?: number;
    skip?: number;
    sort?: { salesCount?: "ASC" | "DESC"; name?: "ASC" | "DESC"; price?: "ASC" | "DESC" };
    facetValueIds?: string[];
    facetValueOperator?: "AND" | "OR";
  };
}

export const SEARCH_PAGE_QUERY = `
  query SearchPage($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productVariantId
        productName
        slug
        description
        inStock
        productAsset { id preview }
        price {
          __typename
          ... on PriceRange { min max }
          ... on SinglePrice { value }
        }
        customProductVariantMappings { isOnSale stockQty discount }
        customProductMappings { variantCount salesCount }
      }
      facetValues {
        count
        facetValue { id name facet { id name } }
      }
      collections {
        count
        collection { id name slug }
      }
    }
  }
`;

export const SEARCH_NEW_ARRIVALS = `
  query GetNewArrivals($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productVariantId
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
        customProductMappings { variantCount salesCount }
      }
    }
  }
`;

export const SEARCH_TOP_SELLING = `
  query GetTopSellingProducts($input: SearchInput!) {
    search(input: $input) {
      totalItems
      items {
        productId
        productVariantId
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
        customProductMappings { variantCount salesCount }
        customProductMappings { variantCount salesCount }
      }
    }
  }
`;
