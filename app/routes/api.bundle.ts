import type { Route } from "./+types/api.bundle";
import { graphqlRequest } from "workers/graphqlClient";
import {
  PRODUCT_BUNDLE_OFFERS_QUERY,
  ADD_BUNDLE_TO_CART_MUTATION,
  RESTORE_BUNDLE_MUTATION,
  type ProductBundleOffersData,
  type AddBundleToCartResult,
  type AddBundleToCartVariables,
  type RestoreBundleResult,
  type RestoreBundleVariables,
} from "~/graphql/bundle";

function makeHeaders(token: string | null | undefined): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
  }
  return headers;
}

// GET /api/bundle?productId=X → bundle offers
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) return Response.json({ productBundleOffers: [] });

  try {
    const { data } = await graphqlRequest<ProductBundleOffersData>(
      env,
      PRODUCT_BUNDLE_OFFERS_QUERY,
      { productId },
      { request }
    );
    return Response.json({ productBundleOffers: data.productBundleOffers ?? [] });
  } catch {
    return Response.json({ productBundleOffers: [] });
  }
}

// POST /api/bundle
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  try {
    const body = await request.json() as Record<string, unknown>;
    const intent = body._intent as string | undefined;

    if (intent === "addBundle") {
      const { bundleDefinitionId, triggerVariantId } = body as AddBundleToCartVariables & { _intent: string };
      const variables = { bundleDefinitionId: String(bundleDefinitionId), triggerVariantId: String(triggerVariantId) };
      console.log("[addBundle] payload:", JSON.stringify(variables));
      const { data, token } = await graphqlRequest<AddBundleToCartResult, AddBundleToCartVariables>(
        env,
        ADD_BUNDLE_TO_CART_MUTATION,
        variables,
        { request }
      );
      console.log("[addBundle] response:", JSON.stringify(data));
      return new Response(JSON.stringify({ addBundleToCart: data.addBundleToCart }), { headers: makeHeaders(token) });
    }

    if (intent === "restoreBundle") {
      const { bundleGroupId } = body as RestoreBundleVariables & { _intent: string };
      const { data, token } = await graphqlRequest<RestoreBundleResult, RestoreBundleVariables>(
        env,
        RESTORE_BUNDLE_MUTATION,
        { bundleGroupId: String(bundleGroupId) },
        { request }
      );
      return new Response(JSON.stringify({ restoreBundle: data.restoreBundle }), { headers: makeHeaders(token) });
    }

    return Response.json({ error: "Unknown intent" });
  } catch (e) {
    console.error("[api.bundle] error:", String(e));
    return Response.json({ error: String(e) });
  }
}
