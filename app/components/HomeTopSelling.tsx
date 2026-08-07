import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useLocation } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "~/components/LocaleLink";
import type { SearchProductItem } from "~/graphql/product";
import ProductCard from "./ProductCard";
import { getLocaleFromPathname } from "~/lib/i18n";

interface Props {
	products: SearchProductItem[];
	vendureBase: string;
	title?: React.ReactNode;
	viewAllHref?: string;
}

export default function HomeTopSelling({ products, vendureBase, title, viewAllHref }: Props) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const resolvedTitle = title ?? (locale === "ar" ? "الأكثر مبيعًا" : "Best-Sellers Edition");
	// embla has its own RTL mode (correct scroll-physics/drag direction for
	// right-to-left content) rather than something achievable by just mirroring
	// CSS — "prev"/"next" stay semantically correct in both directions this way.
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

	if (products.length === 0) return null;

	return (
		<section className="py-2 md:py-4 container mx-auto px-4" aria-labelledby="home-top-selling-title">
			<div className="mb-4 md:mb-5 flex items-center justify-between gap-4">
				<h2 id="home-top-selling-title" className="font-heading2 text-2xl font-extrabold text-black">
					{resolvedTitle}
				</h2>
				{viewAllHref && (
					<Link to={viewAllHref} aria-label={locale === "ar" ? "عرض جميع المنتجات" : "View all products"} className="flex-shrink-0 inline-flex items-center rounded-full border border-black text-black font-bold text-xs px-4 py-1.5 hover:bg-black hover:text-white transition-colors">
						{locale === "ar" ? "عرض الكل" : "View All"}
					</Link>
				)}
			</div>

			<div className="relative">
				<button onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label={locale === "ar" ? "المنتجات السابقة" : "Previous products"} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-4 rtl:translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronLeft size={14} className="rtl:rotate-180" />
				</button>

				<div className="overflow-hidden py-1 pb-3 -my-1 -mb-3" ref={emblaRef}>
					<div className="flex -mx-2" role="list" aria-label={locale === "ar" ? "المنتجات المميزة" : "Featured products"}>
						{products.map((product, index) => (
							<div key={product.productVariantId} className="flex-none w-1/2 md:w-1/4 lg:w-1/5 px-2" role="listitem">
								<ProductCard product={product} vendureBase={vendureBase} eager={index < 4} />
							</div>
						))}
					</div>
				</div>

				<button onClick={() => emblaApi?.scrollNext()} disabled={!canNext} aria-label={locale === "ar" ? "المنتجات التالية" : "Next products"} className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-4 rtl:-translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronRight size={14} className="rtl:rotate-180" />
				</button>
			</div>
		</section>
	);
}
