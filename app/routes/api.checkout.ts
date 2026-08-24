import type { Route } from "./+types/api.checkout";
import { graphqlRequest } from "workers/graphqlClient";
import { subscribeToNewsletter } from "workers/listmonk";
import type { Locale } from "~/lib/i18n";
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  SET_CUSTOMER_FOR_ORDER_MUTATION,
  SET_SHIPPING_ADDRESS_MUTATION,
  SET_SHIPPING_METHOD_MUTATION,
  ELIGIBLE_SHIPPING_METHODS_QUERY,
  ELIGIBLE_PAYMENT_METHODS_QUERY,
  ACTIVE_CUSTOMER_QUERY,
  TRANSITION_ORDER_TO_STATE_MUTATION,
  ADD_PAYMENT_TO_ORDER_MUTATION,
  APPLY_COUPON_CODE_MUTATION,
  INITIATE_SKIPCASH_PAYMENT_MUTATION,
  type ShippingMethod,
  type PaymentMethod,
  type ActiveCustomer,
  type SkipCashCheckoutResult,
} from "~/graphql/checkout";

type GQLResult = Record<string, unknown>;

// Must match the `code` the SkipCash PaymentMethod is created with in the Vendure
// Admin dashboard (Settings -> Payment methods) — NOT the handler code
// ("skipcash-payment" on the backend), which only identifies which handler that
// PaymentMethod uses. Same convention as Sadad's "pay-online" below.
const SKIPCASH_METHOD_CODE = "skipcash-payment";

// graphqlRequest throws `new Error(JSON.stringify(errors))` on any GraphQL error —
// initiateSkipCashPayment throws a real UserInputError (not a typed union result)
// for e.g. "not configured for this channel" or "QAR only", so unwrap that message
// instead of showing the user a generic failure.
function extractGraphQLErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(err.message);
    const message = Array.isArray(parsed) ? parsed[0]?.message : undefined;
    return typeof message === "string" && message ? message : fallback;
  } catch {
    return fallback;
  }
}

function makeHeaders(token?: string | null): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.append(
      "Set-Cookie",
      `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`
    );
  }
  return headers;
}

// ── Loader (GET) ──────────────────────────────────────────────────────────────

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  // This route's own URL is never /ar/* (it's a fixed resource endpoint) —
  // the calling page passes its locale through explicitly instead, same as
  // /api/concern-products and /api/variant-rankings.
  const locale: Locale = url.searchParams.get("lang") === "ar" ? "ar" : "en";

  try {
    if (intent === "shippingMethods") {
      const { data } = await graphqlRequest<{ eligibleShippingMethods: ShippingMethod[] }>(
        env,
        ELIGIBLE_SHIPPING_METHODS_QUERY,
        undefined,
        { request, locale }
      );
      return Response.json({ shippingMethods: data.eligibleShippingMethods ?? [] });
    }

    if (intent === "paymentMethods") {
      const { data } = await graphqlRequest<{ eligiblePaymentMethods: PaymentMethod[] }>(
        env,
        ELIGIBLE_PAYMENT_METHODS_QUERY,
        undefined,
        { request, locale }
      );
      return Response.json({ paymentMethods: data.eligiblePaymentMethods ?? [] });
    }

    // Resolves the signed-in customer's real name after a login/social-login that
    // doesn't itself return one (LOGIN_MUTATION only returns `identifier`) — used to
    // pre-fill the shipping step's name fields and to advance past a social login
    // without a full page reload.
    if (intent === "activeCustomer") {
      const { data } = await graphqlRequest<{ activeCustomer: ActiveCustomer | null }>(
        env,
        ACTIVE_CUSTOMER_QUERY,
        undefined,
        { request, locale }
      );
      return Response.json({ activeCustomer: data.activeCustomer ?? null });
    }

    return Response.json({});
  } catch (err) {
    console.error("[api.checkout loader]", err);
    return Response.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// ── Action (POST) ─────────────────────────────────────────────────────────────

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const intent = body._intent as string;

    // ── Login ────────────────────────────────────────────────────────────────
    if (intent === "login") {
      const { username, password } = body as { username: string; password: string };
      const { data, token } = await graphqlRequest<{ login: GQLResult }>(
        env,
        LOGIN_MUTATION,
        { username, password, rememberMe: true },
        { request }
      );
      return new Response(JSON.stringify({ login: data.login }), {
        headers: makeHeaders(token),
      });
    }

    // ── Register + auto-login ────────────────────────────────────────────────
    if (intent === "register") {
      const { firstName, lastName, emailAddress, password } = body as {
        firstName: string;
        lastName: string;
        emailAddress: string;
        password: string;
      };

      const { data: regData } = await graphqlRequest<{
        registerCustomerAccount: GQLResult;
      }>(
        env,
        REGISTER_MUTATION,
        { input: { firstName, lastName, emailAddress, password } },
        { request }
      );

      const regResult = regData.registerCustomerAccount;
      if (regResult.__typename !== "Success") {
        const msg =
          (regResult.validationErrorMessage as string) ||
          (regResult.message as string) ||
          "Registration failed";
        return Response.json({ error: msg });
      }

      // Auto-login after successful registration
      const { data: loginData, token } = await graphqlRequest<{ login: GQLResult }>(
        env,
        LOGIN_MUTATION,
        { username: emailAddress, password, rememberMe: true },
        { request }
      );
      return new Response(
        JSON.stringify({ login: loginData.login, registered: true }),
        { headers: makeHeaders(token) }
      );
    }

    // ── Guest checkout ───────────────────────────────────────────────────────
    if (intent === "guest") {
      const { firstName, lastName, emailAddress, emailOffers } = body as {
        firstName: string;
        lastName: string;
        emailAddress: string;
        emailOffers?: string;
      };
      const { data, token } = await graphqlRequest<{ setCustomerForOrder: GQLResult }>(
        env,
        SET_CUSTOMER_FOR_ORDER_MUTATION,
        { input: { firstName, lastName, emailAddress } },
        { request }
      );
      if (emailOffers === "true" && data.setCustomerForOrder.__typename === "Order") {
        await subscribeToNewsletter(env, { email: emailAddress, name: `${firstName} ${lastName}`.trim() || undefined });
      }
      return new Response(
        JSON.stringify({ setCustomerForOrder: data.setCustomerForOrder }),
        { headers: makeHeaders(token) }
      );
    }

    // ── Set shipping address ─────────────────────────────────────────────────
    if (intent === "setShippingAddress") {
      const {
        firstName,
        lastName,
        streetLine1,
        streetLine2,
        city,
        province,
        postalCode,
        countryCode,
        phoneNumber,
      } = body as {
        firstName: string;
        lastName: string;
        streetLine1: string;
        streetLine2?: string;
        city?: string;
        province?: string;
        postalCode?: string;
        countryCode: string;
        phoneNumber?: string;
      };

      const { data, token } = await graphqlRequest<{
        setOrderShippingAddress: GQLResult;
      }>(
        env,
        SET_SHIPPING_ADDRESS_MUTATION,
        {
          input: {
            fullName: `${firstName} ${lastName}`.trim(),
            streetLine1,
            streetLine2: streetLine2 || undefined,
            city: city || undefined,
            province: province || undefined,
            postalCode: postalCode || undefined,
            countryCode,
            phoneNumber: phoneNumber || undefined,
          },
        },
        { request }
      );
      return new Response(
        JSON.stringify({ setOrderShippingAddress: data.setOrderShippingAddress }),
        { headers: makeHeaders(token) }
      );
    }

    // ── Set shipping method ──────────────────────────────────────────────────
    if (intent === "setShippingMethod") {
      const { shippingMethodId } = body as { shippingMethodId: string };
      const { data, token } = await graphqlRequest<{ setOrderShippingMethod: GQLResult }>(
        env,
        SET_SHIPPING_METHOD_MUTATION,
        { shippingMethodId: [shippingMethodId] },
        { request }
      );
      return new Response(
        JSON.stringify({ setOrderShippingMethod: data.setOrderShippingMethod }),
        { headers: makeHeaders(token) }
      );
    }

    // ── Add payment ──────────────────────────────────────────────────────────
    if (intent === "addPayment") {
      const { method, metadata } = body as {
        method: string;
        metadata?: Record<string, unknown>;
      };

      // Transition to ArrangingPayment (idempotent — ignore if already there)
      const { data: transData, token: transToken } = await graphqlRequest<{
        transitionOrderToState: GQLResult;
      }>(
        env,
        TRANSITION_ORDER_TO_STATE_MUTATION,
        { state: "ArrangingPayment" },
        { request }
      );

      const transResult = transData.transitionOrderToState;
      if (transResult.__typename === "OrderStateTransitionError") {
        const fromState = transResult.fromState as string;
        if (fromState !== "ArrangingPayment") {
          return new Response(
            JSON.stringify({ error: (transResult.message as string) || "Cannot proceed to payment" }),
            { headers: makeHeaders(transToken) }
          );
        }
      }

      // SkipCash is a hosted-checkout gateway — no Payment/Order is created by this
      // call, unlike the generic addPaymentToOrder path below. It only returns a
      // payUrl to redirect the customer to; the order is only ever settled once
      // SkipCash's webhook confirms the transaction server-side.
      if (method === SKIPCASH_METHOD_CODE) {
        try {
          const { data, token } = await graphqlRequest<{ initiateSkipCashPayment: SkipCashCheckoutResult }>(
            env,
            INITIATE_SKIPCASH_PAYMENT_MUTATION,
            undefined,
            { request, ...(transToken ? { authToken: transToken } : {}) }
          );
          return new Response(
            JSON.stringify({ skipcashCheckout: data.initiateSkipCashPayment }),
            { headers: makeHeaders(token ?? transToken) }
          );
        } catch (err) {
          console.error("[api.checkout] initiateSkipCashPayment failed:", err);
          const message = extractGraphQLErrorMessage(err, "SkipCash payment could not be initiated");
          return new Response(
            JSON.stringify({ error: message }),
            { status: 502, headers: makeHeaders(transToken) }
          );
        }
      }

      // Add payment to order
      const { data, token } = await graphqlRequest<{ addPaymentToOrder: GQLResult }>(
        env,
        ADD_PAYMENT_TO_ORDER_MUTATION,
        { input: { method, metadata: metadata ?? {} } },
        { request, ...(transToken ? { authToken: transToken } : {}) }
      );

      const payResult = data.addPaymentToOrder;

      // For pay-online (Sadad hosted checkout), extract metadata and return for redirect
      if (payResult.__typename === "Order" && method === "pay-online") {
        const payments = payResult.payments as Array<Record<string, unknown>> | undefined;
        const sadadPayment = payments?.find(
          (p) => p.method === method && p.state === "Created"
        );
        if (sadadPayment?.metadata) {
          return new Response(
            JSON.stringify({ sadadMetadata: sadadPayment.metadata }),
            { headers: makeHeaders(token ?? transToken) }
          );
        }
        return new Response(
          JSON.stringify({ error: "Payment could not be initialised" }),
          { status: 500, headers: makeHeaders(token ?? transToken) }
        );
      }

      return new Response(
        JSON.stringify({ addPaymentToOrder: payResult }),
        { headers: makeHeaders(token ?? transToken) }
      );
    }

    // ── Reopen cart (undo "arranging payment") ────────────────────────────────────
    // Vendure's default order process already allows ArrangingPayment -> AddingItems
    // (see @vendure/core's default-order-process.ts) -- this just calls it. Needed
    // whenever a customer wants to edit their order after starting checkout: payment
    // cancelled/failed and they want to change something, or they navigated back to
    // an earlier step. Without this, the order stays locked and every edit mutation
    // (setOrderShippingAddress, adjustOrderLine, etc.) fails server-side.
    if (intent === "reopenCart") {
      const { data, token } = await graphqlRequest<{ transitionOrderToState: GQLResult }>(
        env,
        TRANSITION_ORDER_TO_STATE_MUTATION,
        { state: "AddingItems" },
        { request }
      );
      const result = data.transitionOrderToState;
      if (result.__typename === "OrderStateTransitionError") {
        // Already back in AddingItems (e.g. a duplicate click) -- treat as success.
        if (result.fromState === "AddingItems") {
          return new Response(JSON.stringify({ transitionOrderToState: { __typename: "Order", state: "AddingItems" } }), { headers: makeHeaders(token) });
        }
        return new Response(
          JSON.stringify({ error: (result.message as string) || "Could not reopen your order" }),
          { headers: makeHeaders(token) }
        );
      }
      return new Response(
        JSON.stringify({ transitionOrderToState: result }),
        { headers: makeHeaders(token) }
      );
    }

    // ── Apply coupon code ────────────────────────────────────────────────────────
    if (intent === "applyCoupon") {
      const { couponCode } = body as { couponCode: string };
      const { data, token } = await graphqlRequest<{ applyCouponCode: GQLResult }>(
        env,
        APPLY_COUPON_CODE_MUTATION,
        { couponCode },
        { request }
      );
      return new Response(
        JSON.stringify({ applyCouponCode: data.applyCouponCode }),
        { headers: makeHeaders(token) }
      );
    }

    return Response.json({ error: "Unknown intent" }, { status: 400 });
  } catch (err) {
    console.error("[api.checkout action]", err);
    return Response.json({ error: "Checkout operation failed" }, { status: 500 });
  }
}
