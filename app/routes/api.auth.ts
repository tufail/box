import { redirect } from "react-router";
import type { Route } from "./+types/api.auth";
import { graphqlRequest } from "workers/graphqlClient";
import { LOGOUT_MUTATION, LOGIN_MUTATION, REGISTER_MUTATION } from "~/graphql/checkout";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = await request.json() as Record<string, unknown>;
  const intent = body._intent as string;

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

  if (intent === "login") {
    const { username, password } = body as { username: string; password: string };
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
        return redirect("/", { headers });
      }
      return Response.json(
        { error: result.message ?? "Login failed. Check your credentials." },
        { status: 401 }
      );
    } catch {
      return Response.json({ error: "Login failed. Please try again." }, { status: 500 });
    }
  }

  if (intent === "register") {
    const { firstName, lastName, emailAddress, password, phoneNumber } = body as {
      firstName: string; lastName: string; emailAddress: string; password: string; phoneNumber?: string;
    };
    const input: Record<string, string> = { firstName, lastName, emailAddress, password };
    if (phoneNumber) input.phoneNumber = phoneNumber;
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

  return Response.json({ error: "Unknown intent" }, { status: 400 });
}
