import { useState, useEffect } from "react";
import { useFetcher, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/reset-password";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { getLocaleFromPathname } from "~/lib/i18n";

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "Reset Password | NutriBox" },
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
    showPassword: "Show password",
    hidePassword: "Hide password",
    strength: ["Too weak", "Weak", "Fair", "Good", "Strong"],
    passwordsDoNotMatch: "Passwords do not match.",
    invalidResetLink: "Invalid reset link",
    missingTokenNote: "This password reset link is missing a token. Please use the link from your email or request a new one.",
    requestNewLink: "Request a new link",
    passwordUpdated: "Password updated!",
    resetSuccessNote: "Your password has been reset successfully. You can now sign in with your new password.",
    backToHome: "Back to Home",
    setNewPassword: "Set new password",
    chooseStrongPasswordNote: "Choose a strong password for your account. You'll be signed in automatically after resetting.",
    newPassword: "New Password",
    minPasswordChars: "Minimum 8 characters",
    confirmNewPassword: "Confirm New Password",
    repeatNewPassword: "Repeat your new password",
    updatingPassword: "Updating password…",
    resetPassword: "Reset Password",
  },
  ar: {
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    strength: ["ضعيفة جدًا", "ضعيفة", "متوسطة", "جيدة", "قوية"],
    passwordsDoNotMatch: "كلمتا المرور غير متطابقتين.",
    invalidResetLink: "رابط إعادة التعيين غير صالح",
    missingTokenNote: "رابط إعادة تعيين كلمة المرور هذا يفتقد إلى رمز التحقق. يرجى استخدام الرابط من بريدك الإلكتروني أو طلب رابط جديد.",
    requestNewLink: "طلب رابط جديد",
    passwordUpdated: "تم تحديث كلمة المرور!",
    resetSuccessNote: "تمت إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    backToHome: "العودة إلى الرئيسية",
    setNewPassword: "تعيين كلمة مرور جديدة",
    chooseStrongPasswordNote: "اختر كلمة مرور قوية لحسابك. سيتم تسجيل دخولك تلقائيًا بعد إعادة التعيين.",
    newPassword: "كلمة المرور الجديدة",
    minPasswordChars: "8 أحرف على الأقل",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة",
    repeatNewPassword: "أعد إدخال كلمة المرور الجديدة",
    updatingPassword: "جارٍ تحديث كلمة المرور…",
    resetPassword: "إعادة تعيين كلمة المرور",
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PasswordField({
  name,
  label,
  placeholder,
  value,
  onChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          minLength={8}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={name === "password" ? "new-password" : "new-password"}
          className="w-full px-3 py-2.5 pe-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
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
    </div>
  );
}

function StrengthBar({ password }: { password: string }) {
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /\d/.test(password),
    /[a-zA-Z]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const color =
    score <= 1 ? "bg-red-400" : score === 2 ? "bg-amber-400" : score === 3 ? "bg-yellow-400" : "bg-emerald-500";
  const label = t.strength[score];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? color : "bg-gray-200"}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${score <= 1 ? "text-red-500" : score <= 2 ? "text-amber-500" : "text-emerald-600"}`}>
        {label}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResetPasswordPage({ loaderData }: Route.ComponentProps) {
  const { token } = loaderData;
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const loading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.error) {
      setError(fetcher.data.error);
      return;
    }
    if (fetcher.data.success) {
      setSuccess(true);
    }
  }, [fetcher.data, fetcher.state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t.passwordsDoNotMatch);
      return;
    }
    fetcher.submit(
      { _intent: "resetPassword", token, password },
      { method: "post", encType: "application/json", action: "/api/auth" }
    );
  }

  /* ── No token in URL ── */
  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.invalidResetLink}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {t.missingTokenNote}
          </p>
          <Link
            to="/forgot-password"
            className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            {t.requestNewLink}
          </Link>
        </div>
      </div>
    );
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.passwordUpdated}</h1>
          <p className="text-sm text-gray-500 mb-8">
            {t.resetSuccessNote}
          </p>
          <Link
            to="/"
            className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            {t.backToHome}
          </Link>
        </div>
      </div>
    );
  }

  /* ── Reset form ── */
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
            <KeyRound size={26} className="text-emerald-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.setNewPassword}</h1>
          <p className="text-sm text-gray-500 mb-7">
            {t.chooseStrongPasswordNote}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <PasswordField
                name="password"
                label={t.newPassword}
                placeholder={t.minPasswordChars}
                value={password}
                onChange={setPassword}
              />
              <StrengthBar password={password} />
            </div>

            <PasswordField
              name="confirmPassword"
              label={t.confirmNewPassword}
              placeholder={t.repeatNewPassword}
              value={confirm}
              onChange={setConfirm}
            />

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t.updatingPassword : t.resetPassword}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <Link
              to="/forgot-password"
              className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft size={14} className="rtl:rotate-180" /> {t.requestNewLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
