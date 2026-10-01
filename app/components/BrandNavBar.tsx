import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Link from "~/components/LocaleLink";
import type { Locale } from "~/lib/i18n";

// Noon-style row for a brand page: a "Brand" dropdown (switch to another brand),
// the current brand as a removable chip, then that brand's collections as a
// horizontally scrollable strip. Everything is a real <a href>, and the brand
// list stays in the server-rendered HTML (just `hidden` until opened), so
// crawlers can follow it.

export interface BrandNavLink {
	key: string;
	label: string;
	href: string;
	count?: number;
	// Highlights the entry for the page currently being viewed.
	active?: boolean;
}

interface BrandNavBarProps {
	// Omit on pages with no selected brand (e.g. a collection page): no chip is shown.
	brandName?: string;
	brands: BrandNavLink[];
	collections: BrandNavLink[];
	locale: Locale;
}

const COPY = {
	en: { brand: "Brand", search: "Search", clear: "All brands", left: "Scroll left", right: "Scroll right" },
	ar: { brand: "الماركة", search: "بحث", clear: "كل الماركات", left: "التمرير لليسار", right: "التمرير لليمين" },
} as const;

export default function BrandNavBar({ brandName, brands, collections, locale }: BrandNavBarProps) {
	const copy = COPY[locale];
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const rootRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canLeft, setCanLeft] = useState(false);
	const [canRight, setCanRight] = useState(false);

	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const updateScrollState = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		// scrollLeft is negative in RTL, so compare magnitudes.
		const pos = Math.abs(el.scrollLeft);
		setCanLeft(pos > 4);
		setCanRight(pos + el.clientWidth < el.scrollWidth - 4);
	}, []);

	useEffect(() => {
		updateScrollState();
		window.addEventListener("resize", updateScrollState);
		return () => window.removeEventListener("resize", updateScrollState);
	}, [updateScrollState, collections.length]);

	function scrollByAmount(direction: 1 | -1) {
		const dir = locale === "ar" ? -direction : direction;
		scrollRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
	}

	const q = query.trim().toLowerCase();

	return (
		<div className="flex items-center gap-2 mb-6">
			<div ref={rootRef} className="relative flex-shrink-0 flex items-center gap-2">
				{brands.length > 0 && (
					<>
					<button
						type="button"
						onClick={() => setOpen((v) => !v)}
						aria-expanded={open}
						className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary text-sm font-medium"
					>
						{copy.brand}
						<ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
					</button>

					<div hidden={!open} className="absolute start-0 top-full mt-2 z-30 w-72 max-w-[85vw] bg-white rounded-xl border border-gray-200 shadow-lg p-3">
						<div className="relative mb-2">
							<Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder={copy.search}
								className="w-full ps-9 pe-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
							/>
						</div>
						<ul className="max-h-64 overflow-y-auto space-y-0.5 scrollbar-thin">
							{brands
								.filter((b) => !q || b.label.toLowerCase().includes(q))
								.map((b) => (
									<li key={b.key}>
										<Link
											to={b.href}
											onClick={() => setOpen(false)}
											className={`block px-2 py-2 rounded-md text-sm hover:bg-gray-100 hover:text-black ${b.label === brandName ? "font-semibold text-gray-900" : "text-gray-700"}`}
										>
											{b.label}
										</Link>
									</li>
								))}
						</ul>
					</div>
					</>
				)}

				{/* Current brand; the X goes back to the all-brands page. */}
				{brandName && (
					<Link
						to="/brands"
						aria-label={copy.clear}
						className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors whitespace-nowrap"
					>
						{brandName}
						<X size={14} />
					</Link>
				)}
			</div>

			{collections.length > 0 && (
				<div className="relative flex-1 min-w-0">
					<div ref={scrollRef} onScroll={updateScrollState} className="flex gap-2 overflow-x-auto scrollbar-hide">
						{collections.map((c) => (
							<Link
								key={c.key}
								to={c.href}
								aria-current={c.active ? "page" : undefined}
								className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${c.active ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-black"}`}
							>
								{c.label}
							</Link>
						))}
					</div>
					{canLeft && (
						<button
							type="button"
							onClick={() => scrollByAmount(-1)}
							aria-label={copy.left}
							className="absolute start-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100"
						>
							<ChevronLeft size={16} className="rtl:rotate-180" />
						</button>
					)}
					{canRight && (
						<button
							type="button"
							onClick={() => scrollByAmount(1)}
							aria-label={copy.right}
							className="absolute end-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100"
						>
							<ChevronRight size={16} className="rtl:rotate-180" />
						</button>
					)}
				</div>
			)}
		</div>
	);
}
