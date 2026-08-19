import type { Route } from "./+types/api.newsletter";
import { subscribeToNewsletter } from "workers/listmonk";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const body = (await request.json()) as { email?: string };
	const email = (body.email ?? "").trim();

	if (!EMAIL_RE.test(email)) {
		return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
	}

	await subscribeToNewsletter(env, { email });
	return Response.json({ ok: true });
}
