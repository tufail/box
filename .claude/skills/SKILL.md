# PHQ Frontend — Development Skill Guide

Conventions and best practices for this project: React Router v7 + gql.tada + Cloudflare Workers + Vendure.

---

## React Router v7

### Route files

Each route file lives in `app/routes/` and can export:

```ts
// app/routes/products.$slug.tsx
import type { Route } from "./+types/products.$slug"; // auto-generated — never edit

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data?.product?.name ?? "Product" }];
}

export async function loader({ context, request, params }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const { data } = await graphqlRequest(env, GET_PRODUCT, { slug: params.slug }, { request });
  if (!data.product) throw new Response("Not Found", { status: 404 });
  return { product: data.product };
}

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}
```

**Rules:**
- Always type loaders and components with `Route.*` types from `./+types/<filename>` — never import from `react-router` directly for these.
- Throw `Response` objects (not `Error`) for 404s and other HTTP errors — React Router catches these in the `ErrorBoundary`.
- Access Cloudflare env via `context.cloudflare.env` (typed as `Env` from `worker-configuration.d.ts`).
- `app/root.tsx` loader runs on every request — only fetch data needed globally (currently: collections for the nav).

### Actions (mutations)

```ts
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const formData = await request.formData();
  const { data, token } = await graphqlRequest(env, ADD_TO_CART, { ... }, { request });
  // Set auth cookie if token returned
  const headers = new Headers();
  if (token) headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
  return new Response(JSON.stringify({ ok: true }), { headers, status: 200 });
}
```

### Layouts

- `app/layouts/MainLayout.tsx` is the shell for all storefront pages — pass `collections` from root loader down as a prop.
- Create additional layout files in `app/layouts/` for distinct sections (e.g., `CheckoutLayout.tsx`).

---

## GraphQL with gql.tada

### Defining queries

All queries live in `app/graphql/`. Group by domain (e.g., `collection.ts`, `product.ts`, `cart.ts`).

```ts
// app/graphql/product.ts
import { graphql, type ResultOf } from "./graphql";

export const PRODUCT_FIELDS = graphql(`
  fragment ProductFields on Product {
    id
    name
    slug
    description
  }
`);

export const GET_PRODUCT = graphql(`
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      ...ProductFields
    }
  }
`, [PRODUCT_FIELDS]);

// Export a typed "shape" for prop types — do NOT instantiate with real data
export const PRODUCT_DATA = {} as ResultOf<typeof GET_PRODUCT>;
```

**Rules:**
- Use `graphql()` (from `~/graphql/graphql`) — never the raw `gql` tag for queries that need type safety.
- Use `gql` (from `workers/graphqlClient`) only for quick inline Worker-side queries (e.g., introspection tests).
- Export `TYPENAME_DATA = {} as ResultOf<typeof QUERY>` at the bottom of each query file to use as prop types (matches the existing pattern in `collection.ts`).
- Use fragments (`graphql(\`fragment ... on Type\`, [dep])`) to share field selections across queries.
- Use `readFragment()` when consuming masked fragments in components.
- After changing any query shape, run `npm run typecheck` — gql.tada regenerates `graphql-env.d.ts` automatically.

### Scalars

Configured in `app/graphql/graphql.ts`:
- `DateTime` → `string`
- `Money` → `number` (Vendure stores money as integers in the minor unit, e.g. cents)
- `JSON` → `Record<string, unknown>`

---

## graphqlRequest — the Vendure client

Signature:

```ts
graphqlRequest<TData, TVariables>(
  env,          // context.cloudflare.env
  query,        // TadaDocumentNode or string
  variables?,   // typed from query
  options?: {
    request?:      Request;        // pass the loader request to forward auth cookie
    channelToken?: string;         // override channel (defaults to env.VENDURE_CHANNEL_TOKEN)
    authToken?:    string | null;  // override auth token
    cf?:           CfProperties;   // Cloudflare fetch options (cache, etc.)
  }
): Promise<{ data: TData; token?: string }>
```

**Rules:**
- Always pass `{ request }` in loader options so the user's session cookie is forwarded.
- Use `cf: { cacheTtl: N, cacheEverything: true }` for public, read-only queries (product lists, collections) to leverage Cloudflare's cache.
- Use `cf: { cacheTtl: 0, cacheEverything: false }` for user-specific or mutating operations.
- If `token` is returned, set it as `vendure-auth-token` cookie in the response (HttpOnly, SameSite=Lax).
- The client throws on GraphQL errors — wrap in try/catch in loaders and actions.

---

## Cloudflare Workers

### Worker entry (`workers/app.ts`)

The Worker sits in front of the React Router handler. Use it to:
- Add API-style routes (returning JSON before React Router handles the request).
- Attach middleware logic (auth checks, CORS headers for `/api/*` routes).

```ts
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Custom JSON API routes
    if (url.pathname.startsWith("/api/")) {
      // handle here, return Response
    }

    // Delegate everything else to React Router (SSR)
    return requestHandler(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
```

**Rules:**
- Never add business logic to `workers/app.ts` — keep it as thin middleware. Put logic in loaders/actions.
- The `Env` type is auto-generated by `npm run cf-typegen` from `wrangler.toml` — run this after adding new bindings.
- `AppLoadContext` is augmented in `workers/app.ts` — do not redeclare it elsewhere.

### Adding environment variables

1. Add the binding to `wrangler.toml` (vars, secrets, KV, etc.)
2. Run `npm run cf-typegen` to regenerate `worker-configuration.d.ts`
3. Access in loaders via `context.cloudflare.env.YOUR_VAR`

---

## Styling (Tailwind CSS v4)

- Use Tailwind utility classes directly in JSX — no CSS modules.
- Global styles and CSS variable overrides go in `app/app.css`.
- Tailwind v4 uses `@import "tailwindcss"` — not the v3 `@tailwind` directives.
- Color tokens used: `primary`, `secondary`, `primary-dark` — defined as CSS custom properties in `app.css`.

---

## Component Conventions

### Prop types from GraphQL

Use the `ResultOf` pattern to derive prop types directly from queries — avoids duplication:

```ts
import type { PRODUCT_DATA } from "~/graphql/product";

interface ProductCardProps {
  product: (typeof PRODUCT_DATA.products.items)[0];
}
```

### Path alias

Use `~/*` for imports from `app/`:
```ts
import { graphqlRequest } from "workers/graphqlClient"; // workers/ only
import { GET_COLLECTIONS } from "~/graphql/collection";  // app/ via alias
```

---

## Collections & Navigation

The `root.tsx` loader fetches **all top-level collections** (with 2 levels of children) once per request and passes them through `MainLayout` → `MegaMenu`. If a route needs collection data, use `useRouteLoaderData("root")` rather than re-fetching.

Collection URLs follow the pattern `/collections/:slug`.

---

## Vendure API Notes

- **Channel token**: sent as `vendure-token` header. Defaults to `__default_channel__`. Override per-request via `channelToken` option.
- **Auth token**: sent as `Authorization: Bearer <token>` header. Extracted from `vendure-auth-token` cookie automatically.
- **Money**: all price fields are integers (minor currency unit). Divide by 100 for display.
- **Pagination**: use `CollectionListOptions` / `ProductListOptions` with `take` and `skip`. The root loader uses `take: 50, skip: 0, topLevelOnly: true`.
