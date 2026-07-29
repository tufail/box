import { useEffect, useState } from "react";
import { redirect, useFetcher, useLocation } from "react-router";
import type { Route } from "./+types/account.wellness";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData } from "~/graphql/account";
import {
	WELLNESS_QUIZ_OPTIONS_QUERY,
	MY_WELLNESS_PROFILE_QUERY,
	type WellnessQuizOptionsData,
	type MyWellnessProfileData,
	type WellnessPlan,
	type ActivityLevel,
} from "~/graphql/wellness";
import AccountLayout from "~/layouts/AccountLayout";
import { useCart } from "~/context/CartContext";
import { useNotification } from "~/context/NotificationContext";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { HeartPulse, Dumbbell, Scale, Utensils, ShoppingCart, RefreshCw, X, Clock, Sparkles } from "lucide-react";

const ACTIVITY_LEVELS: ActivityLevel[] = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "ATHLETE"];

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const locale = getLocaleFromPathname(new URL(request.url).pathname);
	try {
		const { data: profileData } = await graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request });
		if (!profileData.activeCustomer) return redirect(localizePath("/", locale));

		const [optionsResult, wellnessResult] = await Promise.allSettled([
			graphqlRequest<WellnessQuizOptionsData>(env, WELLNESS_QUIZ_OPTIONS_QUERY, undefined, { request }),
			graphqlRequest<MyWellnessProfileData>(env, MY_WELLNESS_PROFILE_QUERY, undefined, { request }),
		]);

		const goals = optionsResult.status === "fulfilled" ? optionsResult.value.data.wellnessGoals : [];
		const suggestedDietaryRestrictions = optionsResult.status === "fulfilled" ? optionsResult.value.data.suggestedDietaryRestrictions : [];
		const profile = wellnessResult.status === "fulfilled" ? wellnessResult.value.data.myWellnessProfile : null;
		const plan = wellnessResult.status === "fulfilled" ? wellnessResult.value.data.myWellnessPlan : null;

		return { customer: profileData.activeCustomer, goals, suggestedDietaryRestrictions, profile, plan };
	} catch {
		return redirect(localizePath("/", locale));
	}
}

export function meta() {
	return [{ title: "Wellness Plan — NutriBox" }, { name: "robots", content: "noindex" }];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "Wellness Plan",
		intro: "Answer a few questions and we'll build a personalized supplement plan for you.",
		notAvailable: "The wellness quiz isn't available yet — please check back soon.",
		goalQuestion: "What's your main goal?",
		activityQuestion: "How active are you?",
		weightQuestion: "What's your body weight (kg)?",
		weightPlaceholder: "e.g. 75",
		dietaryQuestion: "Any dietary restrictions?",
		dietaryHint: "Tap to select, or add your own below.",
		addRestrictionPlaceholder: "Add a restriction and press Enter",
		submit: "Get my plan",
		submitting: "Building your plan…",
		selectGoalError: "Please select a goal.",
		weightError: "Enter a valid body weight.",
		activityLevel: {
			SEDENTARY: "Sedentary (little or no exercise)",
			LIGHT: "Light (1–3 days/week)",
			MODERATE: "Moderate (3–5 days/week)",
			ACTIVE: "Active (6–7 days/week)",
			ATHLETE: "Athlete (intense daily training)",
		} as Record<ActivityLevel, string>,
		yourPlan: "Your Wellness Plan",
		generatedOn: (date: string) => `Generated ${date}`,
		retakeQuiz: "Retake the quiz",
		noItems: "None of our recommendations matched your dietary restrictions — try adjusting your answers.",
		addToCart: "Add plan to cart",
		adding: "Adding…",
		planAdded: "Your wellness plan was added to cart ✓",
		sku: "SKU",
	},
	ar: {
		title: "خطة العافية",
		intro: "أجب عن بعض الأسئلة وسنبني لك خطة مكملات غذائية مخصصة.",
		notAvailable: "اختبار العافية غير متاح حاليًا — يرجى المحاولة لاحقًا.",
		goalQuestion: "ما هو هدفك الرئيسي؟",
		activityQuestion: "ما مدى نشاطك؟",
		weightQuestion: "ما هو وزن جسمك (كجم)؟",
		weightPlaceholder: "مثال: 75",
		dietaryQuestion: "هل لديك أي قيود غذائية؟",
		dietaryHint: "اضغط للاختيار، أو أضف قيدك الخاص أدناه.",
		addRestrictionPlaceholder: "أضف قيدًا واضغط Enter",
		submit: "احصل على خطتي",
		submitting: "جارٍ بناء خطتك…",
		selectGoalError: "يرجى اختيار هدف.",
		weightError: "أدخل وزن جسم صحيح.",
		activityLevel: {
			SEDENTARY: "خامل (نشاط قليل أو معدوم)",
			LIGHT: "نشاط خفيف (1-3 أيام/أسبوع)",
			MODERATE: "نشاط معتدل (3-5 أيام/أسبوع)",
			ACTIVE: "نشط (6-7 أيام/أسبوع)",
			ATHLETE: "رياضي (تدريب يومي مكثف)",
		} as Record<ActivityLevel, string>,
		yourPlan: "خطة العافية الخاصة بك",
		generatedOn: (date: string) => `تم الإنشاء في ${date}`,
		retakeQuiz: "أعد الاختبار",
		noItems: "لم تتطابق أي من توصياتنا مع قيودك الغذائية — حاول تعديل إجاباتك.",
		addToCart: "أضف الخطة إلى السلة",
		adding: "جارٍ الإضافة…",
		planAdded: "تمت إضافة خطة العافية إلى السلة ✓",
		sku: "رمز المنتج",
	},
} as const;

function formatDate(iso: string, locale: Locale) {
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

// ── Plan result ──────────────────────────────────────────────────────────────

function PlanResult({ plan, onRetake }: { plan: WellnessPlan; onRetake: () => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const { openCart, refreshCart } = useCart();
	const { notify } = useNotification();
	const fetcher = useFetcher<{ order?: unknown; error?: string }>();
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.order) {
			notify(t.planAdded, "success");
			refreshCart();
			openCart();
		} else if (fetcher.data.error) {
			notify(fetcher.data.error, "error");
		}
	}, [fetcher.state, fetcher.data]);

	const items = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);

	function handleAddToCart() {
		fetcher.submit({ _intent: "addToCart" }, { method: "post", encType: "application/json", action: "/api/wellness" });
	}

	return (
		<div className="bg-white rounded-2xl shadow-sm p-6">
			<div className="flex items-center justify-between flex-wrap gap-2 mb-1">
				<div className="flex items-center gap-2">
					<Sparkles size={18} className="text-emerald-600" />
					<h2 className="text-base font-semibold text-gray-900">{t.yourPlan}</h2>
				</div>
				<button type="button" onClick={onRetake} className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline">
					<RefreshCw size={12} /> {t.retakeQuiz}
				</button>
			</div>
			<p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
				<Clock size={12} /> {t.generatedOn(formatDate(plan.generatedAt, locale))}
			</p>

			{items.length === 0 ? (
				<p className="text-sm text-gray-500 py-6 text-center">{t.noItems}</p>
			) : (
				<div className="space-y-3 mb-5">
					{items.map((item) => (
						<div key={item.variantId} className="border border-gray-100 rounded-xl p-4">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<p className="text-sm font-semibold text-gray-900">{item.variantName}</p>
								<span className="text-[10px] font-mono text-gray-400">{t.sku}: {item.variantSku}</span>
							</div>
							<p className="text-sm text-gray-600 mt-1">{item.dosingInstructions}</p>
						</div>
					))}
				</div>
			)}

			{items.length > 0 && (
				<button
					type="button"
					onClick={handleAddToCart}
					disabled={loading}
					className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <ShoppingCart size={16} />}
					{loading ? t.adding : t.addToCart}
				</button>
			)}
		</div>
	);
}

// ── Quiz form ────────────────────────────────────────────────────────────────

interface QuizFormProps {
	goals: { code: string; label: string; description: string }[];
	suggestedDietaryRestrictions: string[];
	initialGoalCode?: string;
	initialActivityLevel?: ActivityLevel;
	initialBodyWeightKg?: number;
	initialDietaryRestrictions?: string[];
	onPlanReady: (plan: WellnessPlan) => void;
}

function QuizForm({ goals, suggestedDietaryRestrictions, initialGoalCode, initialActivityLevel, initialBodyWeightKg, initialDietaryRestrictions, onPlanReady }: QuizFormProps) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const fetcher = useFetcher<{ plan?: WellnessPlan; error?: string }>();
	const loading = fetcher.state !== "idle";

	const [goalCode, setGoalCode] = useState(initialGoalCode ?? goals[0]?.code ?? "");
	const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialActivityLevel ?? "MODERATE");
	const [bodyWeightKg, setBodyWeightKg] = useState(initialBodyWeightKg ? String(initialBodyWeightKg) : "");
	const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(initialDietaryRestrictions ?? []);
	const [customRestriction, setCustomRestriction] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.plan) {
			setError(null);
			onPlanReady(fetcher.data.plan);
		} else if (fetcher.data.error) {
			setError(fetcher.data.error);
		}
	}, [fetcher.state, fetcher.data]);

	function toggleRestriction(tag: string) {
		setDietaryRestrictions((prev) => (prev.includes(tag) ? prev.filter((r) => r !== tag) : [...prev, tag]));
	}

	function addCustomRestriction() {
		const tag = customRestriction.trim();
		if (!tag || dietaryRestrictions.includes(tag)) return;
		setDietaryRestrictions((prev) => [...prev, tag]);
		setCustomRestriction("");
	}

	function handleSubmit() {
		if (!goalCode) {
			setError(t.selectGoalError);
			return;
		}
		const weight = Number(bodyWeightKg);
		if (!weight || weight <= 0) {
			setError(t.weightError);
			return;
		}
		setError(null);
		fetcher.submit(
			{ _intent: "saveProfile", goalCode, activityLevel, bodyWeightKg: weight, dietaryRestrictions },
			{ method: "post", encType: "application/json", action: "/api/wellness" }
		);
	}

	if (goals.length === 0) {
		return (
			<div className="bg-white rounded-2xl shadow-sm p-10 text-center">
				<HeartPulse size={28} className="mx-auto text-gray-300 mb-3" />
				<p className="text-gray-500 text-sm">{t.notAvailable}</p>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
			{/* Goal picker */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<HeartPulse size={16} className="text-emerald-600" />
					<h2 className="text-sm font-semibold text-gray-900">{t.goalQuestion}</h2>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{goals.map((goal) => (
						<button
							key={goal.code}
							type="button"
							onClick={() => setGoalCode(goal.code)}
							className={`text-start rounded-xl border p-4 transition-colors ${
								goalCode === goal.code ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
							}`}
						>
							<p className="text-sm font-semibold text-gray-900">{goal.label}</p>
							{goal.description && <p className="text-xs text-gray-500 mt-1">{goal.description}</p>}
						</button>
					))}
				</div>
			</div>

			{/* Activity level */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<Dumbbell size={16} className="text-emerald-600" />
					<h2 className="text-sm font-semibold text-gray-900">{t.activityQuestion}</h2>
				</div>
				<select
					value={activityLevel}
					onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
					className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
				>
					{ACTIVITY_LEVELS.map((level) => (
						<option key={level} value={level}>
							{t.activityLevel[level]}
						</option>
					))}
				</select>
			</div>

			{/* Body weight */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<Scale size={16} className="text-emerald-600" />
					<h2 className="text-sm font-semibold text-gray-900">{t.weightQuestion}</h2>
				</div>
				<input
					type="number"
					min={1}
					value={bodyWeightKg}
					onChange={(e) => setBodyWeightKg(e.target.value)}
					placeholder={t.weightPlaceholder}
					className="w-32 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
				/>
			</div>

			{/* Dietary restrictions */}
			<div>
				<div className="flex items-center gap-2 mb-1">
					<Utensils size={16} className="text-emerald-600" />
					<h2 className="text-sm font-semibold text-gray-900">{t.dietaryQuestion}</h2>
				</div>
				<p className="text-xs text-gray-400 mb-3">{t.dietaryHint}</p>

				{suggestedDietaryRestrictions.length > 0 && (
					<div className="flex flex-wrap gap-2 mb-3">
						{suggestedDietaryRestrictions.map((tag) => (
							<button
								key={tag}
								type="button"
								onClick={() => toggleRestriction(tag)}
								className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
									dietaryRestrictions.includes(tag) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
								}`}
							>
								{tag}
							</button>
						))}
					</div>
				)}

				{dietaryRestrictions.filter((r) => !suggestedDietaryRestrictions.includes(r)).length > 0 && (
					<div className="flex flex-wrap gap-2 mb-3">
						{dietaryRestrictions
							.filter((r) => !suggestedDietaryRestrictions.includes(r))
							.map((tag) => (
								<span key={tag} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
									{tag}
									<button type="button" onClick={() => toggleRestriction(tag)} aria-label="Remove">
										<X size={12} />
									</button>
								</span>
							))}
					</div>
				)}

				<input
					type="text"
					value={customRestriction}
					onChange={(e) => setCustomRestriction(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							addCustomRestriction();
						}
					}}
					placeholder={t.addRestrictionPlaceholder}
					className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
				/>
			</div>

			{error && <p className="text-xs text-red-600">{error}</p>}

			<button
				type="button"
				onClick={handleSubmit}
				disabled={loading}
				className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{loading && <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
				{loading ? t.submitting : t.submit}
			</button>
		</div>
	);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WellnessPage({ loaderData }: Route.ComponentProps) {
	const { customer, goals, suggestedDietaryRestrictions, profile, plan: initialPlan } = loaderData;
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const [plan, setPlan] = useState<WellnessPlan | null>(initialPlan);
	const [showQuiz, setShowQuiz] = useState(!initialPlan);

	return (
		<AccountLayout customer={customer}>
			<div className="space-y-6">
				<div>
					<h1 className="text-lg font-semibold text-gray-900">{t.title}</h1>
					<p className="text-sm text-gray-500 mt-0.5">{t.intro}</p>
				</div>

				{plan && !showQuiz ? (
					<PlanResult plan={plan} onRetake={() => setShowQuiz(true)} />
				) : (
					<QuizForm
						goals={goals}
						suggestedDietaryRestrictions={suggestedDietaryRestrictions}
						initialGoalCode={profile?.goalCode}
						initialActivityLevel={profile?.activityLevel}
						initialBodyWeightKg={profile?.bodyWeightKg}
						initialDietaryRestrictions={profile?.dietaryRestrictions}
						onPlanReady={(newPlan) => {
							setPlan(newPlan);
							setShowQuiz(false);
						}}
					/>
				)}
			</div>
		</AccountLayout>
	);
}
