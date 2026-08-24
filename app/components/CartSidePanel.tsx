import { useFetcher, Link, useLocation } from "react-router";
import { useEffect, useRef } from "react";
import { X, ShoppingCart, Trash2, Minus, Plus, RotateCcw, AlertTriangle, Package, Repeat } from "lucide-react";
import type { ActiveOrder, ActiveOrderData, OrderLineItem } from "~/graphql/order";
import type { BundleGroup } from "~/graphql/bundle";
import { formatBundleDiscount } from "~/graphql/bundle";
import { useCart } from "~/context/CartContext";
import { useNotification } from "~/context/NotificationContext";
import { getLocaleFromPathname, type Locale } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";
import { useFocusTrap } from "~/hooks/useFocusTrap";

interface CartSidePanelProps {
	isOpen: boolean;
	onClose: () => void;
}

// "sizeSpecifications" is free text (e.g. "76 Servings", "2kg - 60 Servings") -- pulls
// the number right before "serving(s)" rather than assuming a fixed format, since it's
// phrased slightly differently across products. Returns null (hiding the price-per-
// serving line entirely) for anything that doesn't match, e.g. non-serving-based products.
function parseServings(sizeSpecifications: string | null | undefined): number | null {
	const match = sizeSpecifications?.match(/(\d+)\s*servings?/i);
	return match ? Number(match[1]) : null;
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const CART_COPY = {
	en: {
		decreaseQuantity: "Decrease quantity",
		increaseQuantity: "Increase quantity",
		removeFromCart: (name: string) => `Remove ${name} from cart`,
		couldNotUpdateQuantity: "Could not update quantity",
		missingVariants: "Missing",
		restoreToGet: (label: string) => `— restore to get ${label}`,
		restored: (name: string) => `${name} restored ✓`,
		couldNotRestoreBundle: "Could not restore bundle",
		restore: "Restore",
		shoppingCart: "Shopping cart",
		yourCart: "Your Cart",
		item: "item",
		items: "items",
		closeCart: "Close cart",
		yourCartIsEmpty: "Your cart is empty",
		continueShopping: "Continue Shopping",
		youSave: "You save:",
		subscribeAndSave: "Subscribe & Save",
		saveAmount: (amount: string) => `Save ${amount}`,
		subtotal: "Subtotal",
		total: "Total",
		proceedToCheckout: "Proceed to Checkout",
		perServing: (price: string) => `${price}/serving`,
	},
	ar: {
		decreaseQuantity: "إنقاص الكمية",
		increaseQuantity: "زيادة الكمية",
		removeFromCart: (name: string) => `إزالة ${name} من السلة`,
		couldNotUpdateQuantity: "تعذّر تحديث الكمية",
		missingVariants: "مفقود",
		restoreToGet: (label: string) => `— استعده للحصول على ${label}`,
		restored: (name: string) => `تمت استعادة ${name} ✓`,
		couldNotRestoreBundle: "تعذّرت استعادة الباقة",
		restore: "استعادة",
		shoppingCart: "سلة التسوق",
		yourCart: "سلتك",
		item: "عنصر",
		items: "عناصر",
		closeCart: "إغلاق السلة",
		yourCartIsEmpty: "سلتك فارغة",
		continueShopping: "متابعة التسوق",
		youSave: "توفّر:",
		subscribeAndSave: "اشترك ووفّر",
		saveAmount: (amount: string) => `وفّر ${amount}`,
		subtotal: "المجموع الفرعي",
		total: "الإجمالي",
		proceedToCheckout: "المتابعة إلى الدفع",
		perServing: (price: string) => `${price}/حصة`,
	},
} as const;

function itemsCountLabel(n: number, locale: Locale): string {
	if (locale === "en") return `${n} ${n === 1 ? CART_COPY.en.item : CART_COPY.en.items}`;
	if (n === 1) return "عنصر واحد";
	if (n === 2) return "عنصران";
	if (n >= 3 && n <= 10) return `${n} عناصر`;
	return `${n} عنصرًا`;
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
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CART_COPY[locale];

	useEffect(() => {
		if (adjustFetcher.state !== "idle" || !adjustFetcher.data) return;
		const result = adjustFetcher.data.adjustOrderLine;
		if (!result) return;
		if (result.__typename === "Order") {
			onCartUpdated();
		} else {
			notify((result as { message?: string }).message ?? t.couldNotUpdateQuantity, "error");
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
	const servings = parseServings(line.productVariant.customFields?.sizeSpecifications);
	const pricePerServing = servings ? line.unitPriceWithTax / servings : null;

	function adjust(newQty: number) {
		adjustFetcher.submit({ _intent: "adjust", orderLineId: line.id, quantity: newQty }, { method: "POST", action: "/api/cart", encType: "application/json" });
	}

	function remove() {
		removeFetcher.submit({ _intent: "remove", lineId: line.id }, { method: "POST", action: "/api/cart", encType: "application/json" });
	}

	return (
		<div className="flex items-center justify-between mt-2">
			<div className="flex flex-col items-start gap-1">
				<div className="flex items-center gap-1">
					<button onClick={() => adjust(line.quantity - 1)} disabled={line.quantity <= 1 || isBusy} aria-label={t.decreaseQuantity} className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
						<Minus size={11} />
					</button>
					<span className="w-6 text-center text-sm font-medium text-gray-900 tabular-nums">{adjustFetcher.state !== "idle" ? "…" : line.quantity}</span>
					<button onClick={() => adjust(line.quantity + 1)} disabled={isBusy} aria-label={t.increaseQuantity} className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
						<Plus size={11} />
					</button>
				</div>
				{pricePerServing != null && <span className="text-[10px] text-gray-400">{t.perServing(formatPrice(pricePerServing, currencyCode, locale))}</span>}
			</div>
			<div className="flex flex-col items-end gap-0.5">
				<button onClick={remove} disabled={isBusy} aria-label={t.removeFromCart(line.productVariant.product.name)} className="text-gray-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer self-end">
					{removeFetcher.state !== "idle" ? <span className="block w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" /> : <Trash2 size={14} />}
				</button>
				{line.discountedLinePriceWithTax < line.linePriceWithTax ? (
					<>
						<span className="text-xs text-gray-400 line-through">{formatPrice(line.linePriceWithTax, currencyCode, locale)}</span>
						<span className="text-sm font-bold text-green-600">{formatPrice(line.discountedLinePriceWithTax, currencyCode, locale)}</span>
					</>
				) : (
					<span className="text-sm font-bold text-gray-900">{formatPrice(line.linePriceWithTax, currencyCode, locale)}</span>
				)}
			</div>
		</div>
	);
}

// ─── Broken bundle restore banner ────────────────────────────────────────────

function BrokenBundleBanner({ bundle, onRestored }: { bundle: BundleGroup; onRestored: () => void }) {
	const restoreFetcher = useFetcher<{ restoreBundle?: { status: string }; error?: string }>();
	const { notify } = useNotification();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CART_COPY[locale];
	const discountLabel = formatBundleDiscount(bundle.discountType, bundle.discountValue, locale);

	useEffect(() => {
		if (restoreFetcher.state !== "idle" || !restoreFetcher.data) return;
		if (restoreFetcher.data.restoreBundle) {
			notify(t.restored(bundle.bundleName), "success");
			onRestored();
		} else if (restoreFetcher.data.error) {
			notify(t.couldNotRestoreBundle, "error");
		}
	}, [restoreFetcher.state, restoreFetcher.data]);

	return (
		<div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
			<AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
			<div className="flex-1 min-w-0">
				<p className="text-xs font-semibold text-amber-800">{bundle.bundleName}</p>
				<p className="text-[11px] text-amber-600 mt-0.5">
					{t.missingVariants}: {bundle.missingVariants.map((v) => v.name).join(", ")} {t.restoreToGet(discountLabel)}
				</p>
			</div>
			<button onClick={() => restoreFetcher.submit({ _intent: "restoreBundle", bundleGroupId: bundle.bundleGroupId }, { method: "POST", action: "/api/bundle", encType: "application/json" })} disabled={restoreFetcher.state !== "idle"} className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0 disabled:opacity-50">
				{restoreFetcher.state !== "idle" ? <span className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" /> : <RotateCcw size={11} />}
				{t.restore}
			</button>
		</div>
	);
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function CartSidePanel({ isOpen, onClose }: CartSidePanelProps) {
	const fetcher = useFetcher<ActiveOrderData & { bundleGroups?: BundleGroup[] }>();
	const { setCartCount, cartRefreshKey } = useCart();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CART_COPY[locale];
	const panelRef = useRef<HTMLDivElement>(null);
	useFocusTrap(panelRef, isOpen, onClose);

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
	const totalDiscounts = (order?.discounts ?? []).filter((d) => d.amountWithTax < 0).reduce((sum, d) => sum + Math.abs(d.amountWithTax), 0);

	return (
		<>
			{/* Backdrop */}
			<div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} aria-hidden="true" />

			{/* Panel */}
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-hidden={!isOpen}
				aria-label={t.shoppingCart}
				tabIndex={-1}
				className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-xl flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
					<h2 className="text-lg font-bold flex items-center gap-2">
						<ShoppingCart size={20} />
						{t.yourCart}
						{order && order.totalQuantity > 0 && (
							<span className="text-sm font-normal text-gray-500">({itemsCountLabel(order.totalQuantity, locale)})</span>
						)}
					</h2>
					<button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors cursor-pointer p-1 rounded" aria-label={t.closeCart}>
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
							<p className="text-lg font-medium text-gray-500">{t.yourCartIsEmpty}</p>
							<button onClick={onClose} className="text-primary hover:underline text-sm cursor-pointer">
								{t.continueShopping}
							</button>
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

							{/* Savings notice */}
							{totalDiscounts > 0 && (
								<div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
									<Package size={14} className="text-green-600 flex-shrink-0" />
									<span className="text-xs text-green-700 font-medium">
										{t.youSave} <strong>{formatPrice(totalDiscounts, order?.currencyCode ?? "QAR", locale)}</strong>
									</span>
								</div>
							)}

							<ul className="flex flex-col gap-5">
								{order.lines.map((line) => {
									const image = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview ?? null;
									return (
										<li key={line.id} className="flex gap-3 items-start">
											<div className="w-20 h-20 bg-gray-100 rounded overflow-hidden shrink-0">{image ? <img src={image} alt={line.productVariant.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-bold">{line.productVariant.product.name[0]}</div>}</div>
											<div className="flex-1 min-w-0">
												<Link to={`/products/${line.productVariant.customFields?.slug || line.productVariant.product.slug}`} onClick={onClose} className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2 leading-snug">
													{line.productVariant.name}
												</Link>
												{line.customFields?.subscriptionPlanId && (
													<div className="flex items-center gap-1.5 flex-wrap mt-1">
														<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
															<Repeat size={10} /> {t.subscribeAndSave}
														</span>
														{line.productVariant.priceWithTax > line.unitPriceWithTax && (
															<span className="text-[10px] font-semibold text-orange-600">
																{t.saveAmount(formatPrice((line.productVariant.priceWithTax - line.unitPriceWithTax) * line.quantity, order.currencyCode, locale))}
															</span>
														)}
													</div>
												)}
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
						{/* {totalDiscounts > 0 && (
							<div className="flex justify-between text-sm text-green-600">
								<span className="flex items-center gap-1 font-medium">
									<Package size={13} className="flex-shrink-0" />
									Savings
								</span>
								<span className="font-bold">−{formatPrice(totalDiscounts, order.currencyCode)}</span>
							</div>
						)} */}
						<div className="flex justify-between text-sm">
							<span className="text-gray-600">{t.subtotal}</span>
							<span className="font-semibold">{formatPrice(order.subTotalWithTax, order.currencyCode, locale)}</span>
						</div>

						<div className="flex justify-between text-base font-bold border-t border-gray-200 pt-3">
							<span>{t.total}</span>
							<span>{formatPrice(order.totalWithTax, order.currencyCode, locale)}</span>
						</div>
						<Link to="/checkout" onClick={onClose} className="bg-[#3b8578] hover:bg-[#2e6b61] text-white text-center font-semibold py-3 px-6 rounded-full transition-colors">
							{t.proceedToCheckout}
						</Link>
						<button onClick={onClose} className="text-sm text-center text-primary hover:underline cursor-pointer">
							{t.continueShopping}
						</button>
					</div>
				)}
			</div>
		</>
	);
}
