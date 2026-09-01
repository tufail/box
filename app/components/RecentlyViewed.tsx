import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import type { SearchProductItem } from "~/graphql/product";
import { getRecentlyViewed } from "~/lib/recentlyViewed";
import { getLocaleFromPathname } from "~/lib/i18n";
import HomeTopSelling from "./HomeTopSelling";

// Purely client-side (localStorage) -- reads nothing until after mount, so it
// renders null on the server/first paint to avoid a hydration mismatch, then
// fills in synchronously (no network round trip needed, unlike HomeTrending).
type State = "loading" | SearchProductItem[];

const COPY = { en: "Recently Viewed", ar: "شوهد مؤخرًا" } as const;

export default function RecentlyViewed({ vendureBase, excludeProductId }: { vendureBase: string; excludeProductId?: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const [state, setState] = useState<State>("loading");

	useEffect(() => {
		setState(getRecentlyViewed(excludeProductId));
	}, [excludeProductId]);

	if (state === "loading" || state.length === 0) return null;

	return <HomeTopSelling products={state} vendureBase={vendureBase} title={COPY[locale]} />;
}
