import type { Route } from "./+types/api.track-search";
import { graphqlRequest } from "workers/graphqlClient";
import { RECORD_SEARCH_QUERY_MUTATION } from "~/graphql/search";

// Called fire-and-forget from the search results page on mount (client-side —
// see search.tsx). Never throws back to the caller: a tracking hiccup must
// not be visible to the customer or show up as a console error.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  try {
    const body = (await request.json()) as { term?: string };
    const term = String(body.term ?? "");
    if (!term) return Response.json({ ok: false });
    await graphqlRequest(env, RECORD_SEARCH_QUERY_MUTATION, { term }, { request });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
