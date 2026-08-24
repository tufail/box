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
        collection { id name slug }
      }
      facetValues {
        count
        facetValue { id name facet { id name } }
      }
    }
  }
`;

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
  collection: { id: string; name: string; slug: string };
}

export interface SearchSuggestionFacetValue {
  count: number;
  facetValue: { id: string; name: string; facet: { id: string; name: string } };
}

export interface SearchSuggestionsResponse {
  items: SearchSuggestionItem[];
  collections: SearchSuggestionCollection[];
  facetValues: SearchSuggestionFacetValue[];
  // Not part of the raw GraphQL response — api.search.ts adds this so the
  // client (SearchBox, which has no server-side env access) can resolve
  // asset URLs through VendureImage the same way every other page does.
  vendureBase?: string;
}
