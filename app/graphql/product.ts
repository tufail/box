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
  customFields: { rrp: number | null; keyInfo: string | null; additionalInfo: string | null } | null;
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
        customFields { rrp keyInfo additionalInfo }
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
  productVariantName?: string;
  slug: string;
  description: string;
  inStock: boolean;
  productAsset: { id: string; preview: string } | null;
  price: SearchResultPrice;
  customProductVariantMappings: {
    isOnSale: boolean;
    stockQty: number;
    discount: number;
    rrp: number | null;
  } | null;
  customProductMappings: {
    variantCount: number;
    salesCount: number;
    avgRating: number | null;
    reviewCount: number | null;
    isBundle: boolean | null;
    soldCount30d: number | null;
    bestSellerRank: number | null;
    bestSellerCollection: string | null;
    bestSellerCollectionSlug: string | null;
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
      avgRating?: "ASC" | "DESC";
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

export type SortKey = "default" | "sales_desc" | "name_asc" | "price_asc" | "price_desc" | "rating_desc";

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
        customProductVariantMappings { isOnSale stockQty discount rrp }
        customProductMappings { variantCount salesCount avgRating reviewCount isBundle soldCount30d bestSellerRank bestSellerCollection bestSellerCollectionSlug }
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
          rrp
        }
        customProductMappings { variantCount salesCount avgRating reviewCount isBundle soldCount30d bestSellerRank bestSellerCollection bestSellerCollectionSlug }
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
          rrp
        }
        customProductMappings { variantCount salesCount avgRating reviewCount isBundle soldCount30d bestSellerRank bestSellerCollection bestSellerCollectionSlug }
      }
    }
  }
`;

// ─── Reviews & Ratings ────────────────────────────────────────────────────────

export interface ReviewImage {
  id?: string;
  url: string;
  sortOrder?: number;
}

export interface ReviewItem {
  id: string;
  createdAt: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  authorLocation: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  languageCode: string;
  status?: string;
  myVote?: "HELPFUL" | "NOT_HELPFUL" | null;
  images: ReviewImage[];
}

export interface RatingDistribution { rating: number; count: number; }
export interface RatingHighlight { tag: string; count: number; sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; }
export interface LanguageSummary { languageCode: string; count: number; }
export interface AggregateRating { ratingValue: number; reviewCount: number; bestRating: number; worstRating: number; }

export interface ProductRatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution[];
  highlights: RatingHighlight[];
  topPositiveReview: ReviewItem | null;
  topCriticalReview: ReviewItem | null;
  languageSummary: LanguageSummary[];
  aggregateRating: AggregateRating;
}

export interface ProductRatingSummaryData { productRatingSummaryBySlug: ProductRatingSummary | null; }
export interface ProductReviewsData { productReviewsBySlug: { totalItems: number; items: ReviewItem[] } | null; }
export interface GetProductReviewsData {
  productRatingSummaryBySlug: ProductRatingSummary | null;
  productReviewsBySlug: { totalItems: number; items: ReviewItem[] } | null;
}
export type ReviewSortOrder = "MOST_RELEVANT" | "NEWEST" | "HIGHEST_RATED" | "LOWEST_RATED" | "MOST_HELPFUL";
export interface SubmitReviewData { submitProductReview: { id: string; status: string } }
export interface VoteOnReviewData {
  voteOnReview: { id: string; helpfulCount: number; notHelpfulCount: number; myVote: "HELPFUL" | "NOT_HELPFUL" | null };
}

// ── Product detail page — single combined query (summary + first 5 reviews) ──
export const GET_PRODUCT_REVIEWS_QUERY = `
  query GetProductReviews($slug: String!, $sort: ReviewSortOrder) {
    productRatingSummaryBySlug(slug: $slug) {
      averageRating
      totalReviews
      distribution { rating count }
      highlights { tag count sentiment }
      languageSummary { languageCode count }
      aggregateRating { ratingValue reviewCount bestRating worstRating }
      topPositiveReview {
        id rating title body authorName authorLocation
        isVerifiedPurchase helpfulCount createdAt
        images { url }
      }
      topCriticalReview {
        id rating title body authorName authorLocation
        isVerifiedPurchase helpfulCount createdAt
      }
    }
    productReviewsBySlug(slug: $slug, options: { sort: $sort, take: 5 }) {
      totalItems
      items {
        id rating title body authorName authorLocation
        isVerifiedPurchase helpfulCount notHelpfulCount
        languageCode status myVote createdAt
        images { id url sortOrder }
      }
    }
  }
`;

// ── Reviews page — paginated with dynamic filters ─────────────────────────────
export const PRODUCT_RATING_SUMMARY_QUERY = `
  query ProductRatingSummaryBySlug($slug: String!) {
    productRatingSummaryBySlug(slug: $slug) {
      averageRating totalReviews
      distribution { rating count }
      highlights { tag count sentiment }
      languageSummary { languageCode count }
      aggregateRating { ratingValue reviewCount bestRating worstRating }
    }
  }
`;

export const PRODUCT_REVIEWS_QUERY = `
  query ProductReviewsBySlug(
    $slug: String! $take: Int $skip: Int $sort: ReviewSortOrder
    $ratingFilter: Int $languageCode: String $verifiedOnly: Boolean $withImagesOnly: Boolean
  ) {
    productReviewsBySlug(slug: $slug, options: {
      take: $take skip: $skip sort: $sort ratingFilter: $ratingFilter
      languageCode: $languageCode verifiedOnly: $verifiedOnly withImagesOnly: $withImagesOnly
    }) {
      totalItems
      items {
        id rating title body authorName authorLocation
        isVerifiedPurchase helpfulCount notHelpfulCount
        languageCode status myVote createdAt
        images { id url sortOrder }
      }
    }
  }
`;

export const SUBMIT_REVIEW_MUTATION = `
  mutation SubmitProductReview($input: SubmitProductReviewInput!) {
    submitProductReview(input: $input) {
      id rating title body authorName authorLocation isVerifiedPurchase languageCode status createdAt
      images { id url sortOrder }
    }
  }
`;

export const VOTE_ON_REVIEW_MUTATION = `
  mutation VoteOnReview($reviewId: ID!, $vote: ReviewVoteType!) {
    voteOnReview(reviewId: $reviewId, vote: $vote) { id helpfulCount notHelpfulCount myVote }
  }
`;

// ─── Variant Rankings ─────────────────────────────────────────────────────────

export interface VariantRanking {
  rank: number;
  collectionName: string;
  collectionSlug: string;
}

export interface VariantRankingsData {
  variantRankings: VariantRanking[];
}

export const VARIANT_RANKINGS_QUERY = `
  query VariantRankings($variantId: ID!) {
    variantRankings(variantId: $variantId) {
      rank
      collectionName
      collectionSlug
    }
  }
`;
