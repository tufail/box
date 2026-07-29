import type { Route } from "./+types/api.variant-rankings";
import { graphqlRequest } from "workers/graphqlClient";
import { VARIANT_RANKINGS_QUERY, type VariantRankingsData } from "~/graphql/product";
import type { Locale } from "~/lib/i18n";

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const variantId = url.searchParams.get("variantId") ?? "";
	// This route's own URL is never /ar/* (it's a fixed resource endpoint) —
	// the calling page passes its locale through explicitly instead.
	const locale: Locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";

	if (!variantId) return Response.json({ rankings: [] });

	try {
		const { data } = await graphqlRequest<VariantRankingsData>(
			context.cloudflare.env,
			VARIANT_RANKINGS_QUERY,
			{ variantId },
			{ request, locale },
		);
		return Response.json({ rankings: data.variantRankings ?? [] });
	} catch {
		return Response.json({ rankings: [] });
	}
}
