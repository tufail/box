export const GET_MEGA_MENU = `
  query GetMegaMenu($slug: String!) {
    getMegaMenu(slug: $slug) {
      id
      name
      slug
      items {
        label
        url
        collectionSlug
        excludeFromNav
        columns {
          position
          promoAssetId
          promoAssetPreview
          promoUrl
          promoLabel
          sections {
            title
            links {
              label
              url
              collectionSlug
            }
          }
        }
      }
    }
  }
`;

export interface MegaMenuLink {
  label: string;
  url: string | null;
  collectionSlug: string | null;
}

export interface MegaMenuSection {
  title: string | null;
  links: MegaMenuLink[];
}

export interface MegaMenuColumn {
  position: number;
  promoAssetId: string | null;
  promoAssetPreview: string | null;
  promoUrl: string | null;
  promoLabel: string | null;
  sections: MegaMenuSection[];
}

export interface MegaMenuItem {
  label: string;
  url: string | null;
  collectionSlug: string | null;
  excludeFromNav: boolean;
  columns: MegaMenuColumn[];
}

export interface MegaMenuData {
  getMegaMenu: {
    id: string;
    name: string;
    slug: string;
    items: MegaMenuItem[];
  } | null;
}
