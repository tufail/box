import { useCallback, useEffect, useState } from "react";
import Link from "~/components/LocaleLink";
import { useLocation } from "react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeCollectionItem } from "~/graphql/collection";
import VendureImage from "./VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";

interface Props {
	topLevelCollections: HomeCollectionItem[];
	subCollections: HomeCollectionItem[];
	vendureBase: string;
}

export default function HomeFeaturedCollections({ topLevelCollections, subCollections, vendureBase }: Props) {
	const allCollections = [...topLevelCollections, ...subCollections];
	if (allCollections.length === 0) return null;

	return <CollectionScroll collections={allCollections} vendureBase={vendureBase} />;
}

function CollectionScroll({ collections, vendureBase }: { collections: HomeCollectionItem[]; vendureBase: string }) {
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
		<section className="py-8 md:py-10 container mx-auto px-4" aria-labelledby="featured-collections-title">
			<div className="mb-6 md:mb-8 text-center">
				<h2 id="featured-collections-title" className="font-heading text-3xl md:text-4xl font-extrabold text-black">
					{locale === "ar" ? "تسوّق حسب المجموعة" : "Shop by Collection"}
				</h2>
				<p className="text-gray-500 text-sm mt-2">{locale === "ar" ? "اكتشف مجموعات المنتجات التي تناسب اهتماماتك." : "Explore curated product collections that match your interests."}</p>
			</div>
			<div className="relative">
				<button onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label={locale === "ar" ? "المجموعات السابقة" : "Previous collections"} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-4 rtl:translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronLeft size={14} className="rtl:rotate-180" />
				</button>

				<div className="overflow-hidden" ref={emblaRef}>
					<div className="flex -mx-2" role="list" aria-label={locale === "ar" ? "مجموعات المنتجات" : "Product collections"}>
						{collections.map((col) => (
							<div key={col.id} className="flex-none w-[120px] md:w-[140px] px-2" role="listitem">
								{/* 1px gradient "border" — solid for the top 70% of the card, fading to
								    transparent over the bottom 30% so it merges into the page background. */}
								<div className="rounded-xl p-px" style={{ background: "linear-gradient(to bottom, rgba(209,213,219,0.3) 0%, rgba(209,213,219,0.3) 70%, transparent 100%)" }}>
									<Link to={`/c/${col.slug}`} className="group block rounded-xl">
										<div className="overflow-hidden rounded-xl bg-stone-100">
											<div className="aspect-square overflow-hidden bg-gradient-to-b from-white via-white via-40% to-stone-100 to-70%">
												{col.featuredAsset ? (
													<VendureImage src={col.featuredAsset.preview} vendureBase={vendureBase} alt={col.name} width={400} height={400} objectFit="contain" imgClassName="mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<span className="text-4xl font-bold text-amber-200">{col.name[0]}</span>
													</div>
												)}
											</div>
											<div className="pt-3 pb-1 text-center px-1 bg-stone-100 -mt-5 relative z-10">
												<span className="block text-xs font-semibold text-gray-900 group-hover:text-primary transition-colors duration-200 leading-[0.9]">{col.name}</span>
											</div>
										</div>
									</Link>
								</div>
							</div>
						))}
					</div>
				</div>

				<button onClick={() => emblaApi?.scrollNext()} disabled={!canNext} aria-label={locale === "ar" ? "المجموعات التالية" : "Next collections"} className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-4 rtl:-translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronRight size={14} className="rtl:rotate-180" />
				</button>
			</div>
		</section>
	);
}
