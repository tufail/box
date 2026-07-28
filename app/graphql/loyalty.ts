// Field shapes match the authoritative loyalty plugin source
// (D:\others\ecom\proteinhouse\src\loyalty) — a points-based loyalty + referral
// system where redeemed points become spendable WALLET BALANCE (minor currency
// units), not a discount coupon. Wallet balance is spent at checkout through a
// real Vendure PaymentMethodHandler (code "loyalty-wallet"), so it already
// shows up in our existing generic eligiblePaymentMethods list — no special
// checkout UI needed for that part.
//
// Note: the local dev backend (localhost:3000) this was checked against did
// NOT expose walletBalance / this exact redemption shape when introspected —
// it may be running an older/different build. This file matches the plugin
// source as instructed; re-verify against the live schema once the backend is
// confirmed up to date.

export interface LoyaltyAccount {
	id: string;
	pointsBalance: number;
	lifetimePoints: number;
	walletBalance: number;
	referralCode: string | null;
	pendingPoints: number;
}

export interface LoyaltyTransaction {
	id: string;
	createdAt: string;
	type: string;
	points: number;
	balanceAfter: number | null;
	orderId: string | null;
	description: string | null;
	status: string;
}

export interface LoyaltyRedemptionResult {
	points: number;
	/** Minor currency units credited to the wallet */
	walletCreditAmount: number;
	/** Wallet balance after this redemption, in minor currency units */
	walletBalance: number;
}

export interface Referral {
	id: string;
	createdAt: string;
	referrerCustomerId: string;
	refereeCustomerId: string;
	status: string;
	rewardedAt: string | null;
}

export interface MyLoyaltyAccountData {
	myLoyaltyAccount: LoyaltyAccount;
}

export interface MyLoyaltyTransactionsData {
	myLoyaltyTransactions: {
		items: LoyaltyTransaction[];
		totalItems: number;
	};
}

export interface MyReferralCodeData {
	myReferralCode: string;
}

export interface RedeemLoyaltyPointsData {
	redeemLoyaltyPoints: LoyaltyRedemptionResult;
}

export interface ApplyReferralCodeData {
	applyReferralCode: Referral;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const GET_LOYALTY_ACCOUNT_QUERY = `
	query MyLoyaltyAccount {
		myLoyaltyAccount {
			id
			pointsBalance
			lifetimePoints
			walletBalance
			referralCode
			pendingPoints
		}
	}
`;

export const GET_LOYALTY_TRANSACTIONS_QUERY = `
	query MyLoyaltyTransactions($skip: Int, $take: Int) {
		myLoyaltyTransactions(options: { skip: $skip, take: $take }) {
			items {
				id
				createdAt
				type
				points
				balanceAfter
				orderId
				description
				status
			}
			totalItems
		}
	}
`;

// Guaranteed non-null (auto-creates the code on first call) — prefer this over
// LoyaltyAccount.referralCode, which can be null until a code has been generated.
export const GET_MY_REFERRAL_CODE_QUERY = `
	query MyReferralCode {
		myReferralCode
	}
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const REDEEM_LOYALTY_POINTS_MUTATION = `
	mutation RedeemLoyaltyPoints($points: Int!) {
		redeemLoyaltyPoints(points: $points) {
			points
			walletCreditAmount
			walletBalance
		}
	}
`;

export const APPLY_REFERRAL_CODE_MUTATION = `
	mutation ApplyReferralCode($code: String!) {
		applyReferralCode(code: $code) {
			id
			status
		}
	}
`;
