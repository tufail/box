import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AreaOption {
	id: string;
	zoneNumber: number;
	nameEn: string;
	nameAr: string;
}

function labelFor(area: AreaOption, locale: "en" | "ar") {
	const name = locale === "ar" ? area.nameAr : area.nameEn;
	return locale === "ar" ? `المنطقة ${area.zoneNumber} - ${name}` : `Zone ${area.zoneNumber} - ${name}`;
}

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
	const sortedAreas = useMemo(() => [...areas].sort((a, b) => a.nameEn.localeCompare(b.nameEn)), [areas]);

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
	const committedLabel = committed ? labelFor(committed, locale) : "";
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
		if (!open) setQuery(area ? labelFor(area, locale) : "");
		// `open` is intentionally excluded — this effect only reacts to an outside change
		// to `value`, not to the dropdown's own open/close state.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, locale, sortedAreas]);

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
		setQuery(labelFor(area, locale));
		setOpen(false);
		onChange(zoneNumber, locale === "ar" ? area.nameAr : area.nameEn, area.id);
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
				className={`${inputClassName} pe-10`}
			/>
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
							{labelFor(area, locale)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
