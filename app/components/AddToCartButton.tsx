import { useLocation } from "react-router";
import { getLocaleFromPathname } from "~/lib/i18n";

interface AddToCartButtonProps {
	inStock?: boolean;
	onClick?: () => void;
}

const COPY = {
	en: { addToCart: "Add to Cart", soldOut: "Sold out" },
	ar: { addToCart: "أضف للعربة", soldOut: "نفدت الكمية" },
} as const;

export default function AddToCartButton({ inStock = true, onClick }: AddToCartButtonProps) {
	const t = COPY[getLocaleFromPathname(useLocation().pathname)];
	return (
		<button disabled={!inStock} onClick={onClick} className="w-full bg-[#3b8578] hover:bg-[#2e6b61] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer text-white font-bold text-sm py-2.5 rounded-full transition-colors block">
			{inStock ? t.addToCart : t.soldOut}
		</button>
	);
}
