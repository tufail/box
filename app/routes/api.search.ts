import type { Route } from "./+types/api.search";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SEARCH_SUGGESTIONS_QUERY,
  type SearchSuggestionsResponse,
} from "~/graphql/search";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const term = url.searchParams.get("q")?.trim() ?? "";

  if (term.length < 2) {
    return Response.json({ items: [], collections: [], facetValues: [] } satisfies SearchSuggestionsResponse);
  }

  const env = context.cloudflare.env;

  try {
    const { data } = await graphqlRequest<{ search: SearchSuggestionsResponse }>(
      env,
      SEARCH_SUGGESTIONS_QUERY,
      { term },
      { request }
    );
    return Response.json(data.search);
  } catch {
    return Response.json({ items: [], collections: [], facetValues: [] } satisfies SearchSuggestionsResponse);
  }
}
