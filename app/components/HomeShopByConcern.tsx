import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerItem } from "~/graphql/banner";
import { vendureImageUrl } from "./VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";

// Light, plain fill per card — cycled by position since the banner plugin
// has no color field of its own. Deliberately flat pastels (not gradients),
// paired with dark text/CTA for contrast.
const CARD_BG = ["bg-rose-100", "bg-teal-100", "bg-amber-100", "bg-sky-100", "bg-indigo-100", "bg-fuchsia-100"];

function normalizeDestination(href?: string) {
	if (!href) return undefined;
	const value = href.trim();
	if (!value || value === "#" || value === "/#" || value === "javascript:void(0)" || value === "about:blank") {
		return undefined;
	}
	return value;
}

type State = "loading" | BannerItem[];

export default function HomeShopByConcern({ vendureBase }: { vendureBase: string }) {
	const [state, setState] = useState<State>("loading");

	useEffect(() => {
		let cancelled = false;
		fetch("/api/banner/home-concern-section")
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

	return <ConcernScroll items={state} vendureBase={vendureBase} />;
}

function Shimmer() {
	return (
		<section className="relative my-6 py-8 md:py-10 bg-white">
			<div className="container mx-auto px-4">
				<div className="h-7 w-48 bg-black/10 rounded mb-4 md:mb-5 animate-pulse" />
				<div className="flex gap-4">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="flex-none w-1/2 md:w-1/4 lg:w-1/5">
							<div className="aspect-square w-full rounded-2xl bg-black/10 animate-pulse" />
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function ConcernScroll({ items, vendureBase }: { items: BannerItem[]; vendureBase: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
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
		<section className="relative my-6 py-8 md:py-10 bg-white" aria-labelledby="shop-by-concern-title">
			{/* Full-bleed background — this section (unlike its siblings) isn't wrapped
			    in its own container, so the image spans the full viewport width while
			    the heading/carousel below stay constrained to the normal content width.
			    Inline style (not a Tailwind bg-[url(...)] class) so it's never at the
			    mercy of the arbitrary-value class scanner picking it up correctly. */}

			<div className="container mx-auto px-4">
				<div className="mb-4 md:mb-5">
					<h2 id="shop-by-concern-title" className="font-heading2 text-2xl font-extrabold text-black">
						{locale === "ar" ? "تسوّق حسب الهدف" : "Shop by Goal"}
					</h2>
				</div>

				<div className="relative">
					<button onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label={locale === "ar" ? "العناصر السابقة" : "Previous items"} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-4 rtl:translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
						<ChevronLeft size={14} className="rtl:rotate-180" />
					</button>

					<div className="overflow-hidden py-1 pb-3 -my-1 -mb-3" ref={emblaRef}>
						<div className="flex -mx-2" role="list" aria-label={locale === "ar" ? "احتياجات التسوق" : "Shopping concerns"}>
							{items.map((item, i) => {
								const href = normalizeDestination(item.url);
								const hasImage = !!item.assetPreview;
								const bg = hasImage ? "bg-gray-100" : CARD_BG[i % CARD_BG.length];
								// Photo tiles need a dark scrim + white text for contrast; plain
								// color tiles are light, so dark text/CTA reads better on those.
								const cardContent = (
									<>
										{hasImage && (
											<>
												<img src={vendureImageUrl(item.assetPreview, vendureBase, { preset: "large", format: "webp" })} alt={item.description || item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
												<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 via-50% to-transparent" />
											</>
										)}
										<div className="absolute inset-0 p-3 flex flex-col justify-end items-start gap-1">
											<h3 className={`font-heading2 font-extrabold text-sm sm:text-base leading-tight ${hasImage ? "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" : "text-gray-900"}`}>{item.title}</h3>
											{item.description && <p className={`text-xs leading-snug line-clamp-2 mb-1 ${hasImage ? "text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" : "text-gray-700"}`}>{item.description}</p>}
											<span className={`inline-flex items-center rounded-full font-extrabold text-xs px-3 py-1.5 shadow-sm transition-colors ${hasImage ? "bg-white text-primary group-hover:bg-gray-100" : "bg-black text-white group-hover:bg-gray-800"}`}>{locale === "ar" ? "تسوق الآن" : "Shop Now"}</span>
										</div>
									</>
								);
								return (
									<div key={item.id} className="flex-none w-1/2 md:w-1/4 lg:w-1/5 px-2" role="listitem">
										{href ? (
											<a href={href} className={`group relative overflow-hidden rounded-2xl aspect-square block ${bg}`}>
												{cardContent}
											</a>
										) : (
											<div className={`group relative overflow-hidden rounded-2xl aspect-square block ${bg}`}>{cardContent}</div>
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
			</div>
		</section>
	);
}
