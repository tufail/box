// Real submissions can't complete faster than this — a human has to focus the
// field, type an email, and click submit.
const MIN_FILL_TIME_MS = 1500;

interface HoneypotFields {
	/** Off-screen field real users never fill; bots that blanket-fill forms do. */
	company?: unknown;
	/** Client-side timestamp of when the form mounted, echoed back on submit. */
	renderedAt?: unknown;
}

function isTrustedOrigin(request: Request): boolean {
	const origin = request.headers.get("origin") ?? request.headers.get("referer");
	if (!origin) return false;
	try {
		return new URL(origin).host === new URL(request.url).host;
	} catch {
		return false;
	}
}

// Shared across every public, unauthenticated lead-capture endpoint (newsletter
// signup, wellness quiz email capture) — catches both browser-automation bots
// that fill out the real form (honeypot, fill-time) and bots that skip the page
// and POST straight to the API (origin check). None of this is a hard security
// boundary (a targeted bot can fake all three); it's a cheap filter against the
// generic scraping/spam traffic that actually hits public forms. Cloudflare
// Turnstile is the next layer up if that's not enough.
export function looksLikeBot(request: Request, body: HoneypotFields): boolean {
	if (typeof body.company === "string" && body.company.length > 0) return true;
	if (!isTrustedOrigin(request)) return true;
	if (typeof body.renderedAt === "number" && Date.now() - body.renderedAt < MIN_FILL_TIME_MS) return true;
	return false;
}
