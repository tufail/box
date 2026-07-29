// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "ATHLETE";

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
}

export interface WellnessPlanItem {
  variantId: string;
  variantName: string;
  variantSku: string;
  dosingInstructions: string;
  sortOrder: number;
}

export interface WellnessPlan {
  goalCode: string;
  generatedAt: string;
  items: WellnessPlanItem[];
}

export interface WellnessQuizOptionsData {
  wellnessGoals: WellnessGoal[];
  suggestedDietaryRestrictions: string[];
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
}

export interface SaveWellnessProfileResult {
  saveWellnessProfile: WellnessPlan;
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

// ─── Queries ─────────────────────────────────────────────────────────────────

export const WELLNESS_QUIZ_OPTIONS_QUERY = `
  query WellnessQuizOptions {
    wellnessGoals {
      code
      label
      description
    }
    suggestedDietaryRestrictions
  }
`;

export const MY_WELLNESS_PROFILE_QUERY = `
  query MyWellnessProfile {
    myWellnessProfile {
      goalCode
      activityLevel
      bodyWeightKg
      dietaryRestrictions
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
      }
    }
  }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const SAVE_WELLNESS_PROFILE_MUTATION = `
  mutation SaveWellnessProfile($input: WellnessProfileInput!) {
    saveWellnessProfile(input: $input) {
      goalCode
      generatedAt
      items {
        variantId
        variantName
        variantSku
        dosingInstructions
        sortOrder
      }
    }
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
