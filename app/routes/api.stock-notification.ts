import type { Route } from "./+types/api.stock-notification";
import { graphqlRequest } from "workers/graphqlClient";
import { looksLikeBot } from "workers/botCheck";
import { isDisposableEmail } from "workers/disposableEmail";
import { verifyTurnstile } from "workers/turnstile";
import type { Locale } from "~/lib/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUEST_STOCK_NOTIFICATION = `
	mutation RequestStockNotification($productVariantId: ID!, $email: String!) {
		requestStockNotification(productVariantId: $productVariantId, email: $email) {
			success
			alreadySubscribed
		}
	}
`;

const ERRORS = {
	en: {
		invalidEmail: "Please enter a valid email address.",
		disposable: "Please use a permanent email address (temporary/disposable addresses aren't accepted).",
		failed: "Something went wrong. Please try again.",
		verification: "We couldn't verify you're human. Please try again.",
	},
	ar: {
		invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
		disposable: "يرجى استخدام بريد إلكتروني دائم (لا نقبل عناوين البريد المؤقتة).",
		failed: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
		verification: "تعذّر التحقق من أنك لست روبوتًا. يرجى المحاولة مرة أخرى.",
	},
};

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const body = (await request.json()) as {
		productVariantId?: string;
		email?: string;
		company?: string;
		renderedAt?: number;
		locale?: Locale;
		turnstileToken?: string | null;
	};
	const locale: Locale = body.locale === "ar" ? "ar" : "en";
	const t = ERRORS[locale];
	const email = (body.email ?? "").trim();

	if (!EMAIL_RE.test(email)) {
		return Response.json({ error: t.invalidEmail }, { status: 400 });
	}
	if (isDisposableEmail(email)) {
		return Response.json({ error: t.disposable }, { status: 400 });
	}
	if (!body.productVariantId || !/^\d+$/.test(body.productVariantId)) {
		return Response.json({ error: t.failed }, { status: 400 });
	}

	// Bots get a fake success, same as the newsletter form (see workers/botCheck.ts).
	if (looksLikeBot(request, body)) {
		return Response.json({ ok: true });
	}

	// Cloudflare Turnstile (when configured). A real error rather than a fake success: a
	// genuine shopper whose token expired needs to know to retry, and there's nothing
	// here a bot can learn to route around.
	if (!(await verifyTurnstile(env, body.turnstileToken, request))) {
		return Response.json({ error: t.verification }, { status: 400 });
	}

	// The backend silently drops requests without this secret, so bots can't skip the
	// checks above by POSTing straight to /shop-api. Set with `wrangler secret put
	// STOREFRONT_API_SECRET` (and in .dev.vars locally); must match the Vendure server's
	// STOREFRONT_API_SECRET.
	const secret = (env as unknown as { STOREFRONT_API_SECRET?: string }).STOREFRONT_API_SECRET;

	try {
		const { data } = await graphqlRequest<{ requestStockNotification: { success: boolean; alreadySubscribed: boolean } }>(
			env,
			REQUEST_STOCK_NOTIFICATION,
			{ productVariantId: body.productVariantId, email },
			{ request, locale, headers: secret ? { "x-storefront-secret": secret } : undefined },
		);
		return Response.json({ ok: true, alreadySubscribed: data.requestStockNotification.alreadySubscribed });
	} catch {
		return Response.json({ error: t.failed }, { status: 500 });
	}
}
