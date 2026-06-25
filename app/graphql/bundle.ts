// ─── Bundle offer (product page) ─────────────────────────────────────────────

export interface BundleOfferItem {
  productVariantId: string;
  variantName: string;
  priceWithTax: number;
  currencyCode: string;
  stockLevel: string;
  productName: string;
  productSlug: string;
  featuredAsset: { preview: string } | null;
  requiredQuantity: number;
  required: boolean;
  sortOrder: number;
}

export type BundleDiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_PRODUCT" | "CHEAPEST_FREE";

export interface BundleOffer {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  bundleType: string;
  discountType: BundleDiscountType;
  discountValue: number;
  items: BundleOfferItem[];
}

export interface ProductBundleOffersData {
  productBundleOffers: BundleOffer[];
}

export const PRODUCT_BUNDLE_OFFERS_QUERY = `
  query ProductBundleOffers($productId: ID!) {
    productBundleOffers(productId: $productId) {
      id
      name
      description
      imageUrl
      bundleType
      discountType
      discountValue
      items {
        productVariantId
        variantName
        priceWithTax
        currencyCode
        stockLevel
        featuredAsset { preview }
        productName
        productSlug
        stockLevel
        requiredQuantity
        required
        sortOrder
      }
    }
  }
`;

// ─── Add bundle to cart ───────────────────────────────────────────────────────

export interface AddBundleToCartResult {
  addBundleToCart: {
    bundleGroupId: string;
    bundleName: string;
    status: "COMPLETE" | "BROKEN" | "PENDING";
  };
}

export interface AddBundleToCartVariables {
  bundleDefinitionId: string;
  triggerVariantId: string;
  selectedVariantIds: string[];
}

export const ADD_BUNDLE_TO_CART_MUTATION = `
  mutation AddBundleToCart($bundleDefinitionId: ID!, $triggerVariantId: ID!, $selectedVariantIds: [ID!]!) {
    addBundleToCart(bundleDefinitionId: $bundleDefinitionId, triggerVariantId: $triggerVariantId, selectedVariantIds: $selectedVariantIds) {
      bundleGroupId
      bundleName
      status
    }
  }
`;

// ─── Bundle group (cart) ──────────────────────────────────────────────────────

export interface BundleGroup {
  bundleGroupId: string;
  bundleName: string;
  status: "COMPLETE" | "BROKEN" | "PENDING";
  discountType: BundleDiscountType;
  discountValue: number;
  discountAmount: number;
  expectedVariantIds: string[];
  missingVariants: { id: string; name: string }[];
}

export interface ActiveOrderBundlesData {
  activeOrderBundles: BundleGroup[];
}

export const ACTIVE_ORDER_BUNDLES_QUERY = `
  query ActiveOrderBundles {
    activeOrderBundles {
      bundleGroupId
      bundleName
      status
      discountType
      discountValue
      discountAmount
      expectedVariantIds
      missingVariants { id name }
    }
  }
`;

// ─── Restore broken bundle ────────────────────────────────────────────────────

export interface RestoreBundleResult {
  restoreBundle: {
    bundleGroupId: string;
    bundleName: string;
    status: string;
  };
}

export interface RestoreBundleVariables {
  bundleGroupId: string;
}

export const RESTORE_BUNDLE_MUTATION = `
  mutation RestoreBundle($bundleGroupId: ID!) {
    restoreBundle(bundleGroupId: $bundleGroupId) {
      bundleGroupId
      bundleName
      status
    }
  }
`;

// ─── Validate bundles after cart changes ──────────────────────────────────────

export interface ValidateOrderBundlesResult {
  validateOrderBundles: BundleGroup[];
}

export const VALIDATE_ORDER_BUNDLES_MUTATION = `
  mutation ValidateOrderBundles {
    validateOrderBundles {
      bundleGroupId
      bundleName
      status
      discountAmount
      missingVariants { id name }
    }
  }
`;

// ─── Discount display helper ──────────────────────────────────────────────────

export function formatBundleDiscount(discountType: BundleDiscountType, discountValue: number): string {
  switch (discountType) {
    case "PERCENTAGE": return `Save ${discountValue}%`;
    case "FIXED_AMOUNT": return `Save QAR ${(discountValue).toFixed(2)}`;
    default: return `Save ${discountValue}%`;
  }
}
