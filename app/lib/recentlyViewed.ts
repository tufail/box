import type { SearchProductItem } from "~/graphql/product";

// Purely client-side, per-visitor -- localStorage rather than any backend
// tracking. Stores the full SearchProductItem shape directly (captured from
// the product detail page at view time) so reading it back needs zero
// adaptation/re-fetching -- the tradeoff is price/stock can be a little stale
// by the time it's shown again, which is the standard, well-accepted
// behavior for this exact kind of widget.
const STORAGE_KEY = "nutribox:recentlyViewed";
const MAX_ITEMS = 12;

interface StoredItem extends SearchProductItem {
	viewedAt: number;
}

function readAll(): StoredItem[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as StoredItem[]) : [];
	} catch {
		return [];
	}
}

export function recordRecentlyViewed(item: SearchProductItem): void {
	if (typeof window === "undefined") return;
	try {
		const existing = readAll().filter((i) => i.productId !== item.productId);
		const next: StoredItem[] = [{ ...item, viewedAt: Date.now() }, ...existing].slice(0, MAX_ITEMS);
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// localStorage can throw (private browsing, quota) -- never worth surfacing
	}
}

// excludeProductId — don't show the product the customer is CURRENTLY on in
// its own "recently viewed" strip.
export function getRecentlyViewed(excludeProductId?: string): SearchProductItem[] {
	return readAll()
		.filter((i) => i.productId !== excludeProductId)
		.sort((a, b) => b.viewedAt - a.viewedAt)
		.map(({ viewedAt: _viewedAt, ...rest }) => rest);
}
