import { createRequestHandler } from "react-router";
import { graphqlRequestWithEnv, gql } from "./graphqlClient";

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
    try {
      const url = new URL(request.url);
      if (url.pathname === "/shop-api") {
        try {
          const data = await graphqlRequestWithEnv(env, gql`
            query IntrospectionTest { __typename }
          `);
          return new Response(JSON.stringify({ ok: true, data }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ ok: false, error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      /* ignore and continue to router */
    }
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
