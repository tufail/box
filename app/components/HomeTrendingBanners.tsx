import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerItem } from "~/graphql/banner";
import VendureImage from "./VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";

type State = "loading" | BannerItem[];

function normalizeDestination(href?: string) {
	if (!href) return undefined;
	const value = href.trim();
	if (!value || value === "#" || value === "/#" || value === "javascript:void(0)" || value === "about:blank") {
		return undefined;
	}
	return value;
}

export default function HomeTrendingBanners({ title, vendureBase = "" }: { title?: string; vendureBase?: string }) {
	const [state, setState] = useState<State>("loading");

	useEffect(() => {
		let cancelled = false;
		fetch("/api/banner/trending-products")
			.then((r): Promise<{ items: BannerItem[] } | null> => (r.ok ? r.json() : Promise.resolve(null)))
			.then((data) => {
				if (!cancelled) setState(data?.items ?? []);
			})
			.catch(() => {
				if (!cancelled) setState([]);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (state === "loading") return <Shimmer />;
	if (state.length === 0) return null;

	return <BannerScroll items={state} title={title} vendureBase={vendureBase} />;
}

function Shimmer() {
	return (
		<section className="py-2 md:py-4 container mx-auto px-4">
			<div className="h-6 w-48 bg-gray-200 rounded mb-5 animate-pulse" />
			<div className="flex gap-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="flex-none w-1/2 md:w-1/4">
						<div className="bg-gray-200 animate-pulse aspect-square w-full rounded" />
						<div className="h-4 bg-gray-200 animate-pulse mt-2 rounded w-3/4 mx-auto" />
					</div>
				))}
			</div>
		</section>
	);
}

function BannerScroll({ items, title, vendureBase }: { items: BannerItem[]; title?: string; vendureBase: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const resolvedTitle = title ?? (locale === "ar" ? "المنتجات الرائجة" : "Trending Products");
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: "start",
		slidesToScroll: "auto",
		containScroll: "trimSnaps",
		direction: locale === "ar" ? "rtl" : "ltr",
	});

	const [canPrev, setCanPrev] = useState(false);
	const [canNext, setCanNext] = useState(true);

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setCanPrev(emblaApi.canScrollPrev());
		setCanNext(emblaApi.canScrollNext());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		onSelect();
		emblaApi.on("select", onSelect);
		emblaApi.on("reInit", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
			emblaApi.off("reInit", onSelect);
		};
	}, [emblaApi, onSelect]);

	return (
		<section className="py-2 md:py-4 container mx-auto px-4" aria-labelledby="home-trending-banners-title">
			<div className="mb-4 md:mb-5">
				<h2 id="home-trending-banners-title" className="font-heading2 text-2xl font-extrabold text-black">
					{resolvedTitle}
				</h2>
			</div>

			<div className="relative">
				<button onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label={locale === "ar" ? "العناصر السابقة" : "Previous items"} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-4 rtl:translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronLeft size={14} className="rtl:rotate-180" />
				</button>

				<div className="overflow-hidden py-1 pb-3 -my-1 -mb-3" ref={emblaRef}>
					<div className="flex -mx-2" role="list">
						{items.map((item) => {
							const resolvedHref = normalizeDestination(item.url);
							const cardClassName = "border border-gray-100 bg-white overflow-hidden flex flex-col h-full group block rounded-2xl shadow-sm hover:shadow-md transition-shadow";
							return (
								<div key={item.id} className="flex-none w-1/2 md:w-1/4 lg:w-1/5 px-2" role="listitem">
									{resolvedHref ? (
										<a href={resolvedHref} aria-label={locale === "ar" ? `فتح ${item.title}` : `Open ${item.title}`} className={cardClassName}>
											<div className="aspect-square overflow-hidden bg-white">
												<VendureImage src={item.assetPreview} vendureBase={vendureBase} alt={item.description || item.title} width={300} height={300} objectFit="contain" imgClassName="group-hover:scale-105 transition-transform duration-300" />
											</div>
											<div className="px-3 pt-2 pb-4 text-center">
												<span className="text-md font-bold text-gray-900 underline underline-offset-2 group-hover:text-primary transition-colors">{item.title}</span>
											</div>
										</a>
									) : (
										<div className={cardClassName}>
											<div className="aspect-square overflow-hidden bg-white">
												<VendureImage src={item.assetPreview} vendureBase={vendureBase} alt={item.description || item.title} width={300} height={300} objectFit="contain" imgClassName="group-hover:scale-105 transition-transform duration-300" />
											</div>
											<div className="px-3 pt-2 pb-4 text-center">
												<span className="text-md font-bold text-gray-900 underline underline-offset-2 group-hover:text-primary transition-colors">{item.title}</span>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>

				<button onClick={() => emblaApi?.scrollNext()} disabled={!canNext} aria-label={locale === "ar" ? "العناصر التالية" : "Next items"} className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-4 rtl:-translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronRight size={14} className="rtl:rotate-180" />
				</button>
			</div>
		</section>
	);
}
