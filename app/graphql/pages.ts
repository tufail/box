export interface Page {
  id: string;
  title: string;
  slug: string;
  orderId: number;
  description: string | null;
  assetId: string | null;
  assetPreview: string | null;
  active: boolean;
  externalUrl: string | null;
}

export interface PageSection {
  id: string;
  name: string;
  slug: string;
  orderId: number;
  position: string;
  pages: Page[];
}

export interface PageSectionsData {
  getPageSections: {
    items: PageSection[];
    totalItems: number;
  };
}

export interface CmsPage {
  slug: string;
  title: string;
  description: string | null;
  metaDescription: string | null;
  orderId: number;
  assetPreview: string | null;
  noIndex: boolean;
}

export interface CmsPageData {
  getCmsPageBySlug: CmsPage | null;
}

// languageCode selects which translation the backend hydrates onto the flattened
// title/description/metaDescription fields — slug is shared across every language
// (one canonical URL per page), so it's never per-language.
export const GET_CMS_PAGE_BY_SLUG = `
  query GetCmsPageBySlug($slug: String!, $languageCode: LanguageCode) {
    getCmsPageBySlug(slug: $slug, languageCode: $languageCode) {
      slug
      title
      description
      metaDescription
      orderId
      assetPreview
      noIndex
    }
  }
`;

export const GET_PAGE_SECTIONS = `
  query GetPageSections($languageCode: LanguageCode) {
    getPageSections(options: { limit: 20, skip: 0 }, languageCode: $languageCode) {
      items {
        id
        name
        slug
        orderId
        position
        pages {
          id
          title
          slug
          orderId
          active
          externalUrl
        }
      }
      totalItems
    }
  }
`;
