import { Link } from "react-router";
import { useEffect, useState } from "react";
import AddToCartButton from "./AddToCartButton";
import type { SearchProductItem } from "~/graphql/product";
import VendureImage from "./VendureImage";
import { TrendingUp, Star } from "lucide-react";

type Message = { text: string; icon: React.ReactNode };

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
	showVariantName?: boolean;
	forceAddToCart?: boolean;
	onAddToCart?: (product: SearchProductItem) => void;
}

function minPrice(price: SearchProductItem["price"]): number {
	return price.__typename === "PriceRange" ? price.min : price.value;
}

function formatQAR(value: number): string {
	return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
}

export default function ProductCard({ product, vendureBase, eager = false, showVariantName = false, forceAddToCart = false, onAddToCart }: ProductCardProps) {
	const priceQAR = minPrice(product.price) / 100;
	const discount = product.customProductVariantMappings?.discount ?? 0;
	const originalQAR = discount > 0 ? priceQAR + discount / 100 : null;
	const discountPercent = discount > 0 ? Math.round((discount / 100 / (priceQAR + discount / 100)) * 100) : 0;
	const variantCount = product.customProductMappings?.variantCount ?? 1;
	const sold30Days = product.customProductMappings?.soldCount30d ?? 0;
	const bestSellerRank = product.customProductMappings?.bestSellerRank ?? null;
	const bestSellerCollection = product.customProductMappings?.bestSellerCollection ?? null;
	// Every search result already represents one specific (grouped or ungrouped) variant, so
	// always link straight to it — the clean URL is just the variant's own slug (it already
	// embeds the product slug, e.g. "whey-protein-chocolate-2kg"). Only fall back to the bare
	// product link if that slug hasn't been indexed yet.
	const productHref = product.customProductVariantMappings?.slug
		? `/products/${product.customProductVariantMappings.slug}`
		: `/products/${product.slug}`;
	const displayName = showVariantName && product.productVariantName ? product.productVariantName : product.productName;

	// Build animated message list: base messages + sold30Days + rank
	const messageArray: Message[] = [
		...(sold30Days > 0
			? [
					{
						text: `${sold30Days.toLocaleString()}+ sold in last 30 days`,
						icon: <TrendingUp size={12} className="text-orange-500 flex-shrink-0" />,
					},
				]
			: []),
		...(bestSellerRank != null && bestSellerCollection
			? [
					{
						text: `#${bestSellerRank} in ${bestSellerCollection}`,
						icon: <Star size={12} className="text-amber-500 flex-shrink-0" fill="currentColor" />,
					},
				]
			: []),
	];

	return (
		<div className="group bg-white rounded-2xl p-3 sm:p-4 flex flex-col h-full border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
			{/* Image */}
			<Link to={productHref} className="block">
				<div className="relative aspect-square flex items-center justify-center px-2">
					{/* Badges float over the image instead of reserving their own row */}
					{!product.inStock ? (
						<span className="absolute top-0 left-0 z-10 bg-lime-300 text-black text-[11px] font-bold px-3 py-1 rounded-full">SOLD OUT</span>
					) : discountPercent > 0 ? (
						<span className="absolute top-0 left-0 z-10 bg-lime-300 text-black text-[11px] font-bold px-3 py-1 rounded-full">{discountPercent}% OFF</span>
					) : null}

					{(product.customProductMappings?.avgRating ?? 0) > 0 && (
						<div className="absolute top-0 right-0 z-10 flex items-center gap-1 bg-white rounded-full px-2 py-1 shadow-sm">
							<Star size={10} className="text-lime-300" fill="currentColor" stroke="black" strokeWidth={1} />
							<span className="text-[11px] font-semibold text-gray-800">{product.customProductMappings!.avgRating!.toFixed(1)}</span>
						</div>
					)}

					{product.productAsset ? (
						<VendureImage src={product.productAsset.preview} vendureBase={vendureBase} alt={product.productName} width={300} height={300} objectFit="contain" eager={eager} imgClassName="mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
					) : (
						<div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl font-bold bg-gray-50 rounded-xl">{product.productName[0]}</div>
					)}
				</div>
			</Link>

			{/* Info */}
			<div className="flex flex-col items-center text-center flex-1 mt-1">
				<Link to={productHref}>
					<p className="text-sm font-light text-gray-900 line-clamp-2 leading-snug hover:text-primary hover:underline transition-colors">{displayName}</p>
				</Link>

				{product.productVariantName && <p className="text-xs text-gray-500 mt-0.5">{product.productVariantName}</p>}

				<div className="flex items-center justify-center gap-2 mt-2">
					<span className="text-base font-bold text-gray-900">QAR {formatQAR(priceQAR)}</span>
					{originalQAR && <span className="text-sm text-gray-400 line-through">QAR {formatQAR(originalQAR)}</span>}
				</div>

				{/* Animated badge — cycles through delivery info, sold count, rank */}
				<AnimatedDeliveryBadge messages={messageArray} />
			</div>

			{/* CTA button */}
			<div className="mt-3">
				{forceAddToCart ? (
					<AddToCartButton inStock={product.inStock} onClick={() => onAddToCart?.(product)} />
				) : (
					<Link to={productHref} className={`w-full block text-center font-bold text-sm py-2.5 rounded-full transition-colors ${product.inStock ? "bg-[#3b8578] text-white hover:bg-[#2e6b61] cursor-pointer" : "bg-gray-100 text-gray-400 pointer-events-none"}`}>
						{product.inStock ? (variantCount > 1 ? "Show Options" : "Add to Cart") : "Sold out"}
					</Link>
				)}
			</div>
		</div>
	);
}
