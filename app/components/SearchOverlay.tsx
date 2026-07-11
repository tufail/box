import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Search, X } from "lucide-react";
import type { SearchSuggestionsResponse, SearchSuggestionItem } from "~/graphql/search";

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

function formatPrice(price: SearchSuggestionItem["price"]) {
	const fmt = (cents: number) => new Intl.NumberFormat("en", { style: "currency", currency: "QAR", minimumFractionDigits: 0 }).format(cents / 100);
	if ("value" in price) return fmt(price.value);
	return price.min === price.max ? fmt(price.min) : `${fmt(price.min)} – ${fmt(price.max)}`;
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
	const [term, setTerm] = useState("");
	const [results, setResults] = useState<SearchSuggestionsResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (open) {
			const t = setTimeout(() => inputRef.current?.focus(), 50);
			return () => clearTimeout(t);
		}
		setTerm("");
		setResults(null);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const fetchSuggestions = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults(null);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
			const data: SearchSuggestionsResponse = await res.json();
			setResults(data);
		} catch {
			setResults(null);
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

	if (!open) return null;

	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (term.trim()) {
			onClose();
			navigate(`/search?q=${encodeURIComponent(term.trim())}`);
		}
	}

	function selectProduct(slug: string) {
		onClose();
		navigate(`/products/${slug}`);
	}

	const hasItems = !!results && results.items.length > 0;
	const isSearching = term.trim().length >= 2;

	return (
		<div className="fixed inset-0 z-[200]">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
			<div className="relative mx-auto mt-20 w-full max-w-2xl px-4">
				<div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-drop-in">
					<form onSubmit={submit} className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
						<Search size={18} strokeWidth={1.5} className="text-gray-400 flex-shrink-0" />
						<input
							ref={inputRef}
							type="text"
							value={term}
							onChange={(e) => setTerm(e.target.value)}
							placeholder="Search protein, vitamins, supplements…"
							className="flex-1 text-sm outline-none placeholder-gray-400"
							autoComplete="off"
						/>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close search"
							className="flex-shrink-0 w-7 h-7 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center text-white transition-colors"
						>
							<X size={14} strokeWidth={1.5} />
						</button>
					</form>

					<div className="max-h-[60vh] overflow-y-auto">
						{!isSearching ? (
							<div className="px-5 py-8 text-center">
								<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Recent Searches</p>
								<p className="text-sm text-gray-400">Start typing to search products.</p>
							</div>
						) : loading && !results ? (
							<div className="px-5 py-8 text-center text-sm text-gray-400">Searching…</div>
						) : hasItems ? (
							<div className="py-2">
								{results!.items.map((item) => (
									<button
										key={item.slug}
										onMouseDown={() => selectProduct(item.slug)}
										className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
									>
										{item.productAsset?.preview ? (
											<img src={item.productAsset.preview + "?w=40&h=40&mode=crop"} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 bg-gray-100" />
										) : (
											<span className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-gray-300">
												<Search size={14} strokeWidth={1.5} />
											</span>
										)}
										<span className="text-sm text-gray-800 truncate flex-1">{highlight(item.productName, term)}</span>
										<span className="text-sm font-bold text-black whitespace-nowrap">{formatPrice(item.price)}</span>
									</button>
								))}
							</div>
						) : (
							<div className="px-5 py-8 text-center text-sm text-gray-400">No products found for "{term}"</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
