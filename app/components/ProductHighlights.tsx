import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { ProductHighlightValue } from "~/graphql/product";

function formatHighlightValue(highlight: ProductHighlightValue) {
	const { unit } = highlight.highlightType;
	if (!highlight.textValue) return "";
	return unit ? `${highlight.textValue}${unit}` : highlight.textValue;
}

// Matches a highlight's label to an icon in public/icons/ (e.g. "Fast Absorption"
// -> "fast-absorption.svg"). There's no reliable way to know ahead of time
// whether that file exists, so HighlightIcon just tries to load it and falls back
// (to the given fallback node, or nothing) via the <img>'s onError if it 404s.
function slugify(label: string) {
	return label
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function HighlightIcon({ label, fallback = null }: { label: string; fallback?: React.ReactNode }) {
	const [iconFailed, setIconFailed] = useState(false);

	if (iconFailed) return fallback;
	return <img src={`/icons/${slugify(label)}.svg`} alt="" className="w-7 h-7 shrink-0" onError={() => setIconFailed(true)} />;
}

function BooleanIcon({ highlight }: { highlight: ProductHighlightValue }) {
	if (!highlight.booleanValue) return <XCircle size={28} className="text-gray-300 shrink-0" />;
	return <HighlightIcon label={highlight.highlightType.label} fallback={<CheckCircle size={28} className="text-green-500 shrink-0" />} />;
}

function HighlightCard({ highlight }: { highlight: ProductHighlightValue }) {
	if (highlight.highlightType.valueType === "BOOLEAN") {
		return (
			<div className="flex items-center gap-2 p-3">
				<BooleanIcon highlight={highlight} />
				<span className={`text-xs font-medium ${highlight.booleanValue ? "text-gray-900" : "text-gray-400"}`}>{highlight.highlightType.label}</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 p-3">
			<HighlightIcon label={highlight.highlightType.label} />
			<div className="flex flex-col gap-0.5">
				<span className="text-[11px] text-gray-400 uppercase tracking-wide leading-none">{highlight.highlightType.label}</span>
				<span className="text-xs font-medium text-gray-900">{formatHighlightValue(highlight)}</span>
			</div>
		</div>
	);
}

export default function ProductHighlights({ highlights, title }: { highlights: ProductHighlightValue[]; title?: string }) {
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

	return (
		<div className="flex flex-col gap-3">
			{title && <h4 className="text-sm font-bold text-gray-900">{title}</h4>}
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
}
