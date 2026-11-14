import { redirect } from "react-router";
import type { Route } from "./+types/checkout.paylater-return";
import { graphqlRequest } from "workers/graphqlClient";
import { CHECK_PAYLATER_PAYMENT_STATUS_MUTATION, type PayLaterStatusResult } from "~/graphql/checkout";

// PayLater redirects the browser here after both success AND failure (the backend's
// PAYLATER_SUCCESS_URL and PAYLATER_FAIL_URL point at this same route). The redirect
// itself is never trusted: the shopper can land here for many reasons (closed tab,
// back button, network blip). The only thing used is `merchantOrderId`, which our own
// backend embedded in both redirect URLs when it created the payment link.
// checkPayLaterPaymentStatus makes a live call back to PayLater server-side to find
// the real outcome, then settles or leaves the order as it is.
//
// Like checkout/callback, this is a payment-gateway return target, not a page users
// navigate to, so it is not mirrored under /ar.

function authCookieHeaders(token?: string | null): Headers {
	const headers = new Headers();
	if (token) {
		headers.append("Set-Cookie", `vendure-auth-token=${token}; Path=/; HttpOnly; SameSite=Lax`);
	}
	return headers;
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const merchantOrderId = url.searchParams.get("merchantOrderId");
	if (!merchantOrderId) {
		return redirect("/checkout");
	}

	let result: PayLaterStatusResult | undefined;
	let token: string | undefined;
	try {
		const { data, token: refreshedToken } = await graphqlRequest<{ checkPayLaterPaymentStatus: PayLaterStatusResult }>(
			context.cloudflare.env,
			CHECK_PAYLATER_PAYMENT_STATUS_MUTATION,
			{ merchantOrderId },
			{ request }
		);
		result = data.checkPayLaterPaymentStatus;
		token = refreshedToken;
	} catch (err) {
		console.error("[checkout.paylater-return] status check error:", err);
	}

	const headers = authCookieHeaders(token);
	const orderCode = encodeURIComponent(result?.orderCode ?? "");

	if (result?.paymentSettled) {
		return redirect(`/order-confirmation?code=${orderCode}`, { headers });
	}

	let error = "processing_error";
	if (result?.status === 0) error = "paylater_cancelled";
	else if (result?.status === 3) error = "paylater_declined";
	else if (result?.status === 1) error = "payment_pending";

	return redirect(`/checkout/failed?orderCode=${orderCode}&error=${error}`, { headers });
}

export default function CheckoutPayLaterReturnPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4">
			<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
			<p className="text-gray-500">Confirming your PayLater payment…</p>
		</div>
	);
}
