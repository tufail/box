import { useEffect, useState } from "react";
import { redirect, useLocation, useLoaderData, useNavigate, useRevalidator } from "react-router";
import Link from "~/components/LocaleLink";
import { Check, ShoppingBag, Package } from "lucide-react";
import type { Route } from "./+types/checkout.success";
import { graphqlRequest } from "workers/graphqlClient";
import { CHECK_SKIPCASH_PAYMENT_STATUS_MUTATION, GET_ORDER_BY_CODE_QUERY, type SkipCashPaymentStatusResult } from "~/graphql/checkout";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import VendureImage from "~/components/VendureImage";
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
    orderItems: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    qty: "Qty",
    subtotal: "Subtotal",
    shipping: "Shipping",
    free: "Free",
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
    orderItems: (n: number) => (n === 1 ? "قطعة واحدة" : `${n} قطع`),
    qty: "الكمية",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    free: "مجاني",
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

// How often to re-check payment status while processing. This used to be a
// <meta http-equiv="refresh"> doing a real browser-level page reload every 3s —
// that timer isn't tied to the React component's lifecycle, so it could still
// fire (and yank the customer back to this page) right as they clicked "Continue
// Shopping" or another link, racing the client-side navigation away. A
// revalidator-driven interval (see the effect below) is cleaned up on unmount,
// so it can never fire after the user has navigated elsewhere.
const POLL_INTERVAL_MS = 6_000;

interface OrderLine {
  id: string;
  quantity: number;
  unitPriceWithTax: number;
  linePriceWithTax: number;
  featuredAsset: { preview: string } | null;
  productVariant: {
    id: string;
    name: string;
    customFields: { slug: string | null } | null;
    product: { name: string; slug: string; featuredAsset: { preview: string } | null };
  };
}

interface OrderByCodeData {
  orderByCode: {
    id: string;
    code: string;
    state: string;
    totalWithTax: number;
    subTotalWithTax: number;
    shippingWithTax: number;
    currencyCode: string;
    lines: OrderLine[];
    payments: VendurePayment[];
  } | null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  // SkipCash's Return URL is a fixed setting in its merchant portal, but confirmed
  // empirically that SkipCash appends its own query params on the actual redirect:
  // ?id=<realSkipcashPaymentId>&statusId=<n>&status=<text>&transId=<ourOrderCode>.
  // transId is a more reliable source for the order code than the sessionStorage
  // breadcrumb (see the component's fallback effect below) since it comes straight
  // from SkipCash rather than depending on browser storage surviving the round trip.
  const orderCode = url.searchParams.get("orderCode") ?? url.searchParams.get("transId") ?? "";
  const skipcashPaymentId = url.searchParams.get("id") ?? undefined;
  const env = context.cloudflare.env;
  const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

  if (!orderCode) {
    // No usable order code anywhere on the URL — the page component falls back to
    // the sessionStorage breadcrumb set right before the customer was redirected to
    // SkipCash, then re-navigates here with ?orderCode=.
    return { order: null, paymentState: null, vendureBase };
  }

  // Backup for a delayed/lost SkipCash webhook (or a sandbox where webhooks require
  // manual triggering) — actively ask the backend to check SkipCash directly and
  // settle now if it's actually Paid, instead of only ever passively re-reading
  // Vendure's own state and hoping the webhook already ran. skipcashPaymentId (the
  // real id from SkipCash's own redirect, when present) lets the backend check the
  // actual attempt directly rather than guessing which of our own tracked ids is
  // the real one. A confirmed decline redirects straight to the dedicated failed
  // page instead of rendering inline here. Best-effort: this must never break the
  // page — orderByCode below still reflects whatever the webhook (or an earlier
  // poll tick) already settled either way.
  try {
    const { data: statusData } = await graphqlRequest<{ checkSkipCashPaymentStatus: SkipCashPaymentStatusResult }>(
      env,
      CHECK_SKIPCASH_PAYMENT_STATUS_MUTATION,
      { orderCode, skipcashPaymentId },
      { request }
    );
    if (statusData.checkSkipCashPaymentStatus.failed) {
      return redirect(`/checkout/failed?orderCode=${encodeURIComponent(orderCode)}&error=payment_declined`);
    }
  } catch (err) {
    console.error("[checkout.success] checkSkipCashPaymentStatus failed:", err);
  }

  try {
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
    return { order, paymentState: settledPayment?.state ?? "Unknown", vendureBase };
  } catch (err) {
    if (err instanceof Response) throw err;
    // orderByCode can come back FORBIDDEN — a customer's browser returning
    // from a third-party redirect (SkipCash) doesn't always carry the same
    // order-ownership token Vendure checks against, so this isn't necessarily
    // a real failure. Degrade to the same "still processing" UI (with its
    // existing auto-refresh/timeout handling) instead of crashing this page
    // with a raw 500 right after the customer paid.
    console.error("[checkout.success] orderByCode failed:", err);
    return {
      order: { id: "", code: orderCode, state: "", totalWithTax: 0, subTotalWithTax: 0, shippingWithTax: 0, currencyCode: "QAR", lines: [], payments: [] },
      paymentState: null,
      vendureBase,
    };
  }
}

export default function CheckoutSuccessPage() {
  const { order, paymentState, vendureBase } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const locale = getLocaleFromPathname(useLocation().pathname);
  const t = COPY[locale];
  const isSettled = paymentState === "Settled";
  const [timedOut, setTimedOut] = useState(false);

  // Re-checks payment status on an interval while still processing. Cleaned up
  // on unmount (order resolves, or the customer navigates away), unlike the old
  // meta-refresh approach — see POLL_INTERVAL_MS's comment. A confirmed decline
  // never reaches this state — the loader redirects to /checkout/failed instead.
  useEffect(() => {
    if (!order || isSettled || timedOut) return;
    const interval = setInterval(() => {
      if (revalidator.state === "idle") revalidator.revalidate();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [order, isSettled, timedOut, revalidator]);

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
      <div className="max-w-xl mx-auto text-center py-12 px-4">
        {isSettled ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.orderConfirmed}</h1>
            <p className="text-gray-500 leading-relaxed mb-8">
              {t.thankYou}
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-start overflow-hidden mb-8">
              <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-gray-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-700">
                    {t.orderNumber} <span className="font-mono">{order.code}</span>
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500">{t.orderItems(order.lines.length)}</span>
              </div>

              {order.lines.length > 0 && (
                <div className="divide-y divide-gray-100 px-5">
                  {order.lines.map((line) => {
                    const preview = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview;
                    const productHref = `/products/${line.productVariant.customFields?.slug ?? line.productVariant.product.slug}`;
                    return (
                      <div key={line.id} className="flex items-center gap-4 py-4">
                        <div className="w-16 h-16 rounded-xl bg-stone-50 border border-gray-100 overflow-hidden shrink-0">
                          {preview ? (
                            <VendureImage src={preview} vendureBase={vendureBase} alt={line.productVariant.name} width={64} height={64} objectFit="contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={productHref} className="font-medium text-gray-900 hover:text-primary transition-colors line-clamp-1 text-sm">
                            {line.productVariant.product.name}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{line.productVariant.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t.qty}: {line.quantity}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 shrink-0">
                          {formatPrice(line.linePriceWithTax, order.currencyCode, locale)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5">
                {order.subTotalWithTax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.subtotal}</span>
                    <span>{formatPrice(order.subTotalWithTax, order.currencyCode, locale)}</span>
                  </div>
                )}
                {order.subTotalWithTax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t.shipping}</span>
                    <span>{order.shippingWithTax > 0 ? formatPrice(order.shippingWithTax, order.currencyCode, locale) : t.free}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 mt-1.5 border-t border-gray-200">
                  <span>{t.totalPaid}</span>
                  <span>{formatPrice(order.totalWithTax, order.currencyCode, locale)}</span>
                </div>
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
