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

export interface CmsPageTranslation {
  title: string;
  description: string | null;
}

export interface CmsPage {
  orderId: number;
  assetPreview: string | null;
  translations: CmsPageTranslation[];
}

export interface CmsPageData {
  getCmsPageBySlug: CmsPage | null;
}

export const GET_CMS_PAGE_BY_SLUG = `
  query GetCmsPageBySlug($slug: String!) {
    getCmsPageBySlug(slug: $slug) {
      orderId
      assetPreview
      translations {
        title
        description
      }
    }
  }
`;

export const GET_PAGE_SECTIONS = `
  query GetPageSections {
    getPageSections(options: { limit: 20, skip: 0 }) {
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
