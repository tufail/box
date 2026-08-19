import { useEffect, useRef, useState } from "react";
import { useFetcher, useLocation } from "react-router";
import type { Route } from "./+types/wellness";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData, type CustomerProfile } from "~/graphql/account";
import {
	WELLNESS_QUIZ_OPTIONS_QUERY,
	MY_WELLNESS_PROFILE_QUERY,
	type WellnessQuizOptionsData,
	type MyWellnessProfileData,
	type WellnessPlan,
	type WellnessPlanItem,
	type ActivityLevel,
	type WellnessGender,
} from "~/graphql/wellness";
import { useCart } from "~/context/CartContext";
import { useNotification } from "~/context/NotificationContext";
import { getLocaleFromPathname, type Locale } from "~/lib/i18n";
import { HeartPulse, Dumbbell, Scale, Utensils, Users, ShoppingCart, RefreshCw, X, Clock, Sparkles, Mail } from "lucide-react";

const ACTIVITY_LEVELS: ActivityLevel[] = ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "ATHLETE"];
const GENDERS: WellnessGender[] = ["NO_PREFERENCE", "MEN", "WOMEN"];

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	try {
		const [optionsResult, profileResult] = await Promise.allSettled([
			graphqlRequest<WellnessQuizOptionsData>(env, WELLNESS_QUIZ_OPTIONS_QUERY, undefined, { request }),
			graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request }),
		]);

		const goals = optionsResult.status === "fulfilled" ? optionsResult.value.data.wellnessGoals : [];
		const suggestedDietaryRestrictions = optionsResult.status === "fulfilled" ? optionsResult.value.data.suggestedDietaryRestrictions : [];
		const suggestedTrainingStyles = optionsResult.status === "fulfilled" ? optionsResult.value.data.suggestedTrainingStyles : [];
		const customer = profileResult.status === "fulfilled" ? profileResult.value.data.activeCustomer : null;

		// Logged-in customers get their saved answers/plan prefilled — guests always start fresh, nothing to load.
		let profile: MyWellnessProfileData["myWellnessProfile"] = null;
		let plan: WellnessPlan | null = null;
		if (customer) {
			try {
				const { data } = await graphqlRequest<MyWellnessProfileData>(env, MY_WELLNESS_PROFILE_QUERY, undefined, { request });
				profile = data.myWellnessProfile;
				plan = data.myWellnessPlan;
			} catch {
				/* non-critical — quiz still works without a prior saved plan */
			}
		}

		return { customer, goals, suggestedDietaryRestrictions, suggestedTrainingStyles, profile, plan };
	} catch {
		return { customer: null, goals: [], suggestedDietaryRestrictions: [], suggestedTrainingStyles: [], profile: null, plan: null };
	}
}

export function meta() {
	return [
		{ title: "Find My Supplement Routine — NutriBox" },
		{ name: "description", content: "Answer a few quick questions and get a personalized supplement stack recommendation — no account needed." },
	];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "Find My Supplement Routine",
		intro: "Answer a few quick questions and we'll build a personalized supplement stack for you — no account needed.",
		notAvailable: "The wellness quiz isn't available yet — please check back soon.",
		nameQuestion: "What can we call you?",
		namePlaceholder: "Your first name",
		nameHint: "Just your first name is fine — this is optional.",
		greeting: (name: string) => `Hi ${name}!`,
		coreEssentials: "Start with these core essentials",
		completeStack: "Complete your stack",
		goalQuestion: "What's your main goal?",
		genderQuestion: "You'd like to see products recommended for:",
		gender: { NO_PREFERENCE: "No preference", MEN: "Men", WOMEN: "Women" } as Record<WellnessGender, string>,
		trainingQuestion: "How do you like to train?",
		trainingHint: "Select all that apply.",
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
		yourPlan: "Your Personalized Stack",
		generatedOn: (date: string) => `Generated ${date}`,
		retakeQuiz: "Retake the quiz",
		noItems: "None of our recommendations matched your answers — try adjusting them.",
		addToCart: "Add plan to cart",
		adding: "Adding…",
		planAdded: "Your wellness plan was added to cart ✓",
		sku: "SKU",
		guestNotice: "Taking this as a guest — your plan isn't saved. Log in to save it to your account.",
		emailCaptureTitle: "Want a copy of your plan?",
		emailCaptureBody: "Leave your email and we'll send it over — plus any offers, if you'd like.",
		emailPlaceholder: "you@example.com",
		emailOptIn: "Send me offers and updates",
		emailSubmit: "Email me my plan",
		emailSubmitting: "Sending…",
		emailSent: "Thanks! We've noted your email.",
		emailInvalid: "Enter a valid email address.",
	},
	ar: {
		title: "اعثر على روتين مكملاتي",
		intro: "أجب عن بعض الأسئلة وسنبني لك خطة مكملات غذائية مخصصة — بدون الحاجة لحساب.",
		notAvailable: "اختبار العافية غير متاح حاليًا — يرجى المحاولة لاحقًا.",
		nameQuestion: "ما الاسم الذي يمكننا مناداتك به؟",
		namePlaceholder: "اسمك الأول",
		nameHint: "اسمك الأول فقط يكفي — هذا اختياري.",
		greeting: (name: string) => `مرحبًا ${name}!`,
		coreEssentials: "ابدأ بهذه الأساسيات",
		completeStack: "أكمل مجموعتك",
		goalQuestion: "ما هو هدفك الرئيسي؟",
		genderQuestion: "ترغب برؤية المنتجات الموصى بها لـ:",
		gender: { NO_PREFERENCE: "لا تفضيل", MEN: "رجال", WOMEN: "نساء" } as Record<WellnessGender, string>,
		trainingQuestion: "كيف تفضل التدريب؟",
		trainingHint: "اختر كل ما ينطبق.",
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
		yourPlan: "خطتك المخصصة",
		generatedOn: (date: string) => `تم الإنشاء في ${date}`,
		retakeQuiz: "أعد الاختبار",
		noItems: "لم تتطابق أي من توصياتنا مع إجاباتك — حاول تعديلها.",
		addToCart: "أضف الخطة إلى السلة",
		adding: "جارٍ الإضافة…",
		planAdded: "تمت إضافة خطة العافية إلى السلة ✓",
		sku: "رمز المنتج",
		guestNotice: "أنت تجرب هذا كزائر — لن يتم حفظ خطتك. سجل الدخول لحفظها في حسابك.",
		emailCaptureTitle: "تريد نسخة من خطتك؟",
		emailCaptureBody: "اترك بريدك الإلكتروني وسنرسلها لك — بالإضافة لأي عروض، إن أردت.",
		emailPlaceholder: "you@example.com",
		emailOptIn: "أرسل لي العروض والتحديثات",
		emailSubmit: "أرسل لي خطتي",
		emailSubmitting: "جارٍ الإرسال…",
		emailSent: "شكرًا! لقد سجلنا بريدك الإلكتروني.",
		emailInvalid: "أدخل بريدًا إلكترونيًا صحيحًا.",
	},
} as const;

function formatDate(iso: string, locale: Locale) {
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

// ── Guest email capture ─────────────────────────────────────────────────────

function EmailCapture({ goalCode, name }: { goalCode: string; name: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const fetcher = useFetcher<{ captured?: boolean; error?: string }>();
	const loading = fetcher.state !== "idle";
	const [email, setEmail] = useState("");
	const [optIn, setOptIn] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const sent = fetcher.data?.captured === true;
	// Anti-bot: same honeypot/fill-time pattern as the footer newsletter form.
	const companyRef = useRef<HTMLInputElement>(null);
	const formRenderedAt = useRef(Date.now());

	function submit() {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			setError(t.emailInvalid);
			return;
		}
		setError(null);
		fetcher.submit(
			{ _intent: "captureLead", firstName: name.trim(), email: email.trim(), marketingOptIn: optIn, goalCode, company: companyRef.current?.value ?? "", renderedAt: formRenderedAt.current },
			{ method: "post", encType: "application/json", action: "/api/wellness" }
		);
	}

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.error) setError(fetcher.data.error);
	}, [fetcher.state, fetcher.data]);

	if (sent) {
		return (
			<div className="border border-emerald-100 bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800 flex items-center gap-2">
				<Mail size={16} /> {t.emailSent}
			</div>
		);
	}

	return (
		<div className="border border-gray-100 rounded-xl p-4">
			<p className="text-sm font-semibold text-gray-900">{t.emailCaptureTitle}</p>
			<p className="text-xs text-gray-500 mt-0.5 mb-3">{t.emailCaptureBody}</p>
			{/* Honeypot — off-screen and out of tab order, so real users never see or fill it. */}
			<input ref={companyRef} type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden" />
			<div className="flex flex-col sm:flex-row gap-2">
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder={t.emailPlaceholder}
					className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
				/>
				<button
					type="button"
					onClick={submit}
					disabled={loading}
					className="shrink-0 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors"
				>
					{loading ? t.emailSubmitting : t.emailSubmit}
				</button>
			</div>
			<label className="flex items-center gap-2 mt-2 text-xs text-gray-500">
				<input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="rounded" />
				{t.emailOptIn}
			</label>
			{error && <p className="text-xs text-red-600 mt-1">{error}</p>}
		</div>
	);
}

// ── Plan result ──────────────────────────────────────────────────────────────

function ItemCard({ item, sku }: { item: WellnessPlanItem; sku: string }) {
	return (
		<div className="border border-gray-100 rounded-xl p-4">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<p className="text-sm font-semibold text-gray-900">{item.variantName}</p>
				<span className="text-[10px] font-mono text-gray-400">{sku}: {item.variantSku}</span>
			</div>
			<p className="text-sm text-gray-600 mt-1">{item.dosingInstructions}</p>
		</div>
	);
}

function PlanResult({ plan, customer, name, onRetake }: { plan: WellnessPlan; customer: CustomerProfile | null; name: string; onRetake: () => void }) {
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
	const coreItems = items.filter((i) => i.tier === "CORE");
	const completeItems = items.filter((i) => i.tier === "COMPLETE");

	function handleAddToCart() {
		if (customer) {
			fetcher.submit({ _intent: "addToCart" }, { method: "post", encType: "application/json", action: "/api/wellness" });
		} else {
			fetcher.submit(
				{ _intent: "addItemsToCart", items: items.map((item) => ({ variantId: item.variantId, quantity: 1 })) },
				{ method: "post", encType: "application/json", action: "/api/wellness" }
			);
		}
	}

	return (
		<div className="space-y-4">
			<div className="bg-white rounded-2xl shadow-sm p-6">
				<div className="flex items-center justify-between flex-wrap gap-2 mb-1">
					<div className="flex items-center gap-2">
						<Sparkles size={18} className="text-emerald-600" />
						<h2 className="text-base font-semibold text-gray-900">
							{name.trim() ? `${t.greeting(name.trim())} ${t.yourPlan}` : t.yourPlan}
						</h2>
					</div>
					<button type="button" onClick={onRetake} className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline">
						<RefreshCw size={12} /> {t.retakeQuiz}
					</button>
				</div>
				<p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
					<Clock size={12} /> {t.generatedOn(formatDate(plan.generatedAt, locale))}
				</p>

				{!customer && (
					<p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">{t.guestNotice}</p>
				)}

				{items.length === 0 ? (
					<p className="text-sm text-gray-500 py-6 text-center">{t.noItems}</p>
				) : (
					<div className="space-y-5 mb-5">
						{coreItems.length > 0 && (
							<div>
								<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t.coreEssentials}</h3>
								<div className="space-y-3">
									{coreItems.map((item) => (
										<ItemCard key={item.variantId} item={item} sku={t.sku} />
									))}
								</div>
							</div>
						)}
						{completeItems.length > 0 && (
							<div>
								<h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t.completeStack}</h3>
								<div className="space-y-3">
									{completeItems.map((item) => (
										<ItemCard key={item.variantId} item={item} sku={t.sku} />
									))}
								</div>
							</div>
						)}
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

			{!customer && <EmailCapture goalCode={plan.goalCode} name={name} />}
		</div>
	);
}

// ── Quiz form ────────────────────────────────────────────────────────────────

interface QuizFormProps {
	goals: { code: string; label: string; description: string }[];
	suggestedDietaryRestrictions: string[];
	suggestedTrainingStyles: string[];
	customer: CustomerProfile | null;
	name: string;
	onNameChange: (name: string) => void;
	initialGoalCode?: string;
	initialActivityLevel?: ActivityLevel;
	initialBodyWeightKg?: number;
	initialDietaryRestrictions?: string[];
	initialGenderPreference?: WellnessGender;
	initialTrainingStyles?: string[];
	onPlanReady: (plan: WellnessPlan) => void;
}

function QuizForm({
	goals,
	suggestedDietaryRestrictions,
	suggestedTrainingStyles,
	customer,
	name,
	onNameChange,
	initialGoalCode,
	initialActivityLevel,
	initialBodyWeightKg,
	initialDietaryRestrictions,
	initialGenderPreference,
	initialTrainingStyles,
	onPlanReady,
}: QuizFormProps) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const fetcher = useFetcher<{ plan?: WellnessPlan; error?: string }>();
	const loading = fetcher.state !== "idle";

	const [goalCode, setGoalCode] = useState(initialGoalCode ?? goals[0]?.code ?? "");
	const [genderPreference, setGenderPreference] = useState<WellnessGender>(initialGenderPreference ?? "NO_PREFERENCE");
	const [trainingStyles, setTrainingStyles] = useState<string[]>(initialTrainingStyles ?? []);
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

	function toggleTrainingStyle(tag: string) {
		setTrainingStyles((prev) => (prev.includes(tag) ? prev.filter((r) => r !== tag) : [...prev, tag]));
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
			{
				_intent: customer ? "saveProfile" : "previewPlan",
				goalCode,
				activityLevel,
				bodyWeightKg: weight,
				dietaryRestrictions,
				genderPreference,
				trainingStyles,
			},
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
			{/* Name (optional) */}
			<div>
				<h2 className="text-sm font-semibold text-gray-900 mb-1">{t.nameQuestion}</h2>
				<p className="text-xs text-gray-400 mb-3">{t.nameHint}</p>
				<input
					type="text"
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					placeholder={t.namePlaceholder}
					className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
				/>
			</div>

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

			{/* Gender preference */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<Users size={16} className="text-emerald-600" />
					<h2 className="text-sm font-semibold text-gray-900">{t.genderQuestion}</h2>
				</div>
				<div className="flex flex-wrap gap-2">
					{GENDERS.map((g) => (
						<button
							key={g}
							type="button"
							onClick={() => setGenderPreference(g)}
							className={`text-xs font-medium px-4 py-2 rounded-full border transition-colors ${
								genderPreference === g ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
							}`}
						>
							{t.gender[g]}
						</button>
					))}
				</div>
			</div>

			{/* Training style */}
			{suggestedTrainingStyles.length > 0 && (
				<div>
					<div className="flex items-center gap-2 mb-1">
						<Dumbbell size={16} className="text-emerald-600" />
						<h2 className="text-sm font-semibold text-gray-900">{t.trainingQuestion}</h2>
					</div>
					<p className="text-xs text-gray-400 mb-3">{t.trainingHint}</p>
					<div className="flex flex-wrap gap-2">
						{suggestedTrainingStyles.map((style) => (
							<button
								key={style}
								type="button"
								onClick={() => toggleTrainingStyle(style)}
								className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
									trainingStyles.includes(style) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
								}`}
							>
								{style}
							</button>
						))}
					</div>
				</div>
			)}

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

export default function WellnessQuizPage({ loaderData }: Route.ComponentProps) {
	const { customer, goals, suggestedDietaryRestrictions, suggestedTrainingStyles, profile, plan: initialPlan } = loaderData;
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const [plan, setPlan] = useState<WellnessPlan | null>(initialPlan);
	const [showQuiz, setShowQuiz] = useState(!initialPlan);
	const [name, setName] = useState(customer?.firstName ?? "");

	return (
		<div className="container mx-auto px-4 py-10 max-w-2xl">
			<div className="text-center mb-6">
				<h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
				<p className="text-sm text-gray-500 mt-1">{t.intro}</p>
			</div>

			{plan && !showQuiz ? (
				<PlanResult plan={plan} customer={customer} name={name} onRetake={() => setShowQuiz(true)} />
			) : (
				<QuizForm
					goals={goals}
					suggestedDietaryRestrictions={suggestedDietaryRestrictions}
					suggestedTrainingStyles={suggestedTrainingStyles}
					customer={customer}
					name={name}
					onNameChange={setName}
					initialGoalCode={profile?.goalCode}
					initialActivityLevel={profile?.activityLevel}
					initialBodyWeightKg={profile?.bodyWeightKg}
					initialDietaryRestrictions={profile?.dietaryRestrictions}
					initialGenderPreference={profile?.genderPreference}
					initialTrainingStyles={profile?.trainingStyles}
					onPlanReady={(newPlan) => {
						setPlan(newPlan);
						setShowQuiz(false);
					}}
				/>
			)}
		</div>
	);
}
