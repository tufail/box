import type { Route } from "./+types/api.search";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SEARCH_SUGGESTIONS_QUERY,
  POPULAR_SEARCH_TERMS_QUERY,
  type SearchSuggestionsResponse,
  type PopularSearchTerm,
} from "~/graphql/search";
import type { Locale } from "~/lib/i18n";

const EMPTY: Omit<SearchSuggestionsResponse, "vendureBase"> = { items: [], collections: [], facetValues: [], popularSearchTerms: [] };

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const term = url.searchParams.get("q")?.trim() ?? "";
  // This route's own URL is never /ar/* (it's a fixed resource endpoint) —
  // the calling page passes its locale through explicitly instead.
  const locale: Locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";

  const env = context.cloudflare.env;
  const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

  if (term.length < 2) {
    return Response.json({ ...EMPTY, vendureBase } satisfies SearchSuggestionsResponse);
  }

  // Two independent requests (not one combined query) -- see POPULAR_SEARCH_TERMS_QUERY's
  // comment: popularSearchTerms may not be deployed on the backend yet, and a failure
  // there must not take down the (already working) product/collection suggestions.
  const [suggestionsResult, popularResult] = await Promise.allSettled([
    graphqlRequest<{ search: Omit<SearchSuggestionsResponse, "popularSearchTerms" | "vendureBase"> }>(
      env,
      SEARCH_SUGGESTIONS_QUERY,
      { term },
      { request, locale }
    ),
    graphqlRequest<{ popularSearchTerms: PopularSearchTerm[] }>(
      env,
      POPULAR_SEARCH_TERMS_QUERY,
      { prefix: term, limit: 5 },
      { request, locale }
    ),
  ]);

  const suggestions = suggestionsResult.status === "fulfilled" ? suggestionsResult.value.data.search : EMPTY;
  const popularSearchTerms = popularResult.status === "fulfilled" ? popularResult.value.data.popularSearchTerms : [];

  return Response.json({ ...suggestions, popularSearchTerms, vendureBase });
}
