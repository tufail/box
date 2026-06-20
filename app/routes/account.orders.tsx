import { redirect, Link } from "react-router";
import type { Route } from "./+types/account.orders";
import { graphqlRequest } from "workers/graphqlClient";
import {
  GET_CUSTOMER_PROFILE_QUERY,
  GET_CUSTOMER_ORDERS_QUERY,
  type CustomerProfileData,
  type CustomerOrdersData,
  type CustomerOrder,
} from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";

const ORDERS_PER_PAGE = 10;

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const skip = (page - 1) * ORDERS_PER_PAGE;
  const vendureBase = (env.VENDURE_SHOP_API ?? "http://localhost:3000/shop-api").replace(
    "/shop-api",
    ""
  );

  const [profileResult, ordersResult] = await Promise.allSettled([
    graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request }),
    graphqlRequest<CustomerOrdersData>(
      env,
      GET_CUSTOMER_ORDERS_QUERY,
      { skip, take: ORDERS_PER_PAGE },
      { request }
    ),
  ]);

  if (
    profileResult.status === "rejected" ||
    !profileResult.value.data.activeCustomer
  ) {
    return redirect("/");
  }

  const orders =
    ordersResult.status === "fulfilled"
      ? ordersResult.value.data.activeCustomer?.orders ?? { items: [], totalItems: 0 }
      : { items: [], totalItems: 0 };

  return {
    customer: profileResult.value.data.activeCustomer,
    orders: orders.items,
    totalItems: orders.totalItems,
    page,
    totalPages: Math.ceil(orders.totalItems / ORDERS_PER_PAGE),
    vendureBase,
  };
}

export function meta() {
  return [{ title: "My Orders | PHQ" }, { name: "robots", content: "noindex" }];
}

const ORDER_STATES: Record<string, { label: string; color: string }> = {
  AddingItems: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  ArrangingPayment: { label: "Pending Payment", color: "bg-amber-100 text-amber-700" },
  PaymentAuthorized: { label: "Processing", color: "bg-blue-100 text-blue-700" },
  PaymentSettled: { label: "Confirmed", color: "bg-green-100 text-green-700" },
  PartiallyShipped: { label: "Partially Shipped", color: "bg-indigo-100 text-indigo-700" },
  Shipped: { label: "Shipped", color: "bg-blue-100 text-blue-700" },
  PartiallyDelivered: { label: "Partially Delivered", color: "bg-teal-100 text-teal-700" },
  Delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-700" },
  Modifying: { label: "Modifying", color: "bg-amber-100 text-amber-700" },
  ArrangingAdditionalPayment: {
    label: "Payment Required",
    color: "bg-red-100 text-red-700",
  },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

function orderState(state: string) {
  return ORDER_STATES[state] ?? { label: state, color: "bg-gray-100 text-gray-600" };
}

function formatPrice(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-QA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderCard({ order, vendureBase }: { order: CustomerOrder; vendureBase: string }) {
  const { label, color } = orderState(order.state);
  const previewImages = order.lines
    .slice(0, 4)
    .map((l) => l.featuredAsset?.preview ?? l.productVariant.product.slug)
    .filter(Boolean);

  const itemCount = order.lines.reduce((s, l) => s + l.quantity, 0);
  const firstProduct = order.lines[0]?.productVariant.product.name ?? "Order";

  return (
    <Link
      to={`/account/orders/${order.id}`}
      className="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 group"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: images + info */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Stacked product thumbnails */}
          <div className="flex shrink-0">
            {previewImages.slice(0, 3).map((preview, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-xl border-2 border-white overflow-hidden bg-gray-100"
                style={{ marginLeft: i > 0 ? "-14px" : 0, zIndex: 3 - i }}
              >
                {preview.startsWith("/") ? (
                  <img
                    src={`${vendureBase}${preview}?preset=thumb`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Package size={20} className="text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {firstProduct}
              {order.lines.length > 1 && (
                <span className="text-gray-400 font-normal ml-1">
                  +{order.lines.length - 1} more
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Order #{order.code} · {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.orderPlacedAt)}</p>
          </div>
        </div>

        {/* Right: status + total + arrow */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${color}`}>
            {label}
          </span>
          <p className="text-sm font-semibold text-gray-900">
            {formatPrice(order.totalWithTax, order.currencyCode)}
          </p>
          <ChevronRight
            size={16}
            className="text-gray-300 group-hover:text-emerald-600 transition-colors"
          />
        </div>
      </div>
    </Link>
  );
}

export default function OrdersPage({ loaderData }: Route.ComponentProps) {
  const { customer, orders, totalItems, page, totalPages, vendureBase } = loaderData;

  return (
    <AccountLayout customer={customer}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">My Orders</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {totalItems} order{totalItems !== 1 ? "s" : ""} placed
              </p>
            </div>
            <ShoppingBag size={24} className="text-gray-300" />
          </div>
        </div>

        {/* Order list */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <ShoppingBag size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="font-semibold text-gray-900 mb-1">No orders yet</p>
            <p className="text-sm text-gray-500 mb-6">
              When you place an order, it will appear here.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} vendureBase={vendureBase} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {page > 1 && (
              <Link
                to={`/account/orders?page=${page - 1}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
              >
                ← Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                to={`/account/orders?page=${page + 1}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
