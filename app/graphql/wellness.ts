// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "ATHLETE";
export type WellnessGender = "MEN" | "WOMEN" | "NO_PREFERENCE";
export type WellnessTier = "CORE" | "COMPLETE";

export interface WellnessGoal {
  code: string;
  label: string;
  description: string;
}

export interface WellnessProfile {
  goalCode: string;
  activityLevel: ActivityLevel;
  bodyWeightKg: number;
  dietaryRestrictions: string[];
  genderPreference: WellnessGender;
  trainingStyles: string[];
}

export interface WellnessPlanItem {
  variantId: string;
  variantName: string;
  variantSku: string;
  dosingInstructions: string;
  sortOrder: number;
  tier: WellnessTier;
  // Backfilled from the catalog at read time -- absent for a variant that's
  // since been deleted/disabled (the item still renders, just without a
  // product-card visual). Not present at all until the backend that populates
  // these fields is deployed.
  productId?: string | null;
  productSlug?: string | null;
  variantSlug?: string | null;
  productAsset?: { id: string; preview: string } | null;
  priceWithTax?: number | null;
  currencyCode?: string | null;
  inStock?: boolean | null;
  stockQty?: number | null;
}

export interface WellnessPlan {
  goalCode: string;
  generatedAt: string;
  items: WellnessPlanItem[];
}

export interface WellnessQuizOptionsData {
  wellnessGoals: WellnessGoal[];
  suggestedDietaryRestrictions: string[];
  suggestedTrainingStyles: string[];
}

export interface MyWellnessProfileData {
  myWellnessProfile: WellnessProfile | null;
  myWellnessPlan: WellnessPlan | null;
}

export interface WellnessProfileInput {
  goalCode: string;
  activityLevel: ActivityLevel;
  bodyWeightKg: number;
  dietaryRestrictions: string[];
  genderPreference?: WellnessGender;
  trainingStyles?: string[];
}

export interface SaveWellnessProfileResult {
  saveWellnessProfile: WellnessPlan;
}

export interface PreviewWellnessPlanResult {
  previewWellnessPlan: WellnessPlan;
}

export interface WellnessCartOrder {
  id: string;
  code: string;
  totalWithTax: number;
  lines: {
    id: string;
    quantity: number;
    productVariant: { id: string; name: string; sku: string };
  }[];
}

export interface AddWellnessPlanToCartResult {
  addWellnessPlanToCart: WellnessCartOrder;
}

export interface AddWellnessItemsToCartResult {
  addWellnessItemsToCart: WellnessCartOrder;
}

export interface WellnessCartItemInput {
  variantId: string;
  quantity: number;
}

export interface CaptureWellnessLeadInput {
  firstName?: string;
  email: string;
  marketingOptIn?: boolean;
  goalCode?: string;
}

export interface CaptureWellnessLeadResult {
  captureWellnessLead: boolean;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const WELLNESS_QUIZ_OPTIONS_QUERY = `
  query WellnessQuizOptions {
    wellnessGoals {
      code
      label
      description
    }
    suggestedDietaryRestrictions
    suggestedTrainingStyles
  }
`;

export const MY_WELLNESS_PROFILE_QUERY = `
  query MyWellnessProfile {
    myWellnessProfile {
      goalCode
      activityLevel
      bodyWeightKg
      dietaryRestrictions
      genderPreference
      trainingStyles
    }
    myWellnessPlan {
      goalCode
      generatedAt
      items {
        variantId
        variantName
        variantSku
        dosingInstructions
        sortOrder
        tier
        productId
        productSlug
        variantSlug
        productAsset { id preview }
        priceWithTax
        currencyCode
        inStock
        stockQty
      }
    }
  }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

const WELLNESS_PLAN_FIELDS = `
  goalCode
  generatedAt
  items {
    variantId
    variantName
    variantSku
    dosingInstructions
    sortOrder
    tier
    productId
    productSlug
    variantSlug
    productAsset { id preview }
    priceWithTax
    currencyCode
    inStock
    stockQty
  }
`;

export const SAVE_WELLNESS_PROFILE_MUTATION = `
  mutation SaveWellnessProfile($input: WellnessProfileInput!) {
    saveWellnessProfile(input: $input) { ${WELLNESS_PLAN_FIELDS} }
  }
`;

// Guest-safe: computes a plan from the given answers without saving anything.
export const PREVIEW_WELLNESS_PLAN_MUTATION = `
  mutation PreviewWellnessPlan($input: WellnessProfileInput!) {
    previewWellnessPlan(input: $input) { ${WELLNESS_PLAN_FIELDS} }
  }
`;

export const ADD_WELLNESS_PLAN_TO_CART_MUTATION = `
  mutation AddWellnessPlanToCart {
    addWellnessPlanToCart {
      id
      code
      totalWithTax
      lines {
        id
        quantity
        productVariant { id name sku }
      }
    }
  }
`;

// Guest-safe: adds the given variant/quantity pairs (from a preview result) to the session's active order.
export const ADD_WELLNESS_ITEMS_TO_CART_MUTATION = `
  mutation AddWellnessItemsToCart($items: [WellnessCartItemInput!]!) {
    addWellnessItemsToCart(items: $items) {
      id
      code
      totalWithTax
      lines {
        id
        quantity
        productVariant { id name sku }
      }
    }
  }
`;

// Guest-safe: captures a marketing lead (email + opt-in) from someone who took the quiz.
export const CAPTURE_WELLNESS_LEAD_MUTATION = `
  mutation CaptureWellnessLead($input: WellnessLeadInput!) {
    captureWellnessLead(input: $input)
  }
`;
