import type { Route } from "./+types/api.newsletter";
import { subscribeToNewsletter } from "workers/listmonk";
import { looksLikeBot } from "workers/botCheck";
import { isDisposableEmail } from "workers/disposableEmail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const body = (await request.json()) as { email?: string; company?: string; renderedAt?: number };
	const email = (body.email ?? "").trim();

	if (!EMAIL_RE.test(email)) {
		return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
	}
	// Unlike the bot checks below, a throwaway-domain address can be a real
	// person deliberately dodging spam — worth a real error message, not a
	// silent fake success, so they know to use a real address instead.
	if (isDisposableEmail(email)) {
		return Response.json({ error: "Please use a permanent email address (temporary/disposable addresses aren't accepted)." }, { status: 400 });
	}

	// Bot traffic gets a fake success instead of an error — a hard rejection
	// just tells the bot which check to defeat next.
	if (!looksLikeBot(request, body)) {
		await subscribeToNewsletter(env, { email });
	}
	return Response.json({ ok: true });
}
