import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { Search } from "lucide-react";
import type { SearchSuggestionsResponse, SearchSuggestionItem, SearchSuggestionCollection, SearchSuggestionFacetValue } from "~/graphql/search";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { formatPrice as formatCurrency } from "~/lib/currency";
import { useTypewriter } from "~/hooks/useTypewriter";
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
				<div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-gray-100">
					<VendureImage src={imagePreview} vendureBase={vendureBase} alt={displayName} width={32} height={32} objectFit="cover" />
				</div>
			) : (
				<span className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-gray-300">
					<Search size={14} />
				</span>
			)}
			<span className="text-xs text-gray-800 line-clamp-2 flex-1">{highlight(displayName, term)}</span>
			<span className="flex flex-col items-end gap-0.5 flex-shrink-0">
				<span className="text-xs font-medium text-primary whitespace-nowrap">{formatPrice(item.price, locale)}</span>
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
		products: "Products",
		collections: "Collections",
		brands: "Brands",
		inStock: "In Stock",
		soldOut: "Sold Out",
		// "Search: " itself stays fixed in the placeholder — only this part types/deletes.
		searchPrefix: "Search: ",
		typingCategories: ["Whey Protein", "Creatine", "Pre-Workout", "Vitamins", "Mass Gainers"],
	},
	ar: {
		search: "بحث",
		products: "المنتجات",
		collections: "التصنيفات",
		brands: "العلامات التجارية",
		inStock: "متوفر",
		soldOut: "نفدت الكمية",
		searchPrefix: "بحث: ",
		typingCategories: ["بروتين واي", "كرياتين", "ما قبل التمرين", "فيتامينات", "مكملات زيادة الوزن"],
	},
} as const;

export default function SearchBox() {
	const [term, setTerm] = useState("");
	const [results, setResults] = useState<SearchSuggestionsResponse | null>(null);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = SEARCH_COPY[locale];
	// Only the category name types/deletes — "Search: " itself is a constant part
	// of the string, not part of the animation. Stops once the user's own text is
	// showing instead of the placeholder anyway, no point burning timers in the background.
	const typedCategory = useTypewriter(t.typingCategories, term.length === 0);

	const fetchSuggestions = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults(null);
			setOpen(false);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${locale}`);
			const data: SearchSuggestionsResponse = await res.json();
			setResults(data);
			const hasAny = data.items.length > 0 || data.collections.length > 0 || data.facetValues.length > 0;
			setOpen(hasAny);
		} catch {
			setResults(null);
			setOpen(false);
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

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (term.trim()) {
			setOpen(false);
			navigate(localizePath(`/search?q=${encodeURIComponent(term.trim())}`, locale));
		}
	};

	const selectProduct = (slug: string) => {
		setOpen(false);
		setTerm("");
		navigate(localizePath(`/products/${slug}`, locale));
	};

	const selectCollection = (slug: string) => {
		setOpen(false);
		setTerm("");
		navigate(localizePath(`/c/${slug}`, locale));
	};

	const selectFacet = (facetName: string, valueName: string) => {
		setOpen(false);
		setTerm("");
		navigate(localizePath(`/search?facet=${encodeURIComponent(facetName)}=${encodeURIComponent(valueName)}`, locale));
	};

	const hasItems = results && results.items.length > 0;
	const hasCollections = results && results.collections.length > 0;
	const brandFacets = results?.facetValues.filter((fv) => fv.facetValue.facet.name.toLowerCase() === "brand") ?? [];
	const hasFacets = brandFacets.length > 0;

	return (
		<div ref={containerRef} className="relative w-full">
			<form onSubmit={handleSubmit}>
				<div className="relative">
					<input
						ref={inputRef}
						type="text"
						value={term}
						onChange={(e) => setTerm(e.target.value)}
						onFocus={() => {
							if (results && (results.items.length > 0 || results.collections.length > 0)) {
								setOpen(true);
							}
						}}
						placeholder={`${t.searchPrefix}${typedCategory}`}
						className="border border-stone-400 py-2 text-sm px-4 w-full focus:outline-none focus:ring-2 focus:ring-primary pe-12 rounded-full bg-white"
						autoComplete="off"
					/>
					<button type="submit" aria-label={t.search} className="absolute end-0 text-gray-500 hover:text-primary h-full px-3 -translate-y-1/2 top-1/2 cursor-pointer flex items-center justify-center focus:outline-none">
						{loading ? <span className="w-[18px] h-[18px] border-2 border-white border-t-transparent  animate-spin" /> : <Search size={18} />}
					</button>
				</div>
			</form>

			{open && (
				<div className="absolute top-full start-0 end-0 md:end-auto md:w-[26rem] mt-1 bg-white border border-gray-200 shadow-xl z-[200] overflow-hidden max-h-[70vh] overflow-y-auto">
					{hasItems && (
						<>
							<SectionLabel label={t.products} />
							{results.items.map((item) => (
								<ProductRow key={item.slug} item={item} term={term} onSelect={() => selectProduct(item.customProductVariantMappings?.slug ?? item.slug)} locale={locale} inStockLabel={t.inStock} soldOutLabel={t.soldOut} vendureBase={results?.vendureBase ?? ""} />
							))}
						</>
					)}

					{(hasCollections || hasFacets) && (
						<div className="px-4 pb-3 border-t border-gray-100">
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
				</div>
			)}
		</div>
	);
}
