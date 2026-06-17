export interface BannerItem {
  id: string;
  title: string;
  url: string;
  mobileAssetPreview: string;
  assetPreview: string;
}

export interface BannerData {
  getBannerBySlug: { items: BannerItem[] } | null;
}

export interface BannerVariables {
  slug: string;
}

export const GET_BANNER_BY_SLUG = `
  query GetBannerBySlug($slug: String!) {
    getBannerBySlug(slug: $slug) {
      items {
        id
        title
        url
        mobileAssetPreview
        assetPreview
      }
    }
  }
`;
