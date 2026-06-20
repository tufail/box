import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface WishlistItem {
	variantId: string;
	productSlug: string;
	name: string;
	price: number;
	currencyCode: string;
	image: string;
	vendureBase: string;
}

interface WishlistContextValue {
	items: WishlistItem[];
	toggle: (item: WishlistItem) => void;
	isWishlisted: (variantId: string) => boolean;
	wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const STORAGE_KEY = "phq_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<WishlistItem[]>([]);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) setItems(JSON.parse(stored));
		} catch {}
	}, []);

	const toggle = (item: WishlistItem) => {
		setItems((prev) => {
			const exists = prev.some((i) => i.variantId === item.variantId);
			const next = exists
				? prev.filter((i) => i.variantId !== item.variantId)
				: [...prev, item];
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch {}
			return next;
		});
	};

	const isWishlisted = (variantId: string) => items.some((i) => i.variantId === variantId);

	return (
		<WishlistContext.Provider value={{ items, toggle, isWishlisted, wishlistCount: items.length }}>
			{children}
		</WishlistContext.Provider>
	);
}

export function useWishlist() {
	const ctx = useContext(WishlistContext);
	if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
	return ctx;
}
