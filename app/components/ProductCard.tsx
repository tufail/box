import { Link } from "react-router";
import AddToCartButton from "./AddToCartButton";
import type { SearchProductItem } from "~/graphql/product";
import VendureImage from "./VendureImage";
import { Truck, Star } from "lucide-react";

interface ProductCardProps {
	product: SearchProductItem;
	vendureBase: string;
	eager?: boolean;
	showVariantName?: boolean;
	forceAddToCart?: boolean;
	variantId?: string;
	onAddToCart?: (product: SearchProductItem) => void;
}

function minPrice(price: SearchProductItem["price"]): number {
	return price.__typename === "PriceRange" ? price.min : price.value;
}

function formatQAR(value: number): string {
	return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
}

export default function ProductCard({ product, vendureBase, eager = false, showVariantName = false, forceAddToCart = false, variantId, onAddToCart }: ProductCardProps) {
	const priceQAR = minPrice(product.price) / 100;
	const discount = product.customProductVariantMappings?.discount ?? 0;
	const isOnSale = product.customProductVariantMappings?.isOnSale ?? false;
	const originalQAR = discount > 0 ? priceQAR + discount / 100 : null;
	const discountPercent = discount > 0 ? Math.round((discount / 100) / (priceQAR + discount / 100) * 100) : 0;
	const variantCount = product.customProductMappings?.variantCount ?? 1;
	const productHref = variantId ? `/products/${product.slug}?variant=${variantId}` : `/products/${product.slug}`;
	const displayName = showVariantName && product.productVariantName ? product.productVariantName : product.productName;

	return (
		<div className="group bg-white overflow-hidden flex flex-col h-full rounded-xl">

			{/* Image area */}
			<div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden">
				{/* Top-left promo badge */}
				{(isOnSale || discountPercent > 0) && (
					<div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-pink-100 text-pink-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
						<Star size={10} fill="currentColor" />
						<span>{isOnSale ? "On Sale" : "Best Deal"}</span>
					</div>
				)}

				<Link to={productHref} className="block">
					<div className="aspect-square overflow-hidden">
						{product.productAsset ? (
							<VendureImage
								src={product.productAsset.preview}
								vendureBase={vendureBase}
								alt={product.productName}
								width={300}
								height={300}
								objectFit="contain"
								eager={eager}
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl font-bold bg-gray-50">
								{product.productName[0]}
							</div>
						)}
					</div>

					{!product.inStock && (
						<div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-4">
							<span className="bg-white text-gray-800 text-xs font-semibold px-3 py-1 rounded shadow">Out of Stock</span>
						</div>
					)}
				</Link>
			</div>

			{/* Info */}
			<div className="flex flex-col flex-1 pt-2.5 pb-3 gap-1">

				{/* Product name */}
				<Link to={productHref}>
					<p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug hover:text-primary transition-colors">
						{displayName}
					</p>
				</Link>

				{/* Variant label */}
				{product.productVariantName && (
					<p className="text-xs text-gray-500">{product.productVariantName}</p>
				)}

				{/* Price row */}
				<div className="mt-1">
					<span className="text-base font-bold text-gray-900">QAR {formatQAR(priceQAR)}</span>
					{originalQAR && (
						<div className="flex items-center gap-2 mt-0.5">
							<span className="text-xs text-gray-400 line-through">QAR {formatQAR(originalQAR)}</span>
							<span className="text-[11px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
								{discountPercent}% OFF
							</span>
						</div>
					)}
				</div>

				{/* Delivery */}
				<div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
					<Truck size={12} className="text-primary flex-shrink-0" />
					<span>Free delivery available</span>
				</div>

				{/* CTA button */}
				<div className="mt-auto pt-2">
					{forceAddToCart ? (
						<AddToCartButton inStock={product.inStock} onClick={() => onAddToCart?.(product)} />
					) : (
						<Link
							to={productHref}
							className={`w-full block text-center text-white font-semibold text-sm py-1.5 rounded-lg transition-colors ${
								product.inStock
									? "bg-primary hover:bg-primary/90 cursor-pointer"
									: "bg-gray-300 text-gray-500 pointer-events-none"
							}`}
						>
							{product.inStock
								? variantCount > 1
									? "Show Options"
									: "Add to Cart"
								: "Out of Stock"}
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
