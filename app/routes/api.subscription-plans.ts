import type { Route } from "./+types/api.subscription-plans";
import { graphqlRequest } from "workers/graphqlClient";
import { AVAILABLE_SUBSCRIPTION_PLANS_QUERY, type AvailableSubscriptionPlansData } from "~/graphql/subscription";
import type { Locale } from "~/lib/i18n";

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const productVariantId = url.searchParams.get("variantId") ?? "";
	// This route's own URL is never /ar/* (it's a fixed resource endpoint) —
	// the calling page passes its locale through explicitly instead.
	const locale: Locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";

	if (!productVariantId) return Response.json({ plans: [] });

	try {
		const { data } = await graphqlRequest<AvailableSubscriptionPlansData>(
			context.cloudflare.env,
			AVAILABLE_SUBSCRIPTION_PLANS_QUERY,
			{ productVariantId },
			{ request, locale }
		);
		return Response.json({ plans: data.availableSubscriptionPlans ?? [] });
	} catch {
		return Response.json({ plans: [] });
	}
}
