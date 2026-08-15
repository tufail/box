import { graphql as gql } from "gql.tada";
import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql";
import { getLocaleFromPathname, localeToLanguageCode, type Locale } from "~/lib/i18n";

export const DEFAULT_VENDURE_SHOP_API = "http://localhost:3000/shop-api";

const CHANNEL_HEADER = "vendure-token";
const AUTH_HEADER = "vendure-auth-token";

interface VendureEnv {
  VENDURE_SHOP_API?: string;
  VENDURE_CHANNEL_TOKEN?: string;
}

interface GraphQLRequestOptions {
  request?: Request;
  channelToken?: string;
  authToken?: string | null;
  cf?: Record<string, unknown>;
  // Overrides auto-detection from `request`'s own URL — needed for internal
  // resource routes (e.g. /api/search), whose OWN url never has the /ar/*
  // prefix even when called from an Arabic page. Callers of those endpoints
  // pass the page's locale through explicitly (see e.g. api.search.ts).
  locale?: Locale;
}

function queryToString(query: string | TadaDocumentNode<unknown, unknown>): string {
  if (typeof query === "string") return query;
  return print(query);
}

function getAuthTokenFromCookie(request?: Request): string | null {
  if (!request) return null;
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.match(/vendure-auth-token=([^;]+)/)?.[1] ?? null;
}

export async function graphqlRequest<
  TData = unknown,
  TVariables = Record<string, unknown>
>(
  env: VendureEnv,
  query: string | TadaDocumentNode<TData, TVariables>,
  variables?: TVariables,
  options?: GraphQLRequestOptions
): Promise<{ data: TData; token?: string }> {
  const baseApi =
    typeof env?.VENDURE_SHOP_API === "string"
      ? env.VENDURE_SHOP_API
      : DEFAULT_VENDURE_SHOP_API;

  // Vendure resolves the request's translation language from a `languageCode`
  // query string parameter on the shop-api HTTP request itself (not a GraphQL
  // arg, not a header) — derived here from the page's own URL (via the /ar/*
  // prefix) so every loader gets locale-correct data automatically, with zero
  // changes needed at each of the ~40 call sites.
  const locale = options?.locale ?? (options?.request ? getLocaleFromPathname(new URL(options.request.url).pathname) : "en");
  const api = locale === "en" ? baseApi : `${baseApi}${baseApi.includes("?") ? "&" : "?"}languageCode=${localeToLanguageCode(locale)}`;

  const bodyQuery = queryToString(query as TadaDocumentNode<unknown, unknown>);
  const authToken = options?.authToken ?? getAuthTokenFromCookie(options?.request);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [CHANNEL_HEADER]:
      options?.channelToken ?? env?.VENDURE_CHANNEL_TOKEN ?? "jmnv08o4xjv1wk9dngg",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const fetchOptions: RequestInit & { cf?: Record<string, unknown> } = {
    method: "POST",
    headers,
    body: JSON.stringify({ query: bodyQuery, variables }),
  };

  if (options?.cf) {
    // Cloudflare's edge cache keys fetch() subrequests by URL alone, ignoring the
    // POST body — but every GraphQL query on a given locale hits this same `api`
    // URL. Without a distinct cacheKey per operation+variables, unrelated queries
    // (e.g. the mega menu and page-sections calls in root.tsx, both cacheEverything
    // on every page load) collide in the shared cache: whichever response lands
    // first gets served back for the other until the TTL expires.
    const operationName = bodyQuery.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? "anonymous";
    const cacheKey = `${api}${api.includes("?") ? "&" : "?"}__op=${operationName}&__vars=${encodeURIComponent(JSON.stringify(variables ?? {}))}`;
    fetchOptions.cf = { cacheKey, ...options.cf };
  }

  const res = await fetch(api, fetchOptions);
  const json = await res.json() as { data?: TData; errors?: unknown[] };

  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors ?? { status: res.status, statusText: res.statusText }));
  }

  return {
    data: json.data as TData,
    token: res.headers.get(AUTH_HEADER) ?? undefined,
  };
}

export { gql };
