import type { Route } from "./+types/api.account";
import { graphqlRequest } from "workers/graphqlClient";
import {
  UPDATE_CUSTOMER_MUTATION,
  UPDATE_CUSTOMER_PASSWORD_MUTATION,
  type UpdateCustomerResult,
  type UpdateCustomerPasswordResult,
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

function json(body: unknown, token?: string | null, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: makeHeaders(token),
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = await request.json() as Record<string, string>;
  const intent = body._intent;

  if (intent === "updateProfile") {
    const input: Record<string, string> = {};
    if (body.firstName) input.firstName = body.firstName;
    if (body.lastName) input.lastName = body.lastName;
    if (body.title !== undefined) input.title = body.title;
    if (body.phoneNumber !== undefined) input.phoneNumber = body.phoneNumber;

    try {
      const { data, token } = await graphqlRequest<UpdateCustomerResult>(
        env,
        UPDATE_CUSTOMER_MUTATION,
        { input },
        { request }
      );
      return json({ customer: data.updateCustomer }, token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update profile";
      return json({ error: msg }, null, 500);
    }
  }

  if (intent === "changePassword") {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return json({ error: "Both current and new passwords are required." }, null, 400);
    }

    try {
      const { data, token } = await graphqlRequest<UpdateCustomerPasswordResult>(
        env,
        UPDATE_CUSTOMER_PASSWORD_MUTATION,
        { currentPassword, newPassword },
        { request }
      );

      const result = data.updateCustomerPassword;
      if (result.__typename !== "Success") {
        const msg =
          result.validationErrorMessage ??
          result.message ??
          "Password update failed.";
        return json({ error: msg }, token);
      }

      return json({ success: true }, token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to change password";
      return json({ error: msg }, null, 500);
    }
  }

  return json({ error: "Unknown intent" }, null, 400);
}
