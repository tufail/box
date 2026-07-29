import { useLocation, useLoaderData } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/checkout.failed";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import { getLocaleFromPathname } from "~/lib/i18n";

export function meta() {
  return [
    { title: "Payment Failed — NutriBox" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    errorMessages: {
      payment_declined: "Your payment was declined by the bank. Please try a different card or contact your bank.",
      processing_error: "A technical error occurred while processing your payment.",
      invalid_signature: "Payment verification failed. Please try again.",
    } as Record<string, string>,
    genericError: "Your payment could not be completed. Please try again.",
    paymentFailed: "Payment Failed",
    reference: "Reference:",
    tryAgain: "Try Again",
    returnToShop: "Return to Shop",
  },
  ar: {
    errorMessages: {
      payment_declined: "تم رفض عملية الدفع من قبل البنك. يرجى تجربة بطاقة أخرى أو التواصل مع بنكك.",
      processing_error: "حدث خطأ تقني أثناء معالجة عملية الدفع.",
      invalid_signature: "فشل التحقق من عملية الدفع. يرجى المحاولة مرة أخرى.",
    } as Record<string, string>,
    genericError: "تعذّر إتمام عملية الدفع. يرجى المحاولة مرة أخرى.",
    paymentFailed: "فشلت عملية الدفع",
    reference: "الرقم المرجعي:",
    tryAgain: "المحاولة مرة أخرى",
    returnToShop: "العودة إلى المتجر",
  },
} as const;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    orderCode: url.searchParams.get("orderCode") ?? "",
    error: url.searchParams.get("error") ?? "processing_error",
  };
}

export default function CheckoutFailedPage() {
  const { orderCode, error } = useLoaderData<typeof loader>();
  const locale = getLocaleFromPathname(useLocation().pathname);
  const t = COPY[locale];
  const message = t.errorMessages[error] ?? t.genericError;

  return (
    <CheckoutLayout>
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <div className="w-20 h-20 bg-red-100 rounded flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-red-500">✕</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.paymentFailed}</h1>
        <p className="text-gray-500 leading-relaxed mb-6">{message}</p>

        {orderCode && (
          <p className="text-sm text-gray-400 mb-8">{t.reference} {orderCode}</p>
        )}

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            to="/checkout"
            className="inline-flex items-center justify-center bg-primary text-white font-semibold py-3 px-6 rounded hover:bg-primary/90 transition-colors"
          >
            {t.tryAgain}
          </Link>
          <Link to="/" className="text-gray-500 text-sm underline hover:text-gray-700 transition-colors">
            {t.returnToShop}
          </Link>
        </div>
      </div>
    </CheckoutLayout>
  );
}
