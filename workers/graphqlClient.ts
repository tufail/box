import gql from "gql.tada";
import type { TadaDocumentNode } from "gql.tada";
import { print } from "graphql";

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
  const api =
    typeof env?.VENDURE_SHOP_API === "string"
      ? env.VENDURE_SHOP_API
      : DEFAULT_VENDURE_SHOP_API;

  const bodyQuery = queryToString(query as TadaDocumentNode<unknown, unknown>);
  const authToken = options?.authToken ?? getAuthTokenFromCookie(options?.request);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [CHANNEL_HEADER]:
      options?.channelToken ?? env?.VENDURE_CHANNEL_TOKEN ?? "__default_channel__",
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
    fetchOptions.cf = options.cf;
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
