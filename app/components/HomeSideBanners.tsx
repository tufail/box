import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import type { BannerItem } from "~/graphql/banner";
import { bannerHref, getLocaleFromPathname } from "~/lib/i18n";

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
	const locale = getLocaleFromPathname(useLocation().pathname);
	const roundedClass = rounded === "top" ? "rounded-xl" : "rounded-xl";

	if (state === "loading") {
		return <div className={`flex-1 bg-gray-100 animate-pulse ${roundedClass} min-h-0`} />;
	}

	if (!state) return <div className="flex-1 min-h-0" />;

	const img = (
		<img
			src={state.assetPreview}
			alt={state.description || state.title}
			className={`w-full h-full object-cover ${roundedClass}`}
		/>
	);

	const href = bannerHref(state.url, locale);

	return (
		<div className={`flex-1 overflow-hidden ${roundedClass} min-h-0`}>
			{href ? <a href={href} className="block w-full h-full">{img}</a> : img}
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
