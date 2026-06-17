import { Link, useSearchParams } from "react-router";
import { Check, ShoppingBag, Package } from "lucide-react";
import CheckoutLayout from "~/layouts/CheckoutLayout";

export function meta() {
  return [
    { title: "Order Confirmed — PHQ" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get("code");

  return (
    <CheckoutLayout>
      <div className="max-w-lg mx-auto text-center py-12 px-4">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-500" strokeWidth={2.5} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-500 leading-relaxed mb-8">
          Thank you for your purchase. We've received your order and will begin
          processing it shortly. You'll receive a confirmation email with your order
          details.
        </p>

        {orderCode && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <Package size={20} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Order Details
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Order Number</span>
              <span className="font-bold text-gray-900 font-mono text-lg">
                {orderCode}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ShoppingBag size={18} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </CheckoutLayout>
  );
}
