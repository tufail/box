import type { Route } from "./+types/api.wellness";
import { graphqlRequest } from "workers/graphqlClient";
import {
  SAVE_WELLNESS_PROFILE_MUTATION,
  ADD_WELLNESS_PLAN_TO_CART_MUTATION,
  PREVIEW_WELLNESS_PLAN_MUTATION,
  ADD_WELLNESS_ITEMS_TO_CART_MUTATION,
  CAPTURE_WELLNESS_LEAD_MUTATION,
  type SaveWellnessProfileResult,
  type AddWellnessPlanToCartResult,
  type PreviewWellnessPlanResult,
  type AddWellnessItemsToCartResult,
  type CaptureWellnessLeadResult,
  type WellnessProfileInput,
  type WellnessCartItemInput,
  type ActivityLevel,
  type WellnessGender,
} from "~/graphql/wellness";

function makeHeaders(token: string | null | undefined): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
  }
  return headers;
}

function readProfileInput(body: Record<string, unknown>): WellnessProfileInput {
  return {
    goalCode: String(body.goalCode ?? ""),
    activityLevel: body.activityLevel as ActivityLevel,
    bodyWeightKg: Number(body.bodyWeightKg),
    dietaryRestrictions: Array.isArray(body.dietaryRestrictions) ? body.dietaryRestrictions.map(String) : [],
    genderPreference: body.genderPreference ? (body.genderPreference as WellnessGender) : undefined,
    trainingStyles: Array.isArray(body.trainingStyles) ? body.trainingStyles.map(String) : undefined,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = await request.json() as Record<string, unknown>;
  const intent = body._intent as string | undefined;

  // Logged-in only: persists the profile + plan to the customer's account.
  if (intent === "saveProfile") {
    try {
      const { data, token } = await graphqlRequest<SaveWellnessProfileResult, { input: WellnessProfileInput }>(
        env,
        SAVE_WELLNESS_PROFILE_MUTATION,
        { input: readProfileInput(body) },
        { request }
      );
      return new Response(JSON.stringify({ plan: data.saveWellnessProfile }), { headers: makeHeaders(token) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save your wellness profile";
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: makeHeaders(null) });
    }
  }

  // Guest-safe: computes a plan without saving anything.
  if (intent === "previewPlan") {
    try {
      const { data, token } = await graphqlRequest<PreviewWellnessPlanResult, { input: WellnessProfileInput }>(
        env,
        PREVIEW_WELLNESS_PLAN_MUTATION,
        { input: readProfileInput(body) },
        { request }
      );
      return new Response(JSON.stringify({ plan: data.previewWellnessPlan }), { headers: makeHeaders(token) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to build your wellness plan";
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: makeHeaders(null) });
    }
  }

  // Logged-in only: adds every item in the customer's saved plan to their active order.
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

  // Guest-safe: adds the given variant/quantity pairs (from a preview result) to the session's active order.
  if (intent === "addItemsToCart") {
    const items = Array.isArray(body.items) ? (body.items as WellnessCartItemInput[]) : [];
    try {
      const { data, token } = await graphqlRequest<AddWellnessItemsToCartResult, { items: WellnessCartItemInput[] }>(
        env,
        ADD_WELLNESS_ITEMS_TO_CART_MUTATION,
        { items: items.map((i) => ({ variantId: String(i.variantId), quantity: Number(i.quantity) })) },
        { request }
      );
      return new Response(JSON.stringify({ order: data.addWellnessItemsToCart }), { headers: makeHeaders(token) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not add your plan to the cart";
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: makeHeaders(null) });
    }
  }

  // Guest-safe: captures a marketing lead (email + opt-in).
  if (intent === "captureLead") {
    try {
      const { data, token } = await graphqlRequest<CaptureWellnessLeadResult, { input: { firstName?: string; email: string; marketingOptIn?: boolean; goalCode?: string } }>(
        env,
        CAPTURE_WELLNESS_LEAD_MUTATION,
        {
          input: {
            firstName: body.firstName ? String(body.firstName) : undefined,
            email: String(body.email ?? ""),
            marketingOptIn: Boolean(body.marketingOptIn),
            goalCode: body.goalCode ? String(body.goalCode) : undefined,
          },
        },
        { request }
      );
      return new Response(JSON.stringify({ captured: data.captureWellnessLead }), { headers: makeHeaders(token) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save your email";
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: makeHeaders(null) });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown intent" }), { status: 400, headers: makeHeaders(null) });
}
