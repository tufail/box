// ─── Type declarations for Google Identity Services ───────────────────────────

interface GoogleCredentialResponse {
  credential: string;
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (r: GoogleCredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
    }) => void;
    prompt: (callback?: (n: GooglePromptNotification) => void) => void;
    cancel: () => void;
  };
}

// ─── Type declarations for Facebook Login SDK ─────────────────────────────────

interface FBAuthResponse {
  accessToken: string;
  userID: string;
}

interface FBLoginResponse {
  authResponse: FBAuthResponse | null;
  status: string;
}

interface Facebook {
  init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (r: FBLoginResponse) => void, options?: { scope: string }) => void;
}

// Augment the global Window interface
declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
    FB?: Facebook;
    fbAsyncInit?: () => void;
  }
}

// ─── Script loader (deduplicated) ─────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      // Already inserted — wait if still loading, resolve if done
      if (existing.dataset.ready) { resolve(); return; }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.ready = "1"; resolve(); };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// ─── Google Sign-In (One Tap / GSI popup) ─────────────────────────────────────
//
// Opens Google's consent UI inside the browser (no redirect). After the user
// picks an account the GSI library calls our callback with a signed ID token.
// Pass that token to Vendure's `authenticate` mutation as `{ google: { token } }`.

export async function getGoogleIdToken(clientId: string): Promise<string> {
  await loadScript("https://accounts.google.com/gsi/client");

  return new Promise((resolve, reject) => {
    const g = window.google;
    if (!g) { reject(new Error("Google SDK failed to initialise")); return; }

    g.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        if (credential) resolve(credential);
        else reject(new Error("Google did not return a credential"));
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    g.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason();
        reject(
          new Error(
            reason === "suppressed_by_user" || reason === "opt_out_or_no_session"
              ? "Google sign-in was suppressed. Try allowing third-party cookies."
              : "Google sign-in is not available right now. Try a different method."
          )
        );
      } else if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
        reject(new Error("Google sign-in was cancelled"));
      }
    });
  });
}

// ─── Facebook Login (SDK popup) ───────────────────────────────────────────────
//
// Opens Facebook's native login popup. After the user grants permission the SDK
// returns an access token. Pass that to Vendure as `{ facebook: { token } }`.

export async function getFacebookAccessToken(appId: string): Promise<string> {
  if (!window.FB) {
    await new Promise<void>((resolve, reject) => {
      window.fbAsyncInit = () => {
        window.FB!.init({ appId, cookie: true, xfbml: false, version: "v20.0" });
        resolve();
      };
      loadScript("https://connect.facebook.net/en_US/sdk.js").catch(reject);
    });
  }

  return new Promise<string>((resolve, reject) => {
    window.FB!.login(
      (response) => {
        if (response.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error("Facebook sign-in was cancelled"));
        }
      },
      { scope: "email,public_profile" }
    );
  });
}
