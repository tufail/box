import { useState, useEffect } from "react";
import { useFetcher, useNavigate, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/login";
import { Eye, EyeOff, LogIn } from "lucide-react";
import SocialAuthButtons from "~/components/SocialAuthButtons";
import { getLocaleFromPathname } from "~/lib/i18n";

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "Sign In | NutriBox" },
    { name: "description", content: "Sign in to your NutriBox account to track orders, manage your wishlist and write reviews." },
  ];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    signIn: "Sign in",
    welcomeBack: "Welcome back to NutriBox",
    orSignInWithEmail: "Or sign in with email",
    emailAddress: "Email Address",
    password: "Password",
    forgotPassword: "Forgot password?",
    showPassword: "Show password",
    hidePassword: "Hide password",
    signingIn: "Signing in…",
    signInButton: "Sign In",
    noAccount: "Don't have an account?",
    createOne: "Create one",
  },
  ar: {
    signIn: "تسجيل الدخول",
    welcomeBack: "مرحبًا بعودتك إلى NutriBox",
    orSignInWithEmail: "أو سجّل الدخول عبر البريد الإلكتروني",
    emailAddress: "البريد الإلكتروني",
    password: "كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    signingIn: "جارٍ تسجيل الدخول…",
    signInButton: "تسجيل الدخول",
    noAccount: "ليس لديك حساب؟",
    createOne: "أنشئ حسابًا",
  },
} as const;

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return { redirect: url.searchParams.get("redirect") ?? "/" };
}

export default function LoginPage({ loaderData }: Route.ComponentProps) {
  const returnTo = loaderData.redirect;
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/";
  const locale = getLocaleFromPathname(useLocation().pathname);
  const t = COPY[locale];

  const [error, setError] = useState<string | null>(null);
  const fetcher = useFetcher<{ error?: string }>();
  const loading = fetcher.state !== "idle";
  const navigate = useNavigate();

  const inputCls =
    "w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, fetcher.state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fetcher.submit(
      {
        _intent: "login",
        username: fd.get("email") as string,
        password: fd.get("password") as string,
        redirect: safeReturn,
      },
      { method: "post", encType: "application/json", action: "/api/auth" }
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <LogIn size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{t.signIn}</h1>
              <p className="text-xs text-gray-500">{t.welcomeBack}</p>
            </div>
          </div>

          <SocialAuthButtons
            dividerLabel={t.orSignInWithEmail}
            onSuccess={() => { window.location.href = safeReturn; }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>
                {t.emailAddress} <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls} style={{ marginBottom: 0 }}>
                  {t.password} <span className="text-red-500">*</span>
                </label>
                <Link
                  to={`/forgot-password${safeReturn !== "/" ? `?redirect=${encodeURIComponent(safeReturn)}` : ""}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={`${inputCls} pe-10`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

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
              {loading ? t.signingIn : t.signInButton}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {t.noAccount}{" "}
            <Link
              to={`/register${safeReturn !== "/" ? `?redirect=${encodeURIComponent(safeReturn)}` : ""}`}
              className="text-primary font-medium hover:underline"
            >
              {t.createOne}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
