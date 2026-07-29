import Link from "~/components/LocaleLink";
import { useLocation } from "react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "~/context/WishlistContext";
import VendureImage from "~/components/VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";

export function meta() {
	// Personalized, client-side (localStorage) content — same reasoning as /search's
	// noindex: nothing here is the same page twice, so it shouldn't be indexed.
	return [{ title: "My Wishlist — NutriBox" }, { name: "description", content: "Products you've saved to your wishlist." }, { name: "robots", content: "noindex, follow" }];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const WISHLIST_COPY = {
	en: {
		emptyTitle: "Your wishlist is empty",
		emptyBody: "Tap the heart icon on any product to save it here for later.",
		browseProducts: "Browse Products",
		myWishlist: "My Wishlist",
		removeFromWishlist: "Remove from wishlist",
		viewProduct: "View Product",
	},
	ar: {
		emptyTitle: "قائمة المفضلة فارغة",
		emptyBody: "اضغط على أيقونة القلب في أي منتج لحفظه هنا لوقت لاحق.",
		browseProducts: "تصفح المنتجات",
		myWishlist: "المفضلة",
		removeFromWishlist: "إزالة من المفضلة",
		viewProduct: "عرض المنتج",
	},
} as const;

export default function WishlistPage() {
	const { items, toggle, wishlistCount } = useWishlist();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = WISHLIST_COPY[locale];

	if (items.length === 0) {
		return (
			<div className="container mx-auto px-4 py-20 text-center">
				<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
					<Heart size={36} className="text-gray-300" />
				</div>
				<h1 className="text-2xl font-bold text-gray-900 mb-2">{t.emptyTitle}</h1>
				<p className="text-gray-500 mb-8 max-w-sm mx-auto">
					{t.emptyBody}
				</p>
				<Link
					to="/collections"
					className="inline-block bg-black text-white font-bold px-8 py-3 rounded-full hover:bg-gray-800 transition-colors"
				>
					{t.browseProducts}
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-gray-900">
					{t.myWishlist}{" "}
					<span className="text-gray-400 font-normal text-lg">({wishlistCount})</span>
				</h1>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
				{items.map((item) => {
					// A raw variant id isn't a resolvable path on its own — fall back to the bare
					// product link if this item was saved before variant slugs existed.
					const productHref = item.variantSlug ? `/products/${item.variantSlug}` : `/products/${item.productSlug}`;
					return (
						<div key={item.variantId} className="group bg-white rounded-2xl p-3 sm:p-4 flex flex-col h-full border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
							<div className="relative aspect-square flex items-center justify-center px-2">
								<button
									onClick={() => toggle(item)}
									className="absolute top-0 end-0 z-10 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
									aria-label={t.removeFromWishlist}
								>
									<Heart size={13} fill="currentColor" />
								</button>
								<Link to={productHref} className="block w-full h-full">
									<VendureImage
										src={item.image}
										vendureBase={item.vendureBase}
										alt={item.name}
										width={300}
										height={300}
										objectFit="contain"
										imgClassName="mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
									/>
								</Link>
							</div>

							<div className="flex flex-col items-center text-center flex-1 mt-1">
								<Link to={productHref}>
									<p className="text-sm font-light text-gray-900 line-clamp-2 leading-snug hover:text-primary hover:underline transition-colors">
										{item.name}
									</p>
								</Link>
								<p className="text-base font-bold text-black mt-2">{formatPrice(item.price, item.currencyCode, locale)}</p>
							</div>

							<div className="mt-3">
								<Link
									to={productHref}
									className="w-full block text-center font-bold text-sm py-2.5 rounded-full bg-[#3b8578] text-white hover:bg-[#2e6b61] transition-colors"
								>
									{t.viewProduct}
								</Link>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
