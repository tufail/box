// ─── Type declarations for Google Identity Services ───────────────────────────

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (r: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: {
        type?: "standard" | "icon";
        theme?: "outline" | "filled_blue" | "filled_black";
        size?: "large" | "medium" | "small";
        width?: number;
      }
    ) => void;
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

// ─── Google Sign-In (real Google button, rendered invisibly) ──────────────────
//
// The old approach used the "One Tap" silent prompt() API, which tries to
// auto-detect an active Google session by checking state across origins.
// Browsers increasingly block that by default, so prompt() got suppressed
// for real users ("Google sign-in was suppressed..."). Google's own docs now
// mark the moment-notification reason codes prompt() relies on as
// unsupported/deprecated under FedCM, so there's no reliable way to detect
// *why* it failed anymore -- the fix is to stop depending on the silent
// prompt for a button click and use Google's actual button-click flow
// instead, which doesn't depend on cross-origin session detection.
//
// Google's real "Sign in with Google" button is rendered into `container`
// at full size but invisible (opacity handled by the caller's CSS), stacked
// on top of our custom-styled button so a click on our button actually
// clicks Google's. After the user completes sign-in, the GSI library calls
// back with a signed ID token, passed to Vendure's `authenticate` mutation
// as `{ google: { token } }` -- same as before, no backend change needed.

export async function initGoogleButton(
  container: HTMLElement,
  clientId: string,
  onCredential: (idToken: string) => void,
  onError: (err: Error) => void,
): Promise<void> {
  await loadScript("https://accounts.google.com/gsi/client");

  const g = window.google;
  if (!g) { onError(new Error("Google SDK failed to initialise")); return; }

  g.accounts.id.initialize({
    client_id: clientId,
    callback: ({ credential }) => {
      if (credential) onCredential(credential);
      else onError(new Error("Google did not return a credential"));
    },
  });

  const width = Math.max(120, Math.round(container.getBoundingClientRect().width));
  g.accounts.id.renderButton(container, { type: "standard", theme: "outline", size: "large", width });
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
