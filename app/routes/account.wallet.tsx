import { useState, useEffect } from "react";
import { redirect, useFetcher, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
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
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";

const TRANSACTIONS_PER_PAGE = 15;

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		txTypeLabel: {
			EARN_ORDER: "Order reward",
			REDEEM: "Redeemed to wallet",
			REFERRAL_BONUS: "Referral bonus",
			ADMIN_ADJUST: "Adjustment",
			EXPIRE: "Expired",
		} as Record<string, string>,
		redeemedNote: (points: number) => `You've redeemed ${points} points for`,
		walletBalanceOf: "of wallet balance.",
		newWalletBalance: (amount: string) => `New wallet balance: ${amount} — use it as a payment method at checkout.`,
		redeemMorePoints: "Redeem more points",
		redeemPoints: "Redeem Points",
		convertPointsNote: "Convert points into spendable wallet balance — use it as a payment method at checkout.",
		redeeming: "Redeeming…",
		redeem: "Redeem",
		available: (n: string) => `Available: ${n} points`,
		pendingApproval: "Pending approval",
		rejected: "Rejected",
		viewOrder: "View order",
		pts: "pts",
		bal: "Bal:",
		myWallet: "My Wallet",
		walletIntro: "Earn points on every order, redeem them for wallet balance, and spend it at checkout.",
		accountNotSetUp: "Your loyalty account isn't set up yet.",
		walletBalance: "Wallet Balance",
		spendableNote: "Spendable as a payment method at checkout",
		pointsBalance: "Points Balance",
		lifetimePoints: "Lifetime Points",
		pendingPoints: "Pending Points",
		awaitingApproval: "Awaiting approval — not yet redeemable",
		yourReferralCode: "Your referral code",
		shareReferralNote: "Share it with friends to earn points when they shop.",
		transactionHistory: "Transaction History",
		noTransactionsYet: "No transactions yet.",
		showingOf: (shown: number, total: number) => `Showing ${shown} of ${total} transactions.`,
	},
	ar: {
		txTypeLabel: {
			EARN_ORDER: "مكافأة الطلب",
			REDEEM: "تم استبداله بالمحفظة",
			REFERRAL_BONUS: "مكافأة الإحالة",
			ADMIN_ADJUST: "تعديل",
			EXPIRE: "منتهي الصلاحية",
		} as Record<string, string>,
		redeemedNote: (points: number) => `لقد استبدلت ${points} نقطة مقابل`,
		walletBalanceOf: "من رصيد المحفظة.",
		newWalletBalance: (amount: string) => `رصيد المحفظة الجديد: ${amount} — استخدمه كوسيلة دفع عند الدفع.`,
		redeemMorePoints: "استبدال المزيد من النقاط",
		redeemPoints: "استبدال النقاط",
		convertPointsNote: "حوّل النقاط إلى رصيد محفظة قابل للإنفاق — استخدمه كوسيلة دفع عند الدفع.",
		redeeming: "جارٍ الاستبدال…",
		redeem: "استبدال",
		available: (n: string) => `المتاح: ${n} نقطة`,
		pendingApproval: "بانتظار الموافقة",
		rejected: "مرفوض",
		viewOrder: "عرض الطلب",
		pts: "نقطة",
		bal: "الرصيد:",
		myWallet: "محفظتي",
		walletIntro: "اكسب نقاطًا مع كل طلب، استبدلها برصيد في المحفظة، وأنفقه عند الدفع.",
		accountNotSetUp: "لم يتم إعداد حساب الولاء الخاص بك بعد.",
		walletBalance: "رصيد المحفظة",
		spendableNote: "قابل للإنفاق كوسيلة دفع عند الدفع",
		pointsBalance: "رصيد النقاط",
		lifetimePoints: "إجمالي النقاط",
		pendingPoints: "النقاط المعلّقة",
		awaitingApproval: "بانتظار الموافقة — غير قابلة للاستبدال بعد",
		yourReferralCode: "رمز الإحالة الخاص بك",
		shareReferralNote: "شاركه مع أصدقائك لكسب نقاط عند تسوقهم.",
		transactionHistory: "سجل المعاملات",
		noTransactionsYet: "لا توجد معاملات بعد.",
		showingOf: (shown: number, total: number) => `عرض ${shown} من ${total} معاملة.`,
	},
} as const;

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const locale = getLocaleFromPathname(new URL(request.url).pathname);
	try {
		const { data: profileData } = await graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request });
		if (!profileData.activeCustomer) return redirect(localizePath("/", locale));

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
		return redirect(localizePath("/", locale));
	}
}

export function meta() {
	return [{ title: "My Wallet — NutriBox" }, { name: "robots", content: "noindex" }];
}

function formatDate(iso: string, locale: Locale) {
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

// ── Redeem points panel ─────────────────────────────────────────────────────

function RedeemPanel({ pointsBalance, onRedeemed }: { pointsBalance: number; onRedeemed: (result: LoyaltyRedemptionResult) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
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
					{t.redeemedNote(result.points)}{" "}
					<span className="font-semibold text-emerald-700">{formatPrice(result.walletCreditAmount, "QAR", locale)}</span> {t.walletBalanceOf}
				</p>
				<p className="text-xs text-gray-400 mt-2">{t.newWalletBalance(formatPrice(result.walletBalance, "QAR", locale))}</p>
				<button type="button" onClick={() => setResult(null)} className="mt-4 text-xs font-medium text-emerald-700 hover:underline">
					{t.redeemMorePoints}
				</button>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl shadow-sm p-6">
			<div className="flex items-center gap-2 mb-1">
				<Gift size={18} className="text-emerald-600" />
				<h2 className="text-base font-semibold text-gray-900">{t.redeemPoints}</h2>
			</div>
			<p className="text-sm text-gray-500 mb-4">{t.convertPointsNote}</p>

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
					{loading ? t.redeeming : t.redeem}
				</button>
			</div>
			<p className="text-xs text-gray-400 mt-2">{t.available(pointsBalance.toLocaleString())}</p>
			{error && <p className="text-xs text-red-600 mt-2">{error}</p>}
		</div>
	);
}

// ── Transaction row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const isCredit = tx.points >= 0;
	return (
		<div className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-b-0">
			<div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
				{isCredit ? <ArrowUpRight size={16} className="rtl:rotate-90" /> : <ArrowDownRight size={16} className="rtl:rotate-90" />}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<p className="text-sm font-medium text-gray-900 truncate">{tx.description ?? t.txTypeLabel[tx.type] ?? tx.type}</p>
					{tx.status === "PENDING" && <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{t.pendingApproval}</span>}
					{tx.status === "REJECTED" && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">{t.rejected}</span>}
				</div>
				<p className="text-xs text-gray-400 mt-0.5">
					{formatDate(tx.createdAt, locale)}
					{tx.orderId && (
						<>
							{" · "}
							<Link to={`/account/orders/${tx.orderId}`} className="text-emerald-600 hover:underline">
								{t.viewOrder}
							</Link>
						</>
					)}
				</p>
			</div>
			<div className="text-end shrink-0">
				<p className={`text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
					{isCredit ? "+" : ""}
					{tx.points} {t.pts}
				</p>
				{tx.balanceAfter !== null && <p className="text-xs text-gray-400">{t.bal} {tx.balanceAfter}</p>}
			</div>
		</div>
	);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WalletPage({ loaderData }: Route.ComponentProps) {
	const { customer, account, transactions, totalTransactions, referralCode } = loaderData;
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
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
					<h1 className="text-lg font-semibold text-gray-900">{t.myWallet}</h1>
					<p className="text-sm text-gray-500 mt-0.5">{t.walletIntro}</p>
				</div>

				{!account ? (
					<div className="bg-white rounded-2xl shadow-sm p-10 text-center">
						<Coins size={28} className="mx-auto text-gray-300 mb-3" />
						<p className="text-gray-500 text-sm">{t.accountNotSetUp}</p>
					</div>
				) : (
					<>
						{/* Wallet balance — the headline, spendable number */}
						<div className="bg-emerald-600 rounded-2xl p-6 text-white">
							<div className="flex items-center gap-2 text-emerald-100 text-xs font-medium uppercase tracking-wide mb-2">
								<Wallet size={14} /> {t.walletBalance}
							</div>
							<p className="text-3xl font-bold">{formatPrice(walletBalance, "QAR", locale)}</p>
							<p className="text-emerald-100 text-xs mt-1">{t.spendableNote}</p>
						</div>

						{/* Stat cards */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="bg-white rounded-2xl shadow-sm p-5">
								<div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
									<Coins size={14} /> {t.pointsBalance}
								</div>
								<p className="text-2xl font-bold text-gray-900">{pointsBalance.toLocaleString()}</p>
							</div>
							<div className="bg-white rounded-2xl shadow-sm p-5">
								<div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
									<Sparkles size={14} /> {t.lifetimePoints}
								</div>
								<p className="text-2xl font-bold text-gray-900">{account.lifetimePoints.toLocaleString()}</p>
							</div>
							<div className="bg-white rounded-2xl shadow-sm p-5">
								<div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
									<Clock size={14} /> {t.pendingPoints}
								</div>
								<p className="text-2xl font-bold text-gray-900">{account.pendingPoints.toLocaleString()}</p>
								{account.pendingPoints > 0 && <p className="text-xs text-gray-400 mt-1">{t.awaitingApproval}</p>}
							</div>
						</div>

						{/* Referral code */}
						{referralCode && (
							<div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
								<div>
									<p className="text-sm font-semibold text-gray-900">{t.yourReferralCode}</p>
									<p className="text-xs text-gray-500 mt-0.5">{t.shareReferralNote}</p>
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
							<h2 className="text-base font-semibold text-gray-900 mb-1">{t.transactionHistory}</h2>
							{transactions.length === 0 ? (
								<p className="text-sm text-gray-400 py-6 text-center">{t.noTransactionsYet}</p>
							) : (
								<div>
									{transactions.map((tx) => (
										<TransactionRow key={tx.id} tx={tx} />
									))}
								</div>
							)}
							{totalTransactions > transactions.length && <p className="text-xs text-gray-400 text-center mt-4">{t.showingOf(transactions.length, totalTransactions)}</p>}
						</div>
					</>
				)}
			</div>
		</AccountLayout>
	);
}
