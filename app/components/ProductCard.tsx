import Link from "~/components/LocaleLink";
import { useEffect, useState } from "react";
import { useFetcher, useLocation } from "react-router";
import AddToCartButton from "./AddToCartButton";
import type { SearchProductItem } from "~/graphql/product";
import type { AddToCartResult, AddToCartOrderResult, InsufficientStockError } from "~/graphql/order";
import { getAddToCartErrorMessage } from "~/graphql/order";
import VendureImage from "./VendureImage";
import { TrendingUp, Star } from "lucide-react";
import { getLocaleFromPathname } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";
import { useCart } from "~/context/CartContext";
import { useNotification } from "~/context/NotificationContext";
import { useIsDesktop } from "~/hooks/useIsDesktop";

type Message = { text: string; icon: React.ReactNode };

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const CARD_COPY = {
	en: {
		soldOut: "SOLD OUT",
		off: (percent: number) => `${percent}% OFF`,
		soldLast30Days: (n: string) => `${n}+ sold in last 30 days`,
		rankInCollection: (rank: number, collection: string) => `#${rank} in ${collection}`,
		quickDelivery: "Quick Delivery",
	},
	ar: {
		soldOut: "نفدت الكمية",
		off: (percent: number) => `خصم ${percent}%`,
		soldLast30Days: (n: string) => `تم بيع ${n}+ خلال آخر 30 يومًا`,
		rankInCollection: (rank: number, collection: string) => `#${rank} في ${collection}`,
		quickDelivery: "توصيل سريع",
	},
} as const;

function AnimatedDeliveryBadge({ messages }: { messages: Message[] }) {
	const [index, setIndex] = useState(0);
	const [transitioning, setTransitioning] = useState(false);

	useEffect(() => {
		if (messages.length <= 1) return;
		const interval = setInterval(() => {
			setTransitioning(true);
			setTimeout(() => {
				setIndex((i) => (i + 1) % messages.length);
				setTransitioning(false);
			}, 900);
		}, 3500);
		return () => clearInterval(interval);
	}, [messages.length]);

	if (messages.length === 0) return null;

	const current = messages[index % messages.length];
	const next = messages[(index + 1) % messages.length];

	return (
		<div className="relative overflow-hidden h-4 text-[11px] text-gray-500 mt-0.5">
			<div className={`absolute flex items-center gap-1 ${transitioning ? "slide-out-up" : ""}`}>
				{current.icon}
				<span>{current.text}</span>
			</div>
			{transitioning && next && (
				<div className="absolute flex items-center gap-1 slide-in-up">
					{next.icon}
					<span>{next.text}</span>
				</div>
			)}
		</div>
	);
}

interface ProductCardProps {
	product: SearchProductItem;
	vendureBase: string;
	eager?: boolean;
}

function minPrice(price: SearchProductItem["price"]): number {
	return price.__typename === "PriceRange" ? price.min : price.value;
}

export default function ProductCard({ product, vendureBase, eager = false }: ProductCardProps) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CARD_COPY[locale];
	const { openCart, setCartCount } = useCart();
	const { notify } = useNotification();
	const cartFetcher = useFetcher<AddToCartResult & { error?: string }>();
	const [cartFeedback, setCartFeedback] = useState<"idle" | "success" | "error">("idle");
	// Desktop opens product detail pages in a new tab (keeps the grid/listing page
	// intact to browse further); mobile stays same-tab, where a second tab is just
	// friction. isDesktop starts false during SSR/hydration, so this can't cause a
	// markup mismatch — it only ever adds target/rel after the client confirms it.
	const isDesktop = useIsDesktop();
	const newTabProps = isDesktop ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};

	const priceQAR = minPrice(product.price) / 100;
	const discount = product.customProductVariantMappings?.discount ?? 0;
	const originalQAR = discount > 0 ? priceQAR + discount / 100 : null;
	const discountPercent = discount > 0 ? Math.round((discount / 100 / (priceQAR + discount / 100)) * 100) : 0;
	const hasQuickDelivery = (product.customProductVariantMappings?.stockQty ?? 0) > 0;
	const sold30Days = product.customProductMappings?.soldCount30d ?? 0;
	const bestSellerRank = product.customProductMappings?.bestSellerRank ?? null;
	const bestSellerCollection = product.customProductMappings?.bestSellerCollection ?? null;
	// Every search result already represents one specific variant, so always
	// link straight to it — the clean URL is just the variant's own slug (it
	// already embeds the product slug, e.g. "whey-protein-chocolate-2kg"). Only
	// fall back to the bare product link if that slug hasn't been indexed yet.
	const productHref = product.customProductVariantMappings?.slug
		? `/products/${product.customProductVariantMappings.slug}`
		: `/products/${product.slug}`;
	const displayName = product.productVariantName || product.productName;
	const imageSrc = product.productVariantAsset?.preview ?? product.productAsset?.preview;

	useEffect(() => {
		if (cartFetcher.state !== "idle" || !cartFetcher.data) return;
		const item = cartFetcher.data.addItemToOrder;
		if (!item) return;

		if (item.__typename === "Order") {
			setCartCount((item as AddToCartOrderResult).totalQuantity);
			setCartFeedback("success");
			openCart();
			const timer = setTimeout(() => setCartFeedback("idle"), 2500);
			return () => clearTimeout(timer);
		}

		// InsufficientStockError: partial success — some qty was added
		if (item.__typename === "InsufficientStockError") {
			const err = item as InsufficientStockError;
			if (err.quantityAvailable > 0 && err.order) {
				setCartCount(err.order.totalQuantity);
				openCart();
			}
			notify(getAddToCartErrorMessage(item)!, "warning");
		} else {
			notify(getAddToCartErrorMessage(item)!, "error");
		}

		setCartFeedback("error");
		const timer = setTimeout(() => setCartFeedback("idle"), 3000);
		return () => clearTimeout(timer);
	}, [cartFetcher.state, cartFetcher.data]);

	function handleAddToCart() {
		if (!product.inStock) return;
		cartFetcher.submit({ productVariantId: product.productVariantId, quantity: 1 }, { method: "POST", action: "/api/cart", encType: "application/json" });
	}

	// Build animated message list: base messages + sold30Days + rank
	const messageArray: Message[] = [
		...(sold30Days > 0
			? [
					{
						text: t.soldLast30Days(sold30Days.toLocaleString()),
						icon: <TrendingUp size={12} className="text-orange-500 flex-shrink-0" />,
					},
				]
			: []),
		...(bestSellerRank != null && bestSellerCollection
			? [
					{
						text: t.rankInCollection(bestSellerRank, bestSellerCollection),
						icon: <Star size={12} className="text-amber-500 flex-shrink-0" fill="currentColor" />,
					},
				]
			: []),
	];

	return (
		<div className="group bg-white rounded-2xl p-3 sm:p-4 flex flex-col h-full border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
			{/* Image */}
			<Link to={productHref} className="block" {...newTabProps}>
				<div className="relative aspect-square flex items-center justify-center px-2">
					{/* Badges float over the image instead of reserving their own row */}
					{!product.inStock ? (
						<span className="absolute top-0 start-0 z-10 bg-lime-300 text-black text-[11px] font-bold px-3 py-1 rounded-full">{t.soldOut}</span>
					) : discountPercent > 0 ? (
						<span className="absolute top-0 start-0 z-10 bg-lime-300 text-black text-[11px] font-bold px-3 py-1 rounded-full">{t.off(discountPercent)}</span>
					) : null}

					{(product.customProductMappings?.avgRating ?? 0) > 0 && (
						<div className="absolute top-0 end-0 z-10 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
							<Star size={10} className="text-lime-300" fill="currentColor" stroke="black" strokeWidth={1} />
							<span className="text-[11px] font-semibold text-gray-800">{product.customProductMappings!.avgRating!.toFixed(1)}</span>
						</div>
					)}

					{hasQuickDelivery && (
						<span
							className="absolute bottom-2 start-0 z-10 bg-yellow-400 text-black text-[9px] font-extrabold italic lowercase tracking-wide ps-2.5 pe-4 py-0.5 rounded-s-sm"
							style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }}
						>
							{t.quickDelivery}
						</span>
					)}

					{imageSrc ? (
						<VendureImage src={imageSrc} vendureBase={vendureBase} alt={displayName} width={300} height={300} objectFit="contain" eager={eager} imgClassName="mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
					) : (
						<div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl font-bold bg-gray-50 rounded-xl">{product.productName[0]}</div>
					)}
				</div>
			</Link>

			{/* Info */}
			<div className="flex flex-col items-center text-center flex-1 mt-1">
				<Link to={productHref} {...newTabProps}>
					<p className="text-sm font-light text-gray-900 hover:text-primary hover:underline transition-colors">{displayName}</p>
				</Link>

				<div className="flex items-center justify-center gap-2 mt-2">
					<span className="text-base font-bold text-gray-900">{formatPrice(priceQAR * 100, "QAR", locale)}</span>
					{originalQAR && <span className="text-sm text-gray-400 line-through">{formatPrice(originalQAR * 100, "QAR", locale)}</span>}
				</div>

				{/* Animated badge — cycles through delivery info, sold count, rank */}
				<AnimatedDeliveryBadge messages={messageArray} />
			</div>

			{/* CTA button */}
			<div className="mt-3">
				<AddToCartButton inStock={product.inStock} state={cartFetcher.state !== "idle" ? "loading" : cartFeedback} onClick={handleAddToCart} />
			</div>
		</div>
	);
}
