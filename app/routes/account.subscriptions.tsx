import { useEffect, useState } from "react";
import { redirect, useFetcher, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/account.subscriptions";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData } from "~/graphql/account";
import {
	MY_SUBSCRIPTIONS_QUERY,
	SUBSCRIPTION_VARIANT_QUERY,
	type MySubscriptionsData,
	type CustomerSubscription,
	type SubscriptionPlan,
	type SubscriptionState,
	type SubscriptionVariantData,
	type SubscriptionVariantInfo,
} from "~/graphql/subscription";
import AccountLayout from "~/layouts/AccountLayout";
import { RefreshCw, Package, PauseCircle, PlayCircle, XCircle, Clock } from "lucide-react";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const locale = getLocaleFromPathname(new URL(request.url).pathname);
	const vendureBase = (env.VENDURE_SHOP_API ?? "http://localhost:3000/shop-api").replace("/shop-api", "");

	try {
		const { data: profileData } = await graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request });
		if (!profileData.activeCustomer) return redirect(localizePath("/", locale));

		const { data: subsData } = await graphqlRequest<MySubscriptionsData>(env, MY_SUBSCRIPTIONS_QUERY, undefined, { request }).catch(() => ({ data: { mySubscriptions: [] } }));
		const subscriptions = subsData.mySubscriptions ?? [];

		// CustomerSubscription only carries productVariantId — look up display
		// info (name/image) for each distinct variant referenced.
		const variantIds = [...new Set(subscriptions.map((s) => s.productVariantId))];
		const variantEntries = await Promise.all(
			variantIds.map(async (id) => {
				try {
					const { data } = await graphqlRequest<SubscriptionVariantData>(env, SUBSCRIPTION_VARIANT_QUERY, { id }, { request });
					return [id, data.productVariant] as const;
				} catch {
					return [id, null] as const;
				}
			})
		);
		const variantsById = Object.fromEntries(variantEntries.filter((e): e is [string, SubscriptionVariantInfo] => e[1] !== null));

		const renewalError = new URL(request.url).searchParams.get("renewalError");

		return { customer: profileData.activeCustomer, subscriptions, variantsById, vendureBase, renewalError };
	} catch {
		return redirect(localizePath("/", locale));
	}
}

export function meta() {
	return [{ title: "My Subscriptions — NutriBox" }, { name: "robots", content: "noindex" }];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "My Subscriptions",
		subtitle: (n: number) => `${n} subscription${n !== 1 ? "s" : ""}`,
		stateLabels: {
			PENDING: "Pending",
			TRIAL: "Free Trial",
			ACTIVE: "Active",
			PAUSED: "Paused",
			PAST_DUE: "Payment Due",
			CANCELLED: "Cancelled",
			EXPIRED: "Expired",
		} as Record<string, string>,
		noSubscriptionsYet: "No subscriptions yet",
		noSubscriptionsNote: "Subscribe & Save on eligible products to see them here.",
		startShopping: "Start Shopping",
		every: "Delivered every",
		nextBilling: (date: string) => `Next delivery: ${date}`,
		trialEnds: (date: string) => `Trial ends: ${date}`,
		cyclesCompleted: (n: number) => `${n} deliver${n !== 1 ? "ies" : "y"} completed`,
		qty: "Qty",
		pause: "Pause",
		resume: "Resume",
		cancel: "Cancel",
		cancelling: "Cancelling…",
		pausing: "Pausing…",
		resuming: "Resuming…",
		cancelQuestion: "Cancel this subscription?",
		keepIt: "Keep it",
		confirmCancel: "Yes, cancel",
	},
	ar: {
		title: "اشتراكاتي",
		subtitle: (n: number) => (n === 1 ? "اشتراك واحد" : n === 2 ? "اشتراكان" : `${n} اشتراكات`),
		stateLabels: {
			PENDING: "قيد الانتظار",
			TRIAL: "تجربة مجانية",
			ACTIVE: "نشط",
			PAUSED: "متوقف مؤقتًا",
			PAST_DUE: "دفعة مستحقة",
			CANCELLED: "ملغى",
			EXPIRED: "منتهي",
		} as Record<string, string>,
		noSubscriptionsYet: "لا توجد اشتراكات بعد",
		noSubscriptionsNote: "اشترك ووفّر على المنتجات المؤهلة لتظهر هنا.",
		startShopping: "ابدأ التسوق",
		every: "يتم التوصيل كل",
		nextBilling: (date: string) => `التوصيل القادم: ${date}`,
		trialEnds: (date: string) => `تنتهي التجربة: ${date}`,
		cyclesCompleted: (n: number) => `تم إتمام ${n} عملية توصيل`,
		qty: "الكمية",
		pause: "إيقاف مؤقت",
		resume: "استئناف",
		cancel: "إلغاء",
		cancelling: "جارٍ الإلغاء…",
		pausing: "جارٍ الإيقاف…",
		resuming: "جارٍ الاستئناف…",
		cancelQuestion: "هل تريد إلغاء هذا الاشتراك؟",
		keepIt: "الاحتفاظ به",
		confirmCancel: "نعم، إلغاء",
	},
} as const;

const STATE_COLORS: Record<string, string> = {
	PENDING: "bg-gray-100 text-gray-600",
	TRIAL: "bg-blue-100 text-blue-700",
	ACTIVE: "bg-green-100 text-green-700",
	PAUSED: "bg-amber-100 text-amber-700",
	PAST_DUE: "bg-red-100 text-red-700",
	CANCELLED: "bg-gray-100 text-gray-500",
	EXPIRED: "bg-gray-100 text-gray-500",
};

function intervalLabel(plan: SubscriptionPlan, locale: Locale) {
	const n = plan.intervalCount;
	const unitsEn: Record<SubscriptionPlan["interval"], [string, string]> = {
		DAILY: ["day", "days"],
		WEEKLY: ["week", "weeks"],
		BIWEEKLY: ["2 weeks", "2 weeks"],
		MONTHLY: ["month", "months"],
		QUARTERLY: ["quarter", "quarters"],
		SEMI_ANNUAL: ["6 months", "6 months"],
		ANNUAL: ["year", "years"],
	};
	const unitsAr: Record<SubscriptionPlan["interval"], string> = {
		DAILY: "يوم",
		WEEKLY: "أسبوع",
		BIWEEKLY: "أسبوعين",
		MONTHLY: "شهر",
		QUARTERLY: "ربع سنة",
		SEMI_ANNUAL: "6 أشهر",
		ANNUAL: "سنة",
	};
	if (locale === "ar") {
		return n > 1 && plan.interval !== "BIWEEKLY" ? `${n} ${unitsAr[plan.interval]}` : unitsAr[plan.interval];
	}
	const [singular, plural] = unitsEn[plan.interval];
	if (plan.interval === "BIWEEKLY" || plan.interval === "SEMI_ANNUAL") return plural;
	return n > 1 ? `${n} ${plural}` : singular;
}

function formatDate(iso: string | null, locale: Locale) {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-QA", { day: "numeric", month: "short", year: "numeric" });
}

// ── Subscription card ────────────────────────────────────────────────────────

function SubscriptionCard({ subscription, variant, vendureBase, locale, t }: { subscription: CustomerSubscription; variant: SubscriptionVariantInfo | undefined; vendureBase: string; locale: Locale; t: (typeof COPY)[Locale] }) {
	const [state, setState] = useState<SubscriptionState>(subscription.state);
	const [nextBillingDate, setNextBillingDate] = useState(subscription.nextBillingDate);
	const [confirmingCancel, setConfirmingCancel] = useState(false);
	const fetcher = useFetcher<{ subscription?: { state: SubscriptionState; nextBillingDate?: string | null }; error?: string }>();
	const busy = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data?.subscription) return;
		setState(fetcher.data.subscription.state);
		if (fetcher.data.subscription.nextBillingDate !== undefined) {
			setNextBillingDate(fetcher.data.subscription.nextBillingDate ?? null);
		}
		setConfirmingCancel(false);
	}, [fetcher.data, fetcher.state]);

	function submit(intent: "pause" | "resume" | "cancel") {
		fetcher.submit({ _intent: intent, id: subscription.id }, { method: "post", encType: "application/json", action: "/api/subscriptions" });
	}

	const image = variant?.featuredAsset?.preview ?? variant?.product.featuredAsset?.preview ?? null;
	const productHref = variant ? `/products/${variant.customFields?.slug ?? variant.product.slug}` : "#";
	const canPauseOrCancel = state === "ACTIVE" || state === "TRIAL" || state === "PAST_DUE";
	const canResume = state === "PAUSED";
	const cyclesCompleted = Math.max(0, subscription.currentCycleNumber - 1);

	return (
		<div className="bg-white rounded-2xl shadow-sm p-5">
			<div className="flex items-start gap-4">
				<Link to={productHref} className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0">
					{image ? (
						<img src={`${vendureBase}${image.replace(/\\/g, "/")}?preset=thumb`} alt="" className="w-full h-full object-cover" />
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<Package size={20} className="text-gray-300" />
						</div>
					)}
				</Link>

				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<Link to={productHref} className="font-medium text-gray-900 truncate hover:text-emerald-700 transition-colors block">
								{variant?.product.name ?? subscription.plan.name}
							</Link>
							<p className="text-xs text-gray-500 mt-0.5">
								{t.every} {intervalLabel(subscription.plan, locale)} · {t.qty} {subscription.quantity}
							</p>
						</div>
						<span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${STATE_COLORS[state] ?? "bg-gray-100 text-gray-600"}`}>{t.stateLabels[state] ?? state}</span>
					</div>

					<div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
						<div className="text-xs text-gray-500 space-y-0.5">
							{state === "TRIAL" && subscription.trialEndsAt && <p>{t.trialEnds(formatDate(subscription.trialEndsAt, locale))}</p>}
							{(state === "ACTIVE" || state === "PAST_DUE") && nextBillingDate && (
								<p className="flex items-center gap-1">
									<Clock size={12} /> {t.nextBilling(formatDate(nextBillingDate, locale))}
								</p>
							)}
							{cyclesCompleted > 0 && <p>{t.cyclesCompleted(cyclesCompleted)}</p>}
						</div>
						<p className="text-sm font-semibold text-gray-900">{formatPrice(subscription.unitPrice * subscription.quantity, subscription.currencyCode, locale)}</p>
					</div>

					{(canPauseOrCancel || canResume) && (
						<div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
							{confirmingCancel ? (
								<div className="flex items-center gap-3 text-xs">
									<span className="text-gray-500">{t.cancelQuestion}</span>
									<button type="button" onClick={() => submit("cancel")} disabled={busy} className="font-medium text-red-600 hover:underline disabled:opacity-50">
										{busy ? t.cancelling : t.confirmCancel}
									</button>
									<button type="button" onClick={() => setConfirmingCancel(false)} className="font-medium text-gray-500 hover:underline">
										{t.keepIt}
									</button>
								</div>
							) : (
								<>
									{canPauseOrCancel && (
										<button type="button" onClick={() => submit("pause")} disabled={busy} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-amber-700 transition-colors disabled:opacity-50">
											<PauseCircle size={14} /> {busy ? t.pausing : t.pause}
										</button>
									)}
									{canResume && (
										<button type="button" onClick={() => submit("resume")} disabled={busy} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-emerald-700 transition-colors disabled:opacity-50">
											<PlayCircle size={14} /> {busy ? t.resuming : t.resume}
										</button>
									)}
									<button type="button" onClick={() => setConfirmingCancel(true)} disabled={busy} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50">
										<XCircle size={14} /> {t.cancel}
									</button>
								</>
							)}
						</div>
					)}

					{fetcher.data?.error && <p className="text-xs text-red-600 mt-2">{fetcher.data.error}</p>}
				</div>
			</div>
		</div>
	);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage({ loaderData }: Route.ComponentProps) {
	const { customer, subscriptions, variantsById, vendureBase, renewalError } = loaderData;
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];

	return (
		<AccountLayout customer={customer}>
			<div className="space-y-4">
				{renewalError && (
					<div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3 text-sm">{renewalError}</div>
				)}
				<div className="bg-white rounded-2xl shadow-sm p-6">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
							<p className="text-sm text-gray-500 mt-0.5">{t.subtitle(subscriptions.length)}</p>
						</div>
						<RefreshCw size={24} className="text-gray-300" />
					</div>
				</div>

				{subscriptions.length === 0 ? (
					<div className="bg-white rounded-2xl shadow-sm p-12 text-center">
						<RefreshCw size={48} className="text-gray-200 mx-auto mb-4" />
						<p className="font-semibold text-gray-900 mb-1">{t.noSubscriptionsYet}</p>
						<p className="text-sm text-gray-500 mb-6">{t.noSubscriptionsNote}</p>
						<Link to="/" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
							{t.startShopping}
						</Link>
					</div>
				) : (
					<div className="space-y-3">
						{subscriptions.map((sub) => (
							<SubscriptionCard key={sub.id} subscription={sub} variant={variantsById[sub.productVariantId]} vendureBase={vendureBase} locale={locale} t={t} />
						))}
					</div>
				)}
			</div>
		</AccountLayout>
	);
}
