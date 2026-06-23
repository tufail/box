import { useEffect, useState } from "react";
import type { BannerItem } from "~/graphql/banner";

type BannerState = "loading" | BannerItem | null;

function useBanner(slug: string) {
	const [state, setState] = useState<BannerState>("loading");

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/banner/${slug}`)
			.then((r): Promise<{ items: BannerItem[] } | null> => (r.ok ? r.json() : Promise.resolve(null)))
			.then((data) => {
				if (!cancelled) setState(data?.items?.[0] ?? null);
			})
			.catch(() => {
				if (!cancelled) setState(null);
			});
		return () => { cancelled = true; };
	}, [slug]);

	return state;
}

function SideBanner({ slug, rounded }: { slug: string; rounded: "top" | "bottom" }) {
	const state = useBanner(slug);
	const roundedClass = rounded === "top" ? "rounded-xl" : "rounded-xl";

	if (state === "loading") {
		return <div className={`flex-1 bg-gray-100 animate-pulse ${roundedClass} min-h-0`} />;
	}

	if (!state) return <div className="flex-1 min-h-0" />;

	const img = (
		<img
			src={state.assetPreview}
			alt={state.title}
			className={`w-full h-full object-cover ${roundedClass}`}
		/>
	);

	return (
		<div className={`flex-1 overflow-hidden ${roundedClass} min-h-0`}>
			{state.url ? <a href={state.url} className="block w-full h-full">{img}</a> : img}
		</div>
	);
}

export default function HomeSideBanners() {
	return (
		<div className="hidden md:flex md:w-[30%] flex-col self-stretch gap-2 pl-2">
			<SideBanner slug="hero-side-top" rounded="top" />
			<SideBanner slug="hero-side-bottom" rounded="bottom" />
		</div>
	);
}
