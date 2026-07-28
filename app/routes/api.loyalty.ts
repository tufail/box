import type { Route } from "./+types/api.loyalty";
import { graphqlRequest } from "workers/graphqlClient";
import {
	REDEEM_LOYALTY_POINTS_MUTATION,
	APPLY_REFERRAL_CODE_MUTATION,
	type RedeemLoyaltyPointsData,
	type ApplyReferralCodeData,
} from "~/graphql/loyalty";

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

// graphqlRequest() throws with e.message set to JSON.stringify(errors) — Vendure's
// business-logic errors here (e.g. "Minimum redemption is 100 points") are meant
// to be shown to the customer as-is, so pull the readable message out instead of
// surfacing the raw serialized array.
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

	if (intent === "redeemPoints") {
		const points = parseInt(body.points, 10);
		if (!points || points <= 0) {
			return json({ error: "Enter a valid number of points to redeem." }, 400);
		}

		try {
			const { data } = await graphqlRequest<RedeemLoyaltyPointsData>(env, REDEEM_LOYALTY_POINTS_MUTATION, { points }, { request });
			return json({ result: data.redeemLoyaltyPoints });
		} catch (e) {
			return json({ error: extractErrorMessage(e, "Failed to redeem points") }, 400);
		}
	}

	if (intent === "applyReferralCode") {
		const code = body.code?.trim();
		if (!code) {
			return json({ error: "Enter a referral code." }, 400);
		}

		try {
			const { data } = await graphqlRequest<ApplyReferralCodeData>(env, APPLY_REFERRAL_CODE_MUTATION, { code }, { request });
			return json({ referral: data.applyReferralCode });
		} catch (e) {
			return json({ error: extractErrorMessage(e, "Failed to apply referral code") }, 400);
		}
	}

	return json({ error: "Unknown intent" }, 400);
}
