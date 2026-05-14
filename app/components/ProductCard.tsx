import { Link } from "react-router";
import AddToCartButton from "./AddToCartButton";
import type { SearchProductItem } from "~/graphql/product";

interface ProductCardProps {
  product: SearchProductItem;
  vendureBase: string;
  eager?: boolean;
  onAddToCart?: (product: SearchProductItem) => void;
}

function resolveImageUrl(preview: string, vendureBase: string): string {
  return preview.startsWith("http") ? preview : `${vendureBase}${preview}`;
}

function minPrice(price: SearchProductItem["price"]): number {
  return price.__typename === "PriceRange" ? price.min : price.value;
}

function formatQAR(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
}

export default function ProductCard({ product, vendureBase, eager = false, onAddToCart }: ProductCardProps) {
  const imageUrl = product.productAsset
    ? resolveImageUrl(product.productAsset.preview, vendureBase)
    : null;
  const priceQAR = minPrice(product.price) / 100;
  const discount = product.customProductVariantMappings?.discount ?? 0;
  const isOnSale = product.customProductVariantMappings?.isOnSale ?? false;
  const originalQAR = discount > 0 ? priceQAR / (1 - discount / 100) : null;

  return (
    <div className="border border-gray-200 bg-white overflow-hidden flex flex-col h-full">

      {/* Image area */}
      <div className="relative bg-white">
        {(discount > 0 || isOnSale) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {discount > 0 && (
              <span className="bg-yellow-400 text-black text-[11px] font-bold px-2 py-0.5 rounded leading-tight">
                {discount.toFixed(1)}% Off
              </span>
            )}
            {isOnSale && (
              <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded leading-tight">
                Sale
              </span>
            )}
          </div>
        )}

        <Link to={`/products/${product.slug}`} className="block">
          <div className="h-[220px] overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.productName}
                width={300}
                height={220}
                className="w-full h-full object-cover block"
                loading={eager ? "eager" : "lazy"}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl font-bold">
                {product.productName[0]}
              </div>
            )}
            {!product.inStock && (
              <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-4">
                <span className="bg-white text-gray-800 text-xs font-semibold px-3 py-1 rounded-full shadow">
                  Out of Stock
                </span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-3">
        <Link to={`/products/${product.slug}`} className="block">
          <p className="text-sm font-bold text-gray-900 text-center line-clamp-2 leading-snug hover:text-primary transition-colors h-[2.75rem]">
            {product.productName}
          </p>
        </Link>

        <div className="flex items-baseline justify-center gap-2">
          <span className="text-xl font-bold text-gray-900">
            QAR {formatQAR(priceQAR)}
          </span>
          {originalQAR && (
            <span className="text-sm text-gray-400 line-through">
              QAR {formatQAR(originalQAR)}
            </span>
          )}
        </div>

        <AddToCartButton
          inStock={product.inStock}
          onClick={() => onAddToCart?.(product)}
        />
      </div>
    </div>
  );
}
