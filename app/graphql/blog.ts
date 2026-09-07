// Blog content — served by the `blog` Vendure plugin's Shop API. Slugs are
// shared across every language (same convention as CmsPage, see ~/graphql/pages),
// so a post/category lives at one canonical URL regardless of locale.

export interface BlogCategoryLite {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface BlogTagLite {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPostListItem {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  assetPreview: string | null;
  category: BlogCategoryLite | null;
  tags: BlogTagLite[];
  authorName: string | null;
  authorAvatarPreview: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
  viewCount: number;
  readingTimeMinutes: number;
}

export interface BlogPostDetail extends BlogPostListItem {
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  relatedProductIds: string[];
}

const BLOG_POST_LIST_FIELDS = `
  id
  title
  excerpt
  slug
  assetPreview
  category { id name slug icon }
  tags { id name slug }
  authorName
  authorAvatarPreview
  publishedAt
  isFeatured
  viewCount
  readingTimeMinutes
`;

export interface BlogPostsListOptions {
  limit?: number;
  skip?: number;
  categorySlug?: string;
  tagSlug?: string;
  featured?: boolean;
  search?: string;
}

export interface BlogPostsData {
  blogPosts: { items: BlogPostListItem[]; totalItems: number };
}

export const GET_BLOG_POSTS = `
  query GetBlogPosts($options: ShopBlogPostListOptions, $languageCode: LanguageCode) {
    blogPosts(options: $options, languageCode: $languageCode) {
      items { ${BLOG_POST_LIST_FIELDS} }
      totalItems
    }
  }
`;

export interface BlogPostBySlugData {
  blogPostBySlug: BlogPostDetail | null;
}

export const GET_BLOG_POST_BY_SLUG = `
  query GetBlogPostBySlug($slug: String!, $languageCode: LanguageCode) {
    blogPostBySlug(slug: $slug, languageCode: $languageCode) {
      ${BLOG_POST_LIST_FIELDS}
      content
      metaTitle
      metaDescription
      relatedProductIds
    }
  }
`;

export interface RelatedBlogPostsData {
  relatedBlogPosts: BlogPostListItem[];
}

export const GET_RELATED_BLOG_POSTS = `
  query GetRelatedBlogPosts($id: ID!, $limit: Int, $languageCode: LanguageCode) {
    relatedBlogPosts(id: $id, limit: $limit, languageCode: $languageCode) {
      ${BLOG_POST_LIST_FIELDS}
    }
  }
`;

export interface BlogCategoryWithDescription extends BlogCategoryLite {
  description: string;
}

export interface ShopBlogCategoriesData {
  shopBlogCategories: BlogCategoryWithDescription[];
}

export const GET_SHOP_BLOG_CATEGORIES = `
  query GetShopBlogCategories {
    shopBlogCategories { id name slug description icon }
  }
`;

export const INCREMENT_BLOG_POST_VIEW_COUNT = `
  mutation IncrementBlogPostViewCount($slug: String!) {
    incrementBlogPostViewCount(slug: $slug)
  }
`;

// ── "Shop the products in this article" ─────────────────────────────────────
// relatedProductIds are plain core Product IDs (see the blog plugin's
// BlogRelatedProduct entity) — fetched via the standard `products` query and
// adapted with relatedProductToSearchItem (~/graphql/product) so ProductCard
// can render them exactly like any other product tile.

export interface BlogRelatedProductsData {
  products: {
    items: Array<{
      id: string;
      name: string;
      slug: string;
      featuredAsset: { id: string; preview: string } | null;
      variants: Array<{
        id: string;
        name: string;
        priceWithTax: number;
        currencyCode: string;
        stockLevel: string;
        stockQty: number;
        featuredAsset: { id: string; preview: string } | null;
        customFields: { rrp: number | null; slug: string | null } | null;
      }>;
    }>;
  };
}

// Vendure's IDOperators.in filter is typed [String!], not [ID!] — passing [ID!]
// here fails GraphQL validation even though every ID involved is numeric.
export const GET_BLOG_RELATED_PRODUCTS = `
  query GetBlogRelatedProducts($ids: [String!]!) {
    products(options: { filter: { id: { in: $ids } } }) {
      items {
        id
        name
        slug
        featuredAsset { id preview }
        variants {
          id
          name
          priceWithTax
          currencyCode
          stockLevel
          stockQty
          featuredAsset { id preview }
          customFields { rrp slug }
        }
      }
    }
  }
`;
