import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/checkout.failed";
import CheckoutLayout from "~/layouts/CheckoutLayout";

export function meta() {
  return [
    { title: "Payment Failed — PHQ" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

const ERROR_MESSAGES: Record<string, string> = {
  payment_declined:
    "Your payment was declined by the bank. Please try a different card or contact your bank.",
  processing_error: "A technical error occurred while processing your payment.",
  invalid_signature: "Payment verification failed. Please try again.",
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return {
    orderCode: url.searchParams.get("orderCode") ?? "",
    error: url.searchParams.get("error") ?? "processing_error",
  };
}

export default function CheckoutFailedPage() {
  const { orderCode, error } = useLoaderData<typeof loader>();
  const message =
    ERROR_MESSAGES[error] ?? "Your payment could not be completed. Please try again.";

  return (
    <CheckoutLayout>
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        <div className="w-20 h-20 bg-red-100 rounded flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-red-500">✕</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-500 leading-relaxed mb-6">{message}</p>

        {orderCode && (
          <p className="text-sm text-gray-400 mb-8">Reference: {orderCode}</p>
        )}

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            to="/checkout"
            className="inline-flex items-center justify-center bg-primary text-white font-semibold py-3 px-6 rounded hover:bg-primary/90 transition-colors"
          >
            Try Again
          </Link>
          <Link to="/" className="text-gray-500 text-sm underline hover:text-gray-700 transition-colors">
            Return to Shop
          </Link>
        </div>
      </div>
    </CheckoutLayout>
  );
}
