import { useEffect, useState } from "react";
import { useLocation, useLoaderData, useNavigate } from "react-router";
import Link from "~/components/LocaleLink";
import { Check, ShoppingBag, Package } from "lucide-react";
import type { Route } from "./+types/checkout.success";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_ORDER_BY_CODE_QUERY } from "~/graphql/checkout";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import type { VendurePayment } from "~/types/sadad";
import { getLocaleFromPathname, localizePath } from "~/lib/i18n";
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
    takingLonger: "Still Processing",
    takingLongerBody: "This is taking longer than expected. If you completed payment, it will be confirmed shortly — otherwise, you can try again.",
    checkAgain: "Check Again",
    tryAgain: "Try Payment Again",
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
    takingLonger: "لا تزال المعالجة جارية",
    takingLongerBody: "يستغرق هذا وقتًا أطول من المعتاد. إذا أتممت الدفع، فسيتم تأكيده قريبًا — وإلا يمكنك المحاولة مرة أخرى.",
    checkAgain: "تحقق مرة أخرى",
    tryAgain: "إعادة محاولة الدفع",
  },
} as const;

// If a webhook hasn't settled the order within this window, stop auto-refreshing
// and offer a manual retry instead of polling forever — matters most for SkipCash,
// which (unlike Sadad's signed checkout.callback.tsx) has no verified callback to
// redirect a failed/cancelled payment to /checkout/failed, so a declined SkipCash
// payment lands on this same page and would otherwise spin indefinitely.
const POLL_TIMEOUT_MS = 90_000;

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
    // SkipCash's Return URL is a fixed setting in its merchant portal — it can't
    // carry a dynamic order code the way our own checkout.callback.tsx (Sadad) can.
    // The page component falls back to a sessionStorage breadcrumb set right before
    // the customer was redirected to SkipCash, then re-navigates here with ?orderCode=.
    return { order: null, paymentState: null };
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

  // Gateway-agnostic: any Settled payment means the order is paid, regardless of
  // which method (Sadad, SkipCash, ...) processed it.
  const settledPayment = order.payments?.find((p) => p.state === "Settled");
  return { order, paymentState: settledPayment?.state ?? "Unknown" };
}

export default function CheckoutSuccessPage() {
  const { order, paymentState } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const locale = getLocaleFromPathname(useLocation().pathname);
  const t = COPY[locale];
  const isSettled = paymentState === "Settled";
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!order || isSettled) return;
    const pollKey = `successPollStart:${order.code}`;
    const startedAt = sessionStorage.getItem(pollKey);
    const start = startedAt ? Number(startedAt) : Date.now();
    if (!startedAt) sessionStorage.setItem(pollKey, String(start));
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      setTimedOut(true);
    }
  }, [order, isSettled]);

  useEffect(() => {
    if (isSettled && order) sessionStorage.removeItem(`successPollStart:${order.code}`);
  }, [isSettled, order]);

  useEffect(() => {
    if (order) return;
    // No ?orderCode= on the URL — most likely SkipCash's static Return URL landed us
    // here directly. Re-navigate with the order code stashed before redirecting to
    // SkipCash (see PaymentStep in checkout.tsx), which re-runs the loader for real.
    const pending = sessionStorage.getItem("pendingOrderCode");
    if (pending) {
      sessionStorage.removeItem("pendingOrderCode");
      navigate(localizePath(`/checkout/success?orderCode=${encodeURIComponent(pending)}`, locale), { replace: true });
    } else {
      navigate(localizePath("/", locale), { replace: true });
    }
  }, [order]);

  if (!order) {
    return (
      <CheckoutLayout>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CheckoutLayout>
    );
  }

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
        ) : timedOut ? (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.takingLonger}</h1>
            <p className="text-gray-500 leading-relaxed mb-6">{t.takingLongerBody}</p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto mb-8">
              <Link
                to={`/checkout/success?orderCode=${encodeURIComponent(order.code)}`}
                className="inline-flex items-center justify-center bg-primary text-white font-semibold py-3 px-6 rounded hover:bg-primary/90 transition-colors"
              >
                {t.checkAgain}
              </Link>
              <Link to="/checkout" className="text-gray-500 text-sm underline hover:text-gray-700 transition-colors">
                {t.tryAgain}
              </Link>
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
