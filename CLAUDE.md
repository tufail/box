# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run deploy       # Build and deploy to Cloudflare Workers
npm run preview      # Build and preview locally
npm run typecheck    # Run type checking (generates CF types, RR types, then tsc)
npm run cf-typegen   # Regenerate Cloudflare Worker type bindings
```

There are no test commands configured in this project.

## Architecture

This is a Vendure eCommerce storefront built with React Router v7 (SSR), deployed on Cloudflare Workers.

### Stack
- **React Router v7** — full-stack framework with SSR (`ssr: true`). File-based routes in `app/routes/`.
- **Cloudflare Workers** — edge runtime. `workers/app.ts` is the Worker entry point; it creates a React Router handler and passes the Cloudflare `env`/`ctx` to loaders.
- **Vendure** — headless eCommerce backend via GraphQL shop API (`VENDURE_SHOP_API` env var).
- **gql.tada** — end-to-end type-safe GraphQL. Schema is fetched from the Vendure API at build/typecheck time; auto-generated types live in `app/graphql/graphql-env.d.ts` (do not edit).
- **Tailwind CSS v4** — utility-first styling.

### Data Flow

1. Routes use React Router `loader()` functions for SSR data fetching.
2. Loaders call `graphqlRequest()` from `workers/graphqlClient.ts`, which handles auth tokens (from cookies), channel tokens, and Cloudflare cache options.
3. `app/root.tsx` fetches all collections in its loader and passes them down to `MainLayout` → `MegaMenu` for navigation.
4. GraphQL queries/fragments are defined in `app/graphql/` using `gql` from gql.tada.

### Key Files
- `workers/app.ts` — Cloudflare Worker fetch handler; special `/shop-api` route for introspection testing
- `workers/graphqlClient.ts` — `graphqlRequest<TData, TVariables>()` generic client; extracts auth from cookies, supports CF cache config
- `app/root.tsx` — root layout + global collections loader
- `app/layouts/MainLayout.tsx` — shared header/footer layout; receives collections from root loader
- `app/graphql/collection.ts` — collection GraphQL queries (`GET_COLLECTIONS`, `GET_COLLECTION`)

### Environment Variables (Cloudflare Bindings)

Defined in `wrangler.toml` and typed via `worker-configuration.d.ts` (generated):
- `VENDURE_SHOP_API` — Vendure GraphQL endpoint (currently points to `readonlydemo.vendure.io`)
- `VALUE_FROM_CLOUDFLARE` — example binding

Auth token (`vendure-token` cookie) and channel token are handled automatically in `graphqlClient.ts`.

### TypeScript Config

Three tsconfig files:
- `tsconfig.json` — base config; path alias `~/*` → `./app/*`
- `tsconfig.cloudflare.json` — used for the Worker and app code (extends base, includes `workers/`)
- `tsconfig.node.json` — used for Vite config files only
