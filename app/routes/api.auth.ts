import { redirect } from "react-router";
import type { Route } from "./+types/api.auth";
import { graphqlRequest } from "workers/graphqlClient";
import { LOGOUT_MUTATION, LOGIN_MUTATION, REGISTER_MUTATION } from "~/graphql/checkout";
import {
  REQUEST_PASSWORD_RESET_MUTATION,
  RESET_PASSWORD_MUTATION,
  VERIFY_CUSTOMER_ACCOUNT_MUTATION,
  SOCIAL_LOGIN_MUTATION,
  type SocialLoginResult,
} from "~/graphql/account";

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

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = await request.json() as Record<string, unknown>;
  const intent = body._intent as string;

  // ── logout ──────────────────────────────────────────────────────────────────
  if (intent === "logout") {
    try {
      await graphqlRequest(env, LOGOUT_MUTATION, undefined, { request });
    } catch {
      // still clear the cookie even if the mutation fails
    }
    const headers = new Headers();
    headers.append("Set-Cookie", "vendure-auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return redirect("/", { headers });
  }

  // ── login ───────────────────────────────────────────────────────────────────
  if (intent === "login") {
    const { username, password, redirect: returnTo } = body as { username: string; password: string; redirect?: string };
    const safeRedirect = returnTo && returnTo.startsWith("/") ? returnTo : "/";
    try {
      const { data, token } = await graphqlRequest<{
        login: { __typename: string; id?: string; identifier?: string; errorCode?: string; message?: string };
      }>(env, LOGIN_MUTATION, { username, password, rememberMe: true }, { request });

      const result = data.login;
      if (result.__typename === "CurrentUser") {
        const headers = new Headers();
        if (token) {
          headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
        }
        return redirect(safeRedirect, { headers });
      }
      return Response.json(
        { error: result.message ?? "Login failed. Check your credentials." },
        { status: 401 }
      );
    } catch {
      return Response.json({ error: "Login failed. Please try again." }, { status: 500 });
    }
  }

  // ── register ─────────────────────────────────────────────────────────────────
  if (intent === "register") {
    const { firstName, lastName, emailAddress, password, phoneNumber, emailOffers } = body as {
      firstName: string; lastName: string; emailAddress: string; password: string; phoneNumber?: string; emailOffers?: string;
    };
    const input: Record<string, unknown> = { firstName, lastName, emailAddress, password };
    if (phoneNumber) input.phoneNumber = phoneNumber;
    input.customFields = { emailOffers: emailOffers === "true" };
    try {
      const { data } = await graphqlRequest<{
        registerCustomerAccount: {
          __typename: string;
          success?: boolean;
          errorCode?: string;
          message?: string;
          validationErrorMessage?: string;
        };
      }>(env, REGISTER_MUTATION, { input }, { request });

      const result = data.registerCustomerAccount;
      if (result.__typename === "Success") {
        return Response.json({ registered: true });
      }
      return Response.json(
        { error: result.validationErrorMessage ?? result.message ?? "Registration failed." },
        { status: 400 }
      );
    } catch {
      return Response.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }
  }

  // ── requestPasswordReset ─────────────────────────────────────────────────────
  if (intent === "requestPasswordReset") {
    const { emailAddress } = body as { emailAddress: string };
    try {
      await graphqlRequest<{
        requestPasswordReset: { __typename: string };
      }>(env, REQUEST_PASSWORD_RESET_MUTATION, { emailAddress }, { request });
    } catch {
      // intentionally swallow — never reveal whether the email exists
    }
    return Response.json({ success: true });
  }

  // ── resetPassword ─────────────────────────────────────────────────────────────
  if (intent === "resetPassword") {
    const { token, password } = body as { token: string; password: string };
    try {
      const { data, token: authToken } = await graphqlRequest<{
        resetPassword: {
          __typename: string;
          id?: string;
          identifier?: string;
          message?: string;
          validationErrorMessage?: string;
        };
      }>(env, RESET_PASSWORD_MUTATION, { token, password }, { request });

      const result = data.resetPassword;
      if (result.__typename === "CurrentUser") {
        return new Response(JSON.stringify({ success: true }), {
          headers: makeHeaders(authToken),
        });
      }
      const msg =
        result.validationErrorMessage ??
        result.message ??
        "Password reset failed. The link may have expired.";
      return Response.json({ error: msg });
    } catch {
      return Response.json(
        { error: "Password reset failed. Please try again." },
        { status: 500 }
      );
    }
  }

  // ── verifyEmail ───────────────────────────────────────────────────────────────
  if (intent === "verifyEmail") {
    const { token, password } = body as { token: string; password?: string };
    try {
      const { data, token: authToken } = await graphqlRequest<{
        verifyCustomerAccount: {
          __typename: string;
          id?: string;
          identifier?: string;
          message?: string;
          validationErrorMessage?: string;
        };
      }>(env, VERIFY_CUSTOMER_ACCOUNT_MUTATION, { token, password }, { request });

      const result = data.verifyCustomerAccount;
      if (result.__typename === "CurrentUser") {
        return new Response(JSON.stringify({ success: true }), {
          headers: makeHeaders(authToken),
        });
      }
      if (result.__typename === "PasswordAlreadySetError") {
        return Response.json({ success: true, alreadyVerified: true });
      }
      const msg =
        result.validationErrorMessage ??
        result.message ??
        "Verification failed. The link may be invalid or expired.";
      return Response.json({ error: msg });
    } catch {
      return Response.json(
        { error: "Verification failed. Please try again." },
        { status: 500 }
      );
    }
  }

  // ── socialLogin ───────────────────────────────────────────────────────────────
  if (intent === "socialLogin") {
    const { provider, token, emailOffers } = body as { provider: "google" | "facebook"; token: string; emailOffers?: string };
    if (!provider || !token) {
      return Response.json({ error: "Missing provider or token." }, { status: 400 });
    }
    const input = { [provider]: { token, emailOffers: emailOffers === "true" } };
    try {
      const { data, token: authToken } = await graphqlRequest<SocialLoginResult>(
        env,
        SOCIAL_LOGIN_MUTATION,
        { input },
        { request }
      );
      const result = data.authenticate;
      if (result.__typename === "CurrentUser") {
        return new Response(JSON.stringify({ success: true, identifier: result.identifier }), {
          headers: makeHeaders(authToken),
        });
      }
      return Response.json({
        error: result.message ?? "Social sign-in failed. Please try again.",
      });
    } catch {
      return Response.json(
        { error: "Social sign-in failed. Please try again." },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: "Unknown intent" }, { status: 400 });
}
