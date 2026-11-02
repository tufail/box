import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useLocation } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "~/components/LocaleLink";
import BrandLogo from "~/components/BrandLogo";
import { getLocaleFromPathname } from "~/lib/i18n";
import { FEATURED_BRANDS } from "~/lib/featuredBrands";

export default function HomeTopBrands() {
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
		<section className="py-2 md:py-4 container mx-auto px-4" aria-labelledby="home-top-brands-title">
			<div className="mb-4 md:mb-5 flex items-center justify-between gap-4">
				<h2 id="home-top-brands-title" className="font-heading2 text-2xl font-extrabold text-black">
					{locale === "ar" ? "أشهر العلامات التجارية" : "Top Brands"}
				</h2>
				<Link to="/brands" aria-label={locale === "ar" ? "عرض جميع العلامات التجارية" : "View all brands"} className="flex-shrink-0 inline-flex items-center rounded-full border border-black text-black font-bold text-xs px-4 py-1.5 hover:bg-black hover:text-white transition-colors">
					{locale === "ar" ? "عرض الكل" : "View All"}
				</Link>
			</div>

			<div className="relative">
				<button onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label={locale === "ar" ? "العلامات السابقة" : "Previous brands"} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-4 rtl:translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronLeft size={14} className="rtl:rotate-180" />
				</button>

				<div className="overflow-hidden" ref={emblaRef}>
					<ul className="flex -mx-2">
						{FEATURED_BRANDS.map((brand) => (
							<li key={brand.code} className="flex-none w-1/2 md:w-1/4 lg:w-1/5 px-2">
								<Link to={`/brands/${brand.code}`} aria-label={brand.name} className="group flex flex-col aspect-[3/4] rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-gray-400 transition-colors">
									{brand.banner ? (
										<img src={brand.banner} alt={brand.bannerAlt ?? brand.name} width={720} height={1201} className="w-full h-full object-cover object-top" loading="lazy" />
									) : (
										<>
											<BrandLogo code={brand.code} name={brand.name} className="w-full flex-1" rounded="rounded-none" padding="p-8" />
											<span className="block px-3 pb-4 text-center text-sm font-bold text-gray-900 group-hover:underline">{brand.name}</span>
										</>
									)}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<button onClick={() => emblaApi?.scrollNext()} disabled={!canNext} aria-label={locale === "ar" ? "العلامات التالية" : "Next brands"} className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-4 rtl:-translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronRight size={14} className="rtl:rotate-180" />
				</button>
			</div>
		</section>
	);
}
