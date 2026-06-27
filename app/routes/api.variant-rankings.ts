import type { Route } from "./+types/api.variant-rankings";
import { graphqlRequest } from "workers/graphqlClient";
import { VARIANT_RANKINGS_QUERY, type VariantRankingsData } from "~/graphql/product";

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const variantId = url.searchParams.get("variantId") ?? "";

	if (!variantId) return Response.json({ rankings: [] });

	try {
		const { data } = await graphqlRequest<VariantRankingsData>(
			context.cloudflare.env,
			VARIANT_RANKINGS_QUERY,
			{ variantId },
			{ request },
		);
		return Response.json({ rankings: data.variantRankings ?? [] });
	} catch {
		return Response.json({ rankings: [] });
	}
}
