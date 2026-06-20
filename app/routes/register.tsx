import { useState, useEffect } from "react";
import { Link, useFetcher } from "react-router";
import type { Route } from "./+types/register";
import { CheckCircle2, Check, Eye, EyeOff, UserPlus } from "lucide-react";
import SocialAuthButtons from "~/components/SocialAuthButtons";

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "Create Account | PHQ" },
    { name: "description", content: "Join PHQ and enjoy exclusive offers, fast checkout, and order tracking." },
  ];
}

function PasswordInput({
  name,
  placeholder,
}: {
  name: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required
        minLength={8}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full border border-gray-300 rounded px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [newsletter, setNewsletter] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fetcher = useFetcher<{ registered?: boolean; error?: string }>();
  const loading = fetcher.state !== "idle";

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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account created!</h1>
          <p className="text-sm text-gray-500 mb-1">
            We've sent a verification email to{" "}
            <span className="font-medium text-gray-700">{email}</span>.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Please check your inbox and click the link to activate your account.
          </p>
          <Link
            to="/"
            className="inline-block bg-primary text-white px-8 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Back to Home
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
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Create an account</h1>
              <p className="text-xs text-gray-500">Join PHQ for faster checkout & order tracking</p>
            </div>
          </div>

          <SocialAuthButtons dividerLabel="Or sign up with email" emailOffers={newsletter} />

          {/* Registration form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input name="firstName" type="text" required autoComplete="given-name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input name="lastName" type="text" required autoComplete="family-name" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input name="emailAddress" type="email" required autoComplete="email" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                name="phoneNumber"
                type="tel"
                placeholder="+974 xxxx xxxx"
                autoComplete="tel"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                Password <span className="text-red-500">*</span>
              </label>
              <PasswordInput name="password" placeholder="Minimum 8 characters" />
            </div>

            {/* Newsletter consent */}
            <div className="pt-1">
              <label
                className="flex items-start gap-2.5 cursor-pointer select-none"
                onClick={() => setNewsletter((v) => !v)}
              >
                <div
                  className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors bg-white ${
                    newsletter ? "border-primary" : "border-gray-300"
                  }`}
                >
                  {newsletter && <Check size={12} strokeWidth={3} className="text-primary" />}
                </div>
                <input type="hidden" name="emailOffers" value={newsletter ? "true" : "false"} />
                <span className="text-sm text-gray-700">Email me with news and offers</span>
              </label>
              <p className="text-xs text-gray-400 mt-1.5 ml-7">
                By subscribing you agree to our{" "}
                <Link
                  to="/privacy-policy"
                  className="underline hover:text-gray-600 transition-colors"
                >
                  Privacy Policy
                </Link>
                . You can unsubscribe at any time.
              </p>
            </div>

            {/* Privacy & terms note */}
            <p className="text-xs text-gray-400 text-center">
              By creating an account you agree to our{" "}
              <Link to="/terms" className="underline hover:text-gray-600 transition-colors">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
                Privacy Policy
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
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <Link to="/" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
