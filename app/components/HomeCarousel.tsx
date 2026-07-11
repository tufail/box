import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { vendureImageUrl } from "./VendureImage";

export interface CarouselSlide {
	id: string;
	image: string;
	mobileImage?: string;
	label: string;
	href?: string;
	hideTitle?: boolean;
	titlePosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const defaultSlides: CarouselSlide[] = [
	{ id: "1", image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1400&q=80", label: "Whey Protein" },
	{ id: "2", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=80", label: "Mass Gainer" },
	{ id: "3", image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1400&q=80", label: "Keto Meal" },
	{ id: "4", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1400&q=80", label: "Organic Protein" },
	{ id: "5", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80", label: "Gold Standard" },
];

const AUTOPLAY_DELAY = 7000;
const TRANSITION_MS = 700;

// depth 0 = front/active, higher depth = further back, peeking out to the right.
// Position (x), vertical inset, and opacity are the only moving parts — no scale — so
// entering and leaving a position is always a plain mirror-image slide + fade of the
// same path. Peek cards all share the same modest 10px-shorter height (not compounding
// per depth) and step 5px further right each level back.
const DEPTH_STYLES = [
	{ x: 0, inset: 0, opacity: 1, z: 30 },
	{ x: 5, inset: 5, opacity: 0.85, z: 20 },
	{ x: 10, inset: 5, opacity: 0.6, z: 10 },
	{ x: 15, inset: 5, opacity: 0, z: 0 },
];

function depthOf(index: number, selected: number, total: number) {
	const d = (index - selected + total) % total;
	return Math.min(d, DEPTH_STYLES.length - 1);
}

export default function HomeCarousel({ items = defaultSlides, vendureBase = "" }: { items?: CarouselSlide[]; vendureBase?: string }) {
	const total = items.length;
	const [selectedIndex, setSelectedIndex] = useState(0);
	const selectedIndexRef = useRef(0);

	useEffect(() => {
		selectedIndexRef.current = selectedIndex;
	}, [selectedIndex]);

	const goTo = useCallback(
		(newIndex: number) => {
			setSelectedIndex(((newIndex % total) + total) % total);
		},
		[total]
	);

	// Restarting on selectedIndex gives each newly-active slide a full AUTOPLAY_DELAY
	// window (manual navigation resets the countdown too), which keeps the active dot's
	// fill indicator in sync with when the next auto-advance will actually happen.
	useEffect(() => {
		if (total <= 1) return;
		const timer = setTimeout(() => goTo(selectedIndexRef.current + 1), AUTOPLAY_DELAY);
		return () => clearTimeout(timer);
	}, [total, goTo, selectedIndex]);

	const touchStartX = useRef<number | null>(null);
	function onTouchStart(e: React.TouchEvent) {
		touchStartX.current = e.touches[0].clientX;
	}
	function onTouchEnd(e: React.TouchEvent) {
		if (touchStartX.current === null) return;
		const delta = e.changedTouches[0].clientX - touchStartX.current;
		if (Math.abs(delta) > 40) {
			goTo(selectedIndexRef.current + (delta < 0 ? 1 : -1));
		}
		touchStartX.current = null;
	}

	return (
		<div className="relative group">
			<div
				className={`relative h-[220px] sm:h-[240px] ${total > 1 ? "pr-3" : ""}`}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
			>
				{items.map((slide, index) => {
					const depth = depthOf(index, selectedIndex, total);
					const style = DEPTH_STYLES[depth];
					const isFront = depth === 0;
					const isPeekVisible = depth > 0 && depth <= 2;

					return (
						<a
							key={slide.id}
							href={isFront ? slide.href || undefined : undefined}
							className="absolute left-0 right-0 rounded-xl overflow-hidden block"
							style={{
								top: style.inset,
								bottom: style.inset,
								transform: `translateX(${style.x}px)`,
								opacity: style.opacity,
								zIndex: style.z,
								transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${TRANSITION_MS}ms ease`,
								pointerEvents: isFront || isPeekVisible ? "auto" : "none",
								cursor: isFront ? (slide.href ? "pointer" : "default") : "pointer",
							}}
							onClick={(e) => {
								if (!isFront) {
									e.preventDefault();
									goTo(index);
								}
							}}
						>
							<picture className="block w-full h-full">
								{slide.mobileImage && (
									<source
										media="(max-width: 767px)"
										srcSet={vendureImageUrl(slide.mobileImage, vendureBase, { w: 768, format: "webp", mode: "resize" })}
									/>
								)}
								<img
									src={vendureImageUrl(slide.image, vendureBase, { w: 1600, format: "webp", mode: "resize" })}
									alt={slide.label}
									className="w-full h-full object-cover block"
									draggable={false}
									loading={index === 0 ? "eager" : "lazy"}
									fetchPriority={index === 0 ? "high" : "auto"}
								/>
							</picture>

							{!isFront && <div className="absolute inset-0 bg-black/25" />}

							{isFront && !slide.hideTitle && (() => {
								const position = slide.titlePosition ?? "bottom-left";
								const isTop = position.startsWith("top");
								const isRightAlign = position.endsWith("right");
								// Darken from whichever corner the title sits in, fading toward the opposite corner.
								const gradientDirection = isTop
									? isRightAlign ? "bg-gradient-to-bl" : "bg-gradient-to-br"
									: isRightAlign ? "bg-gradient-to-tl" : "bg-gradient-to-tr";
								return (
									<>
										<div
											className={`absolute inset-0 pointer-events-none ${gradientDirection} from-black/60 via-black/15 via-40% to-transparent`}
										/>
										<div
											className={`absolute p-4 sm:p-6 flex flex-col gap-2 ${isTop ? "top-0" : "bottom-0"} ${isRightAlign ? "right-0 items-end text-right" : "left-0 items-start"}`}
										>
											<h2 className="font-heading text-white font-black text-xl sm:text-3xl md:text-4xl leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] max-w-[220px] sm:max-w-xs">
												{slide.label}
											</h2>
											{slide.href && (
												<span className="inline-flex items-center rounded-full bg-white text-primary font-extrabold text-sm sm:text-base px-4 py-2 shadow-lg hover:bg-gray-100 transition-colors">
													Shop Now
												</span>
											)}
										</div>
									</>
								);
							})()}
						</a>
					);
				})}
			</div>

			{total > 1 && (
				<>
					<button
						onClick={() => goTo(selectedIndex - 1)}
						aria-label="Previous slide"
						className="absolute left-2.5 top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
					>
						<ChevronLeft size={14} />
					</button>

					<button
						onClick={() => goTo(selectedIndex + 1)}
						aria-label="Next slide"
						className="absolute right-2.5 top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
					>
						<ChevronRight size={14} />
					</button>

					<div className="absolute left-1/2 -translate-x-1/2 bottom-2 sm:bottom-3 z-40 flex items-center gap-2">
						{items.map((slide, index) => {
							const isActive = index === selectedIndex;
							return (
								<button
									key={slide.id}
									onClick={() => goTo(index)}
									aria-label={`Go to slide ${index + 1}`}
									className={`relative h-2.5 rounded-full overflow-hidden transition-all ${isActive ? "w-7 bg-white/30" : "w-2.5 bg-white/50 hover:bg-white/75"}`}
								>
									{isActive && (
										<span
											className="absolute inset-y-0 left-0 bg-white rounded-full animate-dot-fill"
											style={{ animationDuration: `${AUTOPLAY_DELAY}ms` }}
										/>
									)}
								</button>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
