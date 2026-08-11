import { CheckCircle, XCircle } from "lucide-react";
import { useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import VendureImage from "~/components/VendureImage";
import { getLocaleFromPathname } from "~/lib/i18n";
import type { ComparisonGroupProduct, ComparisonHighlightType, ComparisonRow } from "~/graphql/product";

const COPY = {
	en: { title: "Compare Similar Products" },
	ar: { title: "قارن منتجات مشابهة" },
} as const;

function formatCell(type: ComparisonHighlightType, value: { booleanValue: boolean | null; textValue: string | null } | undefined) {
	if (!value) return null;
	if (type.valueType === "BOOLEAN") {
		return value.booleanValue ? <CheckCircle size={20} className="text-green-500 mx-auto" /> : <XCircle size={20} className="text-gray-300 mx-auto" />;
	}
	if (!value.textValue) return <span className="text-gray-300">—</span>;
	return <span>{type.unit ? `${value.textValue}${type.unit}` : value.textValue}</span>;
}

interface Props {
	highlightTypes: ComparisonHighlightType[];
	products: ComparisonGroupProduct[];
	rows: ComparisonRow[];
	vendureBase: string;
	currentProductId: string;
}

export default function ProductComparisonTable({ highlightTypes, products, rows, vendureBase, currentProductId }: Props) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];

	if (highlightTypes.length === 0 || products.length < 2) return null;

	// rows[].highlights is index-aligned with highlightTypes (see graphql/product.ts) —
	// build a lookup from productId to that aligned array once, up front.
	const highlightsByProductId = new Map(rows.map((r) => [r.productId, r.highlights]));

	// Group attribute rows by highlightType.group, same contiguous-chunk approach
	// as ProductHighlights (the API pre-sorts by group then type sortOrder).
	const groups: { label: string | null; types: ComparisonHighlightType[] }[] = [];
	for (const type of highlightTypes) {
		const label = type.group?.label ?? null;
		const last = groups[groups.length - 1];
		if (last && last.label === label) last.types.push(type);
		else groups.push({ label, types: [type] });
	}

	return (
		<div className="flex flex-col gap-3">
			<hr className="border-gray-200" />
			<h4 className="text-sm font-bold text-gray-900">{t.title}</h4>
			<div className="overflow-x-auto rounded-xl border border-gray-100">
				<table className="w-full text-sm border-collapse">
					<thead>
						<tr className="bg-gray-50">
							<th className="sticky start-0 bg-gray-50 p-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 min-w-[110px]" />
							{products.map((p) => {
								const isCurrent = p.id === currentProductId;
								return (
									<th key={p.id} className={`p-3 text-center min-w-[140px] ${isCurrent ? "bg-primary/5" : ""}`}>
										<Link to={`/products/${p.slug}`} className="flex flex-col items-center gap-1.5 group">
											{p.featuredAsset?.preview ? (
												<div className="w-14 h-14">
													<VendureImage src={p.featuredAsset.preview} vendureBase={vendureBase} alt={p.name} width={56} height={56} objectFit="contain" />
												</div>
											) : (
												<div className="w-14 h-14 flex items-center justify-center text-gray-300 text-xl font-bold bg-gray-50 rounded-lg">{p.name[0]}</div>
											)}
											<span className="text-xs font-semibold text-gray-800 group-hover:text-primary transition-colors line-clamp-2">{p.name}</span>
										</Link>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{groups.map((group, gi) => (
							<>
								{group.label && groups.length > 1 && (
									<tr key={`group-${gi}`}>
										<td colSpan={products.length + 1} className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 bg-white">
											{group.label}
										</td>
									</tr>
								)}
								{group.types.map((type) => {
									const typeIndex = highlightTypes.indexOf(type);
									return (
										<tr key={type.id} className="border-t border-gray-100">
											<td className="sticky start-0 bg-white p-3 text-xs font-medium text-gray-600">{type.label}</td>
											{products.map((p) => {
												const isCurrent = p.id === currentProductId;
												const value = highlightsByProductId.get(p.id)?.[typeIndex];
												return (
													<td key={p.id} className={`p-3 text-center text-gray-700 ${isCurrent ? "bg-primary/5" : ""}`}>
														{formatCell(type, value)}
													</td>
												);
											})}
										</tr>
									);
								})}
							</>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
