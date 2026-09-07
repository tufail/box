import type { Route } from "./+types/api.track-blog-view";
import { graphqlRequest } from "workers/graphqlClient";
import { INCREMENT_BLOG_POST_VIEW_COUNT } from "~/graphql/blog";

// Called fire-and-forget from the blog post detail page on mount (client-side —
// see blog.$slug.tsx). Never throws back to the caller: a tracking hiccup must
// not be visible to the reader or show up as a console error. Same pattern as
// api.track-view.ts for products.
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  try {
    const body = (await request.json()) as { slug?: string };
    const slug = String(body.slug ?? "");
    if (!slug) return Response.json({ ok: false });
    await graphqlRequest(env, INCREMENT_BLOG_POST_VIEW_COUNT, { slug }, { request });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
