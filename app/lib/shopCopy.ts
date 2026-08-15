import type { Locale } from "./i18n";

// Shared UI strings for the three near-identical product-listing layouts
// (brand page, single collection page, all-collections page) — kept in one
// place so the filter/sort/pagination UI stays consistent instead of drifting
// across three separate translations of the same phrases.
//
// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
export const SHOP_COPY = {
	en: {
		sortLatest: "Latest",
		sortBestSellers: "Best Sellers",
		sortNameAsc: "Name A–Z",
		sortPriceAsc: "Price: Low to High",
		sortPriceDesc: "Price: High to Low",
		filters: "Filters",
		activeFilters: "Active filters",
		clearAll: "Clear all",
		noProductsFound: "Sourcing Perfection. Worth The Wait. Coming Soon To NutriBox",
		tryClearingFilters: "Try clearing some filters.",
		prev: "← Prev",
		next: "Next →",
		pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
	},
	ar: {
		sortLatest: "الأحدث",
		sortBestSellers: "الأكثر مبيعًا",
		sortNameAsc: "الاسم: أ–ي",
		sortPriceAsc: "السعر: من الأقل للأعلى",
		sortPriceDesc: "السعر: من الأعلى للأقل",
		filters: "الفلاتر",
		activeFilters: "الفلاتر المفعّلة",
		clearAll: "مسح الكل",
		noProductsFound: "نسعى للكمال. يستحق الانتظار. قريبًا في NutriBox",
		tryClearingFilters: "جرّب مسح بعض الفلاتر.",
		prev: "→ السابق",
		next: "التالي ←",
		pageOf: (page: number, total: number) => `صفحة ${page} من ${total}`,
	},
} as const;

// Fixed display order for facet filter groups (Category first, then by how
// useful each attribute typically is for narrowing a supplement search) —
// otherwise groups render in whatever order the search index happens to
// aggregate them in, which isn't stable or meaningful to a shopper. Anything
// not in this list (a new facet added later) sinks to the end rather than
// disappearing or erroring.
const FACET_GROUP_ORDER = ["category", "brands", "health topics", "certification and diet", "flavor", "country", "gender", "age group"];

function normalizeFacetName(name: string): string {
	return name
		.toLowerCase()
		.replace(/&/g, "and")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function facetGroupSortIndex(name: string): number {
	const index = FACET_GROUP_ORDER.indexOf(normalizeFacetName(name));
	return index === -1 ? FACET_GROUP_ORDER.length : index;
}

export function sortFacetGroups<T extends { facetName: string }>(groups: T[]): T[] {
	return [...groups].sort((a, b) => facetGroupSortIndex(a.facetName) - facetGroupSortIndex(b.facetName));
}

// Arabic countable-noun agreement (0/1/2/3-10/11+) — a plain "${n} منتجات" for
// every count reads as a grammatical error to an Arabic speaker, unlike
// English's simple singular/plural split.
export function productCountLabel(n: number, locale: Locale): string {
	if (locale === "en") return `${n} product${n !== 1 ? "s" : ""}`;
	if (n === 0) return "لا توجد منتجات";
	if (n === 1) return "منتج واحد";
	if (n === 2) return "منتجان";
	if (n >= 3 && n <= 10) return `${n} منتجات`;
	return `${n} منتج`;
}
