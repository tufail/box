import { Fragment, useEffect, useState } from "react";
import { CheckCircle, XCircle, X, Search, Plus, ChevronDown } from "lucide-react";
import { useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import VendureImage from "~/components/VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";
import type { ComparisonProductEntry, ComparisonHighlightType, ComparisonRow } from "~/graphql/product";

const COPY = {
	en: {
		title: "Compare Similar Products",
		addProduct: "Add product",
		searchPlaceholder: "Search products to add…",
		noMatches: "No matching products",
		maxReached: (n: number) => `You can compare up to ${n} products at a time`,
		loadMore: (n: number) => `Show ${n} more details`,
		showLess: "Show less",
		remove: "Remove from comparison",
	},
	ar: {
		title: "قارن منتجات مشابهة",
		addProduct: "إضافة منتج",
		searchPlaceholder: "ابحث عن منتجات لإضافتها…",
		noMatches: "لا توجد منتجات مطابقة",
		maxReached: (n: number) => `يمكنك مقارنة حتى ${n} منتجات في المرة الواحدة`,
		loadMore: (n: number) => `عرض ${n} تفاصيل إضافية`,
		showLess: "عرض أقل",
		remove: "إزالة من المقارنة",
	},
} as const;

const MAX_COLUMNS = 5;
const DEFAULT_ROWS = 5;
// Fixed widths so the sticky attribute + current-product columns have a
// predictable offset to stick at, regardless of content.
const LABEL_COL = "w-28";
const CURRENT_COL = "w-36";

function formatCell(type: ComparisonHighlightType, value: { booleanValue: boolean | null; textValue: string | null } | undefined) {
	if (!value) return null;
	if (type.valueType === "BOOLEAN") {
		return value.booleanValue ? <CheckCircle size={20} className="text-green-500 mx-auto" /> : <XCircle size={20} className="text-gray-300 mx-auto" />;
	}
	if (!value.textValue) return <span className="text-gray-300">—</span>;
	return <span>{type.unit ? `${value.textValue}${type.unit}` : value.textValue}</span>;
}

interface FetchedTable {
	products: ComparisonProductEntry[];
	highlightTypes: ComparisonHighlightType[];
	rows: ComparisonRow[];
}

interface Props {
	comparisonGroupId: string;
	flavorOption: string | null;
	vendureBase: string;
	currentProductId: string;
}

export default function ProductComparisonTable({ comparisonGroupId, flavorOption, vendureBase, currentProductId }: Props) {
	// Fetched client-side, not part of the PDP's own SSR loader — this is a
	// supplementary section, not something every visitor needs immediately, so
	// it shouldn't hold up the page's initial render.
	const [table, setTable] = useState<FetchedTable | "loading">("loading");

	useEffect(() => {
		let cancelled = false;
		setTable("loading");
		const params = new URLSearchParams({ groupId: comparisonGroupId });
		if (flavorOption) params.set("flavorOption", flavorOption);
		fetch(`/api/product-comparison?${params}`)
			.then((r): Promise<FetchedTable | null> => (r.ok ? r.json() : Promise.resolve(null)))
			.then((data) => {
				if (!cancelled) setTable(data ?? { products: [], highlightTypes: [], rows: [] });
			})
			.catch(() => {
				if (!cancelled) setTable({ products: [], highlightTypes: [], rows: [] });
			});
		return () => {
			cancelled = true;
		};
	}, [comparisonGroupId, flavorOption]);

	if (table === "loading") return <ComparisonSkeleton />;
	if (table.highlightTypes.length === 0 || table.products.length < 2) return null;

	return <ComparisonBody highlightTypes={table.highlightTypes} products={table.products} rows={table.rows} vendureBase={vendureBase} currentProductId={currentProductId} />;
}

function ComparisonSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<hr className="border-gray-200" />
			<div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
			<div className="h-40 w-full bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
		</div>
	);
}

function ComparisonBody({ highlightTypes, products, rows, vendureBase, currentProductId }: { highlightTypes: ComparisonHighlightType[]; products: ComparisonProductEntry[]; rows: ComparisonRow[]; vendureBase: string; currentProductId: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];

	// currentProductId is always first and pinned; up to MAX_COLUMNS - 1 others
	// start visible, the rest are reachable via the search-to-add popup.
	const [visibleIds, setVisibleIds] = useState<string[]>(() => {
		const others = products.filter((p) => p.id !== currentProductId).map((p) => p.id);
		return [currentProductId, ...others.slice(0, MAX_COLUMNS - 1)];
	});
	const [searchTerm, setSearchTerm] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [rowsExpanded, setRowsExpanded] = useState(false);

	const visibleProducts = visibleIds.map((id) => products.find((p) => p.id === id)).filter((p): p is ComparisonProductEntry => !!p);
	const addableProducts = products.filter((p) => !visibleIds.includes(p.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
	const atMax = visibleIds.length >= MAX_COLUMNS;

	function addProduct(id: string) {
		setVisibleIds((prev) => (prev.length >= MAX_COLUMNS || prev.includes(id) ? prev : [...prev, id]));
		setSearchTerm("");
		setSearchOpen(false);
	}

	function removeProduct(id: string) {
		if (id === currentProductId) return;
		setVisibleIds((prev) => prev.filter((x) => x !== id));
	}

	// rows[].highlights is index-aligned with highlightTypes (see graphql/product.ts) —
	// build a lookup from productId to that aligned array once, up front.
	const highlightsByProductId = new Map(rows.map((r) => [r.productId, r.highlights]));

	const visibleTypes = rowsExpanded ? highlightTypes : highlightTypes.slice(0, DEFAULT_ROWS);
	const hiddenCount = highlightTypes.length - visibleTypes.length;

	// Group attribute rows by highlightType.group, same contiguous-chunk approach
	// as ProductHighlights (the API pre-sorts by group then type sortOrder).
	const groups: { label: string | null; types: ComparisonHighlightType[] }[] = [];
	for (const type of visibleTypes) {
		const label = type.group?.label ?? null;
		const last = groups[groups.length - 1];
		if (last && last.label === label) last.types.push(type);
		else groups.push({ label, types: [type] });
	}

	return (
		<div className="flex flex-col gap-3">
			<hr className="border-gray-200" />
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h4 className="text-sm font-bold text-gray-900">{t.title}</h4>

				<div className="relative">
					{atMax ? (
						<span className="text-xs text-gray-400">{t.maxReached(MAX_COLUMNS)}</span>
					) : (
						<button
							type="button"
							onClick={() => setSearchOpen((o) => !o)}
							className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-colors"
						>
							<Plus size={13} />
							{t.addProduct}
						</button>
					)}

					{searchOpen && !atMax && (
						<div className="absolute end-0 top-full mt-2 z-30 w-72 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
							<div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
								<Search size={14} className="text-gray-400 flex-shrink-0" />
								<input
									autoFocus
									type="text"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									placeholder={t.searchPlaceholder}
									className="flex-1 text-sm outline-none placeholder:text-gray-400"
								/>
								<button type="button" onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-gray-700 flex-shrink-0">
									<X size={14} />
								</button>
							</div>
							<div className="max-h-60 overflow-y-auto">
								{addableProducts.length === 0 ? (
									<p className="text-xs text-gray-400 text-center py-4">{t.noMatches}</p>
								) : (
									addableProducts.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => addProduct(p.id)}
											className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-start"
										>
											{p.featuredAsset?.preview ? (
												<div className="w-8 h-8 flex-shrink-0">
													<VendureImage src={p.featuredAsset.preview} vendureBase={vendureBase} alt={p.name} width={32} height={32} objectFit="contain" />
												</div>
											) : (
												<div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-gray-300 text-xs font-bold bg-gray-50 rounded-lg">{p.name[0]}</div>
											)}
											<span className="text-xs font-medium text-gray-700 line-clamp-2">{p.name}</span>
										</button>
									))
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Row-heading + current-product columns stay pinned while the rest scroll horizontally */}
			<div className="overflow-x-auto rounded-xl border border-gray-100">
				<table className="w-full text-sm border-separate border-spacing-0">
					<thead>
						<tr className="bg-white">
							<th className={`sticky start-0 z-10 ${LABEL_COL} bg-white p-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500`} />
							{visibleProducts.map((p) => {
								const isCurrent = p.id === currentProductId;
								// Prefer the compared variant's own asset over the generic
								// product-level one — each column represents a specific
								// variant (e.g. one flavor), so it should show that variant's
								// actual photo, not whichever image the product defaults to.
								const asset = p.variantFeaturedAsset ?? p.featuredAsset;
								return (
									<th
										key={p.id}
										className={`relative p-3 text-center bg-white ${isCurrent ? `sticky start-28 z-10 ${CURRENT_COL} shadow-[0_0_16px_rgba(0,0,0,0.18)]` : "min-w-[140px]"}`}
									>
										{!isCurrent && (
											<button
												type="button"
												onClick={() => removeProduct(p.id)}
												aria-label={t.remove}
												className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-colors z-10"
											>
												<X size={13} strokeWidth={2.5} />
											</button>
										)}
										<Link to={`/products/${p.variantSlug ?? p.slug}`} className="flex flex-col items-center gap-1.5 group">
											{asset?.preview ? (
												<div className="w-14 h-14">
													<VendureImage src={asset.preview} vendureBase={vendureBase} alt={p.name} width={56} height={56} objectFit="contain" />
												</div>
											) : (
												<div className="w-14 h-14 flex items-center justify-center text-gray-300 text-xl font-bold bg-gray-50 rounded-lg">{p.name[0]}</div>
											)}
											{/* variantName already includes the product name (Vendure convention:
											"Product - Option") - showing p.name too would just repeat it. */}
											<span className="text-xs font-semibold text-gray-800 group-hover:text-primary transition-colors line-clamp-3">{p.variantName}</span>
										</Link>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{groups.map((group, gi) => (
							<Fragment key={group.label ?? gi}>
								{group.label && groups.length > 1 && (
									<tr key={`group-${gi}`}>
										<td className={`sticky start-0 z-10 ${LABEL_COL} bg-white`} />
										<td colSpan={visibleProducts.length} className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 bg-white">
											{group.label}
										</td>
									</tr>
								)}
								{group.types.map((type) => {
									const typeIndex = highlightTypes.indexOf(type);
									return (
										<tr key={type.id}>
											<td className={`sticky start-0 z-10 ${LABEL_COL} bg-white border-t border-gray-100 p-3 text-xs font-medium text-gray-600`}>{type.label}</td>
											{visibleProducts.map((p) => {
												const isCurrent = p.id === currentProductId;
												const value = highlightsByProductId.get(p.id)?.[typeIndex];
												return (
													<td key={p.id} className={`p-3 text-start text-gray-700 bg-white border-t border-gray-100 ${isCurrent ? `sticky start-28 z-10 ${CURRENT_COL} shadow-[0_0_16px_rgba(0,0,0,0.18)]` : ""}`}>
														{formatCell(type, value)}
													</td>
												);
											})}
										</tr>
									);
								})}
							</Fragment>
						))}
					</tbody>
				</table>
			</div>

			{highlightTypes.length > DEFAULT_ROWS && (
				<button
					type="button"
					onClick={() => setRowsExpanded((e) => !e)}
					className="self-center inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
				>
					{rowsExpanded ? t.showLess : t.loadMore(hiddenCount)}
					<ChevronDown size={14} className={`transition-transform ${rowsExpanded ? "rotate-180" : ""}`} />
				</button>
			)}
		</div>
	);
}
