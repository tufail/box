import { useState, useEffect } from "react";
import { redirect, useFetcher, useLocation } from "react-router";
import type { Route } from "./+types/account.social";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, MY_LINKED_SOCIAL_ACCOUNTS_QUERY, type CustomerProfileData, type LinkedSocialAccountsData } from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { AlertCircle, CheckCircle2, Link2, Link2Off, Loader2 } from "lucide-react";
import { getLocaleFromPathname, localizePath } from "~/lib/i18n";
import { getGoogleIdToken, getFacebookAccessToken } from "~/lib/socialAuth";

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
const FACEBOOK_APP_ID = (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined) ?? "";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const locale = getLocaleFromPathname(new URL(request.url).pathname);
  try {
    const [profileResult, linkedResult] = await Promise.allSettled([
      graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request }),
      graphqlRequest<LinkedSocialAccountsData>(env, MY_LINKED_SOCIAL_ACCOUNTS_QUERY, undefined, { request }),
    ]);
    if (profileResult.status === "rejected" || !profileResult.value.data.activeCustomer) {
      return redirect(localizePath("/", locale));
    }
    const linkedAccounts = linkedResult.status === "fulfilled" ? linkedResult.value.data.myLinkedSocialAccounts : [];
    return { customer: profileResult.value.data.activeCustomer, linkedAccounts };
  } catch {
    return redirect(localizePath("/", locale));
  }
}

export function meta() {
  return [
    { title: "Social Accounts | NutriBox" },
    { name: "robots", content: "noindex" },
  ];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    disconnect: "Disconnect",
    connect: "Connect",
    connecting: "Connecting…",
    disconnecting: "Disconnecting…",
    socialAccounts: "Social Accounts",
    connectNote: "Connect your social accounts for quick sign-in. Your personal data is never shared without consent.",
    infoBanner: "Manage which accounts can be used to sign in to NutriBox below.",
    notConfigured: (provider: string) => `${provider} sign-in is not configured for this site yet.`,
    google: "Google",
    googleDesc: "Sign in quickly using your Google account",
    facebook: "Facebook",
    facebookDesc: "Sign in quickly using your Facebook account",
    aboutSocialSignIn: "About Social Sign-In",
    bullet1: "Sign in without remembering a separate password",
    bullet2: "Your social provider only shares basic profile info (name, email)",
    bullet3: "You can disconnect at any time from this page",
    bullet4: "Connecting a social account does not change your password",
    connected: (platform: string) => `${platform} account connected!`,
    disconnected: (platform: string) => `${platform} account disconnected.`,
    connectFailed: "Could not connect account.",
    disconnectFailed: "Could not disconnect account.",
  },
  ar: {
    disconnect: "قطع الاتصال",
    connect: "ربط",
    connecting: "جارٍ الربط…",
    disconnecting: "جارٍ قطع الاتصال…",
    socialAccounts: "الحسابات الاجتماعية",
    connectNote: "اربط حساباتك الاجتماعية لتسجيل دخول سريع. لن تتم مشاركة بياناتك الشخصية أبدًا دون موافقتك.",
    infoBanner: "أدر الحسابات التي يمكن استخدامها لتسجيل الدخول إلى NutriBox أدناه.",
    notConfigured: (provider: string) => `تسجيل الدخول عبر ${provider} غير مُفعّل على هذا الموقع بعد.`,
    google: "جوجل",
    googleDesc: "سجّل الدخول بسرعة باستخدام حساب جوجل الخاص بك",
    facebook: "فيسبوك",
    facebookDesc: "سجّل الدخول بسرعة باستخدام حساب فيسبوك الخاص بك",
    aboutSocialSignIn: "حول تسجيل الدخول الاجتماعي",
    bullet1: "سجّل الدخول دون الحاجة لتذكر كلمة مرور منفصلة",
    bullet2: "يشارك مزود الخدمة الاجتماعية معلومات الملف الشخصي الأساسية فقط (الاسم، البريد الإلكتروني)",
    bullet3: "يمكنك قطع الاتصال في أي وقت من هذه الصفحة",
    bullet4: "ربط حساب اجتماعي لا يغيّر كلمة المرور الخاصة بك",
    connected: (platform: string) => `تم ربط حساب ${platform}!`,
    disconnected: (platform: string) => `تم قطع الاتصال بحساب ${platform}.`,
    connectFailed: "تعذّر ربط الحساب.",
    disconnectFailed: "تعذّر قطع الاتصال بالحساب.",
  },
} as const;

// ─── Platform icons (inline SVG) ─────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-6 h-6">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-6 h-6">
      <path fill="#3F51B5" d="M42 37a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v26z" />
      <path fill="#FFF" d="M34.368 25H31v13h-5V25h-3v-4h3v-2.41c.002-3.508 1.459-5.59 5.592-5.59H35v4h-2.287C31.104 17 31 17.6 31 18.723V21h4l-.632 4z" />
    </svg>
  );
}

// ─── Platform card ────────────────────────────────────────────────────────────

interface PlatformCardProps {
  name: string;
  icon: React.ReactNode;
  description: string;
  connected: boolean;
  connectedEmail?: string;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  t: (typeof COPY)[keyof typeof COPY];
}

function PlatformCard({
  name,
  icon,
  description,
  connected,
  connectedEmail,
  busy,
  onConnect,
  onDisconnect,
  t,
}: PlatformCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
            {icon}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{name}</p>
              {connected && (
                <CheckCircle2 size={15} className="text-emerald-500" />
              )}
            </div>
            {connected && connectedEmail ? (
              <p className="text-sm text-gray-500 mt-0.5">{connectedEmail}</p>
            ) : (
              <p className="text-sm text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Action */}
        {connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2Off size={14} />} {busy ? t.disconnecting : t.disconnect}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {busy ? t.connecting : t.connect}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, error, onClose }: { message: string; error?: boolean; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 text-white text-sm rounded-xl px-5 py-3 shadow-xl ${error ? "bg-red-600" : "bg-gray-900"}`}>
      <AlertCircle size={16} className={error ? "text-white shrink-0" : "text-amber-400 shrink-0"} />
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-gray-300 hover:text-white ms-1">
        ✕
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialAccountsPage({ loaderData }: Route.ComponentProps) {
  const { customer, linkedAccounts } = loaderData;
  const t = COPY[getLocaleFromPathname(useLocation().pathname)];
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [connectedProviders, setConnectedProviders] = useState(() => new Set(linkedAccounts.map((a) => a.provider)));
  const [busyProvider, setBusyProvider] = useState<"google" | "facebook" | null>(null);
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data || !busyProvider) return;
    const provider = busyProvider;
    const label = provider === "google" ? t.google : t.facebook;
    if (fetcher.data.error) {
      showToast(fetcher.data.error, true);
    } else if (fetcher.data.success) {
      setConnectedProviders((prev) => {
        const next = new Set(prev);
        if (next.has(provider)) {
          next.delete(provider);
          showToast(t.disconnected(label));
        } else {
          next.add(provider);
          showToast(t.connected(label));
        }
        return next;
      });
    }
    setBusyProvider(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data, fetcher.state]);

  function showToast(msg: string, error = false) {
    setToast({ message: msg, error });
    setTimeout(() => setToast(null), 4500);
  }

  async function handleConnect(provider: "google" | "facebook") {
    if (provider === "google" && !GOOGLE_CLIENT_ID) {
      showToast(t.notConfigured(t.google), true);
      return;
    }
    if (provider === "facebook" && !FACEBOOK_APP_ID) {
      showToast(t.notConfigured(t.facebook), true);
      return;
    }
    setBusyProvider(provider);
    try {
      const token = provider === "google" ? await getGoogleIdToken(GOOGLE_CLIENT_ID) : await getFacebookAccessToken(FACEBOOK_APP_ID);
      fetcher.submit(
        { _intent: provider === "google" ? "linkGoogleAccount" : "linkFacebookAccount", token },
        { method: "post", encType: "application/json", action: "/api/account" }
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : t.connectFailed, true);
      setBusyProvider(null);
    }
  }

  function handleDisconnect(provider: "google" | "facebook") {
    setBusyProvider(provider);
    fetcher.submit(
      { _intent: "unlinkSocialAccount", provider },
      { method: "post", encType: "application/json", action: "/api/account" }
    );
  }

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.socialAccounts}</h2>
          <p className="text-sm text-gray-500">
            {t.connectNote}
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
          <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            {t.infoBanner}
          </p>
        </div>

        {/* Platforms */}
        <PlatformCard
          name={t.google}
          icon={<GoogleIcon />}
          description={t.googleDesc}
          connected={connectedProviders.has("google")}
          connectedEmail={connectedProviders.has("google") ? customer.emailAddress : undefined}
          busy={busyProvider === "google"}
          onConnect={() => handleConnect("google")}
          onDisconnect={() => handleDisconnect("google")}
          t={t}
        />

        <PlatformCard
          name={t.facebook}
          icon={<FacebookIcon />}
          description={t.facebookDesc}
          connected={connectedProviders.has("facebook")}
          connectedEmail={connectedProviders.has("facebook") ? customer.emailAddress : undefined}
          busy={busyProvider === "facebook"}
          onConnect={() => handleConnect("facebook")}
          onDisconnect={() => handleDisconnect("facebook")}
          t={t}
        />

        {/* Security note */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3">{t.aboutSocialSignIn}</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              {t.bullet1}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              {t.bullet2}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              {t.bullet3}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              {t.bullet4}
            </li>
          </ul>
        </div>
      </div>

      {toast && <Toast message={toast.message} error={toast.error} onClose={() => setToast(null)} />}
    </AccountLayout>
  );
}
