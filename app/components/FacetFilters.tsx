import { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import type { CollectionPageFacetValue } from "~/graphql/collection";
import { SHOP_COPY, sortFacetGroups } from "~/lib/shopCopy";
import type { Locale } from "~/lib/i18n";

// The left-hand facet filter used on the brand x category page (same look and
// behavior as the sidebars inlined in the brand and collection routes).

export interface FacetGroup {
	facetId: string;
	facetName: string;
	values: { id: string; name: string; count: number }[];
}

// Pass facet names (lowercase) to leave out, e.g. "brand" on a page that's
// already scoped to one brand.
export function groupFacets(facetValues: CollectionPageFacetValue[], exclude: string[] = []): FacetGroup[] {
	const map = new Map<string, FacetGroup>();
	for (const { facetValue, count } of facetValues) {
		const { id: facetId, name: facetName } = facetValue.facet;
		if (exclude.includes(facetName.toLowerCase())) continue;
		if (!map.has(facetId)) map.set(facetId, { facetId, facetName, values: [] });
		map.get(facetId)!.values.push({ id: facetValue.id, name: facetValue.name, count });
	}
	return sortFacetGroups([...map.values()]);
}

interface FilterSidebarProps {
	facetGroups: FacetGroup[];
	filteredIds: Set<string>;
	activeFv: string[];
	onToggle: (id: string) => void;
	onClearAll: () => void;
	locale: Locale;
}

export default function FilterSidebar({ facetGroups, filteredIds, activeFv, onToggle, onClearAll, locale }: FilterSidebarProps) {
	const t = SHOP_COPY[locale];
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
	return (
		<div>
			{activeFv.length > 0 && (
				<div className="mb-5">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs text-gray-400 uppercase tracking-wide">{t.activeFilters}</span>
						<button onClick={onClearAll} className="text-xs text-primary hover:underline">{t.clearAll}</button>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{activeFv.map((id) => {
							const match = facetGroups.flatMap((g) => g.values).find((v) => v.id === id);
							return match ? (
								<button
									key={id}
									onClick={() => onToggle(id)}
									className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
								>
									{match.name}
									<X size={10} />
								</button>
							) : null;
						})}
					</div>
				</div>
			)}

			{facetGroups.map((group) => {
				const isCollapsed = collapsed[group.facetId];
				return (
					<div key={group.facetId} className="mb-5">
						<button
							type="button"
							onClick={() => setCollapsed((prev) => ({ ...prev, [group.facetId]: !prev[group.facetId] }))}
							className="w-full flex items-center justify-between mb-2.5 group/header"
							aria-expanded={!isCollapsed}
						>
							<span className="text-xs font-semibold uppercase tracking-wide text-gray-500 group-hover/header:text-gray-700">{group.facetName}</span>
							<ChevronDown size={14} className={`text-gray-400 transition-transform ${!isCollapsed ? "rotate-180" : ""}`} />
						</button>
						{!isCollapsed && (
							<ul className="space-y-2 max-h-52 overflow-y-auto pe-1 scrollbar-thin">
								{group.values.map((v) => {
									const isActive = activeFv.includes(v.id);
									const unavailable = activeFv.length > 0 && !filteredIds.has(v.id) && !isActive;
									return (
										<li key={v.id}>
											<label className={`flex items-center gap-2.5 cursor-pointer group ${unavailable ? "opacity-40" : ""}`}>
												<input type="checkbox" checked={isActive} onChange={() => onToggle(v.id)} className="sr-only" />
												<span className={`flex items-center justify-center w-5 h-5 rounded-md border flex-shrink-0 transition-colors ${isActive ? "bg-lime-300 border-lime-300" : "bg-white border-gray-300 group-hover:border-gray-400"}`}>
													{isActive && <Check size={13} strokeWidth={3} className="text-black" />}
												</span>
												<span className={`flex-1 text-sm transition-colors ${isActive ? "text-gray-900 font-semibold" : "text-gray-700 group-hover:text-gray-900"}`}>
													{v.name} <span className="text-gray-400">({v.count})</span>
												</span>
											</label>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				);
			})}
		</div>
	);
}
