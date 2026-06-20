import { useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/account.social";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData } from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { AlertCircle, CheckCircle2, Link2, Link2Off, Info } from "lucide-react";

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
    { title: "Social Accounts | PHQ" },
    { name: "robots", content: "noindex" },
  ];
}

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
  onConnect: () => void;
  onDisconnect: () => void;
}

function PlatformCard({
  name,
  icon,
  description,
  connected,
  connectedEmail,
  onConnect,
  onDisconnect,
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
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <Link2Off size={14} /> Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <Link2 size={14} /> Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm rounded-xl px-5 py-3 shadow-xl">
      <AlertCircle size={16} className="text-amber-400 shrink-0" />
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-white ml-1">
        ✕
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialAccountsPage({ loaderData }: Route.ComponentProps) {
  const { customer } = loaderData;
  const [toast, setToast] = useState<string | null>(null);

  // In a real implementation these would come from the server
  const [gmailConnected] = useState(false);
  const [facebookConnected] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleConnect(platform: string) {
    showToast(
      `Connecting ${platform} requires the Vendure external authentication plugin. Contact your administrator.`
    );
  }

  function handleDisconnect(platform: string) {
    showToast(`${platform} disconnected.`);
  }

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Social Accounts</h2>
          <p className="text-sm text-gray-500">
            Connect your social accounts for quick sign-in. Your personal data is never shared
            without consent.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Social login is powered by Vendure's external authentication plugin. Reach out to
            support if you need help connecting your accounts.
          </p>
        </div>

        {/* Platforms */}
        <PlatformCard
          name="Google"
          icon={<GoogleIcon />}
          description="Sign in quickly using your Google account"
          connected={gmailConnected}
          connectedEmail={gmailConnected ? customer.emailAddress : undefined}
          onConnect={() => handleConnect("Google")}
          onDisconnect={() => handleDisconnect("Google")}
        />

        <PlatformCard
          name="Facebook"
          icon={<FacebookIcon />}
          description="Sign in quickly using your Facebook account"
          connected={facebookConnected}
          onConnect={() => handleConnect("Facebook")}
          onDisconnect={() => handleDisconnect("Facebook")}
        />

        {/* Security note */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3">About Social Sign-In</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              Sign in without remembering a separate password
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              Your social provider only shares basic profile info (name, email)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              You can disconnect at any time from this page
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              Connecting a social account does not change your password
            </li>
          </ul>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </AccountLayout>
  );
}
