import { useEffect, useState } from "react";
import type { BannerItem } from "~/graphql/banner";

function BannerShimmer() {
	return (
		<div className="container mx-auto px-4 mt-4">
			<svg className="w-full" style={{ aspectRatio: "1440/280" }} xmlns="http://www.w3.org/2000/svg">
				<defs>
					<linearGradient id="banner-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#e5e7eb">
							<animate attributeName="offset" values="-1;2" dur="1.4s" repeatCount="indefinite" />
						</stop>
						<stop offset="50%" stopColor="#f3f4f6">
							<animate attributeName="offset" values="-0.5;2.5" dur="1.4s" repeatCount="indefinite" />
						</stop>
						<stop offset="100%" stopColor="#e5e7eb">
							<animate attributeName="offset" values="0;3" dur="1.4s" repeatCount="indefinite" />
						</stop>
					</linearGradient>
				</defs>
				<rect width="100%" height="100%" fill="url(#banner-shimmer)" rx="4" />
			</svg>
		</div>
	);
}

type BannerState = "loading" | BannerItem | null;

export default function HomeBanner({ slug }: { slug: string }) {
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
		return () => {
			cancelled = true;
		};
	}, [slug]);

	if (state === "loading") return <BannerShimmer />;
	if (!state) return null;

	const picture = (
		<picture>
			{state.mobileAssetPreview && <source media="(max-width: 767px)" srcSet={state.mobileAssetPreview} />}
			<img src={state.assetPreview} alt={state.title} className="w-full border border-gray-200 h-auto block" loading="lazy" />
		</picture>
	);

	return (
		<div className="container mx-auto px-4 mt-4">
			{state.url ? <a href={state.url}>{picture}</a> : picture}
		</div>
	);
}
