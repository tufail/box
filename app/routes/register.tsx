import { useState, useEffect, useRef } from "react";
import { useFetcher, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/register";
import { getLocaleFromPathname } from "~/lib/i18n";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return { redirect: url.searchParams.get("redirect") ?? "/" };
}
import { CheckCircle2, Check, Eye, EyeOff, UserPlus } from "lucide-react";
import SocialAuthButtons from "~/components/SocialAuthButtons";

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "Create Account | NutriBox" },
    { name: "description", content: "Join NutriBox and enjoy exclusive offers, fast checkout, and order tracking." },
  ];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    showPassword: "Show password",
    hidePassword: "Hide password",
    accountCreated: "Account created!",
    verificationSentTo: "We've sent a verification email to",
    checkInbox: "Please check your inbox and click the link to activate your account.",
    signIn: "Sign In",
    createAnAccount: "Create an account",
    joinNutribox: "Join NutriBox for faster checkout & order tracking",
    orSignUpWithEmail: "Or sign up with email",
    firstName: "First Name",
    lastName: "Last Name",
    emailAddress: "Email Address",
    phoneNumber: "Phone Number",
    password: "Password",
    minPasswordChars: "Minimum 8 characters",
    emailMeOffers: "Email me with news and offers",
    subscribeAgreement: "By subscribing you agree to our",
    privacyPolicy: "Privacy Policy",
    unsubscribeNote: ". You can unsubscribe at any time.",
    createAccountAgreement: "By creating an account you agree to our",
    termsAndConditions: "Terms & Conditions",
    and: "and",
    creatingAccount: "Creating account…",
    createAccount: "Create Account",
    alreadyHaveAccount: "Already have an account?",
  },
  ar: {
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    accountCreated: "تم إنشاء الحساب!",
    verificationSentTo: "لقد أرسلنا رسالة تحقق إلى",
    checkInbox: "يرجى التحقق من بريدك الإلكتروني والنقر على الرابط لتفعيل حسابك.",
    signIn: "تسجيل الدخول",
    createAnAccount: "إنشاء حساب",
    joinNutribox: "انضم إلى NutriBox لتسجيل خروج أسرع وتتبع الطلبات",
    orSignUpWithEmail: "أو أنشئ حسابًا عبر البريد الإلكتروني",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    emailAddress: "البريد الإلكتروني",
    phoneNumber: "رقم الهاتف",
    password: "كلمة المرور",
    minPasswordChars: "8 أحرف على الأقل",
    emailMeOffers: "أرسلوا لي الأخبار والعروض عبر البريد الإلكتروني",
    subscribeAgreement: "بالاشتراك، فإنك توافق على",
    privacyPolicy: "سياسة الخصوصية",
    unsubscribeNote: ". يمكنك إلغاء الاشتراك في أي وقت.",
    createAccountAgreement: "بإنشاء حساب، فإنك توافق على",
    termsAndConditions: "الشروط والأحكام",
    and: "و",
    creatingAccount: "جارٍ إنشاء الحساب…",
    createAccount: "إنشاء حساب",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
  },
} as const;

function PasswordInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type={show ? "text" : "password"}
        required
        minLength={8}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full border border-gray-300 rounded px-3 py-2.5 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={show ? t.hidePassword : t.showPassword}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage({ loaderData }: Route.ComponentProps) {
  const returnTo = loaderData.redirect;
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/";
  const locale = getLocaleFromPathname(useLocation().pathname);
  const t = COPY[locale];
  const [newsletter, setNewsletter] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fetcher = useFetcher<{ registered?: boolean; error?: string }>();
  const loading = fetcher.state !== "idle";
  // Anti-bot: same honeypot/fill-time pattern as the newsletter form.
  const formRenderedAt = useRef(Date.now());

  const inputCls =
    "w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.error) {
      setError(fetcher.data.error);
      return;
    }
    if (fetcher.data.registered) {
      setRegistered(true);
    }
  }, [fetcher.data, fetcher.state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const emailVal = fd.get("emailAddress") as string;
    setEmail(emailVal);
    const body: Record<string, string> = {
      _intent: "register",
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      emailAddress: emailVal,
      password: fd.get("password") as string,
      emailOffers: fd.get("emailOffers") as string,
      company: (fd.get("company") as string) ?? "",
      renderedAt: String(formRenderedAt.current),
    };
    const phone = fd.get("phoneNumber") as string;
    if (phone) body.phoneNumber = phone;
    fetcher.submit(body, {
      method: "post",
      encType: "application/json",
      action: "/api/auth",
    });
  }

  /* ── Success state ── */
  if (registered) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.accountCreated}</h1>
          <p className="text-sm text-gray-500 mb-1">
            {t.verificationSentTo}{" "}
            <span className="font-medium text-gray-700">{email}</span>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {t.checkInbox}
          </p>
          <Link
            to={`/login${safeReturn !== "/" ? `?redirect=${encodeURIComponent(safeReturn)}` : ""}`}
            className="inline-block bg-primary text-white px-8 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {t.signIn}
          </Link>
        </div>
      </div>
    );
  }

  /* ── Register form ── */
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{t.createAnAccount}</h1>
              <p className="text-xs text-gray-500">{t.joinNutribox}</p>
            </div>
          </div>

          <SocialAuthButtons dividerLabel={t.orSignUpWithEmail} emailOffers={newsletter} />

          {/* Registration form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Honeypot — off-screen and out of tab order, so real users never see or fill it. */}
            <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="register-firstName" className={labelCls}>
                  {t.firstName} <span className="text-red-500">*</span>
                </label>
                <input id="register-firstName" name="firstName" type="text" required autoComplete="given-name" className={inputCls} />
              </div>
              <div>
                <label htmlFor="register-lastName" className={labelCls}>
                  {t.lastName} <span className="text-red-500">*</span>
                </label>
                <input id="register-lastName" name="lastName" type="text" required autoComplete="family-name" className={inputCls} />
              </div>
            </div>

            <div>
              <label htmlFor="register-emailAddress" className={labelCls}>
                {t.emailAddress} <span className="text-red-500">*</span>
              </label>
              <input id="register-emailAddress" name="emailAddress" type="email" required autoComplete="email" className={inputCls} />
            </div>

            <div>
              <label htmlFor="register-phoneNumber" className={labelCls}>{t.phoneNumber}</label>
              <input
                id="register-phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+974 xxxx xxxx"
                autoComplete="tel"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelCls}>
                {t.password} <span className="text-red-500">*</span>
              </label>
              <PasswordInput name="password" placeholder={t.minPasswordChars} />
            </div>

            {/* Newsletter consent */}
            <div className="pt-1">
              <label htmlFor="register-newsletter" className="flex items-start gap-2.5 cursor-pointer select-none">
                <input id="register-newsletter" type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="peer sr-only" />
                <div className="mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors bg-white border-gray-300 peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1">
                  {newsletter && <Check size={12} strokeWidth={3} className="text-primary" />}
                </div>
                <input type="hidden" name="emailOffers" value={newsletter ? "true" : "false"} />
                <span className="text-sm text-gray-700">{t.emailMeOffers}</span>
              </label>
              <p className="text-xs text-gray-400 mt-1.5 ms-7">
                {t.subscribeAgreement}{" "}
                <Link
                  to="/privacy-policy"
                  className="underline hover:text-gray-600 transition-colors"
                >
                  {t.privacyPolicy}
                </Link>
                {t.unsubscribeNote}
              </p>
            </div>

            {/* Privacy & terms note */}
            <p className="text-xs text-gray-400 text-center">
              {t.createAccountAgreement}{" "}
              <Link to="/terms" className="underline hover:text-gray-600 transition-colors">
                {t.termsAndConditions}
              </Link>{" "}
              {t.and}{" "}
              <Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
                {t.privacyPolicy}
              </Link>
              .
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-3 rounded hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t.creatingAccount : t.createAccount}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-500 mt-5">
            {t.alreadyHaveAccount}{" "}
            <Link
              to={`/login${safeReturn !== "/" ? `?redirect=${encodeURIComponent(safeReturn)}` : ""}`}
              className="text-primary font-medium hover:underline"
            >
              {t.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
