import { useCallback, useEffect, useState } from "react";
import Link from "~/components/LocaleLink";
import { useLocation } from "react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeCollectionItem } from "~/graphql/collection";
import VendureImage from "./VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";

interface Props {
	collections: HomeCollectionItem[];
	vendureBase: string;
}

// Matches a collection's name to an icon in public/icons/ (e.g. "Supplements"
// -> "supplements.svg"), same convention as ProductHighlights' HighlightIcon.
// No reliable way to know ahead of time whether that file exists, so this
// just tries to load it and falls back to the original big-letter tile via
// the <img>'s onError if it 404s.
function slugify(label: string) {
	return label
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function CategoryFallback({ name }: { name: string }) {
	const [iconFailed, setIconFailed] = useState(false);
	const iconSrc = `/icons/${slugify(name)}.svg`;

	if (iconFailed) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<span className="text-4xl font-bold text-amber-200">{name[0]}</span>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex items-center justify-center">
			{/* Hidden — only here to detect via onError whether the icon file exists.
			    The visible icon below is rendered as a CSS mask (not <img src>) since
			    an <img>-loaded SVG's currentColor doesn't inherit the page's CSS —
			    masking is what actually lets bg-primary tint it. */}
			<img src={iconSrc} alt="" className="hidden" onError={() => setIconFailed(true)} />
			<div
				className="w-10 h-10 bg-primary"
				style={{
					WebkitMaskImage: `url(${iconSrc})`,
					maskImage: `url(${iconSrc})`,
					WebkitMaskRepeat: "no-repeat",
					maskRepeat: "no-repeat",
					WebkitMaskSize: "contain",
					maskSize: "contain",
					WebkitMaskPosition: "center",
					maskPosition: "center",
				}}
			/>
		</div>
	);
}

export default function HomeFeaturedCollections({ collections, vendureBase }: Props) {
	if (collections.length === 0) return null;

	return <CollectionScroll collections={collections} vendureBase={vendureBase} />;
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
		<section className="py-2 md:py-4 container mx-auto px-4" aria-label={locale === "ar" ? "تسوّق حسب الفئة" : "Shop by Category"}>
			<div className="relative">
				<button onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label={locale === "ar" ? "المجموعات السابقة" : "Previous collections"} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-4 rtl:translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none">
					<ChevronLeft size={14} className="rtl:rotate-180" />
				</button>

				<div className="overflow-hidden" ref={emblaRef}>
					<div className="flex -mx-3" role="list" aria-label={locale === "ar" ? "مجموعات المنتجات" : "Product collections"}>
						{collections.map((col) => (
							<div key={col.id} className="flex-none w-[120px] md:w-[140px] px-3" role="listitem">
								{/* 1px gradient "border" — solid for the top 70% of the card, fading to
								    transparent over the bottom 30% so it merges into the page background. */}
								<div className="rounded-xl p-px" style={{ background: "linear-gradient(to bottom, rgba(209,213,219,0.3) 0%, rgba(209,213,219,0.3) 70%, transparent 100%)" }}>
									<Link to={`/c/${col.slug}`} className="group block rounded-xl">
										<div className="overflow-hidden rounded-xl bg-stone-100">
											<div className="aspect-square overflow-hidden bg-gradient-to-b from-[#e8a08f]/30 via-[#e8a08f]/30 via-40% to-stone-100 to-70% py-1 px-3">
												{col.featuredAsset ? (
													<VendureImage src={col.featuredAsset.preview} vendureBase={vendureBase} alt={col.name} width={400} height={400} objectFit="contain" imgClassName="group-hover:scale-105 transition-transform duration-300" />
												) : (
													<CategoryFallback name={col.name} />
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
