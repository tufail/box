import type { Route } from "./+types/api.questions";
import { graphqlRequest } from "workers/graphqlClient";
import { PRODUCT_QUESTIONS_QUERY, SUBMIT_PRODUCT_QUESTION_MUTATION, type ProductQuestionsData, type SubmitProductQuestionData } from "~/graphql/question";

function extractApiError(e: unknown, fallback: string): string {
	if (!(e instanceof Error)) return fallback;
	try {
		const parsed = JSON.parse(e.message);
		if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
		if (parsed?.statusText) return parsed.statusText;
	} catch {
		if (e.message && !e.message.startsWith("{") && e.message.length < 200) return e.message;
	}
	return fallback;
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const slug = url.searchParams.get("slug") ?? "";
	const take = Math.min(Number(url.searchParams.get("take") ?? "10"), 50);
	const skip = Math.max(Number(url.searchParams.get("skip") ?? "0"), 0);

	if (!slug) return Response.json({ questions: [], totalItems: 0 });

	const env = context.cloudflare.env;
	try {
		const { data } = await graphqlRequest<ProductQuestionsData>(
			env, PRODUCT_QUESTIONS_QUERY,
			{ slug, options: { take, skip } },
			{ request }
		);
		return Response.json({
			questions: data.productQuestionsBySlug?.items ?? [],
			totalItems: data.productQuestionsBySlug?.totalItems ?? 0,
		});
	} catch {
		return Response.json({ questions: [], totalItems: 0 });
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const body = (await request.json()) as Record<string, unknown>;
	const intent = body._intent as string;

	if (intent === "submit") {
		const productId = body.productId as string;
		const questionText = body.questionText as string;
		try {
			const { data } = await graphqlRequest<SubmitProductQuestionData>(
				env, SUBMIT_PRODUCT_QUESTION_MUTATION,
				{ input: { productId, questionText } },
				{ request }
			);
			if (!data.submitProductQuestion) {
				return { ok: false, error: "Could not submit your question. Please try again." };
			}
			return { ok: true, question: data.submitProductQuestion };
		} catch (e) {
			return { ok: false, error: extractApiError(e, "Could not submit your question. Please try again.") };
		}
	}

	return { ok: false, error: "Unknown intent." };
}
