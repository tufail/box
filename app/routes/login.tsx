import { useState, useEffect } from "react";
import { Link, useFetcher, useNavigate } from "react-router";
import type { Route } from "./+types/login";
import { Eye, EyeOff, LogIn } from "lucide-react";
import SocialAuthButtons from "~/components/SocialAuthButtons";

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "Sign In | PHQ" },
    { name: "description", content: "Sign in to your PHQ account to track orders, manage your wishlist and write reviews." },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return { redirect: url.searchParams.get("redirect") ?? "/" };
}

export default function LoginPage({ loaderData }: Route.ComponentProps) {
  const returnTo = loaderData.redirect;
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/";

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
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Sign in</h1>
              <p className="text-xs text-gray-500">Welcome back to PHQ</p>
            </div>
          </div>

          <SocialAuthButtons
            dividerLabel="Or sign in with email"
            onSuccess={() => { window.location.href = safeReturn; }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>
                Email Address <span className="text-red-500">*</span>
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
                  Password <span className="text-red-500">*</span>
                </label>
                <Link
                  to={`/forgot-password${safeReturn !== "/" ? `?redirect=${encodeURIComponent(safeReturn)}` : ""}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{" "}
            <Link
              to={`/register${safeReturn !== "/" ? `?redirect=${encodeURIComponent(safeReturn)}` : ""}`}
              className="text-primary font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
