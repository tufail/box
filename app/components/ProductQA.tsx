import { useEffect, useState } from "react";
import { useFetcher, useRouteLoaderData, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { ActiveCustomer } from "~/graphql/checkout";
import type { ProductQuestionItem } from "~/graphql/question";
import { getLocaleFromPathname, type Locale } from "~/lib/i18n";
import { MessageCircleQuestion, BadgeCheck, ChevronDown } from "lucide-react";

const MIN_LENGTH = 5;
const MAX_LENGTH = 500;

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const QA_COPY = {
	en: {
		title: "Questions & Answers",
		askQuestion: "Ask a question",
		noQuestionsYet: "No questions yet — be the first to ask.",
		loadMore: "Load more questions",
		answeredBy: "NutriBox Team",
		notYetAnswered: "Not answered yet — our team typically responds within a couple of days.",
		verifiedPurchase: "Verified Purchase",
		signInToAsk: "Sign in to ask a question",
		needLogin: "You need an account to ask a product question — this keeps answers trustworthy and spam-free.",
		signIn: "Sign In",
		createAccount: "Create Account",
		cancel: "Cancel",
		yourQuestion: "Your question",
		questionPlaceholder: "e.g. Is this suitable for someone with a nut allergy?",
		submit: "Submit Question",
		submitting: "Submitting…",
		submitted: "Question submitted!",
		pendingApproval: "Thanks — your question is awaiting a quick review and will appear here once approved.",
		close: "Close",
		charCount: (n: number, max: number) => `${n}/${max}`,
		tooShort: (n: number) => `Question must be at least ${n} characters`,
	},
	ar: {
		title: "الأسئلة والأجوبة",
		askQuestion: "اطرح سؤالاً",
		noQuestionsYet: "لا توجد أسئلة بعد — كن أول من يسأل.",
		loadMore: "عرض المزيد من الأسئلة",
		answeredBy: "فريق NutriBox",
		notYetAnswered: "لم تتم الإجابة بعد — يستجيب فريقنا عادةً خلال يومين.",
		verifiedPurchase: "شراء موثّق",
		signInToAsk: "سجّل الدخول لطرح سؤال",
		needLogin: "تحتاج إلى حساب لطرح سؤال حول المنتج — هذا يحافظ على مصداقية الإجابات ويمنع البريد العشوائي.",
		signIn: "تسجيل الدخول",
		createAccount: "إنشاء حساب",
		cancel: "إلغاء",
		yourQuestion: "سؤالك",
		questionPlaceholder: "مثال: هل هذا مناسب لمن لديه حساسية من المكسرات؟",
		submit: "إرسال السؤال",
		submitting: "جارٍ الإرسال…",
		submitted: "تم إرسال السؤال!",
		pendingApproval: "شكرًا — سؤالك قيد المراجعة السريعة وسيظهر هنا بعد الموافقة عليه.",
		close: "إغلاق",
		charCount: (n: number, max: number) => `${n}/${max}`,
		tooShort: (n: number) => `يجب أن يتكون السؤال من ${n} أحرف على الأقل`,
	},
} as const;

function formatDate(iso: string, locale: Locale) {
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-QA", { day: "numeric", month: "short", year: "numeric" });
}

function QuestionRow({ q, locale, t }: { q: ProductQuestionItem; locale: Locale; t: (typeof QA_COPY)[Locale] }) {
	return (
		<div className="py-4 border-b border-gray-100 last:border-b-0">
			<div className="flex items-start gap-2">
				<MessageCircleQuestion size={16} className="text-gray-400 mt-0.5 shrink-0" />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium text-gray-900">{q.questionText}</p>
					<div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-400">
						<span>{q.askerName ?? t.answeredBy}</span>
						<span>·</span>
						<span>{formatDate(q.createdAt, locale)}</span>
						{q.isVerifiedPurchase && (
							<span className="flex items-center gap-1 text-emerald-600 font-medium">
								<BadgeCheck size={12} /> {t.verifiedPurchase}
							</span>
						)}
					</div>
				</div>
			</div>
			<div className="ms-6 mt-2">
				{q.answerText ? (
					<p className="text-sm text-gray-700 leading-relaxed">
						<span className="font-semibold text-gray-900">{t.answeredBy}: </span>
						{q.answerText}
					</p>
				) : (
					<p className="text-xs text-gray-400 italic">{t.notYetAnswered}</p>
				)}
			</div>
		</div>
	);
}

function AskQuestionForm({ productId, isLoggedIn, productSlug, onSubmitted, t }: { productId: string; isLoggedIn: boolean; productSlug: string; onSubmitted: () => void; t: (typeof QA_COPY)[Locale] }) {
	const [text, setText] = useState("");
	const [done, setDone] = useState(false);
	const fetcher = useFetcher<{ ok: boolean; error?: string }>();
	const busy = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.ok) {
			setDone(true);
			setText("");
			onSubmitted();
		}
	}, [fetcher.state, fetcher.data]);

	if (!isLoggedIn) {
		return (
			<div className="bg-gray-50 rounded-xl p-5 text-center">
				<h4 className="text-sm font-bold text-gray-900 mb-1">{t.signInToAsk}</h4>
				<p className="text-xs text-gray-500 mb-4">{t.needLogin}</p>
				<div className="flex items-center justify-center gap-3">
					<Link to={`/login?redirect=${encodeURIComponent(`/products/${productSlug}`)}`} className="bg-black hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
						{t.signIn}
					</Link>
					<Link to={`/register?redirect=${encodeURIComponent(`/products/${productSlug}`)}`} className="border border-primary text-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/5 transition-colors">
						{t.createAccount}
					</Link>
				</div>
			</div>
		);
	}

	if (done) {
		return (
			<div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center">
				<p className="text-sm font-semibold text-emerald-800">{t.submitted}</p>
				<p className="text-xs text-emerald-700 mt-1">{t.pendingApproval}</p>
			</div>
		);
	}

	const tooShort = text.trim().length > 0 && text.trim().length < MIN_LENGTH;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = text.trim();
		if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return;
		fetcher.submit({ _intent: "submit", productId, questionText: trimmed }, { method: "POST", action: "/api/questions", encType: "application/json" });
	}

	return (
		<form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-5">
			<label htmlFor="qa-question" className="block text-sm font-medium text-gray-700 mb-1.5">
				{t.yourQuestion}
			</label>
			<textarea
				id="qa-question"
				value={text}
				onChange={(e) => setText(e.target.value)}
				maxLength={MAX_LENGTH}
				rows={3}
				placeholder={t.questionPlaceholder}
				className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-white"
			/>
			<div className="flex items-center justify-between mt-1">
				{tooShort ? <p className="text-xs text-red-500">{t.tooShort(MIN_LENGTH)}</p> : <span />}
				<p className="text-xs text-gray-400">{t.charCount(text.length, MAX_LENGTH)}</p>
			</div>
			{fetcher.data?.error && <p className="text-xs text-red-500 mt-1">{fetcher.data.error}</p>}
			<button type="submit" disabled={busy || text.trim().length < MIN_LENGTH} className="mt-3 bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
				{busy ? t.submitting : t.submit}
			</button>
		</form>
	);
}

export default function ProductQA({ productId, productSlug, embedded = false }: { productId: string; productSlug: string; embedded?: boolean }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = QA_COPY[locale];
	const rootData = useRouteLoaderData("root") as { activeCustomer: ActiveCustomer | null } | undefined;
	const isLoggedIn = !!rootData?.activeCustomer;

	const [take, setTake] = useState(10);
	const [showForm, setShowForm] = useState(false);
	const fetcher = useFetcher<{ questions: ProductQuestionItem[]; totalItems: number }>();

	useEffect(() => {
		fetcher.load(`/api/questions?slug=${productSlug}&take=${take}`);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [take]);

	const questions = fetcher.data?.questions ?? [];
	const totalItems = fetcher.data?.totalItems ?? 0;
	const hasMore = questions.length < totalItems;

	return (
		<div className={embedded ? "" : "bg-white rounded-2xl border border-gray-200 p-6"}>
			<div className="flex items-center justify-between mb-4 flex-wrap gap-3">
				{!embedded && (
					<h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
						<MessageCircleQuestion size={20} className="text-primary" />
						{t.title}
					</h2>
				)}
				<button onClick={() => setShowForm((s) => !s)} className={`text-sm font-semibold text-primary hover:underline ${embedded ? "mx-auto" : ""}`}>
					{t.askQuestion}
				</button>
			</div>

			{showForm && (
				<div className="mb-5">
					<AskQuestionForm
						productId={productId}
						productSlug={productSlug}
						isLoggedIn={isLoggedIn}
						t={t}
						onSubmitted={() => {
							/* keep the success message visible; list stays as-is until admin approves */
						}}
					/>
				</div>
			)}

			{questions.length === 0 ? (
				<p className="text-sm text-gray-400 py-4">{t.noQuestionsYet}</p>
			) : (
				<div>
					{questions.map((q) => (
						<QuestionRow key={q.id} q={q} locale={locale} t={t} />
					))}
				</div>
			)}

			{hasMore && (
				<button onClick={() => setTake((n) => n + 10)} disabled={fetcher.state !== "idle"} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-primary transition-colors mt-3 disabled:opacity-50">
					{t.loadMore} <ChevronDown size={14} />
				</button>
			)}
		</div>
	);
}
