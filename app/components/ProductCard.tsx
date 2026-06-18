import { Link } from "react-router";
import AddToCartButton from "./AddToCartButton";
import type { SearchProductItem } from "~/graphql/product";
import VendureImage from "./VendureImage";

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
	console.log(discount, priceQAR);
	const isOnSale = product.customProductVariantMappings?.isOnSale ?? false;
	const originalQAR = discount > 0 ? priceQAR + discount / 100 : null;
	const discountPercent = discount > 0 ? (discount / 100 / priceQAR) * 100 : 0;

	return (
		<div className="group border border-gray-200 bg-white overflow-hidden flex flex-col h-full">
			{/* Image area */}
			<div className="relative bg-white">
				{(discount > 0 || isOnSale) && (
					<div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
						{discountPercent > 0 && <span className="bg-yellow-400 text-black text-sm font-bold px-2 py-0.5 rounded leading-tight">{discountPercent.toFixed(0)}% Off</span>}
						{isOnSale && <span className="bg-orange-500 text-white text-sm font-bold px-2 py-0.5 rounded leading-tight">Sale</span>}
					</div>
				)}

				<Link to={variantId ? `/products/${product.slug}?variant=${variantId}` : `/products/${product.slug}`} className="block">
					<div className="aspect-square overflow-hidden">
						{product.productAsset ? <VendureImage src={product.productAsset.preview} vendureBase={vendureBase} alt={product.productName} width={300} height={300} objectFit="cover" eager={eager} /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl font-bold">{product.productName[0]}</div>}
						{!product.inStock && (
							<div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-4">
								<span className="bg-white text-gray-800 text-xs font-semibold px-3 py-1 rounded shadow">Out of Stock</span>
							</div>
						)}
					</div>
				</Link>
			</div>

			{/* Info */}
			<div className="flex flex-col flex-1 px-3 pt-2 pb-6 gap-3">
				<Link to={variantId ? `/products/${product.slug}?variant=${variantId}` : `/products/${product.slug}`} className="block">
					<p className="text-md font-bold text-gray-900 text-center line-clamp-2 leading-snug hover:text-primary transition-colors h-[3rem]">{showVariantName && product.productVariantName ? product.productVariantName : product.productName}</p>
				</Link>

				<div className="flex items-baseline justify-center gap-2">
					{originalQAR && <span className="text-md text-gray-400 line-through">QAR {formatQAR(originalQAR)}</span>}
					<span className="text-xl font-bold text-gray-900">QAR {formatQAR(priceQAR)}</span>
				</div>

				<div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 flex justify-center">
					{forceAddToCart || product.customProductMappings?.variantCount === 1 ? (
						<AddToCartButton inStock={product.inStock} onClick={() => onAddToCart?.(product)} />
					) : (
						<Link to={variantId ? `/products/${product.slug}?variant=${variantId}` : `/products/${product.slug}`} className={`text-white font-semibold text-sm py-2.5 px-7 rounded transition-colors mx-auto inline-block text-center ${product.inStock ? "bg-cart hover:bg-[#d47800] cursor-pointer" : "bg-gray-400 text-gray-200 pointer-events-none cursor-not-allowed"}`}>
							{product.inStock ? "Select Options" : "Out of Stock"}
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
