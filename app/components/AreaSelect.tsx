import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

export interface AreaOption {
	id: string;
	zoneNumber: number;
	nameEn: string;
	nameAr: string;
}

// Always both scripts together ("38 Al Sadd/السد"), regardless of UI locale — area
// names in Qatar get referenced in either language interchangeably, so showing just
// one made the other half of customers re-read the number to double check.
function labelFor(area: AreaOption) {
	return `${area.zoneNumber} - ${area.nameEn}/${area.nameAr}`;
}

const clearLabel = { en: "Clear selected area", ar: "مسح المنطقة المحددة" };

// A zone number alone doesn't identify which named area was picked (one zone covers
// several) — this is only ever a display fallback for a value that arrived from outside
// this component (e.g. editing a saved address with just a postal code on file, and no
// specific area id known for it yet).
function bestEffortMatch(areas: AreaOption[], value: string) {
	return areas.find((a) => `${a.zoneNumber}` === value) ?? null;
}

const noMatchesLabel = { en: "No matches", ar: "لا توجد نتائج" };

// Searchable replacement for a plain <select> — with ~740 named areas across Qatar's
// delivery zones, scrolling a native dropdown to find one is impractical. Each option
// shows its zone number alongside the area name (e.g. "Zone 38 - Al Sadd") since a zone
// can cover several named areas and the customer needs to recognize their own.
//
// `areas` comes from the live qatarShippingAreas Shop API query (fetched by the caller's
// route loader), not a bundled static list — pricing is keyed on the backend's own row
// `id`, which only the live data can provide, so `onChange`'s third argument carries it.
export default function AreaSelect({
	id,
	name,
	value,
	initialAreaId,
	areas,
	onChange,
	locale,
	placeholder,
	required,
	inputClassName,
}: {
	id: string;
	name: string;
	value: string;
	// The precise area id for a pre-filled `value` (e.g. editing a saved address that
	// already has one on file) — lets the initial display show the exact area picked
	// instead of guessing the zone's alphabetically-first one. Mount-time only.
	initialAreaId?: string;
	areas: AreaOption[];
	onChange: (zoneNumber: string, areaName: string, areaId: string) => void;
	locale: "en" | "ar";
	placeholder: string;
	required?: boolean;
	inputClassName: string;
}) {
	// Ascending by zone number (1, 2, 3, …) — zone 0 (areas with no official zone
	// assigned, see qatar-areas.ts) is a catch-all, not really "before zone 1", so it's
	// pinned to the end instead of sorting first the way a plain numeric sort would.
	const sortedAreas = useMemo(
		() =>
			[...areas].sort((a, b) => {
				if (a.zoneNumber === 0 && b.zoneNumber !== 0) return 1;
				if (b.zoneNumber === 0 && a.zoneNumber !== 0) return -1;
				if (a.zoneNumber !== b.zoneNumber) return a.zoneNumber - b.zoneNumber;
				return a.nameEn.localeCompare(b.nameEn);
			}),
		[areas]
	);

	const [open, setOpen] = useState(false);
	// The exact area last confirmed (typed selection, or a best-effort guess for a value
	// that arrived pre-filled) — kept as its own state rather than re-derived from `value`
	// on every render, since re-deriving via zone number alone would silently swap the
	// just-picked area for the zone's alphabetically-first one the next time this needs
	// to be shown (e.g. right after commit, or on blur). Also doubles as the precise
	// "which row is selected" identity, since `value` (zone number) alone can't tell two
	// same-zone areas apart.
	const [committed, setCommitted] = useState<AreaOption | null>(() => {
		const byId = initialAreaId ? sortedAreas.find((a) => a.id === initialAreaId) : undefined;
		return byId ?? bestEffortMatch(sortedAreas, value);
	});
	const committedLabel = committed ? labelFor(committed) : "";
	const [query, setQuery] = useState(committedLabel);
	const [activeIndex, setActiveIndex] = useState(0);
	const ref = useRef<HTMLDivElement>(null);
	const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
	// Tracks the zone number `committed` currently corresponds to, so an external change
	// to `value` (not routed through this component's own commit()) is detected and
	// re-synced — e.g. the form resetting, or a saved address loading in.
	const committedValueRef = useRef(value);

	useEffect(() => {
		if (value === committedValueRef.current) return;
		committedValueRef.current = value;
		const area = bestEffortMatch(sortedAreas, value);
		setCommitted(area);
		if (!open) setQuery(area ? labelFor(area) : "");
		// `open` is intentionally excluded — this effect only reacts to an outside change
		// to `value`, not to the dropdown's own open/close state.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, sortedAreas]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q || q === committedLabel.toLowerCase()) return sortedAreas;
		return sortedAreas.filter((a) => `${a.zoneNumber}`.includes(q) || a.nameEn.toLowerCase().includes(q) || a.nameAr.includes(query.trim()));
	}, [query, committedLabel, sortedAreas]);

	useEffect(() => {
		setActiveIndex(0);
	}, [filtered]);

	useEffect(() => {
		optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
	}, [activeIndex]);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	function commit(area: AreaOption) {
		const zoneNumber = `${area.zoneNumber}`;
		committedValueRef.current = zoneNumber;
		setCommitted(area);
		setQuery(labelFor(area));
		setOpen(false);
		onChange(zoneNumber, locale === "ar" ? area.nameAr : area.nameEn, area.id);
	}

	// Lets a committed selection be deleted and a different one picked, rather than
	// only being able to overwrite it by typing over the auto-selected text on focus.
	function clear() {
		committedValueRef.current = "";
		setCommitted(null);
		setQuery("");
		setOpen(true);
		onChange("", "", "");
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (!open) {
			if (e.key === "ArrowDown" || e.key === "Enter") {
				e.preventDefault();
				setOpen(true);
			}
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((i) => Math.max(i - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (filtered[activeIndex]) commit(filtered[activeIndex]);
		} else if (e.key === "Escape") {
			setOpen(false);
			setQuery(committedLabel);
		}
	}

	return (
		<div ref={ref} className="relative">
			<input type="hidden" name={name} value={value} />
			<input
				id={id}
				type="text"
				role="combobox"
				aria-expanded={open}
				aria-controls={`${id}-listbox`}
				aria-autocomplete="list"
				autoComplete="off"
				required={required}
				placeholder={placeholder}
				value={query}
				onChange={(e) => {
					setQuery(e.target.value);
					setOpen(true);
				}}
				onFocus={(e) => {
					setOpen(true);
					e.target.select();
				}}
				onBlur={() => {
					setOpen(false);
					setQuery(committedLabel);
				}}
				onKeyDown={onKeyDown}
				className={`${inputClassName} ${committed ? "pe-16" : "pe-10"}`}
			/>
			{committed && (
				<button
					type="button"
					tabIndex={-1}
					aria-label={clearLabel[locale]}
					// Prevent-default here for the same reason as each option's onMouseDown
					// below — without it, the input blurs (and resets query) before the
					// click handler even runs.
					onMouseDown={(e) => e.preventDefault()}
					onClick={clear}
					className="absolute end-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
				>
					<X size={14} />
				</button>
			)}
			<ChevronDown size={16} className={`absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />
			{open && (
				<ul id={`${id}-listbox`} role="listbox" aria-label={placeholder} className="absolute start-0 end-0 top-full mt-2 max-h-64 overflow-y-auto bg-white border border-gray-100 shadow-lg rounded-xl z-50 py-1">
					{filtered.length === 0 && <li className="px-4 py-2 text-sm text-gray-400">{noMatchesLabel[locale]}</li>}
					{filtered.map((area, i) => (
						<li
							key={area.id}
							ref={(el) => {
								optionRefs.current[i] = el;
							}}
							role="option"
							aria-selected={area.id === committed?.id}
							// Prevent the input from blurring before the click is handled — a blur
							// would close the list (and reset the query) first, dropping the click.
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => commit(area)}
							className={`px-4 py-2 text-sm cursor-pointer ${i === activeIndex ? "bg-lime-50" : ""} ${area.id === committed?.id ? "font-semibold text-gray-900" : "text-gray-700"}`}
						>
							{labelFor(area)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
