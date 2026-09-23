// Cloudflare Turnstile server-side verification. Off until TURNSTILE_SECRET_KEY is set
// (`wrangler secret put TURNSTILE_SECRET_KEY`), paired with VITE_TURNSTILE_SITE_KEY on
// the client — both come from the Turnstile widget in the Cloudflare dashboard.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(env: unknown): boolean {
	return !!(env as { TURNSTILE_SECRET_KEY?: string }).TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(env: unknown, token: unknown, request: Request): Promise<boolean> {
	const secret = (env as { TURNSTILE_SECRET_KEY?: string }).TURNSTILE_SECRET_KEY;
	if (!secret) return true;
	if (typeof token !== "string" || !token) return false;

	const form = new FormData();
	form.append("secret", secret);
	form.append("response", token);
	const ip = request.headers.get("cf-connecting-ip");
	if (ip) form.append("remoteip", ip);

	try {
		const res = await fetch(VERIFY_URL, { method: "POST", body: form });
		const outcome = (await res.json()) as { success?: boolean };
		return outcome.success === true;
	} catch {
		// Cloudflare's own verify endpoint being unreachable shouldn't lock real
		// shoppers out; the honeypot/origin/fill-time checks still apply.
		return true;
	}
}
