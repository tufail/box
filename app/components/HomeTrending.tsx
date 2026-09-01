import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import type { SearchProductItem } from "~/graphql/product";
import { getLocaleFromPathname } from "~/lib/i18n";
import HomeTopSelling from "./HomeTopSelling";

// Client-fetched, not part of the home loader's SSR payload (see api.trending.ts
// for why) -- same fetch-after-mount pattern as HomeShopByConcern.
type State = "loading" | SearchProductItem[];

const COPY = { en: "Trending This Week", ar: "الأكثر رواجًا هذا الأسبوع" } as const;

export default function HomeTrending({ vendureBase }: { vendureBase: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const [state, setState] = useState<State>("loading");

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/trending?lang=${locale}`)
			.then((r): Promise<{ items: SearchProductItem[] } | null> => (r.ok ? r.json() : Promise.resolve(null)))
			.then((data) => {
				if (!cancelled) setState(data?.items ?? []);
			})
			.catch(() => {
				if (!cancelled) setState([]);
			});
		return () => {
			cancelled = true;
		};
	}, [locale]);

	if (state === "loading") return <Shimmer />;
	if (state.length === 0) return null;

	return <HomeTopSelling products={state} vendureBase={vendureBase} title={COPY[locale]} />;
}

function Shimmer() {
	return (
		<section className="py-2 md:py-4 container mx-auto px-4">
			<div className="h-7 w-48 bg-black/10 rounded mb-4 md:mb-5 animate-pulse" />
			<div className="flex gap-4">
				{[...Array(5)].map((_, i) => (
					<div key={i} className="flex-none w-1/2 md:w-1/4 lg:w-1/5">
						<div className="aspect-square w-full rounded-2xl bg-black/10 animate-pulse" />
					</div>
				))}
			</div>
		</section>
	);
}
