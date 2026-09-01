import type { Route } from "./+types/api.track-view";
import { graphqlRequest } from "workers/graphqlClient";
import { RECORD_PRODUCT_VIEW_MUTATION } from "~/graphql/product";

// Called fire-and-forget from the product detail page on mount (client-side —
// see products.$slug.tsx). Never throws back to the caller: a tracking hiccup
// must not be visible to the customer or show up as a console error.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  try {
    const body = (await request.json()) as { productId?: string };
    const productId = String(body.productId ?? "");
    if (!productId) return Response.json({ ok: false });
    await graphqlRequest(env, RECORD_PRODUCT_VIEW_MUTATION, { productId }, { request });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
