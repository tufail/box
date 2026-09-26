import { useState, useEffect } from "react";
import { CheckCircle, XCircle, ChevronDown } from "lucide-react";
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

// `collapsible` renders the whole block as a <details>, closed by default, with
// `title` doubling as the toggle — used on the mobile product page so the section
// doesn't push the Add to Cart box further down the page by default.
export default function ProductHighlights({ highlights, title, collapsible = false }: { highlights: ProductHighlightValue[]; title?: string; collapsible?: boolean }) {
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

	const grid = (
		<div className="flex flex-col gap-3">
			{groups.map((group, i) => (
				<div key={i} className="flex flex-col gap-1.5">
					{group.label && groups.length > 1 && <p className="text-xs font-semibold text-gray-500">{group.label}</p>}
					<div className="grid grid-cols-2 sm:grid-cols-3 rounded-xl overflow-hidden">
						{group.items.map((highlight, j) => (
							<HighlightCard key={j} highlight={highlight} />
						))}
					</div>
				</div>
			))}
		</div>
	);

	if (collapsible) {
		return (
			<details className="group mt-5">
				<hr className="border-gray-200 mb-3" />
				<summary className="flex items-center justify-between cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
					{title && <h4 className="text-sm font-bold text-gray-900">{title}</h4>}
					<ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
				</summary>
				<div className="mt-3">{grid}</div>
			</details>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<hr className="border-gray-200" />
			{title && <h4 className="text-sm font-bold text-gray-900">{title}</h4>}
			{grid}
		</div>
	);
}
