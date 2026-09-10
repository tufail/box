// The live counterpart to app/constants/qatar-areas.ts's static list -- backed by the
// nutrient backend's `qatar_shipping_area` table (see nutrient/src/plugins/qatar-shipping).
// AreaSelect needs this (not the static file) as its actual data source because pricing
// is keyed on the backend's own row `id`, which the static file has no way to know.
export interface QatarShippingAreaItem {
  id: string;
  zoneNumber: number;
  nameEn: string;
  nameAr: string;
}

export interface QatarShippingAreasData {
  qatarShippingAreas: QatarShippingAreaItem[];
}

export const GET_QATAR_SHIPPING_AREAS_QUERY = `
  query GetQatarShippingAreas {
    qatarShippingAreas {
      id
      zoneNumber
      nameEn
      nameAr
    }
  }
`;
