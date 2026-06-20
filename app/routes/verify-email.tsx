import { useEffect } from "react";
import { Link, useFetcher } from "react-router";
import type { Route } from "./+types/verify-email";
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from "lucide-react";

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "Verify Email | PHQ" },
    { name: "robots", content: "noindex" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return { token };
}

export default function VerifyEmailPage({ loaderData }: Route.ComponentProps) {
  const { token } = loaderData;
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid verification link</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          This link doesn't contain a verification token. Please use the link from your
          registration email or contact support.
        </p>
        <Link
          to="/"
          className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          Back to Home
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying your email…</h1>
        <p className="text-sm text-gray-500">Please wait a moment.</p>
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
          {alreadyVerified ? "Already verified" : "Email verified!"}
        </h1>
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
          {alreadyVerified
            ? "Your email address is already verified. You can sign in to your account."
            : "Your email address has been confirmed. You can now sign in and start shopping."}
        </p>
        <Link
          to="/"
          className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          Go to Home
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
      <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
      <p className="text-sm text-gray-500 mb-2 max-w-xs mx-auto">
        {error ?? "We couldn't verify your email. The link may have expired."}
      </p>
      <p className="text-xs text-gray-400 mb-8">
        Verification links are valid for 24 hours.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          className="inline-block border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Back to Home
        </Link>
        <a
          href="mailto:support@phq.qa"
          className="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          Contact Support
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
            <span className="text-sm font-semibold uppercase tracking-widest">PHQ</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
