import type { Route } from "./+types/api.concern-products";
import { graphqlRequest } from "workers/graphqlClient";
import { SEARCH_TOP_SELLING, type SearchProductsData, type SearchTopSellingVariables } from "~/graphql/product";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const url = new URL(request.url);
	const collectionSlug = url.searchParams.get("collectionSlug") ?? "";
	const skip = Number(url.searchParams.get("skip") ?? "0");
	const take = Number(url.searchParams.get("take") ?? "8");

	if (!collectionSlug) {
		return Response.json({ items: [], totalItems: 0 });
	}

	try {
		const { data } = await graphqlRequest<SearchProductsData, SearchTopSellingVariables>(
			env,
			SEARCH_TOP_SELLING,
			{ input: { collectionSlug, skip, take, groupByProduct: true } },
			{ request }
		);
		return Response.json({ items: data.search.items, totalItems: data.search.totalItems });
	} catch {
		return Response.json({ items: [], totalItems: 0 });
	}
}
