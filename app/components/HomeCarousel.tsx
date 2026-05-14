import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

export interface CarouselSlide {
	id: number;
	image: string;
	label: string;
	href?: string;
}

const defaultSlides: CarouselSlide[] = [
	{ id: 1, image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1400&q=80", label: "Whey Protein" },
	{ id: 2, image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=80", label: "Mass Gainer" },
	{ id: 3, image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1400&q=80", label: "Keto Meal" },
	{ id: 4, image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1400&q=80", label: "Organic Protein" },
	{ id: 5, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80", label: "Gold Standard" },
];

export default function HomeCarousel({ items = defaultSlides }: { items?: CarouselSlide[] }) {
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
		<div className="bg-white mt-2 md:mt-4 lg:mt-4 relative">
			<div className="relative container mx-auto px-4" style={{ height: "clamp(280px, 40vw, 480px)" }}>
				<div className="overflow-hidden h-full" ref={emblaRef}>
					<div className="flex h-full">
						{items.map((slide, index) => (
							<div key={slide.id} className="flex-none w-full h-full">
								<img src={slide.image} alt={slide.label} width={1400} height={480} className="w-full h-full object-cover" draggable={false} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
							</div>
						))}
					</div>
				</div>

				{/* Dot indicators — single overlay, centred at the bottom of the image */}
				{scrollSnaps.length > 1 && (
					<div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 pointer-events-none">
						{scrollSnaps.map((_, i) => (
							<button key={i} onClick={() => emblaApi?.scrollTo(i)} aria-label={`Go to slide ${i + 1}`} className={`pointer-events-auto rounded-full transition-all duration-300 ${i === selectedIndex ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"}`} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
