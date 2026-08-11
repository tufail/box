// Field shapes match the subscriptions plugin shop API extensions
// (D:\others\ecom\nutrient\src\plugins\subscriptions\api\subscription-shop.extensions.ts).

export type SubscriptionInterval = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";

export type SubscriptionState = "PENDING" | "TRIAL" | "ACTIVE" | "PAUSED" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export type SubscriptionCycleState = "PENDING" | "AWAITING_PAYMENT" | "SUCCESS" | "FAILED" | "SKIPPED";

export interface SubscriptionPlan {
	id: string;
	name: string;
	description: string | null;
	interval: SubscriptionInterval;
	intervalCount: number;
	discountPercent: number;
	trialDays: number;
	maxCycles: number;
	isActive: boolean;
	sortOrder: number;
}

export interface SubscriptionCyclePublic {
	id: string;
	createdAt: string;
	cycleNumber: number;
	state: SubscriptionCycleState;
	scheduledAt: string;
	processedAt: string | null;
	amount: number;
	currencyCode: string;
}

export interface CustomerSubscription {
	id: string;
	createdAt: string;
	updatedAt: string;
	plan: SubscriptionPlan;
	productVariantId: string;
	quantity: number;
	state: SubscriptionState;
	unitPrice: number;
	currencyCode: string;
	nextBillingDate: string | null;
	currentCycleNumber: number;
	cancelledAt: string | null;
	pausedAt: string | null;
	pausedUntil: string | null;
	trialEndsAt: string | null;
	cycles: SubscriptionCyclePublic[];
}

export interface AvailableSubscriptionPlansData {
	availableSubscriptionPlans: SubscriptionPlan[];
}

export interface MySubscriptionsData {
	mySubscriptions: CustomerSubscription[];
}

export interface CancelMySubscriptionData {
	cancelMySubscription: CustomerSubscription;
}

export interface PauseMySubscriptionData {
	pauseMySubscription: CustomerSubscription;
}

export interface ResumeMySubscriptionData {
	resumeMySubscription: CustomerSubscription;
}

// CustomerSubscription only carries productVariantId (a scalar) — this is used
// to separately look up display info (name/image/product link) for the
// account "My Subscriptions" page.
export interface SubscriptionVariantInfo {
	id: string;
	name: string;
	sku: string;
	featuredAsset: { preview: string } | null;
	customFields: { slug: string | null } | null;
	product: { name: string; slug: string; featuredAsset: { preview: string } | null };
}

export interface SubscriptionVariantData {
	productVariant: SubscriptionVariantInfo | null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

const SUBSCRIPTION_PLAN_FIELDS = `
	id
	name
	description
	interval
	intervalCount
	discountPercent
	trialDays
	maxCycles
	isActive
	sortOrder
`;

export const AVAILABLE_SUBSCRIPTION_PLANS_QUERY = `
	query AvailableSubscriptionPlans($productVariantId: ID!) {
		availableSubscriptionPlans(productVariantId: $productVariantId) {
			${SUBSCRIPTION_PLAN_FIELDS}
		}
	}
`;

export const MY_SUBSCRIPTIONS_QUERY = `
	query MySubscriptions {
		mySubscriptions {
			id
			createdAt
			updatedAt
			plan { ${SUBSCRIPTION_PLAN_FIELDS} }
			productVariantId
			quantity
			state
			unitPrice
			currencyCode
			nextBillingDate
			currentCycleNumber
			cancelledAt
			pausedAt
			pausedUntil
			trialEndsAt
			cycles {
				id
				createdAt
				cycleNumber
				state
				scheduledAt
				processedAt
				amount
				currencyCode
			}
		}
	}
`;

export const SUBSCRIPTION_VARIANT_QUERY = `
	query SubscriptionVariant($id: ID!) {
		productVariant(id: $id) {
			id
			name
			sku
			featuredAsset { preview }
			customFields { slug }
			product { name slug featuredAsset { preview } }
		}
	}
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const CANCEL_MY_SUBSCRIPTION_MUTATION = `
	mutation CancelMySubscription($id: ID!, $reason: String) {
		cancelMySubscription(id: $id, reason: $reason) {
			id
			state
			cancelledAt
		}
	}
`;

export const PAUSE_MY_SUBSCRIPTION_MUTATION = `
	mutation PauseMySubscription($id: ID!, $until: DateTime) {
		pauseMySubscription(id: $id, until: $until) {
			id
			state
			pausedAt
			pausedUntil
		}
	}
`;

export const RESUME_MY_SUBSCRIPTION_MUTATION = `
	mutation ResumeMySubscription($id: ID!) {
		resumeMySubscription(id: $id) {
			id
			state
			nextBillingDate
		}
	}
`;

export interface SubscriptionRenewalOrder {
	orderCode: string;
	totalWithTax: number;
	currencyCode: string;
}

export interface InitiateSubscriptionRenewalData {
	initiateSubscriptionRenewal: SubscriptionRenewalOrder;
}

export const INITIATE_SUBSCRIPTION_RENEWAL_MUTATION = `
	mutation InitiateSubscriptionRenewal($subscriptionId: ID!, $cycleId: ID) {
		initiateSubscriptionRenewal(subscriptionId: $subscriptionId, cycleId: $cycleId) {
			orderCode
			totalWithTax
			currencyCode
		}
	}
`;
