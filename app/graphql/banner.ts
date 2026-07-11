export type BannerTitlePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface BannerItem {
  id: string;
  title: string;
  url: string;
  mobileAssetPreview: string;
  assetPreview: string;
  hideTitle: boolean;
  titlePosition: BannerTitlePosition;
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
        hideTitle
        titlePosition
      }
    }
  }
`;
