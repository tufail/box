import type { Route } from "./+types/api.search";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SEARCH_SUGGESTIONS_QUERY,
  type SearchSuggestionsResponse,
} from "~/graphql/search";
import type { Locale } from "~/lib/i18n";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const term = url.searchParams.get("q")?.trim() ?? "";
  // This route's own URL is never /ar/* (it's a fixed resource endpoint) —
  // the calling page passes its locale through explicitly instead.
  const locale: Locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";

  const env = context.cloudflare.env;
  const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

  if (term.length < 2) {
    return Response.json({ items: [], collections: [], facetValues: [], vendureBase } satisfies SearchSuggestionsResponse);
  }

  try {
    const { data } = await graphqlRequest<{ search: SearchSuggestionsResponse }>(
      env,
      SEARCH_SUGGESTIONS_QUERY,
      { term },
      { request, locale }
    );
    return Response.json({ ...data.search, vendureBase });
  } catch {
    return Response.json({ items: [], collections: [], facetValues: [], vendureBase } satisfies SearchSuggestionsResponse);
  }
}
