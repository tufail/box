import { useLocation } from "react-router";
import { getLocaleFromPathname } from "~/lib/i18n";

interface AddToCartButtonProps {
	inStock?: boolean;
	state?: "idle" | "loading" | "success" | "error";
	onClick?: () => void;
}

const COPY = {
	en: { addToCart: "Add to Cart", soldOut: "Sold out", adding: "Adding...", added: "Added ✓", failed: "Try again" },
	ar: { addToCart: "أضف للعربة", soldOut: "نفدت الكمية", adding: "جارٍ الإضافة...", added: "تمت الإضافة ✓", failed: "حاول مرة أخرى" },
} as const;

export default function AddToCartButton({ inStock = true, state = "idle", onClick }: AddToCartButtonProps) {
	const t = COPY[getLocaleFromPathname(useLocation().pathname)];
	const label = !inStock ? t.soldOut : state === "loading" ? t.adding : state === "success" ? t.added : state === "error" ? t.failed : t.addToCart;
	const bgClass = state === "success" ? "bg-green-600" : state === "error" ? "bg-red-500 hover:bg-red-600" : "bg-[#3b8578] hover:bg-[#2e6b61]";
	return (
		<button disabled={!inStock || state === "loading"} onClick={onClick} className={`w-full ${bgClass} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer text-white font-bold text-sm py-2.5 rounded-full transition-colors block`}>
			{label}
		</button>
	);
}
