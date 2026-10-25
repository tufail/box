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

// Same list plus each area's own delivery fee (minor units, i.e. fils -- the backend's
// QatarShippingArea.price, which is exactly what the checkout's area-based calculator
// charges). Used by the product page's delivery estimate; kept as a separate query so the
// checkout/address pages' payloads don't grow.
export interface QatarShippingAreaWithPrice extends QatarShippingAreaItem {
  price: number;
}

export interface QatarShippingAreasWithPriceData {
  qatarShippingAreas: QatarShippingAreaWithPrice[];
}

export const GET_QATAR_SHIPPING_AREAS_WITH_PRICE_QUERY = `
  query GetQatarShippingAreasWithPrice {
    qatarShippingAreas {
      id
      zoneNumber
      nameEn
      nameAr
      price
    }
  }
`;

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
