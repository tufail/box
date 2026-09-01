import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router";
import { Search, X } from "lucide-react";
import type { SearchSuggestionsResponse, SearchSuggestionItem, SearchSuggestionCollection, SearchSuggestionFacetValue } from "~/graphql/search";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { formatPrice as formatCurrency } from "~/lib/currency";
import { useTypewriter } from "~/hooks/useTypewriter";
import { useFocusTrap } from "~/hooks/useFocusTrap";
import VendureImage from "~/components/VendureImage";

function highlight(text: string, term: string) {
	const idx = text.toLowerCase().indexOf(term.toLowerCase());
	if (idx === -1 || !term) return <span>{text}</span>;
	return (
		<>
			{text.slice(0, idx)}
			<strong className="font-semibold text-primary">{text.slice(idx, idx + term.length)}</strong>
			{text.slice(idx + term.length)}
		</>
	);
}

interface ProductRowProps {
	item: SearchSuggestionItem;
	term: string;
	onSelect: () => void;
	locale: Locale;
	inStockLabel: string;
	soldOutLabel: string;
	vendureBase: string;
}
function formatPrice(price: SearchSuggestionItem["price"], locale: Locale) {
	const fmt = (cents: number) => formatCurrency(cents, "QAR", locale);
	if ("value" in price) return fmt(price.value);
	return price.min === price.max ? fmt(price.min) : `${fmt(price.min)} – ${fmt(price.max)}`;
}

function ProductRow({ item, term, onSelect, locale, inStockLabel, soldOutLabel, vendureBase }: ProductRowProps) {
	const imagePreview = item.productVariantAsset?.preview ?? item.productAsset?.preview;
	// Same precedence as ProductCard: the variant's own name is the fuller,
	// more specific one (e.g. includes flavor/size) — falls back to the bare
	// product name only when a product has no distinct variant name.
	const displayName = item.productVariantName || item.productName;
	return (
		<button onMouseDown={onSelect} className="w-full text-start px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 flex items-center gap-3 transition-colors cursor-pointer">
			{imagePreview ? (
				// Same VendureImage component (and blur-up-then-sharp loading) every
				// other product image on the site uses — real alt text, width/height,
				// lazy loading — instead of a bare <img> with no SEO signal at all.
				<div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100">
					<VendureImage src={imagePreview} vendureBase={vendureBase} alt={displayName} width={40} height={40} objectFit="cover" />
				</div>
			) : (
				<span className="w-10 h-10 flex items-center justify-center flex-shrink-0 text-gray-300">
					<Search size={14} />
				</span>
			)}
			<span className="text-sm text-gray-800 line-clamp-2 flex-1">{highlight(displayName, term)}</span>
			<span className="flex flex-col items-end gap-0.5 flex-shrink-0">
				<span className="text-sm font-medium text-primary whitespace-nowrap">{formatPrice(item.price, locale)}</span>
				<span className={`text-[10px] font-medium whitespace-nowrap ${item.inStock ? "text-green-600" : "text-gray-400"}`}>{item.inStock ? inStockLabel : soldOutLabel}</span>
			</span>
		</button>
	);
}

interface CollectionChipProps {
	col: SearchSuggestionCollection;
	term: string;
	onSelect: () => void;
}
function CollectionChip({ col, term, onSelect }: CollectionChipProps) {
	return (
		<button onMouseDown={onSelect} className="inline-flex items-center gap-1 px-3 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:border-primary hover:text-primary transition-colors whitespace-nowrap cursor-pointer">
			{highlight(col.collection.name, term)}
			<span className="text-[10px] text-gray-400">{col.count}</span>
		</button>
	);
}

interface FacetChipProps {
	fv: SearchSuggestionFacetValue;
	term: string;
	onSelect: () => void;
}
function FacetChip({ fv, term, onSelect }: FacetChipProps) {
	return (
		<button onMouseDown={onSelect} className="inline-flex items-center px-3 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:border-primary hover:text-primary transition-colors whitespace-nowrap cursor-pointer">
			{highlight(fv.facetValue.name, term)}
		</button>
	);
}

function SectionLabel({ label }: { label: string }) {
	return <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">{label}</div>;
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const SEARCH_COPY = {
	en: {
		search: "Search",
		closeSearch: "Close search",
		products: "Products",
		collections: "Collections",
		brands: "Brands",
		inStock: "In Stock",
		soldOut: "Sold Out",
		// "Search: " itself stays fixed in the placeholder — only this part types/deletes.
		searchPrefix: "Search: ",
		typingCategories: ["Whey Protein", "Creatine", "Pre-Workout", "Vitamins", "Mass Gainers"],
		startTyping: "Start typing to search products, brands and collections.",
		searching: "Searching…",
		noResultsFor: (term: string) => `No results found for "${term}"`,
	},
	ar: {
		search: "بحث",
		closeSearch: "إغلاق البحث",
		products: "المنتجات",
		collections: "التصنيفات",
		brands: "العلامات التجارية",
		inStock: "متوفر",
		soldOut: "نفدت الكمية",
		searchPrefix: "بحث: ",
		typingCategories: ["بروتين واي", "كرياتين", "ما قبل التمرين", "فيتامينات", "مكملات زيادة الوزن"],
		startTyping: "ابدأ الكتابة للبحث عن المنتجات والعلامات التجارية والتصنيفات.",
		searching: "جارٍ البحث…",
		noResultsFor: (term: string) => `لم يتم العثور على نتائج لـ "${term}"`,
	},
} as const;

// How much wider the expanded overlay grows past the trigger's own width —
// capped so it doesn't sprawl the full viewport on a huge monitor.
const EXPANDED_MAX_WIDTH = 640;

interface Anchor {
	top: number;
	width: number;
	// Which physical edge stays pinned to the trigger's own edge while the
	// panel grows — toward whichever side of the trigger has more room, so it
	// always expands toward open space (the header's center) instead of
	// potentially running off-screen or crowding the cart/account icons.
	edge: "left" | "right";
	offset: number;
}

export default function SearchBox() {
	const [term, setTerm] = useState("");
	const [results, setResults] = useState<SearchSuggestionsResponse | null>(null);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	// Where the overlay grows from — the trigger's own on-screen position, so it
	// reads as "this input expanded" rather than a dialog appearing somewhere
	// else on the page. Computed fresh on every open (the trigger's on-screen
	// position can change between opens: page scroll, viewport resize, etc).
	const [anchor, setAnchor] = useState<Anchor | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const navigate = useNavigate();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = SEARCH_COPY[locale];
	// Only the category name types/deletes — "Search: " itself is a constant part
	// of the string, not part of the animation. Stops once the user's own text is
	// showing instead of the placeholder anyway, no point burning timers in the background.
	const typedCategory = useTypewriter(t.typingCategories, term.length === 0);

	const close = useCallback(() => setOpen(false), []);
	useFocusTrap(dialogRef, open, close);

	function openOverlay() {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (rect) {
			const spaceLeft = rect.left;
			const spaceRight = window.innerWidth - rect.right;
			// Grow into whichever side has more room. The trigger typically sits
			// off-center in the header (next to the logo/nav on one side, cart/
			// account icons on the other), so this is what keeps the expanded
			// panel reaching toward the open middle of the page instead of
			// crowding those icons or clipping against the viewport edge.
			if (spaceLeft > spaceRight) {
				setAnchor({ top: rect.top, edge: "right", offset: window.innerWidth - rect.right, width: Math.min(rect.width + spaceLeft, EXPANDED_MAX_WIDTH) });
			} else {
				setAnchor({ top: rect.top, edge: "left", offset: rect.left, width: Math.min(rect.width + spaceRight, EXPANDED_MAX_WIDTH) });
			}
		}
		setOpen(true);
	}

	// Reset to a clean slate each time the overlay closes, same as the previous
	// full-screen search design — there's no persisted "recent searches" store,
	// so leaving stale results behind between opens would be more confusing
	// than starting fresh.
	useEffect(() => {
		if (!open) {
			setTerm("");
			setResults(null);
		}
	}, [open]);

	const fetchSuggestions = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults(null);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${locale}`);
			const data: SearchSuggestionsResponse = await res.json();
			setResults(data);
		} catch {
			setResults(null);
		} finally {
			setLoading(false);
		}
	}, [locale]);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => fetchSuggestions(term), 300);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [term, fetchSuggestions]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (term.trim()) {
			setOpen(false);
			navigate(localizePath(`/search?q=${encodeURIComponent(term.trim())}`, locale));
		}
	};

	const selectProduct = (slug: string) => {
		setOpen(false);
		navigate(localizePath(`/products/${slug}`, locale));
	};

	const selectCollection = (slug: string) => {
		setOpen(false);
		navigate(localizePath(`/c/${slug}`, locale));
	};

	const selectFacet = (facetName: string, valueName: string) => {
		setOpen(false);
		navigate(localizePath(`/search?facet=${encodeURIComponent(facetName)}=${encodeURIComponent(valueName)}`, locale));
	};

	const hasItems = !!results && results.items.length > 0;
	const hasCollections = !!results && results.collections.length > 0;
	const brandFacets = results?.facetValues.filter((fv) => fv.facetValue.facet.name.toLowerCase() === "brand") ?? [];
	const hasFacets = brandFacets.length > 0;
	const isSearching = term.trim().length >= 2;
	const hasAnyResults = hasItems || hasCollections || hasFacets;

	return (
		<div className="relative w-full">
			{/* Closed state: a plain, always-visible trigger styled like an input.
			    Clicking/focusing it opens the full-screen overlay below, which owns
			    the real, autofocused input — avoids two live controlled inputs
			    fighting over the same focus at once. */}
			<button
				ref={triggerRef}
				type="button"
				onClick={openOverlay}
				aria-label={t.search}
				className="w-full flex items-center border border-stone-400 py-2 text-sm px-4 pe-12 rounded-full bg-white relative text-start cursor-text"
			>
				<span className={`flex-1 truncate ${term ? "text-gray-900" : "text-gray-400"}`}>{term || `${t.searchPrefix}${typedCategory}`}</span>
				<span className="absolute end-0 text-gray-500 h-full px-3 flex items-center justify-center top-0">
					<Search size={18} />
				</span>
			</button>

			{open &&
				createPortal(
					<div className="fixed inset-0 z-[200]">
						<div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={close} />
						<div
							ref={dialogRef}
							role="dialog"
							aria-modal="true"
							aria-label={t.search}
							tabIndex={-1}
							style={
								anchor
									? {
											position: "fixed",
											top: Math.max(anchor.top, 8),
											[anchor.edge]: anchor.offset,
											width: anchor.width,
											maxWidth: `calc(100vw - ${anchor.offset + 16}px)`,
										}
									: undefined
							}
							className="bg-white flex flex-col max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden animate-drop-in"
						>
							<form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
								<Search size={18} strokeWidth={1.5} className="text-gray-400 flex-shrink-0" />
								<label htmlFor="search-overlay-input" className="sr-only">
									{t.search}
								</label>
								<input
									id="search-overlay-input"
									autoFocus
									type="text"
									value={term}
									onChange={(e) => setTerm(e.target.value)}
									placeholder={`${t.searchPrefix}${typedCategory}`}
									className="flex-1 text-sm outline-none placeholder-gray-400"
									autoComplete="off"
								/>
								{loading && <span className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin flex-shrink-0" />}
								<button
									type="button"
									onClick={close}
									aria-label={t.closeSearch}
									className="flex-shrink-0 w-7 h-7 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center text-white transition-colors cursor-pointer"
								>
									<X size={14} strokeWidth={1.5} />
								</button>
							</form>

							<div className="flex-1 min-h-0 overflow-y-auto">
								{!isSearching ? (
									<div className="px-5 py-10 text-center text-sm text-gray-400">{t.startTyping}</div>
								) : !results ? (
									<div className="px-5 py-10 text-center text-sm text-gray-400">{t.searching}</div>
								) : hasAnyResults ? (
									<>
										{hasItems && (
											<>
												<SectionLabel label={t.products} />
												{results.items.map((item) => (
													<ProductRow key={item.slug} item={item} term={term} onSelect={() => selectProduct(item.customProductVariantMappings?.slug ?? item.slug)} locale={locale} inStockLabel={t.inStock} soldOutLabel={t.soldOut} vendureBase={results?.vendureBase ?? ""} />
												))}
											</>
										)}

										{(hasCollections || hasFacets) && (
											<div className="px-4 pb-4 border-t border-gray-100">
												{hasCollections && (
													<>
														<SectionLabel label={t.collections} />
														<div className="flex flex-wrap gap-2 mt-1">
															{results.collections.map(({ collection, count }) => (
																<CollectionChip key={collection.id} col={{ collection, count }} term={term} onSelect={() => selectCollection(collection.slug)} />
															))}
														</div>
													</>
												)}

												{hasFacets && (
													<>
														<SectionLabel label={t.brands} />
														<div className="flex flex-wrap gap-2 mt-1">
															{brandFacets.map((fv) => (
																<FacetChip key={fv.facetValue.id} fv={fv} term={term} onSelect={() => selectFacet(fv.facetValue.facet.name, fv.facetValue.name)} />
															))}
														</div>
													</>
												)}
											</div>
										)}
									</>
								) : (
									<div className="px-5 py-10 text-center text-sm text-gray-400">{t.noResultsFor(term)}</div>
								)}
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
