import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductHighlightValue } from "~/graphql/product";

function formatHighlightValue(highlight: ProductHighlightValue) {
	const { unit } = highlight.highlightType;
	if (!highlight.textValue) return "";
	return unit ? `${highlight.textValue}${unit}` : highlight.textValue;
}

// Matches a highlight's label to an icon in public/icons/ (e.g. "Fast Absorption"
// -> "fast-absorption.svg"). There's no reliable way to know ahead of time
// whether that file exists, so HighlightIcon just tries to load it and falls
// back (to the given fallback node, or nothing) if it 404s.
function slugify(label: string) {
	return label
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// The icon files use fill/stroke="currentColor" so the surrounding badge's
// text color can recolor them -- but that only works for an inline <svg> in
// the document, not an <img src="...svg">, which renders the file in an
// isolated context CSS can't reach. Fetched and injected as markup instead,
// specifically so the teal badge color below actually recolors the icon.
function HighlightIcon({ label, fallback = null }: { label: string; fallback?: React.ReactNode }) {
	const [svg, setSvg] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setSvg(null);
		setFailed(false);
		fetch(`/icons/${slugify(label)}.svg`)
			.then((r) => (r.ok ? r.text() : Promise.reject()))
			.then((text) => {
				if (!cancelled) setSvg(text);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});
		return () => {
			cancelled = true;
		};
	}, [label]);

	if (failed) return fallback;
	if (!svg) return null;
	// Some icon files hardcode fill/stroke="#000000" instead of "currentColor"
	// (e.g. banned-substance-tested.svg) -- an SVG's own presentation attributes
	// lose to author stylesheet rules, so these force just those hardcoded-black
	// shapes to the surrounding badge's color instead. Targeted by attribute
	// value (not every path/circle) so a shape deliberately left fill="none"
	// (a hollow outline) doesn't get filled in solid.
	return (
		<span
			className='w-9 h-9 [&>svg]:w-full [&>svg]:h-full [&_[fill="#000000"]]:fill-current [&_[stroke="#000000"]]:stroke-current'
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}

// No extra border/circle here -- the icon files already draw their own
// outline (see fast-absorption.svg's <circle stroke="currentColor">), so
// wrapping them in another circle would just double up the ring.
function HighlightBadge({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
	return <div className={`w-9 h-9 flex items-center justify-center shrink-0 ${muted ? "text-gray-300" : "text-[#3b8578]"}`}>{children}</div>;
}

function BooleanIcon({ highlight }: { highlight: ProductHighlightValue }) {
	if (!highlight.booleanValue) {
		return (
			<HighlightBadge muted>
				<XCircle size={32} />
			</HighlightBadge>
		);
	}
	return (
		<HighlightBadge>
			<HighlightIcon label={highlight.highlightType.label} fallback={<CheckCircle size={32} />} />
		</HighlightBadge>
	);
}

function HighlightCard({ highlight }: { highlight: ProductHighlightValue }) {
	if (highlight.highlightType.valueType === "BOOLEAN") {
		return (
			<div className="flex items-center gap-2.5 p-3">
				<BooleanIcon highlight={highlight} />
				<span className={`text-xs font-medium ${highlight.booleanValue ? "text-gray-900" : "text-gray-400"}`}>{highlight.highlightType.label}</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2.5 p-3">
			<HighlightBadge>
				<HighlightIcon label={highlight.highlightType.label} />
			</HighlightBadge>
			<div className="flex flex-col gap-0.5">
				<span className="text-[11px] text-gray-400 uppercase tracking-wide leading-none">{highlight.highlightType.label}</span>
				<span className="text-xs font-medium text-gray-900">{formatHighlightValue(highlight)}</span>
			</div>
		</div>
	);
}

// One swipeable row with "there's more this way" arrows: a round button appears at an edge only
// while cards are hidden past that edge, tapping it scrolls about a card-and-a-half, and it hides
// again at the end. Direction-aware (RTL pages scroll the other way and get mirrored arrows).
function ScrollRow({ children }: { children: React.ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const [more, setMore] = useState({ start: false, end: false });

	const update = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const max = el.scrollWidth - el.clientWidth;
		const pos = Math.abs(el.scrollLeft); // negative in RTL, so compare magnitudes
		setMore({ start: pos > 4, end: max - pos > 4 });
	}, []);

	useEffect(() => {
		update();
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [update]);

	function nudge(towardEnd: boolean) {
		const el = ref.current;
		if (!el) return;
		const rtl = getComputedStyle(el).direction === "rtl";
		const dir = (towardEnd ? 1 : -1) * (rtl ? -1 : 1);
		el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: "smooth" });
	}

	const arrow = "absolute top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md active:scale-95";
	return (
		// -mx-4 lets the row run edge to edge of the screen inside the page's 16px gutter, so cards
		// scroll out under the edge instead of being clipped at the content boundary.
		<div className="relative -mx-4">
			<div ref={ref} onScroll={update} className="flex gap-2 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-hide [scroll-padding-inline:1rem]">
				{children}
			</div>
			{more.start && (
				<button type="button" onClick={() => nudge(false)} aria-label="Scroll back" className={`${arrow} start-1`}>
					<ChevronLeft size={18} className="rtl:rotate-180" />
				</button>
			)}
			{more.end && (
				<button type="button" onClick={() => nudge(true)} aria-label="Scroll for more highlights" className={`${arrow} end-1`}>
					<ChevronRight size={18} className="rtl:rotate-180" />
				</button>
			)}
		</div>
	);
}
// `scroll` lays each group out as ONE horizontally swipeable row of cards instead of the
// wrapped grid -- used on the mobile product page, where the full grid is tall and used to sit
// hidden in a closed accordion. The row snaps card by card and lets a sliver of the next card
// peek in, which is the cue that it scrolls sideways.
export default function ProductHighlights({ highlights, title, scroll = false }: { highlights: ProductHighlightValue[]; title?: string; scroll?: boolean }) {
	if (!highlights || highlights.length === 0) return null;

	// The API pre-sorts by group then type sortOrder, so same-group items are
	// always contiguous — just chunk consecutive runs, no re-sorting needed.
	const groups: { label: string | null; items: ProductHighlightValue[] }[] = [];
	for (const highlight of highlights) {
		const label = highlight.highlightType.group?.label ?? null;
		const last = groups[groups.length - 1];
		if (last && last.label === label) last.items.push(highlight);
		else groups.push({ label, items: [highlight] });
	}

	const body = (
		<div className="flex flex-col gap-3">
			{groups.map((group, i) => (
				<div key={i} className="flex flex-col gap-1.5">
					{group.label && groups.length > 1 && <p className="text-xs font-semibold text-gray-500">{group.label}</p>}
					{scroll ? (
						<ScrollRow>
							{group.items.map((highlight, j) => (
								<div key={j} className="snap-start shrink-0 min-w-[10.5rem] max-w-[14rem] rounded-xl border border-gray-100 bg-gray-50">
									<HighlightCard highlight={highlight} />
								</div>
							))}
						</ScrollRow>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 rounded-xl overflow-hidden">
							{group.items.map((highlight, j) => (
								<HighlightCard key={j} highlight={highlight} />
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);

	return (
		<div className="flex flex-col gap-3">
			<hr className="border-gray-200" />
			{title && <h4 className="text-sm font-bold text-gray-900">{title}</h4>}
			{body}
		</div>
	);
}