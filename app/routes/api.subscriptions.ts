import type { Route } from "./+types/api.subscriptions";
import { graphqlRequest } from "workers/graphqlClient";
import {
	CANCEL_MY_SUBSCRIPTION_MUTATION,
	PAUSE_MY_SUBSCRIPTION_MUTATION,
	RESUME_MY_SUBSCRIPTION_MUTATION,
	type CancelMySubscriptionData,
	type PauseMySubscriptionData,
	type ResumeMySubscriptionData,
} from "~/graphql/subscription";

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

// graphqlRequest() throws with e.message set to JSON.stringify(errors) — Vendure's
// business-logic errors here are meant to be shown to the customer as-is, so pull
// the readable message out instead of surfacing the raw serialized array.
function extractErrorMessage(e: unknown, fallback: string): string {
	if (!(e instanceof Error)) return fallback;
	try {
		const parsed = JSON.parse(e.message);
		const first = Array.isArray(parsed) ? parsed[0] : parsed;
		return typeof first?.message === "string" ? first.message : e.message;
	} catch {
		return e.message;
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const body = (await request.json()) as Record<string, string>;
	const intent = body._intent;
	const id = body.id;

	if (!id) return json({ error: "Missing subscription id" }, 400);

	if (intent === "cancel") {
		try {
			const { data } = await graphqlRequest<CancelMySubscriptionData>(env, CANCEL_MY_SUBSCRIPTION_MUTATION, { id, reason: body.reason }, { request });
			return json({ subscription: data.cancelMySubscription });
		} catch (e) {
			return json({ error: extractErrorMessage(e, "Failed to cancel subscription") }, 400);
		}
	}

	if (intent === "pause") {
		try {
			const { data } = await graphqlRequest<PauseMySubscriptionData>(env, PAUSE_MY_SUBSCRIPTION_MUTATION, { id, until: body.until ?? null }, { request });
			return json({ subscription: data.pauseMySubscription });
		} catch (e) {
			return json({ error: extractErrorMessage(e, "Failed to pause subscription") }, 400);
		}
	}

	if (intent === "resume") {
		try {
			const { data } = await graphqlRequest<ResumeMySubscriptionData>(env, RESUME_MY_SUBSCRIPTION_MUTATION, { id }, { request });
			return json({ subscription: data.resumeMySubscription });
		} catch (e) {
			return json({ error: extractErrorMessage(e, "Failed to resume subscription") }, 400);
		}
	}

	return json({ error: "Unknown intent" }, 400);
}
