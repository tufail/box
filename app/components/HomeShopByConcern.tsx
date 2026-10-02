import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, Bone, ChevronLeft, ChevronRight, Dumbbell, Moon, Scale, Smile } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BannerItem } from "~/graphql/banner";
import { vendureImageUrl } from "./VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";

// The banner plugin only supplies title/description/image/url, so the icon badge and
// quick-link chips are matched by (lower-cased) title. Every chip links to a collection
// page; unmatched goals render without chips and with a generic icon. The store has no
// dedicated Collagen / Vitamins / Muscle Recovery collections, so those point at the
// closest existing one.
const C = {
	hairSkinNails: "/c/supplements/hair-skin-nails",
	supplements: "/c/supplements",
	weightLoss: "/c/supplements/weight-loss",
	weightGain: "/c/supplements/weight-gain-wellbeing",
	protein: "/c/sports-nutrition/protein",
	creatine: "/c/sports-nutrition/creatine",
	bcaa: "/c/sports-nutrition/bcaa-amino-acids",
	sleep: "/c/supplements/sleep",
	recovery: "/c/sports-nutrition/post-workout-recovery",
	hydration: "/c/sports-nutrition/hydration-electrolytes",
	boneJoint: "/c/supplements/bone-joint-cartilage",
};
type Chip = { label: string; path: string };
const GOAL_META: Record<string, { icon: LucideIcon; chips: Chip[] }> = {
	"skin, hair & nails": { icon: Smile, chips: [{ label: "Hair, Skin & Nails", path: C.hairSkinNails }, { label: "Collagen", path: C.hairSkinNails }, { label: "Vitamins", path: C.supplements }] },
	"weight management": { icon: Scale, chips: [{ label: "Weight Loss", path: C.weightLoss }, { label: "Weight Gain", path: C.weightGain }, { label: "Protein", path: C.protein }] },
	"muscle & strength": { icon: Dumbbell, chips: [{ label: "Protein", path: C.protein }, { label: "Creatine", path: C.creatine }, { label: "BCAA & Amino Acids", path: C.bcaa }] },
	"sleep & recovery": { icon: Moon, chips: [{ label: "Sleep", path: C.sleep }, { label: "Muscle Recovery", path: C.recovery }, { label: "Hydration & Electrolytes", path: C.hydration }] },
	"joint & bone health": { icon: Bone, chips: [{ label: "Bone, Joint & Cartilage", path: C.boneJoint }, { label: "Collagen", path: C.boneJoint }, { label: "Vitamins", path: C.supplements }] },
};

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
		<section className="relative py-2 md:py-4 bg-white">
			<div className="container mx-auto px-4">
				<div className="h-14 w-72 max-w-full mx-auto bg-black/10 rounded mb-8 animate-pulse" />
				<div className="flex gap-4">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="flex-none w-[78%] sm:w-1/2 md:w-1/3 lg:w-1/5">
							<div className="h-[26rem] w-full rounded-3xl bg-black/10 animate-pulse" />
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function ConcernScroll({ items, vendureBase }: { items: BannerItem[]; vendureBase: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const ar = locale === "ar";
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: "start",
		slidesToScroll: "auto",
		containScroll: "trimSnaps",
		direction: ar ? "rtl" : "ltr",
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

	const arrowCls = "absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white text-primary shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none";

	return (
		<section className="relative py-2 md:py-4 bg-white" aria-labelledby="shop-by-concern-title">
			<div className="container mx-auto px-4">
				<div className="mb-4 md:mb-5">
					<h2 id="shop-by-concern-title" className="font-heading2 text-2xl font-extrabold text-black">
						{ar ? "تسوّق حسب الهدف" : "Shop by Goal"}
					</h2>
				</div>

				<div className="relative">
					<button onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev} aria-label={ar ? "العناصر السابقة" : "Previous items"} className={`${arrowCls} start-0 -translate-x-3 rtl:translate-x-3`}>
						<ChevronLeft size={18} className="rtl:rotate-180" />
					</button>

					<div className="overflow-hidden pt-2 pb-6 -mt-2" ref={emblaRef}>
						<div className="flex -mx-2" role="list" aria-label={ar ? "احتياجات التسوق" : "Shopping concerns"}>
							{items.map((item, i) => {
								const href = normalizeDestination(item.url);
								const meta = GOAL_META[item.title.trim().toLowerCase()];
								const Icon = meta?.icon ?? Smile;
								const teal = i % 2 === 1;
								const lines = (item.description ?? "").split(/\r?\n|(?<=[.!?])\s+/).filter(Boolean);
								const cta = (
									<span className="inline-flex items-center justify-between gap-6 rounded-full bg-primary text-white font-bold text-sm ps-6 pe-1.5 py-1.5 group-hover:bg-[#1a3d42] transition-colors">
										{ar ? "تسوق الآن" : "Shop Now"}
										<span className="w-8 h-8 rounded-full border border-white/80 flex items-center justify-center">
											<ArrowRight size={16} className="rtl:rotate-180" />
										</span>
									</span>
								);
								return (
									<div key={item.id} className="flex-none w-[78%] sm:w-1/2 md:w-1/3 lg:w-1/5 px-2" role="listitem">
										<div className="group relative h-full bg-white rounded-3xl shadow-[0_6px_24px_rgba(34,77,83,0.08)] overflow-hidden flex flex-col">
											<div className="relative aspect-[4/3.6] bg-gray-100" style={{ clipPath: "polygon(0 0, 100% 0, 100% 88%, 0 100%)" }}>
												{item.assetPreview && (
													<img src={vendureImageUrl(item.assetPreview, vendureBase, { preset: "large", format: "webp" })} alt={item.description || item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
												)}
											</div>
											<div className="relative px-4 pb-5 -mt-7 flex flex-col flex-1">
												<span className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-sm ${teal ? "bg-primary" : "bg-[#e58a78]"}`}>
													<Icon size={26} strokeWidth={1.5} />
												</span>
												<h3 className="font-heading font-extrabold text-xl leading-tight text-primary mt-2">{item.title}</h3>
												{lines.length > 0 && (
													<p className="text-gray-600 text-sm leading-snug mt-1">
														{lines.map((l, idx) => (
															<span key={idx} className="block">{l}</span>
														))}
													</p>
												)}
												{meta && (
													<div className="flex flex-wrap gap-2 mt-3">
														{meta.chips.map((chip) => (
															<a key={chip.label} href={`${ar ? "/ar" : ""}${chip.path}`} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-primary hover:border-primary hover:bg-primary/5 transition-colors">
																{chip.label}
																<ChevronRight size={12} className="rtl:rotate-180" />
															</a>
														))}
													</div>
												)}
												<div className="mt-auto pt-4">
													{href ? (
														<a href={href} className="inline-block" aria-label={item.title}>{cta}</a>
													) : (
														cta
													)}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					<button onClick={() => emblaApi?.scrollNext()} disabled={!canNext} aria-label={ar ? "العناصر التالية" : "Next items"} className={`${arrowCls} end-0 translate-x-3 rtl:-translate-x-3`}>
						<ChevronRight size={18} className="rtl:rotate-180" />
					</button>
				</div>
			</div>
		</section>
	);
}
