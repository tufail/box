import { redirect } from "react-router";
import type { Route } from "./+types/subscription-checkout";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData } from "~/graphql/account";
import { INITIATE_SUBSCRIPTION_RENEWAL_MUTATION, type InitiateSubscriptionRenewalData } from "~/graphql/subscription";
import { getLocaleFromPathname, localizePath } from "~/lib/i18n";

// graphqlRequest() throws with e.message set to JSON.stringify(errors) — pull the
// readable business-logic message out (e.g. "No pending renewal payment found for
// this subscription") instead of surfacing the raw serialized array to the customer.
function extractErrorMessage(e: unknown, fallback: string): string {
	if (!(e instanceof Error)) return fallback;
	try {
		const parsed = JSON.parse(e.message);
		const first = Array.isArray(parsed) ? parsed[0] : parsed;
		return typeof first?.message === "string" ? first.message : e.message;
	} catch {
		return e.message;
	}
}

// Entry point for the "Confirm & Pay" link in subscription renewal emails
// (?subscriptionId=...&cycleId=...). Never renders — it either creates a payable
// renewal Order and hands off to the normal /checkout Payment step, or bounces back
// to My Subscriptions with an error. Not mirrored contextually to /ar since the
// renewal email itself isn't locale-aware; the /checkout redirect it lands on is.
export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const url = new URL(request.url);
	const locale = getLocaleFromPathname(url.pathname);
	const subscriptionId = url.searchParams.get("subscriptionId");
	const cycleId = url.searchParams.get("cycleId") ?? undefined;

	if (!subscriptionId) {
		return redirect(localizePath("/account/subscriptions", locale));
	}

	const { data: profileData } = await graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request }).catch(() => ({ data: { activeCustomer: null } }));

	if (!profileData.activeCustomer) {
		const returnTo = `${url.pathname}${url.search}`;
		return redirect(localizePath(`/login?redirect=${encodeURIComponent(returnTo)}`, locale));
	}

	try {
		await graphqlRequest<InitiateSubscriptionRenewalData>(env, INITIATE_SUBSCRIPTION_RENEWAL_MUTATION, { subscriptionId, cycleId }, { request });
		return redirect(localizePath("/checkout", locale));
	} catch (e) {
		const message = extractErrorMessage(e, "Could not start your subscription renewal.");
		return redirect(localizePath(`/account/subscriptions?renewalError=${encodeURIComponent(message)}`, locale));
	}
}

export default function SubscriptionCheckoutPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4">
			<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
			<p className="text-gray-500">Preparing your renewal…</p>
		</div>
	);
}
