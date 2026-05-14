import { createRequestHandler } from "react-router";

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/.well-known/")) {
      return new Response(null, { status: 404 });
    }
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
