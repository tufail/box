import { redirect } from "react-router";
import type { Route } from "./+types/checkout.callback";
import { graphqlRequest } from "workers/graphqlClient";
import {
	CONFIRM_SADAD_CALLBACK_MUTATION,
	type SadadCallbackInput,
	type SadadCallbackResult,
} from "~/graphql/checkout";

interface CallbackEnv {
	VENDURE_SHOP_API?: string;
	VENDURE_CHANNEL_TOKEN?: string;
}

function authCookieHeaders(token?: string | null): Headers {
	const headers = new Headers();
	if (token) {
		headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
	}
	return headers;
}

// Shared by both the GET loader (Sadad redirecting the browser) and the POST
// action (Sadad posting the transaction result) — both forward the full,
// signed param set to Vendure so it can verify the checksum and settle or
// decline the payment, then route based on the real, verified outcome
// (never guess success/failure from raw, unverified query params).
async function processCallback(env: CallbackEnv, request: Request, params: Record<string, string>) {
	const input: SadadCallbackInput = { params };

	let result: SadadCallbackResult | undefined;
	let token: string | undefined;
	try {
		const { data, token: refreshedToken } = await graphqlRequest<{ confirmSadadCallback: SadadCallbackResult }>(
			env,
			CONFIRM_SADAD_CALLBACK_MUTATION,
			{ input },
			{ request }
		);
		result = data.confirmSadadCallback;
		token = refreshedToken;
	} catch (err) {
		console.error("[checkout.callback] mutation error:", err);
	}

	const headers = authCookieHeaders(token);
	const orderCode = encodeURIComponent(result?.orderCode ?? "");

	if (result?.paymentSettled) {
		return redirect(`/order-confirmation?code=${orderCode}`, { headers });
	}

	const error = result?.success ? "payment_declined" : "processing_error";
	return redirect(`/checkout/failed?orderCode=${orderCode}&error=${error}`, { headers });
}

// ── Loader (GET) ─────────────────────────────────────────────────────────────
// Sadad may redirect the customer's browser here via GET after payment
// (including a decline or a customer-initiated cancel on Sadad's page).
export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const params: Record<string, string> = {};
	for (const [key, value] of url.searchParams.entries()) {
		params[key] = value;
	}

	const hasOrderRef = params.ORDERID || params.ORDER_ID || params.orderCode;
	if (!hasOrderRef) {
		return redirect("/checkout");
	}

	try {
		return await processCallback(context.cloudflare.env, request, params);
	} catch (err) {
		console.error("[checkout.callback] loader error:", err);
		return redirect("/checkout/failed?error=processing_error");
	}
}

// ── Action (POST) ────────────────────────────────────────────────────────────
// Sadad POSTs the transaction result here after the customer pays.
export async function action({ request, context }: Route.ActionArgs) {
	try {
		const formData = await request.formData();
		// Forward ALL fields Sadad sends — Sadad signs the full param set, so
		// filtering here would cause signature verification to fail on the backend.
		const params: Record<string, string> = {};
		for (const [key, value] of formData.entries()) {
			if (typeof value === "string") params[key] = value;
		}
		return await processCallback(context.cloudflare.env, request, params);
	} catch (err) {
		console.error("[checkout.callback] action error:", err);
		return redirect("/checkout/failed?error=processing_error");
	}
}

export default function CheckoutCallbackPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4">
			<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
			<p className="text-gray-500">Processing payment…</p>
		</div>
	);
}
