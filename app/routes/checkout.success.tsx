import { useLocation, useLoaderData } from "react-router";
import Link from "~/components/LocaleLink";
import { Check, ShoppingBag, Package } from "lucide-react";
import type { Route } from "./+types/checkout.success";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_ORDER_BY_CODE_QUERY } from "~/graphql/checkout";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import type { VendurePayment } from "~/types/sadad";
import { getLocaleFromPathname } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";

export function meta() {
  return [
    { title: "Order Confirmed — NutriBox" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    orderConfirmed: "Order Confirmed!",
    thankYou: "Thank you for your purchase. We've received your order and will begin processing it shortly.",
    orderDetails: "Order Details",
    orderNumber: "Order Number",
    totalPaid: "Total Paid",
    paymentProcessing: "Payment Processing…",
    beingConfirmed: "is being confirmed. This usually takes a few seconds.",
    continueShopping: "Continue Shopping",
  },
  ar: {
    orderConfirmed: "تم تأكيد الطلب!",
    thankYou: "شكرًا لشرائك. لقد استلمنا طلبك وسنبدأ بمعالجته قريبًا.",
    orderDetails: "تفاصيل الطلب",
    orderNumber: "رقم الطلب",
    totalPaid: "المبلغ المدفوع",
    paymentProcessing: "جارٍ معالجة الدفع…",
    beingConfirmed: "قيد التأكيد. عادةً ما يستغرق ذلك بضع ثوانٍ.",
    continueShopping: "متابعة التسوق",
  },
} as const;

interface OrderByCodeData {
  orderByCode: {
    id: string;
    code: string;
    state: string;
    totalWithTax: number;
    currencyCode: string;
    payments: VendurePayment[];
  } | null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orderCode = url.searchParams.get("orderCode") ?? "";

  if (!orderCode) {
    throw new Response("Missing orderCode", { status: 400 });
  }

  const env = context.cloudflare.env;
  const { data } = await graphqlRequest<OrderByCodeData>(
    env,
    GET_ORDER_BY_CODE_QUERY,
    { code: orderCode },
    { request }
  );

  const order = data.orderByCode;
  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  const sadadPayment = order.payments?.find((p) => p.method === "pay-online");
  return { order, paymentState: sadadPayment?.state ?? "Unknown" };
}

export default function CheckoutSuccessPage() {
  const { order, paymentState } = useLoaderData<typeof loader>();
  const locale = getLocaleFromPathname(useLocation().pathname);
  const t = COPY[locale];
  const isSettled = paymentState === "Settled";

  return (
    <CheckoutLayout>
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        {isSettled ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.orderConfirmed}</h1>
            <p className="text-gray-500 leading-relaxed mb-6">
              {t.thankYou}
            </p>
            <div className="bg-gray-50 rounded border border-gray-200 p-6 mb-8 text-start">
              <div className="flex items-center gap-3 mb-4">
                <Package size={20} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  {t.orderDetails}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">{t.orderNumber}</span>
                <span className="font-bold text-gray-900 font-mono text-lg">{order.code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t.totalPaid}</span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(order.totalWithTax, order.currencyCode, locale)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.paymentProcessing}</h1>
            <p className="text-gray-500 leading-relaxed mb-6">
              {locale === "ar" ? (
                <>
                  طلبك <strong>{order.code}</strong> {t.beingConfirmed}
                </>
              ) : (
                <>
                  Your order <strong>{order.code}</strong> {t.beingConfirmed}
                </>
              )}
            </p>
            {/* Auto-refresh to re-check payment state */}
            <meta httpEquiv="refresh" content="3" />
          </>
        )}

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-8 py-3 rounded hover:bg-primary/90 transition-colors"
        >
          <ShoppingBag size={18} />
          {t.continueShopping}
        </Link>
      </div>
    </CheckoutLayout>
  );
}
