import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import type { SearchSuggestionsResponse, SearchSuggestionItem, SearchSuggestionCollection, SearchSuggestionFacetValue } from "~/graphql/search";

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
}
function formatPrice(price: SearchSuggestionItem["price"]) {
	const fmt = (cents: number) => new Intl.NumberFormat("en", { style: "currency", currency: "QAR", minimumFractionDigits: 0 }).format(cents / 100);
	if ("value" in price) return fmt(price.value);
	return price.min === price.max ? fmt(price.min) : `${fmt(price.min)} – ${fmt(price.max)}`;
}

function ProductRow({ item, term, onSelect }: ProductRowProps) {
	return (
		<button onMouseDown={onSelect} className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 flex items-center gap-3 transition-colors">
			{item.productAsset?.preview ? (
				<img src={item.productAsset.preview + "?w=40&h=40&mode=crop"} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-100" />
			) : (
				<span className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-gray-300">
					<Search size={14} />
				</span>
			)}
			<span className="text-sm text-gray-800 truncate flex-1">{highlight(item.productName, term)}</span>
			<span className="text-sm font-medium text-primary whitespace-nowrap">{formatPrice(item.price)}</span>
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
		<button onMouseDown={onSelect} className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
			{highlight(col.collection.name, term)}
			<span className="text-xs text-gray-400">{col.count}</span>
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
		<button onMouseDown={onSelect} className="inline-flex items-center px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
			{highlight(fv.facetValue.name, term)}
		</button>
	);
}

function SectionLabel({ label }: { label: string }) {
	return <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">{label}</div>;
}

export default function SearchBox() {
	const [term, setTerm] = useState("");
	const [results, setResults] = useState<SearchSuggestionsResponse | null>(null);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	const fetchSuggestions = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults(null);
			setOpen(false);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
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
	}, []);

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
			navigate(`/search?q=${encodeURIComponent(term.trim())}`);
		}
	};

	const selectProduct = (slug: string) => {
		setOpen(false);
		setTerm("");
		navigate(`/products/${slug}`);
	};

	const selectCollection = (slug: string) => {
		setOpen(false);
		setTerm("");
		navigate(`/collections/${slug}`);
	};

	const selectFacet = (facetName: string, valueName: string) => {
		setOpen(false);
		setTerm("");
		navigate(`/search?facet=${encodeURIComponent(facetName)}=${encodeURIComponent(valueName)}`);
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
						placeholder="Search Products"
						className="border border-gray-300 rounded-full py-2 text-sm px-4 w-full focus:outline-none focus:ring-2 focus:ring-primary pr-12"
						autoComplete="off"
					/>
					<button type="submit" aria-label="Search" className="absolute right-0 bg-primary text-white hover:bg-primary-dark rounded-l-none rounded-r-full h-full px-3 -translate-y-1/2 top-1/2 cursor-pointer flex items-center justify-center">
						{loading ? <span className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={18} />}
					</button>
				</div>
			</form>

			{open && (
				<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[200] overflow-hidden max-h-[70vh] overflow-y-auto">
					{hasItems && (
						<>
							<SectionLabel label="Products" />
							{results.items.map((item) => (
								<ProductRow key={item.slug} item={item} term={term} onSelect={() => selectProduct(item.slug)} />
							))}
						</>
					)}

					{(hasCollections || hasFacets) && (
						<div className="px-4 pb-3 border-t border-gray-100">
							{hasCollections && (
								<>
									<SectionLabel label="Collections" />
									<div className="flex flex-wrap gap-2 mt-1">
										{results.collections.map(({ collection, count }) => (
											<CollectionChip key={collection.id} col={{ collection, count }} term={term} onSelect={() => selectCollection(collection.slug)} />
										))}
									</div>
								</>
							)}

							{hasFacets && (
								<>
									<SectionLabel label="Brands" />
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
