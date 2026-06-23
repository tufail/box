import { useFetcher, Link } from "react-router";
import { useEffect } from "react";
import { X, ShoppingCart, Trash2, Minus, Plus, RotateCcw, AlertTriangle, Package } from "lucide-react";
import type { ActiveOrder, ActiveOrderData, OrderLineItem } from "~/graphql/order";
import type { BundleGroup } from "~/graphql/bundle";
import { formatBundleDiscount } from "~/graphql/bundle";
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
  onCartUpdated: () => void;
}

function LineControls({ line, currencyCode, onCartUpdated }: LineControlsProps) {
  const adjustFetcher = useFetcher<{ adjustOrderLine?: { __typename: string; [k: string]: unknown }; error?: string }>();
  const removeFetcher = useFetcher<{ removeCartItem?: { success: boolean }; error?: string } | null>();
  const { notify } = useNotification();

  useEffect(() => {
    if (adjustFetcher.state !== "idle" || !adjustFetcher.data) return;
    const result = adjustFetcher.data.adjustOrderLine;
    if (!result) return;
    if (result.__typename === "Order") {
      onCartUpdated();
    } else {
      notify((result as { message?: string }).message ?? "Could not update quantity", "error");
    }
  }, [adjustFetcher.state, adjustFetcher.data]);

  useEffect(() => {
    if (removeFetcher.state !== "idle" || !removeFetcher.data) return;
    if (removeFetcher.data?.error) {
      notify(removeFetcher.data.error, "error");
      return;
    }
    onCartUpdated();
  }, [removeFetcher.state, removeFetcher.data]);

  const isBusy = adjustFetcher.state !== "idle" || removeFetcher.state !== "idle";

  function adjust(newQty: number) {
    adjustFetcher.submit(
      { _intent: "adjust", orderLineId: line.id, quantity: newQty },
      { method: "POST", action: "/api/cart", encType: "application/json" }
    );
  }

  function remove() {
    removeFetcher.submit(
      { _intent: "remove", lineId: line.id },
      { method: "POST", action: "/api/cart", encType: "application/json" }
    );
  }

  return (
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center gap-1">
        <button onClick={() => adjust(line.quantity - 1)} disabled={line.quantity <= 1 || isBusy} aria-label="Decrease quantity"
          className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <Minus size={11} />
        </button>
        <span className="w-6 text-center text-sm font-medium text-gray-900 tabular-nums">
          {adjustFetcher.state !== "idle" ? "…" : line.quantity}
        </span>
        <button onClick={() => adjust(line.quantity + 1)} disabled={isBusy} aria-label="Increase quantity"
          className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <Plus size={11} />
        </button>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <button onClick={remove} disabled={isBusy} aria-label={`Remove ${line.productVariant.product.name} from cart`}
          className="text-gray-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer self-end">
          {removeFetcher.state !== "idle"
            ? <span className="block w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            : <Trash2 size={14} />
          }
        </button>
        <span className="text-sm font-bold text-gray-900">{formatPrice(line.linePriceWithTax, currencyCode)}</span>
      </div>
    </div>
  );
}

// ─── Broken bundle restore banner ────────────────────────────────────────────

function BrokenBundleBanner({ bundle, onRestored }: { bundle: BundleGroup; onRestored: () => void }) {
  const restoreFetcher = useFetcher<{ restoreBundle?: { status: string }; error?: string }>();
  const { notify } = useNotification();
  const discountLabel = formatBundleDiscount(bundle.discountType, bundle.discountValue);

  useEffect(() => {
    if (restoreFetcher.state !== "idle" || !restoreFetcher.data) return;
    if (restoreFetcher.data.restoreBundle) {
      notify(`${bundle.bundleName} restored ✓`, "success");
      onRestored();
    } else if (restoreFetcher.data.error) {
      notify("Could not restore bundle", "error");
    }
  }, [restoreFetcher.state, restoreFetcher.data]);

  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">{bundle.bundleName}</p>
        <p className="text-[11px] text-amber-600 mt-0.5">
          Missing: {bundle.missingVariants.map((v) => v.name).join(", ")} — restore to get {discountLabel}
        </p>
      </div>
      <button
        onClick={() => restoreFetcher.submit(
          { _intent: "restoreBundle", bundleGroupId: bundle.bundleGroupId },
          { method: "POST", action: "/api/bundle", encType: "application/json" }
        )}
        disabled={restoreFetcher.state !== "idle"}
        className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0 disabled:opacity-50"
      >
        {restoreFetcher.state !== "idle"
          ? <span className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          : <RotateCcw size={11} />
        }
        Restore
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function CartSidePanel({ isOpen, onClose }: CartSidePanelProps) {
  const fetcher = useFetcher<ActiveOrderData & { bundleGroups?: BundleGroup[] }>();
  const { setCartCount, cartRefreshKey } = useCart();

  useEffect(() => {
    if (isOpen) fetcher.load("/api/cart");
  }, [isOpen, cartRefreshKey]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.activeOrder) {
      setCartCount(fetcher.data.activeOrder.totalQuantity);
    }
    if (fetcher.state === "idle" && fetcher.data?.activeOrder === null) {
      setCartCount(0);
    }
  }, [fetcher.state, fetcher.data]);

  function handleCartUpdated() {
    fetcher.load("/api/cart");
  }

  const order = fetcher.data?.activeOrder ?? null;
  const bundleGroups: BundleGroup[] = fetcher.data?.bundleGroups ?? [];
  const isLoading = fetcher.state === "loading";
  const isFirstLoad = isLoading && !fetcher.data;

  const brokenBundles = bundleGroups.filter((bg) => bg.status === "BROKEN" && bg.missingVariants.length > 0);
  const totalBundleSavings = bundleGroups
    .filter((bg) => bg.status === "COMPLETE" && bg.discountAmount > 0)
    .reduce((sum, bg) => sum + bg.discountAmount, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-xl flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer p-1 rounded" aria-label="Close cart">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-5 py-4">
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
              <button onClick={onClose} className="text-primary hover:underline text-sm cursor-pointer">Continue Shopping</button>
            </div>
          ) : (
            <>
              {/* Broken bundle restore banners */}
              {brokenBundles.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {brokenBundles.map((bg) => (
                    <BrokenBundleBanner key={bg.bundleGroupId} bundle={bg} onRestored={handleCartUpdated} />
                  ))}
                </div>
              )}

              {/* Complete bundle savings notice */}
              {totalBundleSavings > 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
                  <Package size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-xs text-green-700 font-medium">
                    Bundle saving: <strong>{formatPrice(totalBundleSavings, order?.currencyCode ?? "QAR")}</strong>
                  </span>
                </div>
              )}

            <ul className="flex flex-col gap-5">
              {order.lines.map((line) => {
                const image = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview ?? null;
                return (
                  <li key={line.id} className="flex gap-3 items-start">
                    <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden shrink-0">
                      {image
                        ? <img src={image} alt={line.productVariant.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-bold">{line.productVariant.product.name[0]}</div>
                      }
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
                      <LineControls line={line} currencyCode={order.currencyCode} onCartUpdated={handleCartUpdated} />
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </div>

        {/* Footer */}
        {order && order.lines.length > 0 && (
          <div className="border-t border-gray-200 px-5 py-4 flex flex-col gap-3">
            {totalBundleSavings > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1 font-medium">
                  <Package size={13} className="flex-shrink-0" />
                  Bundle savings
                </span>
                <span className="font-bold">−{formatPrice(totalBundleSavings, order.currencyCode)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{formatPrice(order.subTotalWithTax, order.currencyCode)}</span>
            </div>
            {order.shippingWithTax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">{formatPrice(order.shippingWithTax, order.currencyCode)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3">
              <span>Total</span>
              <span>{formatPrice(order.totalWithTax, order.currencyCode)}</span>
            </div>
            <Link to="/checkout" onClick={onClose} className="bg-primary text-white text-center font-semibold py-3 px-6 rounded hover:bg-primary/90 transition-colors">
              Proceed to Checkout
            </Link>
            <button onClick={onClose} className="text-sm text-center text-primary hover:underline cursor-pointer">Continue Shopping</button>
          </div>
        )}
      </div>
    </>
  );
}
