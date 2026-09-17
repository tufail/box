import { useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import Link from "~/components/LocaleLink";
import { Check, ShoppingBag } from "lucide-react";
import type { Route } from "./+types/order-confirmation";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_ORDER_BY_CODE_QUERY } from "~/graphql/checkout";
import { GET_MY_REFERRAL_CODE_QUERY, type MyReferralCodeData } from "~/graphql/loyalty";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import PostOrderAccountPrompt from "~/components/PostOrderAccountPrompt";
import PostOrderReferralPrompt from "~/components/PostOrderReferralPrompt";
import OrderSummaryBox, { type OrderSummaryLine } from "~/components/OrderSummaryBox";
import { getLocaleFromPathname } from "~/lib/i18n";

export function meta() {
  return [
    { title: "Order Confirmed - NutriBox" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    orderConfirmed: "Order Confirmed!",
    thankYou: "Thank you for your purchase. We've received your order and will begin processing it shortly. You'll receive a confirmation email with your order details.",
    continueShopping: "Continue Shopping",
  },
  ar: {
    orderConfirmed: "تم تأكيد الطلب!",
    thankYou: "شكرًا لشرائك. لقد استلمنا طلبك وسنبدأ بمعالجته قريبًا. ستصلك رسالة تأكيد عبر البريد الإلكتروني تحتوي على تفاصيل طلبك.",
    continueShopping: "متابعة التسوق",
  },
} as const;

interface OrderConfirmationData {
  orderByCode: {
    code: string;
    totalWithTax: number;
    subTotalWithTax: number;
    shippingWithTax: number;
    currencyCode: string;
    customer: { firstName: string; lastName: string; emailAddress: string; user: { id: string } | null } | null;
    lines: OrderSummaryLine[];
  } | null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");
  const url = new URL(request.url);
  const orderCode = url.searchParams.get("code") ?? "";
  if (!orderCode) return { order: null, referralCode: null, vendureBase };

  try {
    const { data } = await graphqlRequest<OrderConfirmationData>(env, GET_ORDER_BY_CODE_QUERY, { code: orderCode }, { request });
    const order = data.orderByCode ?? null;
    const customer = order?.customer ?? null;

    // Already registered (has a linked User) — offer the referral share box
    // instead of the create-account prompt. myReferralCode resolves off the
    // current session, not the order, so this only comes back non-null when
    // they placed the order while actually signed in (the common case for a
    // registered customer) — silently omitted otherwise rather than showing
    // a broken/empty card.
    let referralCode: string | null = null;
    if (customer?.user) {
      try {
        const { data: referralData } = await graphqlRequest<MyReferralCodeData>(env, GET_MY_REFERRAL_CODE_QUERY, undefined, { request });
        referralCode = referralData.myReferralCode;
      } catch {
        // Best-effort — see comment above.
      }
    }

    return { order, referralCode, vendureBase };
  } catch (err) {
    // Best-effort only — the account prompt is a nice-to-have, never worth
    // breaking this page over (e.g. the same post-redirect ownership-token
    // quirk documented in checkout.success.tsx's loader).
    console.error("[order-confirmation] orderByCode failed:", err);
    return { order: null, referralCode: null, vendureBase };
  }
}

export default function OrderConfirmationPage({ loaderData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const locale = getLocaleFromPathname(useLocation().pathname);
  const t = COPY[locale];
  // Snapshotted once: submitting the account-creation form below revalidates this
  // loader, and a successful registration flips customer.user from null to set —
  // reading loaderData live here would yank the prompt away mid-success-message.
  const [order] = useState(loaderData.order);
  const [referralCode] = useState(loaderData.referralCode);
  const { vendureBase } = loaderData;
  const orderCode = order?.code ?? searchParams.get("code");
  const customer = order?.customer ?? null;
  const isGuest = customer && !customer.user;
  const showReferral = customer?.user && referralCode;
  const hasSideCard = isGuest || showReferral;

  return (
    <CheckoutLayout>
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Success header */}
        <div className="flex flex-col items-center lg:flex-row lg:items-center gap-4 mb-8 text-center lg:text-start">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <Check size={26} className="text-green-500" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{t.orderConfirmed}</h1>
            <p className="text-gray-500 leading-relaxed">{t.thankYou}</p>
          </div>
        </div>

        {(orderCode || hasSideCard) && (
          <div className={`grid grid-cols-1 gap-6 mb-8 ${hasSideCard ? "lg:grid-cols-2 lg:items-start" : ""}`}>
            {orderCode && (
              <OrderSummaryBox
                orderCode={orderCode}
                lines={order?.lines ?? []}
                subTotalWithTax={order?.subTotalWithTax ?? 0}
                shippingWithTax={order?.shippingWithTax ?? 0}
                totalWithTax={order?.totalWithTax ?? 0}
                currencyCode={order?.currencyCode ?? "QAR"}
                vendureBase={vendureBase}
                locale={locale}
              />
            )}

            {isGuest && customer && (
              <PostOrderAccountPrompt email={customer.emailAddress} firstName={customer.firstName} lastName={customer.lastName} locale={locale} />
            )}

            {showReferral && referralCode && <PostOrderReferralPrompt referralCode={referralCode} locale={locale} />}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-8 py-3 rounded hover:bg-primary/90 transition-colors"
          >
            <ShoppingBag size={18} />
            {t.continueShopping}
          </Link>
        </div>
      </div>
    </CheckoutLayout>
  );
}
