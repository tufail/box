import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Loader2 } from "lucide-react";
import { getGoogleIdToken, getFacebookAccessToken } from "~/lib/socialAuth";

// Configure via VITE_GOOGLE_CLIENT_ID / VITE_FACEBOOK_APP_ID in your .env file
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
const FACEBOOK_APP_ID = (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined) ?? "";

// ─── Brand icons ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0" aria-hidden>
      <path fill="#3F51B5" d="M42 37a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v26z" />
      <path fill="#FFF" d="M34.368 25H31v13h-5V25h-3v-4h3v-2.41c.002-3.508 1.459-5.59 5.592-5.59H35v4h-2.287C31.104 17 31 17.6 31 18.723V21h4l-.632 4z" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  /** Text inside the OR divider between social buttons and the email form */
  dividerLabel: string;
  /**
   * Called after a successful social login. Defaults to `window.location.reload()`
   * so the page picks up the new auth session.
   */
  onSuccess?: () => void;
  /** Pass "white" when the divider sits on a non-white background */
  bg?: "white" | "gray";
}

export default function SocialAuthButtons({ dividerLabel, onSuccess, bg = "white" }: Props) {
  const [active, setActive] = useState<"google" | "facebook" | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const fetcherBusy = fetcher.state !== "idle";
  const busy = active !== null || fetcherBusy;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.error) {
      setSocialError(fetcher.data.error);
      setActive(null);
      return;
    }
    if (fetcher.data.success) {
      setActive(null);
      if (onSuccess) onSuccess();
      else window.location.reload();
    }
  }, [fetcher.data, fetcher.state, onSuccess]);

  async function submit(provider: "google" | "facebook", token: string) {
    fetcher.submit(
      { _intent: "socialLogin", provider, token },
      { method: "post", encType: "application/json", action: "/api/auth" }
    );
  }

  async function handleGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      setSocialError("Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.");
      return;
    }
    setSocialError(null);
    setActive("google");
    try {
      const token = await getGoogleIdToken(GOOGLE_CLIENT_ID);
      submit("google", token);
    } catch (e) {
      setSocialError(e instanceof Error ? e.message : "Google sign-in failed.");
      setActive(null);
    }
  }

  async function handleFacebook() {
    if (!FACEBOOK_APP_ID) {
      setSocialError("Facebook sign-in is not configured. Add VITE_FACEBOOK_APP_ID to your .env file.");
      return;
    }
    setSocialError(null);
    setActive("facebook");
    try {
      const token = await getFacebookAccessToken(FACEBOOK_APP_ID);
      submit("facebook", token);
    } catch (e) {
      setSocialError(e instanceof Error ? e.message : "Facebook sign-in failed.");
      setActive(null);
    }
  }

  const googleBusy = active === "google";
  const facebookBusy = active === "facebook";

  const btnCls =
    "flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const dividerBg = bg === "white" ? "bg-white" : "bg-gray-50";

  return (
    <div>
      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={handleGoogle} disabled={busy} className={btnCls}>
          {googleBusy ? <Loader2 size={16} className="animate-spin shrink-0" /> : <GoogleIcon />}
          <span>{googleBusy ? "Signing in…" : "Google"}</span>
        </button>

        <button type="button" onClick={handleFacebook} disabled={busy} className={btnCls}>
          {facebookBusy ? <Loader2 size={16} className="animate-spin shrink-0" /> : <FacebookIcon />}
          <span>{facebookBusy ? "Signing in…" : "Facebook"}</span>
        </button>
      </div>

      {/* Inline error */}
      {socialError && (
        <div className="mt-2 bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-xs leading-relaxed">
          {socialError}
        </div>
      )}

      {/* OR divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className={`${dividerBg} px-3 text-xs text-gray-400 uppercase tracking-wider`}>
            {dividerLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
