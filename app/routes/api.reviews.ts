import type { Route } from "./+types/api.reviews";
import { graphqlRequest } from "workers/graphqlClient";
import { SUBMIT_REVIEW_MUTATION, VOTE_ON_REVIEW_MUTATION, type SubmitReviewData, type VoteOnReviewData } from "~/graphql/product";

function extractApiError(e: unknown, fallback: string): string {
	if (!(e instanceof Error)) return fallback;
	try {
		const parsed = JSON.parse(e.message);
		// GraphQL errors array: [{ message: "..." }, ...]
		if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
		// Single object with statusText
		if (parsed?.statusText) return parsed.statusText;
	} catch {
		// e.message is a plain string — use it if it looks human-readable
		if (e.message && !e.message.startsWith("{") && e.message.length < 200) return e.message;
	}
	return fallback;
}

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const body = await request.json() as Record<string, unknown>;
	const intent = body._intent as string;

	if (intent === "submit") {
		const { _intent: _, ...input } = body;
		try {
			const { data } = await graphqlRequest<SubmitReviewData>(env, SUBMIT_REVIEW_MUTATION, { input }, { request });
			if (!data.submitProductReview) {
				return { ok: false, error: "Review submission failed. Please try again." };
			}
			return { ok: true, review: data.submitProductReview };
		} catch (e) {
			return { ok: false, error: extractApiError(e, "Failed to submit review. Please try again.") };
		}
	}

	if (intent === "vote") {
		const { reviewId, vote } = body as { reviewId: string; vote: string; _intent: string };
		try {
			const { data } = await graphqlRequest<VoteOnReviewData>(env, VOTE_ON_REVIEW_MUTATION, { reviewId, vote }, { request });
			return { ok: true, review: data.voteOnReview };
		} catch (e) {
			return { ok: false, error: extractApiError(e, "Failed to record vote.") };
		}
	}

	return { ok: false, error: "Unknown intent." };
}
