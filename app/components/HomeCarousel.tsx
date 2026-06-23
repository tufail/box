import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { vendureImageUrl } from "./VendureImage";

function ConditionalLink({ href, children }: { href?: string; children: React.ReactNode }) {
	if (!href) return <>{children}</>;
	return <a href={href} className="block">{children}</a>;
}

export interface CarouselSlide {
	id: string;
	image: string;
	mobileImage?: string;
	label: string;
	href?: string;
}

const defaultSlides: CarouselSlide[] = [
	{ id: "1", image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1400&q=80", label: "Whey Protein" },
	{ id: "2", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=80", label: "Mass Gainer" },
	{ id: "3", image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1400&q=80", label: "Keto Meal" },
	{ id: "4", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1400&q=80", label: "Organic Protein" },
	{ id: "5", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80", label: "Gold Standard" },
];

export default function HomeCarousel({ items = defaultSlides, vendureBase = "" }: { items?: CarouselSlide[]; vendureBase?: string }) {
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1 }, [Autoplay({ delay: 5000, stopOnInteraction: false })]);

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		setScrollSnaps(emblaApi.scrollSnapList());
		emblaApi.on("select", onSelect);
		onSelect();
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi, onSelect]);

	return (
		<div>
			<div className="relative group">
				<div className="overflow-hidden rounded-xl" ref={emblaRef}>
				<div className="flex">
					{items.map((slide, index) => (
						<div key={slide.id} className="flex-none w-full">
							<ConditionalLink href={slide.href}>
								<picture>
									{slide.mobileImage && (
										<source
											media="(max-width: 767px)"
											srcSet={vendureImageUrl(slide.mobileImage, vendureBase, { w: 768, format: "webp", mode: "resize" })}
										/>
									)}
									<img
										src={vendureImageUrl(slide.image, vendureBase, { w: 1600, format: "webp", mode: "resize" })}
										alt={slide.label}
										className="w-full h-auto block"
										draggable={false}
										loading={index === 0 ? "eager" : "lazy"}
										fetchPriority={index === 0 ? "high" : "auto"}
									/>
								</picture>
							</ConditionalLink>
						</div>
					))}
				</div>
			</div>

			<button
				onClick={() => emblaApi?.scrollPrev()}
				aria-label="Previous slide"
				className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
			>
				<ChevronLeft size={14} />
			</button>

			<button
				onClick={() => emblaApi?.scrollNext()}
				aria-label="Next slide"
				className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
			>
				<ChevronRight size={14} />
			</button>

		</div>
		</div>
	);
}
