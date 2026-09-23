import { useLocation } from "react-router";
import { Bell } from "lucide-react";
import Link from "~/components/LocaleLink";
import { getLocaleFromPathname } from "~/lib/i18n";

interface AddToCartButtonProps {
	inStock?: boolean;
	state?: "idle" | "loading" | "success" | "error";
	onClick?: () => void;
	/**
	 * Product page link. When sold out, the button becomes "Notify Me" and links there,
	 * opening the back-in-stock email form (#notify-me) instead of a dead "Sold out" button.
	 */
	notifyHref?: string;
}

const COPY = {
	en: { addToCart: "Add to Cart", notifyMe: "Notify Me", adding: "Adding...", added: "Added ✓", failed: "Try again" },
	ar: { addToCart: "أضف للعربة", notifyMe: "أبلغني", adding: "جارٍ الإضافة...", added: "تمت الإضافة ✓", failed: "حاول مرة أخرى" },
} as const;

export default function AddToCartButton({ inStock = true, state = "idle", onClick, notifyHref }: AddToCartButtonProps) {
	const t = COPY[getLocaleFromPathname(useLocation().pathname)];
	if (!inStock) {
		// No product link to send them to (shouldn't happen: every product has a slug):
		// show nothing rather than a dead "Sold out" button.
		if (!notifyHref) return null;
		return (
			<Link
				to={`${notifyHref}#notify-me`}
				className="w-full flex items-center justify-center gap-1.5 border border-[#3b8578] text-[#3b8578] hover:bg-[#3b8578] hover:text-white font-bold text-sm py-2.5 rounded-full transition-colors"
			>
				<Bell size={14} />
				{t.notifyMe}
			</Link>
		);
	}
	const label = state === "loading" ? t.adding : state === "success" ? t.added : state === "error" ? t.failed : t.addToCart;
	const bgClass = state === "success" ? "bg-green-600" : state === "error" ? "bg-red-500 hover:bg-red-600" : "bg-[#3b8578] hover:bg-[#2e6b61]";
	return (
		<button disabled={!inStock || state === "loading"} onClick={onClick} className={`w-full ${bgClass} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer text-white font-bold text-sm py-2.5 rounded-full transition-colors block`}>
			{label}
		</button>
	);
}
