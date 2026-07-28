import { useState, useEffect } from "react";
import { redirect, useFetcher, Link } from "react-router";
import type { Route } from "./+types/account.wallet";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData } from "~/graphql/account";
import {
	GET_LOYALTY_ACCOUNT_QUERY,
	GET_LOYALTY_TRANSACTIONS_QUERY,
	GET_MY_REFERRAL_CODE_QUERY,
	type MyLoyaltyAccountData,
	type MyLoyaltyTransactionsData,
	type MyReferralCodeData,
	type LoyaltyTransaction,
	type LoyaltyRedemptionResult,
} from "~/graphql/loyalty";
import AccountLayout from "~/layouts/AccountLayout";
import { Coins, Wallet, Gift, Clock, Copy, Check, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

const TRANSACTIONS_PER_PAGE = 15;

// LoyaltyTransactionType -> human label (see proteinhouse/src/loyalty/types.ts)
const TX_TYPE_LABEL: Record<string, string> = {
	EARN_ORDER: "Order reward",
	REDEEM: "Redeemed to wallet",
	REFERRAL_BONUS: "Referral bonus",
	ADMIN_ADJUST: "Adjustment",
	EXPIRE: "Expired",
};

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	try {
		const { data: profileData } = await graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request });
		if (!profileData.activeCustomer) return redirect("/");

		const [accountResult, txResult, referralResult] = await Promise.allSettled([
			graphqlRequest<MyLoyaltyAccountData>(env, GET_LOYALTY_ACCOUNT_QUERY, undefined, { request }),
			graphqlRequest<MyLoyaltyTransactionsData>(env, GET_LOYALTY_TRANSACTIONS_QUERY, { skip: 0, take: TRANSACTIONS_PER_PAGE }, { request }),
			graphqlRequest<MyReferralCodeData>(env, GET_MY_REFERRAL_CODE_QUERY, undefined, { request }),
		]);

		const account = accountResult.status === "fulfilled" ? accountResult.value.data.myLoyaltyAccount : null;
		const transactions = txResult.status === "fulfilled" ? txResult.value.data.myLoyaltyTransactions.items : [];
		const totalTransactions = txResult.status === "fulfilled" ? txResult.value.data.myLoyaltyTransactions.totalItems : 0;
		const referralCode = referralResult.status === "fulfilled" ? referralResult.value.data.myReferralCode : null;

		return { customer: profileData.activeCustomer, account, transactions, totalTransactions, referralCode };
	} catch {
		return redirect("/");
	}
}

export function meta() {
	return [{ title: "My Wallet — NutriBox" }, { name: "robots", content: "noindex" }];
}

function formatQAR(cents: number) {
	return `QAR ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// ── Redeem points panel ─────────────────────────────────────────────────────

function RedeemPanel({ pointsBalance, onRedeemed }: { pointsBalance: number; onRedeemed: (result: LoyaltyRedemptionResult) => void }) {
	const [points, setPoints] = useState(100);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<LoyaltyRedemptionResult | null>(null);
	const fetcher = useFetcher<{ result?: LoyaltyRedemptionResult; error?: string }>();
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.error) {
			setError(fetcher.data.error);
			return;
		}
		if (fetcher.data.result) {
			setResult(fetcher.data.result);
			setError(null);
			onRedeemed(fetcher.data.result);
		}
	}, [fetcher.data, fetcher.state]);

	function handleRedeem() {
		if (points <= 0 || points > pointsBalance) return;
		setError(null);
		fetcher.submit({ _intent: "redeemPoints", points: String(points) }, { method: "post", encType: "application/json", action: "/api/loyalty" });
	}

	if (result) {
		return (
			<div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
				<Sparkles size={28} className="mx-auto text-emerald-600 mb-2" />
				<p className="text-sm text-gray-600">
					You've redeemed <span className="font-semibold text-gray-900">{result.points} points</span> for{" "}
					<span className="font-semibold text-emerald-700">{formatQAR(result.walletCreditAmount)}</span> of wallet balance.
				</p>
				<p className="text-xs text-gray-400 mt-2">New wallet balance: {formatQAR(result.walletBalance)} — use it as a payment method at checkout.</p>
				<button type="button" onClick={() => setResult(null)} className="mt-4 text-xs font-medium text-emerald-700 hover:underline">
					Redeem more points
				</button>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl shadow-sm p-6">
			<div className="flex items-center gap-2 mb-1">
				<Gift size={18} className="text-emerald-600" />
				<h2 className="text-base font-semibold text-gray-900">Redeem Points</h2>
			</div>
			<p className="text-sm text-gray-500 mb-4">Convert points into spendable wallet balance — use it as a payment method at checkout.</p>

			<div className="flex items-center gap-3">
				<input
					type="number"
					min={1}
					max={pointsBalance}
					value={points}
					onChange={(e) => setPoints(Math.max(0, Number(e.target.value)))}
					className="w-32 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
				/>
				<button
					type="button"
					onClick={handleRedeem}
					disabled={loading || points <= 0 || points > pointsBalance}
					className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? "Redeeming…" : "Redeem"}
				</button>
			</div>
			<p className="text-xs text-gray-400 mt-2">Available: {pointsBalance.toLocaleString()} points</p>
			{error && <p className="text-xs text-red-600 mt-2">{error}</p>}
		</div>
	);
}

// ── Transaction row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
	const isCredit = tx.points >= 0;
	return (
		<div className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-b-0">
			<div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
				{isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<p className="text-sm font-medium text-gray-900 truncate">{tx.description ?? TX_TYPE_LABEL[tx.type] ?? tx.type}</p>
					{tx.status === "PENDING" && <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Pending approval</span>}
					{tx.status === "REJECTED" && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Rejected</span>}
				</div>
				<p className="text-xs text-gray-400 mt-0.5">
					{formatDate(tx.createdAt)}
					{tx.orderId && (
						<>
							{" · "}
							<Link to={`/account/orders/${tx.orderId}`} className="text-emerald-600 hover:underline">
								View order
							</Link>
						</>
					)}
				</p>
			</div>
			<div className="text-right shrink-0">
				<p className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
					{isCredit ? "+" : ""}
					{tx.points} pts
				</p>
				{tx.balanceAfter !== null && <p className="text-xs text-gray-400">Bal: {tx.balanceAfter}</p>}
			</div>
		</div>
	);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WalletPage({ loaderData }: Route.ComponentProps) {
	const { customer, account, transactions, totalTransactions, referralCode } = loaderData;
	const [pointsBalance, setPointsBalance] = useState(account?.pointsBalance ?? 0);
	const [walletBalance, setWalletBalance] = useState(account?.walletBalance ?? 0);
	const [copiedReferral, setCopiedReferral] = useState(false);

	function handleRedeemed(result: LoyaltyRedemptionResult) {
		setPointsBalance((prev) => Math.max(0, prev - result.points));
		setWalletBalance(result.walletBalance);
	}

	function copyReferral() {
		if (!referralCode) return;
		navigator.clipboard.writeText(referralCode).then(() => {
			setCopiedReferral(true);
			setTimeout(() => setCopiedReferral(false), 2000);
		});
	}

	return (
		<AccountLayout customer={customer}>
			<div className="space-y-6">
				<div>
					<h1 className="text-lg font-semibold text-gray-900">My Wallet</h1>
					<p className="text-sm text-gray-500 mt-0.5">Earn points on every order, redeem them for wallet balance, and spend it at checkout.</p>
				</div>

				{!account ? (
					<div className="bg-white rounded-2xl shadow-sm p-10 text-center">
						<Coins size={28} className="mx-auto text-gray-300 mb-3" />
						<p className="text-gray-500 text-sm">Your loyalty account isn't set up yet.</p>
					</div>
				) : (
					<>
						{/* Wallet balance — the headline, spendable number */}
						<div className="bg-emerald-600 rounded-2xl p-6 text-white">
							<div className="flex items-center gap-2 text-emerald-100 text-xs font-medium uppercase tracking-wide mb-2">
								<Wallet size={14} /> Wallet Balance
							</div>
							<p className="text-3xl font-bold">{formatQAR(walletBalance)}</p>
							<p className="text-emerald-100 text-xs mt-1">Spendable as a payment method at checkout</p>
						</div>

						{/* Stat cards */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="bg-white rounded-2xl shadow-sm p-5">
								<div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
									<Coins size={14} /> Points Balance
								</div>
								<p className="text-2xl font-bold text-gray-900">{pointsBalance.toLocaleString()}</p>
							</div>
							<div className="bg-white rounded-2xl shadow-sm p-5">
								<div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
									<Sparkles size={14} /> Lifetime Points
								</div>
								<p className="text-2xl font-bold text-gray-900">{account.lifetimePoints.toLocaleString()}</p>
							</div>
							<div className="bg-white rounded-2xl shadow-sm p-5">
								<div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
									<Clock size={14} /> Pending Points
								</div>
								<p className="text-2xl font-bold text-gray-900">{account.pendingPoints.toLocaleString()}</p>
								{account.pendingPoints > 0 && <p className="text-xs text-gray-400 mt-1">Awaiting approval — not yet redeemable</p>}
							</div>
						</div>

						{/* Referral code */}
						{referralCode && (
							<div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
								<div>
									<p className="text-sm font-semibold text-gray-900">Your referral code</p>
									<p className="text-xs text-gray-500 mt-0.5">Share it with friends to earn points when they shop.</p>
								</div>
								<button type="button" onClick={copyReferral} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-mono font-bold text-gray-800 hover:border-emerald-400 transition-colors">
									{referralCode}
									{copiedReferral ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-gray-400" />}
								</button>
							</div>
						)}

						{/* Redeem panel */}
						<RedeemPanel pointsBalance={pointsBalance} onRedeemed={handleRedeemed} />

						{/* Transaction history */}
						<div className="bg-white rounded-2xl shadow-sm p-6">
							<h2 className="text-base font-semibold text-gray-900 mb-1">Transaction History</h2>
							{transactions.length === 0 ? (
								<p className="text-sm text-gray-400 py-6 text-center">No transactions yet.</p>
							) : (
								<div>
									{transactions.map((tx) => (
										<TransactionRow key={tx.id} tx={tx} />
									))}
								</div>
							)}
							{totalTransactions > transactions.length && <p className="text-xs text-gray-400 text-center mt-4">Showing {transactions.length} of {totalTransactions} transactions.</p>}
						</div>
					</>
				)}
			</div>
		</AccountLayout>
	);
}
