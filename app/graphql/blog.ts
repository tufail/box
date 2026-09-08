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
  relatedVariantIds: string[];
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
      relatedVariantIds
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
// relatedVariantIds are plain core ProductVariant IDs (see the blog plugin's
// BlogRelatedVariant entity) — an article usually discusses one exact flavor/
// size, not the whole product, so the admin picks a variant directly rather
// than a product (which would force an arbitrary "first variant" guess).
// Fetched via the standard `productVariants` query and adapted with
// blogRelatedVariantToSearchItem (~/graphql/product) so ProductCard can render
// them exactly like any other product tile.

export interface BlogRelatedVariantsData {
  blogRelatedVariants: Array<{
    id: string;
    name: string;
    priceWithTax: number;
    currencyCode: string;
    stockLevel: string;
    stockQty: number;
    featuredAsset: { id: string; preview: string } | null;
    customFields: { rrp: number | null; slug: string | null } | null;
    product: {
      id: string;
      name: string;
      slug: string;
      featuredAsset: { id: string; preview: string } | null;
    };
  }>;
}

// The Shop API has no top-level productVariants query of its own (that's
// admin-only) — blogRelatedVariants is the blog plugin's own entry point,
// which resolves to core ProductVariant entities and gets Vendure's normal
// field resolvers (priceWithTax, stockLevel, etc.) applied automatically.
export const GET_BLOG_RELATED_VARIANTS = `
  query GetBlogRelatedVariants($ids: [ID!]!) {
    blogRelatedVariants(ids: $ids) {
      id
      name
      priceWithTax
      currencyCode
      stockLevel
      stockQty
      featuredAsset { id preview }
      customFields { rrp slug }
      product {
        id
        name
        slug
        featuredAsset { id preview }
      }
    }
  }
`;
