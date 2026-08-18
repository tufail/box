import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Check, Lock } from "lucide-react";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    title: "Save your info for next time?",
    subtitle: (email: string) => `Create a password for ${email} to check out faster next time.`,
    passwordLabel: "Create a password",
    minChars: "Minimum 8 characters",
    submit: "Create Account",
    creating: "Creating…",
    doneVerified: "Account created! You're all set for next time.",
    doneUnverified: "Account created! Check your email to verify it, then sign in next time.",
  },
  ar: {
    title: "هل تريد حفظ بياناتك للمرة القادمة؟",
    subtitle: (email: string) => `أنشئ كلمة مرور لـ ${email} لإتمام الشراء بشكل أسرع في المرة القادمة.`,
    passwordLabel: "أنشئ كلمة مرور",
    minChars: "8 أحرف على الأقل",
    submit: "إنشاء حساب",
    creating: "جارٍ الإنشاء…",
    doneVerified: "تم إنشاء الحساب! أصبحت جاهزًا للمرة القادمة.",
    doneUnverified: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتفعيل، ثم سجّل الدخول في المرة القادمة.",
  },
} as const;

/**
 * Shown on order confirmation pages for guest checkouts only (a Customer with
 * no linked User yet). registerCustomerAccount attaches auth credentials to
 * the SAME guest Customer record created during checkout — it doesn't create
 * a duplicate — so this "upgrades" the guest to a real account in one field.
 */
export default function PostOrderAccountPrompt({ email, firstName, lastName, locale }: { email: string; firstName: string; lastName: string; locale: "en" | "ar" }) {
  const t = COPY[locale];
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const fetcher = useFetcher<{ error?: string; login?: { __typename?: string; message?: string } }>();
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const d = fetcher.data;
    if (d.error) {
      setError(d.error);
      return;
    }
    if (d.login) {
      setVerified(d.login.__typename === "CurrentUser");
    }
  }, [fetcher.data, fetcher.state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    fetcher.submit({ _intent: "register", firstName, lastName, emailAddress: email, password }, { method: "post", encType: "application/json", action: "/api/checkout" });
  }

  if (verified !== null) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-start flex items-start gap-3">
        <Check size={18} className="text-green-600 mt-0.5 shrink-0" strokeWidth={2.5} />
        <p className="text-sm text-green-800">{verified ? t.doneVerified : t.doneUnverified}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-start p-5">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">{t.title}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">{t.subtitle(email)}</p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.passwordLabel}
          title={t.minChars}
          required
          minLength={8}
          className="flex-1 border border-gray-300 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button type="submit" disabled={busy} className="bg-primary text-white font-semibold px-5 py-2.5 rounded text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
          {busy ? t.creating : t.submit}
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
