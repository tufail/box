import type { Route } from "./+types/api.checkout";
import { graphqlRequest } from "workers/graphqlClient";
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  SET_CUSTOMER_FOR_ORDER_MUTATION,
  SET_SHIPPING_ADDRESS_MUTATION,
  SET_SHIPPING_METHOD_MUTATION,
  ELIGIBLE_SHIPPING_METHODS_QUERY,
  ELIGIBLE_PAYMENT_METHODS_QUERY,
  TRANSITION_ORDER_TO_STATE_MUTATION,
  ADD_PAYMENT_TO_ORDER_MUTATION,
  type ShippingMethod,
  type PaymentMethod,
} from "~/graphql/checkout";

type GQLResult = Record<string, unknown>;

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

  try {
    if (intent === "shippingMethods") {
      const { data } = await graphqlRequest<{ eligibleShippingMethods: ShippingMethod[] }>(
        env,
        ELIGIBLE_SHIPPING_METHODS_QUERY,
        undefined,
        { request }
      );
      return Response.json({ shippingMethods: data.eligibleShippingMethods ?? [] });
    }

    if (intent === "paymentMethods") {
      const { data } = await graphqlRequest<{ eligiblePaymentMethods: PaymentMethod[] }>(
        env,
        ELIGIBLE_PAYMENT_METHODS_QUERY,
        undefined,
        { request }
      );
      return Response.json({ paymentMethods: data.eligiblePaymentMethods ?? [] });
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
      const { firstName, lastName, emailAddress } = body as {
        firstName: string;
        lastName: string;
        emailAddress: string;
      };
      const { data, token } = await graphqlRequest<{ setCustomerForOrder: GQLResult }>(
        env,
        SET_CUSTOMER_FOR_ORDER_MUTATION,
        { input: { firstName, lastName, emailAddress } },
        { request }
      );
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

      // Add payment to order
      const { data, token } = await graphqlRequest<{ addPaymentToOrder: GQLResult }>(
        env,
        ADD_PAYMENT_TO_ORDER_MUTATION,
        { input: { method, metadata: metadata ?? {} } },
        { request, ...(transToken ? { authToken: transToken } : {}) }
      );

      return new Response(
        JSON.stringify({ addPaymentToOrder: data.addPaymentToOrder }),
        { headers: makeHeaders(token ?? transToken) }
      );
    }

    return Response.json({ error: "Unknown intent" }, { status: 400 });
  } catch (err) {
    console.error("[api.checkout action]", err);
    return Response.json({ error: "Checkout operation failed" }, { status: 500 });
  }
}
