import type { Route } from "./+types/api.concern-products";
import { graphqlRequest } from "workers/graphqlClient";
import { SEARCH_TOP_SELLING, type SearchProductsData, type SearchTopSellingVariables } from "~/graphql/product";
import type { Locale } from "~/lib/i18n";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const url = new URL(request.url);
	const collectionSlug = url.searchParams.get("collectionSlug") ?? "";
	const skip = Number(url.searchParams.get("skip") ?? "0");
	const take = Number(url.searchParams.get("take") ?? "8");
	// This route's own URL is never /ar/* (it's a fixed resource endpoint) —
	// the calling page passes its locale through explicitly instead.
	const locale: Locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";

	if (!collectionSlug) {
		return Response.json({ items: [], totalItems: 0 });
	}

	try {
		const { data } = await graphqlRequest<SearchProductsData, SearchTopSellingVariables>(
			env,
			SEARCH_TOP_SELLING,
			{ input: { collectionSlug, skip, take, groupByProduct: true } },
			{ request, locale }
		);
		return Response.json({ items: data.search.items, totalItems: data.search.totalItems });
	} catch {
		return Response.json({ items: [], totalItems: 0 });
	}
}
