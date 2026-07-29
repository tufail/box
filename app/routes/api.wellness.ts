import type { Route } from "./+types/api.wellness";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SAVE_WELLNESS_PROFILE_MUTATION,
  ADD_WELLNESS_PLAN_TO_CART_MUTATION,
  type SaveWellnessProfileResult,
  type AddWellnessPlanToCartResult,
  type WellnessProfileInput,
  type ActivityLevel,
} from "~/graphql/wellness";

function makeHeaders(token: string | null | undefined): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
  }
  return headers;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = await request.json() as Record<string, unknown>;
  const intent = body._intent as string | undefined;

  if (intent === "saveProfile") {
    const input: WellnessProfileInput = {
      goalCode: String(body.goalCode ?? ""),
      activityLevel: body.activityLevel as ActivityLevel,
      bodyWeightKg: Number(body.bodyWeightKg),
      dietaryRestrictions: Array.isArray(body.dietaryRestrictions) ? body.dietaryRestrictions.map(String) : [],
    };

    try {
      const { data, token } = await graphqlRequest<SaveWellnessProfileResult, { input: WellnessProfileInput }>(
        env,
        SAVE_WELLNESS_PROFILE_MUTATION,
        { input },
        { request }
      );
      return new Response(JSON.stringify({ plan: data.saveWellnessProfile }), { headers: makeHeaders(token) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save your wellness profile";
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: makeHeaders(null) });
    }
  }

  if (intent === "addToCart") {
    try {
      const { data, token } = await graphqlRequest<AddWellnessPlanToCartResult>(
        env,
        ADD_WELLNESS_PLAN_TO_CART_MUTATION,
        undefined,
        { request }
      );
      return new Response(JSON.stringify({ order: data.addWellnessPlanToCart }), { headers: makeHeaders(token) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not add your plan to the cart";
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: makeHeaders(null) });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown intent" }), { status: 400, headers: makeHeaders(null) });
}
