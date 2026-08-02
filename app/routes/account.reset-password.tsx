import { useState, useEffect } from "react";
import { redirect, useFetcher, useLocation } from "react-router";
import type { Route } from "./+types/account.reset-password";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData } from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { CheckCircle, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const locale = getLocaleFromPathname(new URL(request.url).pathname);
  try {
    const { data } = await graphqlRequest<CustomerProfileData>(
      env,
      GET_CUSTOMER_PROFILE_QUERY,
      undefined,
      { request }
    );
    if (!data.activeCustomer) return redirect(localizePath("/", locale));
    return { customer: data.activeCustomer };
  } catch {
    return redirect(localizePath("/", locale));
  }
}

export function meta() {
  return [
    { title: "Security | NutriBox" },
    { name: "robots", content: "noindex" },
  ];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    showPassword: "Show password",
    hidePassword: "Hide password",
    strengthChecks: [
      "At least 8 characters",
      "Contains a number",
      "Contains a letter",
      "Contains a special character",
    ],
    changePassword: "Change Password",
    changePasswordNote: "Choose a strong password and don't reuse it for other accounts.",
    currentPassword: "Current Password",
    enterCurrentPassword: "Enter current password",
    newPassword: "New Password",
    minPasswordChars: "Minimum 8 characters",
    confirmNewPassword: "Confirm New Password",
    repeatNewPassword: "Repeat new password",
    passwordsDoNotMatch: "New passwords do not match.",
    passwordTooShort: "New password must be at least 8 characters.",
    passwordChanged: "Password changed successfully!",
    updating: "Updating…",
    updatePassword: "Update Password",
    passwordTips: "Password Tips",
    tips: [
      "Use at least 8 characters — longer is stronger",
      "Mix uppercase, lowercase, numbers, and symbols",
      "Avoid using personal info like your name or birthday",
      "Don't reuse passwords from other sites",
      "Consider using a password manager",
    ],
    security: "Security",
    securityNote: "Manage your password and account security settings.",
  },
  ar: {
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    strengthChecks: [
      "8 أحرف على الأقل",
      "تحتوي على رقم",
      "تحتوي على حرف",
      "تحتوي على رمز خاص",
    ],
    changePassword: "تغيير كلمة المرور",
    changePasswordNote: "اختر كلمة مرور قوية ولا تعيد استخدامها في حسابات أخرى.",
    currentPassword: "كلمة المرور الحالية",
    enterCurrentPassword: "أدخل كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    minPasswordChars: "8 أحرف على الأقل",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة",
    repeatNewPassword: "أعد إدخال كلمة المرور الجديدة",
    passwordsDoNotMatch: "كلمتا المرور الجديدتان غير متطابقتين.",
    passwordTooShort: "يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.",
    passwordChanged: "تم تغيير كلمة المرور بنجاح!",
    updating: "جارٍ التحديث…",
    updatePassword: "تحديث كلمة المرور",
    passwordTips: "نصائح لكلمة المرور",
    tips: [
      "استخدم 8 أحرف على الأقل — كلما طالت كانت أقوى",
      "امزج بين الأحرف الكبيرة والصغيرة والأرقام والرموز",
      "تجنّب استخدام معلومات شخصية مثل اسمك أو تاريخ ميلادك",
      "لا تعد استخدام كلمات مرور من مواقع أخرى",
      "فكّر في استخدام مدير كلمات مرور",
    ],
    security: "الأمان",
    securityNote: "إدارة كلمة المرور وإعدادات أمان حسابك.",
  },
} as const;

function PasswordInput({
  name,
  label,
  placeholder,
  required,
  value,
  onChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          required={required}
          placeholder={placeholder}
          {...(controlled
            ? { value, onChange: (e) => onChange(e.target.value) }
            : {})}
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

function PasswordStrength({ password }: { password: string }) {
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  const checks = [
    { label: t.strengthChecks[0], ok: password.length >= 8 },
    { label: t.strengthChecks[1], ok: /\d/.test(password) },
    { label: t.strengthChecks[2], ok: /[a-zA-Z]/.test(password) },
    { label: t.strengthChecks[3], ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor =
    score <= 1 ? "bg-red-400" : score === 2 ? "bg-amber-400" : score === 3 ? "bg-yellow-400" : "bg-emerald-500";

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? barColor : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map(({ label, ok }) => (
          <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : "text-gray-400"}`}>
            <CheckCircle size={11} className={ok ? "text-emerald-500" : "text-gray-300"} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangePasswordForm() {
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [fetcher.data, fetcher.state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get("currentPassword") as string;
    const np = fd.get("newPassword") as string;
    const cp = fd.get("confirmPassword") as string;

    if (np !== cp) {
      setError(t.passwordsDoNotMatch);
      return;
    }
    if (np.length < 8) {
      setError(t.passwordTooShort);
      return;
    }

    fetcher.submit(
      { _intent: "changePassword", currentPassword, newPassword: np },
      { method: "post", encType: "application/json", action: "/api/account" }
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.changePassword}</h2>
      <p className="text-sm text-gray-500 mb-6">
        {t.changePasswordNote}
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <PasswordInput
          name="currentPassword"
          label={t.currentPassword}
          placeholder={t.enterCurrentPassword}
          required
        />

        <div>
          <PasswordInput
            name="newPassword"
            label={t.newPassword}
            placeholder={t.minPasswordChars}
            required
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordStrength password={newPassword} />
        </div>

        <PasswordInput
          name="confirmPassword"
          label={t.confirmNewPassword}
          placeholder={t.repeatNewPassword}
          required
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">
            <CheckCircle size={16} />
            {t.passwordChanged}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t.updating : t.updatePassword}
        </button>
      </form>
    </div>
  );
}

function PasswordTips() {
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={18} className="text-emerald-600" />
        <h3 className="font-semibold text-gray-900">{t.passwordTips}</h3>
      </div>
      <ul className="space-y-2">
        {t.tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResetPasswordPage({ loaderData }: Route.ComponentProps) {
  const { customer } = loaderData;
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.security}</h2>
          <p className="text-sm text-gray-500">
            {t.securityNote}
          </p>
        </div>

        <ChangePasswordForm />
        <PasswordTips />
      </div>
    </AccountLayout>
  );
}
