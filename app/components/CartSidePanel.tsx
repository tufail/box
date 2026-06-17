import { useFetcher, Link } from "react-router";
import { useEffect } from "react";
import { X, ShoppingCart, Trash2, Minus, Plus } from "lucide-react";
import type { ActiveOrder, ActiveOrderData, OrderLineItem } from "~/graphql/order";
import { useCart } from "~/context/CartContext";
import { useNotification } from "~/context/NotificationContext";

interface CartSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatPrice(amount: number, currencyCode: string): string {
  return `${currencyCode} ${(amount / 100).toFixed(2)}`;
}

// ─── Per-line controls ────────────────────────────────────────────────────────

interface LineControlsProps {
  line: OrderLineItem;
  currencyCode: string;
  onOrderUpdated: (order: ActiveOrder) => void;
}

function LineControls({ line, currencyCode, onOrderUpdated }: LineControlsProps) {
  const adjustFetcher = useFetcher<{ adjustOrderLine?: { __typename: string; [k: string]: unknown }; error?: string }>();
  const removeFetcher = useFetcher<{ removeOrderLine?: { __typename: string; [k: string]: unknown }; error?: string }>();
  const { notify } = useNotification();

  // Handle adjust response
  useEffect(() => {
    if (adjustFetcher.state !== "idle" || !adjustFetcher.data) return;
    const result = adjustFetcher.data.adjustOrderLine;
    if (!result) return;
    if (result.__typename === "Order") {
      onOrderUpdated(result as unknown as ActiveOrder);
    } else {
      const msg = (result as { message?: string }).message ?? "Could not update quantity";
      notify(msg, "error");
    }
  }, [adjustFetcher.state, adjustFetcher.data]);

  // Handle remove response
  useEffect(() => {
    if (removeFetcher.state !== "idle" || !removeFetcher.data) return;
    const result = removeFetcher.data.removeOrderLine;
    if (!result) return;
    if (result.__typename === "Order") {
      onOrderUpdated(result as unknown as ActiveOrder);
    } else {
      const msg = (result as { message?: string }).message ?? "Could not remove item";
      notify(msg, "error");
    }
  }, [removeFetcher.state, removeFetcher.data]);

  const isAdjusting = adjustFetcher.state !== "idle";
  const isRemoving = removeFetcher.state !== "idle";
  const isBusy = isAdjusting || isRemoving;

  function adjust(newQty: number) {
    adjustFetcher.submit(
      { _intent: "adjust", orderLineId: line.id, quantity: newQty },
      { method: "POST", action: "/api/cart", encType: "application/json" }
    );
  }

  function remove() {
    removeFetcher.submit(
      { _intent: "remove", orderLineId: line.id },
      { method: "POST", action: "/api/cart", encType: "application/json" }
    );
  }

  return (
    <div className="flex items-center justify-between mt-2">
      {/* Qty stepper */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => adjust(line.quantity - 1)}
          disabled={line.quantity <= 1 || isBusy}
          aria-label="Decrease quantity"
          className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Minus size={11} />
        </button>
        <span className="w-6 text-center text-sm font-medium text-gray-900 tabular-nums">
          {isAdjusting ? "…" : line.quantity}
        </span>
        <button
          onClick={() => adjust(line.quantity + 1)}
          disabled={isBusy}
          aria-label="Increase quantity"
          className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Price + delete */}
      <div className="flex flex-col items-end gap-0.5">
        <button
          onClick={remove}
          disabled={isBusy}
          aria-label={`Remove ${line.productVariant.product.name} from cart`}
          className="text-gray-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer self-end"
        >
          {isRemoving ? (
            <span className="block w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
        <span className="text-sm font-bold text-gray-900">
          {formatPrice(line.linePriceWithTax, currencyCode)}
        </span>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function CartSidePanel({ isOpen, onClose }: CartSidePanelProps) {
  const fetcher = useFetcher<ActiveOrderData>();
  const { setCartCount } = useCart();

  useEffect(() => {
    if (isOpen) fetcher.load("/api/cart");
  }, [isOpen]);

  // Sync cart count badge when panel data arrives
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.activeOrder) {
      setCartCount(fetcher.data.activeOrder.totalQuantity);
    }
    if (fetcher.state === "idle" && fetcher.data?.activeOrder === null) {
      setCartCount(0);
    }
  }, [fetcher.state, fetcher.data]);

  // Called by LineControls after a successful mutation to refresh local data
  function handleOrderUpdated(updated: ActiveOrder) {
    setCartCount(updated.totalQuantity);
    // Patch the fetcher data in-place by reloading so we always show fresh server state
    fetcher.load("/api/cart");
  }

  const order = fetcher.data?.activeOrder ?? null;
  const isLoading = fetcher.state === "loading";
  // First load = no data yet; subsequent reloads already have data to show beneath
  const isFirstLoad = isLoading && !fetcher.data;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart size={20} />
            Your Cart
            {order && order.totalQuantity > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({order.totalQuantity} {order.totalQuantity === 1 ? "item" : "items"})
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer p-1 rounded"
            aria-label="Close cart"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-5 py-4">
          {/* Overlay spinner shown while reloading existing data */}
          {isLoading && !isFirstLoad && (
            <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center pointer-events-none">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {isFirstLoad ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !order || order.lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
              <ShoppingCart size={56} strokeWidth={1} className="opacity-30" />
              <p className="text-lg font-medium text-gray-500">Your cart is empty</p>
              <button
                onClick={onClose}
                className="text-primary hover:underline text-sm cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-5">
              {order.lines.map((line) => {
                const image =
                  line.featuredAsset?.preview ??
                  line.productVariant.product.featuredAsset?.preview ??
                  null;
                return (
                  <li key={line.id} className="flex gap-3 items-start">
                    <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden shrink-0">
                      {image ? (
                        <img
                          src={image}
                          alt={line.productVariant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-bold">
                          {line.productVariant.product.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${line.productVariant.product.slug}`}
                        onClick={onClose}
                        className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2 leading-snug"
                      >
                        {line.productVariant.product.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">{line.productVariant.name}</p>
                      <LineControls
                        line={line}
                        currencyCode={order.currencyCode}
                        onOrderUpdated={handleOrderUpdated}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {order && order.lines.length > 0 && (
          <div className="border-t border-gray-200 px-5 py-4 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">
                {formatPrice(order.subTotalWithTax, order.currencyCode)}
              </span>
            </div>
            {order.shippingWithTax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">
                  {formatPrice(order.shippingWithTax, order.currencyCode)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3">
              <span>Total</span>
              <span>{formatPrice(order.totalWithTax, order.currencyCode)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={onClose}
              className="bg-primary text-white text-center font-semibold py-3 px-6 rounded-full hover:bg-green-700 transition-colors"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={onClose}
              className="text-sm text-center text-primary hover:underline cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
