import { useState, useEffect } from "react";
import { redirect, useFetcher } from "react-router";
import type { Route } from "./+types/account.reset-password";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData } from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { CheckCircle, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  try {
    const { data } = await graphqlRequest<CustomerProfileData>(
      env,
      GET_CUSTOMER_PROFILE_QUERY,
      undefined,
      { request }
    );
    if (!data.activeCustomer) return redirect("/");
    return { customer: data.activeCustomer };
  } catch {
    return redirect("/");
  }
}

export function meta() {
  return [
    { title: "Security | PHQ" },
    { name: "robots", content: "noindex" },
  ];
}

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
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required={required}
          placeholder={placeholder}
          {...(controlled
            ? { value, onChange: (e) => onChange(e.target.value) }
            : {})}
          className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a number", ok: /\d/.test(password) },
    { label: "Contains a letter", ok: /[a-zA-Z]/.test(password) },
    { label: "Contains a special character", ok: /[^a-zA-Z0-9]/.test(password) },
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
      setError("New passwords do not match.");
      return;
    }
    if (np.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    fetcher.submit(
      { _intent: "changePassword", currentPassword, newPassword: np },
      { method: "post", encType: "application/json", action: "/api/account" }
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Choose a strong password and don't reuse it for other accounts.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <PasswordInput
          name="currentPassword"
          label="Current Password"
          placeholder="Enter current password"
          required
        />

        <div>
          <PasswordInput
            name="newPassword"
            label="New Password"
            placeholder="Minimum 8 characters"
            required
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordStrength password={newPassword} />
        </div>

        <PasswordInput
          name="confirmPassword"
          label="Confirm New Password"
          placeholder="Repeat new password"
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
            Password changed successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}

function PasswordTips() {
  const tips = [
    "Use at least 8 characters — longer is stronger",
    "Mix uppercase, lowercase, numbers, and symbols",
    "Avoid using personal info like your name or birthday",
    "Don't reuse passwords from other sites",
    "Consider using a password manager",
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={18} className="text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Password Tips</h3>
      </div>
      <ul className="space-y-2">
        {tips.map((tip) => (
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

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Security</h2>
          <p className="text-sm text-gray-500">
            Manage your password and account security settings.
          </p>
        </div>

        <ChangePasswordForm />
        <PasswordTips />
      </div>
    </AccountLayout>
  );
}
