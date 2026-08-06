import { createRequestHandler } from "react-router";
import { graphqlRequest } from "./graphqlClient";
import { GET_BANNER_BY_SLUG, type BannerData, type BannerVariables } from "~/graphql/banner";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

const BANNER_ROUTE = /^\/api\/banner\/([^/]+)$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/.well-known/")) {
      return new Response(null, { status: 404 });
    }

    const bannerMatch = BANNER_ROUTE.exec(url.pathname);
    if (bannerMatch) {
      try {
        const result = await graphqlRequest<BannerData, BannerVariables>(
          env,
          GET_BANNER_BY_SLUG,
          { slug: bannerMatch[1] }
        );
        return Response.json({ items: result.data.getBannerBySlug?.items ?? [] });
      } catch {
        return Response.json({ items: [] });
      }
    }

    const response = await requestHandler(request, {
      cloudflare: { env, ctx },
    });

    // Preview/staging deploys (*.workers.dev, before a real custom domain is wired
    // up) should never be indexed or surfaced by search engines — this catches every
    // route uniformly, on top of the belt-and-suspenders robots.txt Disallow below.
    if (url.hostname.endsWith(".workers.dev")) {
      const headers = new Headers(response.headers);
      headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    return response;
  },
} satisfies ExportedHandler<Env>;
