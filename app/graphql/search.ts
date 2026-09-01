export const SEARCH_SUGGESTIONS_QUERY = `
  query SearchSuggestions($term: String!) {
    search(input: { term: $term, groupByProduct: true, take: 5 }) {
      items {
        productName
        productVariantName
        slug
        productAsset { preview }
        productVariantAsset { preview }
        price { ... on PriceRange { min max } ... on SinglePrice { value } }
        inStock
        facetValueIds
        collectionIds
        customProductVariantMappings { slug }
      }
      collections {
        count
        collection {
          id
          name
          slug
          breadcrumbs { id name slug }
        }
      }
      facetValues {
        count
        facetValue { id name facet { id name } }
      }
    }
  }
`;

// Deliberately a SEPARATE request from SEARCH_SUGGESTIONS_QUERY above rather
// than one combined query -- popularSearchTerms is a newer backend field that
// may not be deployed yet. A GraphQL query fails validation as a whole unit
// on an unknown field, so bundling them would take down the entire
// (otherwise-working) product/collection suggestions the moment this field
// isn't recognized, instead of just leaving the popular-searches list empty.
export const POPULAR_SEARCH_TERMS_QUERY = `
  query PopularSearchTerms($prefix: String!, $limit: Int!) {
    popularSearchTerms(prefix: $prefix, limit: $limit) {
      term
      searchCount
    }
  }
`;

export const RECORD_SEARCH_QUERY_MUTATION = `
  mutation RecordSearchQuery($term: String!) {
    recordSearchQuery(term: $term)
  }
`;

export interface PopularSearchTerm {
  term: string;
  searchCount: number;
}

export interface SearchSuggestionItem {
  productName: string;
  productVariantName: string;
  slug: string;
  productAsset: { preview: string } | null;
  productVariantAsset: { preview: string } | null;
  price: { min: number; max: number } | { value: number };
  inStock: boolean;
  facetValueIds: string[];
  collectionIds: string[];
  customProductVariantMappings: { slug: string | null } | null;
}

export interface SearchSuggestionCollection {
  count: number;
  // breadcrumbs includes the synthetic root collection (name "__root_collection__")
  // as its first entry -- callers should drop it before display.
  collection: { id: string; name: string; slug: string; breadcrumbs: { id: string; name: string; slug: string }[] };
}

export interface SearchSuggestionFacetValue {
  count: number;
  facetValue: { id: string; name: string; facet: { id: string; name: string } };
}

export interface SearchSuggestionsResponse {
  items: SearchSuggestionItem[];
  collections: SearchSuggestionCollection[];
  facetValues: SearchSuggestionFacetValue[];
  popularSearchTerms: PopularSearchTerm[];
  // Not part of the raw GraphQL response — api.search.ts adds this so the
  // client (SearchBox, which has no server-side env access) can resolve
  // asset URLs through VendureImage the same way every other page does.
  vendureBase?: string;
}
