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

// The homepage's loader already CDN-caches its own GraphQL subrequests
// (cacheTtl/cacheEverything in home.tsx), but that only saves network/backend
// load -- the Worker still fully re-renders the whole page (React SSR) on
// every single request, and that render is the real CPU cost. Confirmed live
// via `wrangler tail`: this repeatedly trips Cloudflare's per-request CPU time
// limit ("Worker exceeded CPU time limit"), which the Free plan can't raise
// via config (see wrangler.jsonc history -- a `limits.cpu_ms` override was
// tried and reverted, since custom CPU limits are a paid-plan-only feature).
// Caching the fully-rendered HTML response itself, not just its inputs, is
// the actual fix: most requests then skip SSR entirely. Bypassed whenever an
// auth cookie is present, so no cached anonymous page is ever served back to
// (or captures) a signed-in state, even though the homepage loader itself
// carries no per-user data today.
const FULL_PAGE_CACHE_PATHS = new Set(["/", "/ar"]);
const FULL_PAGE_CACHE_TTL_SECONDS = 60;

function isFullPageCacheable(request: Request, url: URL): boolean {
  return (
    request.method === "GET" &&
    FULL_PAGE_CACHE_PATHS.has(url.pathname) &&
    !request.headers.get("cookie")?.includes("vendure-auth-token")
  );
}

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

    const cacheable = isFullPageCacheable(request, url);
    // `caches.default` is a real, documented Cloudflare Workers API, but this
    // project's generated Workers types don't declare it on CacheStorage.
    const cache = (caches as CacheStorage & { default: Cache }).default;
    const cacheKey = new Request(url.toString(), request);

    if (cacheable) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    const response = await requestHandler(request, {
      cloudflare: { env, ctx },
    });

    // Never cache a response carrying Set-Cookie -- this page is meant to be
    // identical for every anonymous visitor, and caching a session-setting
    // response would leak one visitor's cookie to everyone served from cache.
    // Rather than trust the platform to strip it, check and skip explicitly.
    if (cacheable && response.status === 200 && !response.headers.has("set-cookie")) {
      const toCache = response.clone();
      const cacheHeaders = new Headers(toCache.headers);
      cacheHeaders.set("Cache-Control", `public, max-age=${FULL_PAGE_CACHE_TTL_SECONDS}`);
      ctx.waitUntil(
        cache.put(cacheKey, new Response(toCache.body, { status: toCache.status, statusText: toCache.statusText, headers: cacheHeaders })),
      );
    }

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
