import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeCollectionItem } from "~/graphql/collection";
import type { SearchProductItem } from "~/graphql/product";
import ProductCard from "./ProductCard";

const PAGE_SIZE = 8;

interface ConcernResponse {
	items: SearchProductItem[];
	totalItems: number;
}

// Mirrors ProductCard's outer box (padding/border/radius/shadow) exactly so swapping
// from skeleton to real card doesn't change row heights or cause a layout jump.
function ProductCardSkeleton() {
	return (
		<div className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col h-full border border-gray-100 shadow-sm animate-pulse">
			<div className="aspect-square rounded-xl bg-gray-100" />
			<div className="flex flex-col items-center mt-2 gap-2 flex-1">
				<div className="h-3.5 w-4/5 bg-gray-100 rounded-full" />
				<div className="h-3.5 w-1/2 bg-gray-100 rounded-full" />
				<div className="h-4 w-16 bg-gray-100 rounded-full mt-1" />
			</div>
			<div className="mt-3 h-9 w-full bg-gray-100 rounded-full" />
		</div>
	);
}

export default function HomeShopByConcern({ collections, vendureBase }: { collections: HomeCollectionItem[]; vendureBase: string }) {
	const tabs = collections;
	const [activeSlug, setActiveSlug] = useState(tabs[0]?.slug ?? "");
	const [items, setItems] = useState<SearchProductItem[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [pillRect, setPillRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
	// Set from the very first render (seeded with the initial tab) and on every click,
	// cleared once that slug's data arrives — makes the skeleton grid appear on the same
	// render as the click/mount, with no empty frame in between (fetcher.state itself only
	// flips to "loading" a render later).
	const [loadingSlug, setLoadingSlug] = useState<string | null>(tabs[0]?.slug ?? null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const scrollRef = useRef<HTMLDivElement>(null);
	const fetcher = useFetcher<ConcernResponse>();
	const loadMoreFetcher = useFetcher<ConcernResponse>();

	const updateScrollState = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 4);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
	}, []);

	useEffect(() => {
		updateScrollState();
		window.addEventListener("resize", updateScrollState);
		return () => window.removeEventListener("resize", updateScrollState);
	}, [updateScrollState, tabs.length]);

	function scrollTabs(direction: "left" | "right") {
		scrollRef.current?.scrollBy({ left: direction === "left" ? -240 : 240, behavior: "smooth" });
	}

	// Measure the active tab's box so the sliding pill can animate to it exactly —
	// tabs are variable-width and horizontally scrollable, so no fixed formula works.
	// Also scroll the active tab into view if it's off-screen — done by hand against
	// scrollRef (not el.scrollIntoView, which scrolls every scrollable ancestor,
	// including the page itself — on mount that dragged the whole homepage down to
	// this section since it sits below the fold).
	useEffect(() => {
		const el = tabRefs.current.get(activeSlug);
		const container = scrollRef.current;
		if (!el) return;
		setPillRect({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
		if (!container) return;
		const elLeft = el.offsetLeft;
		const elRight = elLeft + el.offsetWidth;
		const viewLeft = container.scrollLeft;
		const viewRight = viewLeft + container.clientWidth;
		if (elLeft < viewLeft) {
			container.scrollTo({ left: elLeft - 16, behavior: "smooth" });
		} else if (elRight > viewRight) {
			container.scrollTo({ left: elRight - container.clientWidth + 16, behavior: "smooth" });
		}
	}, [activeSlug, tabs.length]);

	// Tab switch — client-fetch the first page for the newly selected concern
	useEffect(() => {
		if (!activeSlug) return;
		fetcher.load(`/api/concern-products?collectionSlug=${encodeURIComponent(activeSlug)}&skip=0&take=${PAGE_SIZE}`);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeSlug]);

	useEffect(() => {
		if (!fetcher.data) return;
		setItems(fetcher.data.items);
		setTotalItems(fetcher.data.totalItems);
		setLoadingSlug(null);
	}, [fetcher.data]);

	useEffect(() => {
		if (!loadMoreFetcher.data) return;
		setItems((prev) => [...prev, ...loadMoreFetcher.data!.items]);
	}, [loadMoreFetcher.data]);

	function handleLoadMore() {
		loadMoreFetcher.load(`/api/concern-products?collectionSlug=${encodeURIComponent(activeSlug)}&skip=${items.length}&take=${PAGE_SIZE}`);
	}

	if (tabs.length === 0) return null;

	const activeCollection = tabs.find((t) => t.slug === activeSlug);
	const loading = loadingSlug !== null || fetcher.state !== "idle";
	const loadingMore = loadMoreFetcher.state !== "idle";
	const hasMore = items.length < totalItems;

	return (
		<section className="pt-8 md:pt-10 pb-8 md:pb-10 container mx-auto px-4">
			<div className="mb-8 md:mb-10 text-center">
				<h2 className="font-heading text-3xl md:text-4xl font-extrabold text-black">Shop by Concern</h2>
				<p className="text-gray-500 text-sm mt-2">Find what fits your goals</p>
			</div>

			{/* Tabs — sliding pill, measured against each tab's own box so it works with
			    variable-width, horizontally-scrolling tabs */}
			<div className="relative mb-6">
				<div ref={scrollRef} onScroll={updateScrollState} className="relative flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
					<div
						className="absolute rounded-full bg-black transition-all duration-300 ease-out"
						style={{ left: pillRect.left, top: pillRect.top, width: pillRect.width, height: pillRect.height }}
					/>
					{tabs.map((c) => (
						<button
							key={c.id}
							ref={(el) => {
								if (el) tabRefs.current.set(c.slug, el);
							}}
							onClick={() => {
								if (c.slug === activeSlug) return;
								setActiveSlug(c.slug);
								setLoadingSlug(c.slug);
							}}
							className={`relative z-10 flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeSlug === c.slug ? "text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-black hover:text-black"}`}
						>
							{c.name}
						</button>
					))}
				</div>

				{canScrollLeft && (
					<>
						<div className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-stone-100 to-transparent pointer-events-none" />
						<button onClick={() => scrollTabs("left")} aria-label="Scroll tabs left" className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors">
							<ChevronLeft size={14} />
						</button>
					</>
				)}
				{canScrollRight && (
					<>
						<div className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-stone-100 to-transparent pointer-events-none" />
						<button onClick={() => scrollTabs("right")} aria-label="Scroll tabs right" className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors">
							<ChevronRight size={14} />
						</button>
					</>
				)}
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
				{/* Presentation panel — fills the 5th column left empty by the 4-col product grid */}
				<div className="col-span-2 sm:col-span-4 lg:col-span-1 lg:row-span-2 lg:col-start-1 lg:row-start-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#0f2a2f] p-6 flex flex-col justify-between min-h-[200px] lg:min-h-0">
					<div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-lime-300/20 blur-2xl pointer-events-none" />
					<div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-lime-300/10 blur-3xl pointer-events-none" />
					<Sparkles className="absolute bottom-4 right-4 text-white/10 pointer-events-none" size={96} strokeWidth={1} />

					<div className="relative z-10">
						<span className="inline-block bg-lime-300 text-black text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4">Shop by Concern</span>
						<h3 className="font-heading text-2xl font-extrabold text-white leading-tight">{activeCollection?.name ?? "Your Goals"}</h3>
						<p className="text-white/70 text-sm mt-2">Curated picks trusted by thousands, backed by science.</p>
					</div>

					<Link to={`/c/${activeSlug}`} className="relative z-10 mt-6 inline-flex items-center gap-1.5 text-white text-sm font-semibold hover:gap-2.5 transition-all w-fit">
						Explore all <ArrowRight size={15} />
					</Link>
				</div>

				{/* Products */}
				{!loading &&
					items.map((item, i) => (
						<div key={item.productVariantId}>
							<ProductCard product={item} vendureBase={vendureBase} eager={i < 4} />
						</div>
					))}

				{loading && Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)}

				{!loading && items.length === 0 && <p className="col-span-full lg:col-span-4 text-center text-gray-400 text-sm py-10">No products found for this concern yet.</p>}
			</div>

			{hasMore && (
				<div className="mt-8 flex justify-center">
					<button onClick={handleLoadMore} disabled={loadingMore} className="inline-flex items-center rounded-full bg-black text-white font-bold text-sm px-8 py-3 hover:bg-gray-800 transition-colors disabled:opacity-60">
						{loadingMore ? "Loading…" : "Load More"}
					</button>
				</div>
			)}
		</section>
	);
}
