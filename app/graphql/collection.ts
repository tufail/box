import { graphql, type ResultOf } from "./graphql";

export const GET_COLLECTION = graphql(`
  query GetCollection($id: ID, $slug: String) {
    collection(id: $id, slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
    }
  }
`);

export const GET_COLLECTIONS = graphql(`
  query GetCollections($options: CollectionListOptions) {
    collections(options: $options) {
      totalItems
      items {
        id
        name
        slug
        description
        parentId
        children {
          id
          name
          slug
          description
          parentId
          children {
            id
            name
            slug
            description
            parentId
          }
        }
      }
    }
  }
`);

export type CollectionsResult = ResultOf<typeof GET_COLLECTIONS>;
export type CollectionItem = CollectionsResult["collections"]["items"][number];

// ─── Collection page (plain string — uses custom search fields) ──────────────

export interface CollectionBreadcrumb {
  id: string;
  name: string;
  slug: string;
}

// Builds the canonical deep URL for a collection from Vendure's breadcrumb chain
// (root -> ... -> this collection), e.g. "/c/health-supplements/creatine". Used both
// to link to collections and to detect when a visited /c/* path needs canonicalizing.
export function buildCollectionPath(breadcrumbs: { name: string; slug: string }[]): string {
  const segments = breadcrumbs.filter((b) => b.name !== "__root_collection__").map((b) => b.slug);
  return `/c/${segments.join("/")}`;
}

export interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  breadcrumbs: CollectionBreadcrumb[];
  featuredAsset: { preview: string } | null;
  customFields: { banner: { source: string } | null } | null;
  children: { id: string; name: string; slug: string; featuredAsset: { preview: string } | null }[];
}

export interface CollectionPageFacetValue {
  count: number;
  facetValue: { id: string; name: string; facet: { id: string; name: string } };
}

export interface CollectionPageData {
  collection: CollectionDetail | null;
  search: {
    totalItems: number;
    items: import("./product").SearchProductItem[];
    facetValues: CollectionPageFacetValue[];
  };
}

export interface CollectionPageVariables {
  slug: string;
  input: {
    collectionSlug: string;
    take: number;
    skip: number;
    sort?: { salesCount?: "ASC" | "DESC"; name?: "ASC" | "DESC"; price?: "ASC" | "DESC"; avgRating?: "ASC" | "DESC" };
    facetValueIds?: string[];
    facetValueOperator?: "AND" | "OR";
  };
}

export interface HomeCollectionItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  featuredAsset: { id: string; preview: string } | null;
}

export interface HomeCollectionsResult {
  collections: {
    totalItems: number;
    items: HomeCollectionItem[];
  };
}

export const HOME_COLLECTIONS_QUERY = `
  query HomeCollections($options: CollectionListOptions) {
    collections(options: $options) {
      totalItems
      items {
        id
        name
        slug
        parentId
        featuredAsset {
          id
          preview
        }
      }
    }
  }
`;

export interface CollectionFacetsData {
  search: { facetValues: CollectionPageFacetValue[] };
}

export const COLLECTION_FACETS_QUERY = `
  query CollectionAllFacets($input: SearchInput!) {
    search(input: $input) {
      facetValues {
        count
        facetValue { id name facet { id name } }
      }
    }
  }
`;

export const COLLECTION_PAGE_QUERY = `
  query CollectionPage($slug: String!, $input: SearchInput!) {
    collection(slug: $slug) {
      id
      name
      slug
      description
      breadcrumbs { id name slug }
      featuredAsset { preview }
      customFields { banner { source } }
      children {
        id
        name
        slug
        featuredAsset { preview }
      }
    }
    search(input: $input) {
      totalItems
      items {
        productId
        productVariantId
        productName
        productVariantName
        slug
        description
        inStock
        productAsset { id preview }
        price {
          __typename
          ... on PriceRange { min max }
          ... on SinglePrice { value }
        }
        customProductVariantMappings { isOnSale stockQty discount rrp slug }
        customProductMappings { variantCount salesCount avgRating reviewCount isBundle soldCount30d bestSellerRank bestSellerCollection bestSellerCollectionSlug }
      }
      facetValues {
        count
        facetValue { id name facet { id name } }
      }
    }
  }
`;
