export const SEARCH_SUGGESTIONS_QUERY = `
  query SearchSuggestions($term: String!) {
    search(input: { term: $term, groupByProduct: true, take: 5 }) {
      items {
        productName
        slug
        productAsset { preview }
        price { ... on PriceRange { min max } ... on SinglePrice { value } }
        facetValueIds
        collectionIds
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
  slug: string;
  productAsset: { preview: string } | null;
  price: { min: number; max: number } | { value: number };
  facetValueIds: string[];
  collectionIds: string[];
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
}
