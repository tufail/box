import { Link } from "react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "~/context/WishlistContext";
import VendureImage from "~/components/VendureImage";

export function meta() {
	return [{ title: "My Wishlist — PHQ" }, { name: "description", content: "Products you've saved to your wishlist." }];
}

function formatQAR(cents: number) {
	const val = cents / 100;
	return `QAR ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)}`;
}

export default function WishlistPage() {
	const { items, toggle, wishlistCount } = useWishlist();

	if (items.length === 0) {
		return (
			<div className="container mx-auto px-4 py-20 text-center">
				<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
					<Heart size={36} className="text-gray-300" />
				</div>
				<h1 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h1>
				<p className="text-gray-500 mb-8 max-w-sm mx-auto">
					Tap the heart icon on any product to save it here for later.
				</p>
				<Link
					to="/collections"
					className="inline-block bg-primary text-white font-semibold px-8 py-3 rounded hover:bg-primary/90 transition-colors"
				>
					Browse Products
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-900">
					My Wishlist{" "}
					<span className="text-gray-400 font-normal text-lg">({wishlistCount})</span>
				</h1>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
				{items.map((item) => (
					<div key={item.variantId} className="group border border-gray-200 bg-white overflow-hidden flex flex-col">
						<div className="relative aspect-square bg-white">
							<Link to={`/products/${item.productSlug}?variant=${item.variantId}`}>
								<VendureImage
									src={item.image}
									vendureBase={item.vendureBase}
									alt={item.name}
									width={300}
									height={300}
									objectFit="contain"
								/>
							</Link>
							<button
								onClick={() => toggle(item)}
								className="absolute top-2 right-2 w-8 h-8 rounded bg-white/90 border border-red-200 shadow-sm flex items-center justify-center text-red-500 hover:border-red-400 transition-colors"
								aria-label="Remove from wishlist"
							>
								<Heart size={14} fill="currentColor" />
							</button>
						</div>

						<div className="flex flex-col flex-1 p-3 gap-2">
							<Link to={`/products/${item.productSlug}?variant=${item.variantId}`}>
								<p className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-primary transition-colors leading-snug">
									{item.name}
								</p>
							</Link>
							<p className="text-base font-bold text-gray-900">{formatQAR(item.price)}</p>
							<Link
								to={`/products/${item.productSlug}?variant=${item.variantId}`}
								className="mt-auto text-center text-sm font-semibold py-2 px-4 rounded bg-cart text-white hover:bg-[#d47800] transition-colors"
							>
								View Product
							</Link>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
