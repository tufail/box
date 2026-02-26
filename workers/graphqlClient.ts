import gql from "gql.tada";
import type { TadaDocumentNode } from "gql.tada";

export const DEFAULT_VENDURE_SHOP_API = "https://readonlydemo.vendure.io/shop-api";

function queryToString(query: any): string {
    if (typeof query === "string") return query;
    if (query && typeof query === "object") {
        if (query.loc && query.loc.source && typeof query.loc.source.body === "string") {
            return query.loc.source.body;
        }
        if (typeof query.toString === "function") return query.toString();
    }
    return String(query);
}

export async function graphqlRequest<TData = any, TVariables = Record<string, any>>(
    query: string | TadaDocumentNode<TData, TVariables> | { toString(): string },
    variables?: TVariables,
    cf?: any
): Promise<TData> {
    const bodyQuery = queryToString(query);

    const api = (typeof (globalThis as any)?.ENV?.VENDURE_SHOP_API === "string")
        ? (globalThis as any).ENV.VENDURE_SHOP_API
        : DEFAULT_VENDURE_SHOP_API;

    const fetchOptions: any = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: bodyQuery, variables }),
    };
    if (cf) fetchOptions.cf = cf;

    const res = await fetch(api, fetchOptions);

    const json = await res.json() as any;
    if (!res.ok || json.errors) {
        const err = json.errors ?? { status: res.status, statusText: res.statusText };
        throw new Error(JSON.stringify(err));
    }

    return json.data as TData;
}

export { gql };

export async function graphqlRequestWithEnv<TData = any, TVariables = Record<string, any>>(
    env: any,
    query: string | TadaDocumentNode<TData, TVariables> | { toString(): string },
    variables?: TVariables,
    cf?: any
): Promise<TData> {
    const api = env && typeof env.VENDURE_SHOP_API === "string" ? env.VENDURE_SHOP_API : DEFAULT_VENDURE_SHOP_API;
    const bodyQuery = queryToString(query);

    const fetchOptions: any = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: bodyQuery, variables }),
    };
    if (cf) fetchOptions.cf = cf;

    const res = await fetch(api, fetchOptions);

    const json = await res.json() as any;
    if (!res.ok || json.errors) {
        const err = json.errors ?? { status: res.status, statusText: res.statusText };
        throw new Error(JSON.stringify(err));
    }

    return json.data as TData;
}
