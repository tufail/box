import { redirect, Link } from "react-router";
import type { Route } from "./+types/account.orders.$id";
import { graphqlRequest } from "workers/graphqlClient";
import {
  GET_CUSTOMER_PROFILE_QUERY,
  GET_ORDER_DETAIL_QUERY,
  type CustomerProfileData,
  type CustomerOrderDetailData,
  type CustomerOrderDetail,
} from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { Package, MapPin, CreditCard, ChevronLeft } from "lucide-react";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const id = params.id;
  const vendureBase = (env.VENDURE_SHOP_API ?? "http://localhost:3000/shop-api").replace(
    "/shop-api",
    ""
  );

  const [profileResult, orderResult] = await Promise.allSettled([
    graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request }),
    graphqlRequest<CustomerOrderDetailData>(env, GET_ORDER_DETAIL_QUERY, { id }, { request }),
  ]);

  if (
    profileResult.status === "rejected" ||
    !profileResult.value.data.activeCustomer
  ) {
    return redirect("/");
  }

  const order =
    orderResult.status === "fulfilled" ? orderResult.value.data.order : null;

  if (!order) return redirect("/account/orders");

  return {
    customer: profileResult.value.data.activeCustomer,
    order,
    vendureBase,
  };
}

export function meta({ data }: Route.MetaArgs) {
  const code = data?.order?.code ?? "";
  return [
    { title: `Order #${code} | PHQ` },
    { name: "robots", content: "noindex" },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORDER_STEPS = ["Placed", "Confirmed", "Shipped", "Delivered"] as const;

const STATE_STEP_MAP: Record<string, number> = {
  AddingItems: 0,
  ArrangingPayment: 0,
  PaymentAuthorized: 1,
  PaymentSettled: 1,
  PartiallyShipped: 2,
  Shipped: 2,
  PartiallyDelivered: 3,
  Delivered: 3,
  Cancelled: -1,
};

function getStep(state: string) {
  return STATE_STEP_MAP[state] ?? 0;
}

function formatPrice(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-QA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stateBadge(state: string) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-100 text-emerald-700",
    Shipped: "bg-blue-100 text-blue-700",
    Cancelled: "bg-red-100 text-red-700",
    PaymentSettled: "bg-green-100 text-green-700",
    PaymentAuthorized: "bg-blue-100 text-blue-700",
    ArrangingPayment: "bg-amber-100 text-amber-700",
  };
  return map[state] ?? "bg-gray-100 text-gray-600";
}

function stateLabel(state: string) {
  const map: Record<string, string> = {
    AddingItems: "Draft",
    ArrangingPayment: "Pending Payment",
    PaymentAuthorized: "Processing",
    PaymentSettled: "Confirmed",
    PartiallyShipped: "Partially Shipped",
    Shipped: "Shipped",
    PartiallyDelivered: "Partially Delivered",
    Delivered: "Delivered",
    Modifying: "Modifying",
    ArrangingAdditionalPayment: "Payment Required",
    Cancelled: "Cancelled",
  };
  return map[state] ?? state;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusTracker({ state }: { state: string }) {
  const isCancelled = state === "Cancelled";
  const currentStep = getStep(state);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-red-700">
          This order has been cancelled.
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 mx-8">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${(currentStep / (ORDER_STEPS.length - 1)) * 100}%` }}
        />
      </div>

      <div className="flex justify-between relative">
        {ORDER_STEPS.map((step, idx) => {
          const done = idx <= currentStep;
          return (
            <div key={step} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-white transition-colors ${
                  done
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-gray-300 bg-white"
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 fill-white">
                    <path d="M1 6l3.5 3.5L11 2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </svg>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  done ? "text-emerald-700" : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderItems({
  order,
  vendureBase,
}: {
  order: CustomerOrderDetail;
  vendureBase: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package size={18} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900">
          Order Items ({order.lines.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {order.lines.map((line) => {
          const preview =
            line.featuredAsset?.preview ??
            line.productVariant.product.featuredAsset?.preview;
          return (
            <div key={line.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              {/* Image */}
              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                {preview ? (
                  <img
                    src={`${vendureBase}${preview}?preset=thumb`}
                    alt={line.productVariant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={20} className="text-gray-300" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${line.productVariant.product.slug}`}
                  className="font-medium text-gray-900 hover:text-emerald-700 transition-colors line-clamp-1"
                >
                  {line.productVariant.product.name}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">{line.productVariant.name}</p>
                {line.productVariant.sku && (
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {line.productVariant.sku}</p>
                )}
              </div>

              {/* Qty + price */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatPrice(line.linePriceWithTax, order.currencyCode)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatPrice(line.unitPriceWithTax, order.currencyCode)} × {line.quantity}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price summary */}
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(order.subTotalWithTax, order.currencyCode)}</span>
        </div>
        {order.shippingWithTax > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Shipping</span>
            <span>{formatPrice(order.shippingWithTax, order.currencyCode)}</span>
          </div>
        )}
        {order.discounts.map((d, i) => (
          <div key={i} className="flex justify-between text-sm text-emerald-600">
            <span>{d.description}</span>
            <span>-{formatPrice(d.amountWithTax, order.currencyCode)}</span>
          </div>
        ))}
        <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
          <span>Total</span>
          <span>{formatPrice(order.totalWithTax, order.currencyCode)}</span>
        </div>
      </div>
    </div>
  );
}

function ShippingInfo({ order }: { order: CustomerOrderDetail }) {
  const addr = order.shippingAddress;
  if (!addr) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={18} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900">Shipping Address</h3>
      </div>
      <div className="text-sm text-gray-700 space-y-0.5">
        <p className="font-medium">{addr.fullName}</p>
        <p>{addr.streetLine1}</p>
        {addr.streetLine2 && <p>{addr.streetLine2}</p>}
        <p>
          {addr.city}
          {addr.province ? `, ${addr.province}` : ""}
          {addr.postalCode ? ` ${addr.postalCode}` : ""}
        </p>
        <p>{addr.country}</p>
        {addr.phoneNumber && (
          <p className="text-gray-500 pt-1">{addr.phoneNumber}</p>
        )}
      </div>
    </div>
  );
}

function PaymentInfo({ order }: { order: CustomerOrderDetail }) {
  if (!order.payments.length) return null;

  const paymentStateColor: Record<string, string> = {
    Settled: "text-emerald-700 bg-emerald-50",
    Authorized: "text-blue-700 bg-blue-50",
    Declined: "text-red-700 bg-red-50",
    Cancelled: "text-gray-700 bg-gray-100",
    Error: "text-red-700 bg-red-50",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard size={18} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900">Payment</h3>
      </div>
      <div className="space-y-3">
        {order.payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-gray-900 capitalize">
                {p.method.replace(/-/g, " ")}
              </p>
              <p className="text-gray-500">{formatPrice(p.amount, order.currencyCode)}</p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                paymentStateColor[p.state] ?? "text-gray-600 bg-gray-100"
              }`}
            >
              {p.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage({ loaderData }: Route.ComponentProps) {
  const { customer, order, vendureBase } = loaderData;

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <Link
                to="/account/orders"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors mb-3"
              >
                <ChevronLeft size={15} /> Back to Orders
              </Link>
              <h2 className="text-lg font-semibold text-gray-900">
                Order #{order.code}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.orderPlacedAt)}</p>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full shrink-0 ${stateBadge(order.state)}`}
            >
              {stateLabel(order.state)}
            </span>
          </div>

          <StatusTracker state={order.state} />
        </div>

        {/* Items */}
        <OrderItems order={order} vendureBase={vendureBase} />

        {/* Shipping + Payment (side by side on wider screens) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ShippingInfo order={order} />
          <PaymentInfo order={order} />
        </div>
      </div>
    </AccountLayout>
  );
}
