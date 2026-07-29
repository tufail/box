import { useEffect } from "react";
import { useFetcher, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/verify-email";
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from "lucide-react";
import { getLocaleFromPathname } from "~/lib/i18n";

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "Verify Email | NutriBox" },
    { name: "robots", content: "noindex" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return { token };
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    invalidLink: "Invalid verification link",
    invalidLinkNote: "This link doesn't contain a verification token. Please use the link from your registration email or contact support.",
    backToHome: "Back to Home",
    verifying: "Verifying your email…",
    pleaseWait: "Please wait a moment.",
    alreadyVerified: "Already verified",
    emailVerified: "Email verified!",
    alreadyVerifiedNote: "Your email address is already verified. You can sign in to your account.",
    verifiedNote: "Your email address has been confirmed. You can now sign in and start shopping.",
    goToHome: "Go to Home",
    verificationFailed: "Verification failed",
    genericError: "We couldn't verify your email. The link may have expired.",
    validFor24Hours: "Verification links are valid for 24 hours.",
    contactSupport: "Contact Support",
  },
  ar: {
    invalidLink: "رابط التحقق غير صالح",
    invalidLinkNote: "لا يحتوي هذا الرابط على رمز تحقق. يرجى استخدام الرابط من رسالة التسجيل أو التواصل مع الدعم.",
    backToHome: "العودة إلى الرئيسية",
    verifying: "جارٍ التحقق من بريدك الإلكتروني…",
    pleaseWait: "يرجى الانتظار لحظة.",
    alreadyVerified: "تم التحقق مسبقًا",
    emailVerified: "تم التحقق من البريد الإلكتروني!",
    alreadyVerifiedNote: "تم التحقق من بريدك الإلكتروني بالفعل. يمكنك تسجيل الدخول إلى حسابك.",
    verifiedNote: "تم تأكيد بريدك الإلكتروني. يمكنك الآن تسجيل الدخول والبدء بالتسوق.",
    goToHome: "الذهاب إلى الرئيسية",
    verificationFailed: "فشل التحقق",
    genericError: "تعذّر التحقق من بريدك الإلكتروني. ربما انتهت صلاحية الرابط.",
    validFor24Hours: "روابط التحقق صالحة لمدة 24 ساعة.",
    contactSupport: "التواصل مع الدعم",
  },
} as const;

export default function VerifyEmailPage({ loaderData }: Route.ComponentProps) {
  const { token } = loaderData;
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  const fetcher = useFetcher<{
    success?: boolean;
    alreadyVerified?: boolean;
    error?: string;
  }>();

  // Auto-submit the token as soon as the page mounts
  useEffect(() => {
    if (!token) return;
    fetcher.submit(
      { _intent: "verifyEmail", token },
      { method: "post", encType: "application/json", action: "/api/auth" }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── No token in URL ── */
  if (!token) {
    return (
      <PageShell>
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={26} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t.invalidLink}</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          {t.invalidLinkNote}
        </p>
        <Link
          to="/"
          className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          {t.backToHome}
        </Link>
      </PageShell>
    );
  }

  /* ── Verifying (pending) ── */
  if (fetcher.state !== "idle" || !fetcher.data) {
    return (
      <PageShell>
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Loader2 size={30} className="text-emerald-600 animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t.verifying}</h1>
        <p className="text-sm text-gray-500">{t.pleaseWait}</p>
      </PageShell>
    );
  }

  const { success, alreadyVerified, error } = fetcher.data;

  /* ── Success ── */
  if (success) {
    return (
      <PageShell>
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {alreadyVerified ? t.alreadyVerified : t.emailVerified}
        </h1>
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
          {alreadyVerified
            ? t.alreadyVerifiedNote
            : t.verifiedNote}
        </p>
        <Link
          to="/"
          className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          {t.goToHome}
        </Link>
      </PageShell>
    );
  }

  /* ── Error ── */
  return (
    <PageShell>
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <AlertCircle size={26} className="text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">{t.verificationFailed}</h1>
      <p className="text-sm text-gray-500 mb-2 max-w-xs mx-auto">
        {error ?? t.genericError}
      </p>
      <p className="text-xs text-gray-400 mb-8">
        {t.validFor24Hours}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          className="inline-block border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {t.backToHome}
        </Link>
        <a
          href="mailto:support@phq.qa"
          className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          {t.contactSupport}
        </a>
      </div>
    </PageShell>
  );
}

/* ── Shared card wrapper ── */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-10 text-center">
        {/* Brand mark */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-emerald-600">
            <MailCheck size={22} />
            <span className="text-sm font-semibold uppercase tracking-widest">NutriBox</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
