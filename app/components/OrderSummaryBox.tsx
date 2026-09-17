import { useState } from "react";
import Link from "~/components/LocaleLink";
import { Package, ChevronDown } from "lucide-react";
import VendureImage from "~/components/VendureImage";
import { formatPrice } from "~/lib/currency";
import type { Locale } from "~/lib/i18n";

export interface OrderSummaryLine {
	id: string;
	quantity: number;
	linePriceWithTax: number;
	featuredAsset: { preview: string } | null;
	productVariant: {
		name: string;
		customFields?: { slug: string | null } | null;
		product: { name: string; slug: string; featuredAsset: { preview: string } | null };
	};
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		orderDetails: "Order Details",
		orderNumber: "Order Number",
		qty: "Qty",
		subtotal: "Subtotal",
		shipping: "Shipping",
		free: "Free",
		total: "Total",
		viewDetails: "View Order Details",
		hideDetails: "Hide Order Details",
	},
	ar: {
		orderDetails: "تفاصيل الطلب",
		orderNumber: "رقم الطلب",
		qty: "الكمية",
		subtotal: "المجموع الفرعي",
		shipping: "الشحن",
		free: "مجاني",
		total: "الإجمالي",
		viewDetails: "عرض تفاصيل الطلب",
		hideDetails: "إخفاء تفاصيل الطلب",
	},
} as const;

/**
 * Read-only order recap for post-purchase pages (order-confirmation.tsx,
 * checkout.success.tsx) -- collapsed by default to a thumbnail-row-plus-total
 * glance, matching checkout.tsx's OrderSummaryPanel, with an explicit toggle
 * button to expand the full itemized list. Deliberately its own component
 * rather than reusing OrderSummaryPanel directly: that one is wired to the
 * *active* order (coupon form, discount recalculation) which doesn't apply
 * to an order that's already been placed.
 */
export default function OrderSummaryBox({
	orderCode,
	lines,
	subTotalWithTax,
	shippingWithTax,
	totalWithTax,
	currencyCode,
	vendureBase,
	locale,
}: {
	orderCode: string;
	lines: OrderSummaryLine[];
	subTotalWithTax: number;
	shippingWithTax: number;
	totalWithTax: number;
	currencyCode: string;
	vendureBase: string;
	locale: Locale;
}) {
	const t = COPY[locale];
	const [expanded, setExpanded] = useState(false);
	const fmt = (cents: number) => formatPrice(cents, currencyCode, locale);

	return (
		<div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-start overflow-hidden">
			<div className="flex items-center gap-2 px-5 py-4 bg-gray-50 border-b border-gray-100">
				<Package size={18} className="text-gray-500 flex-shrink-0" />
				<span className="text-sm font-semibold text-gray-700">
					{t.orderNumber} <span className="font-mono">{orderCode}</span>
				</span>
			</div>

			{lines.length > 0 && (
				<div className="px-5 pt-4">
					{/* Thumbnail row — always visible, image + qty badge only. pt-2 -mt-2 gives
					    the badge's negative top/end offset room without shifting the row. */}
					<div className="flex items-center gap-2 overflow-x-auto pt-2 -mt-2 pb-1">
						{lines.map((line) => {
							const preview = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview;
							return (
								<div key={line.id} className="relative flex-shrink-0 w-14 h-14">
									{/* overflow-hidden lives on this inner wrapper, not the outer relative
									    box below -- the badge is a sibling positioned with a negative offset,
									    and an ancestor's overflow-hidden would clip it right along with the image. */}
									<div className="w-full h-full rounded-lg overflow-hidden bg-stone-50 border border-gray-100">
										{preview ? (
											<VendureImage src={preview} vendureBase={vendureBase} alt={line.productVariant.product.name} width={56} height={56} objectFit="contain" />
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<Package size={18} className="text-gray-300" />
											</div>
										)}
									</div>
									<span className="absolute -top-1 -end-1 bg-gray-900 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
										{line.quantity}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{expanded && (
				<div className="divide-y divide-gray-100 px-5 mt-2">
					{lines.map((line) => {
						const preview = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview;
						const productHref = `/products/${line.productVariant.customFields?.slug ?? line.productVariant.product.slug}`;
						return (
							<div key={line.id} className="flex items-center gap-4 py-4">
								<div className="w-16 h-16 rounded-xl bg-stone-50 border border-gray-100 overflow-hidden shrink-0">
									{preview ? (
										<VendureImage src={preview} vendureBase={vendureBase} alt={line.productVariant.product.name} width={64} height={64} objectFit="contain" />
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<Package size={20} className="text-gray-300" />
										</div>
									)}
								</div>
								<div className="flex-1 min-w-0">
									<Link to={productHref} className="font-medium text-gray-900 hover:text-primary transition-colors line-clamp-1 text-sm">
										{line.productVariant.product.name}
									</Link>
									<p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{line.productVariant.name}</p>
									<p className="text-xs text-gray-400 mt-0.5">{t.qty}: {line.quantity}</p>
								</div>
								<span className="text-sm font-semibold text-gray-900 shrink-0">{fmt(line.linePriceWithTax)}</span>
							</div>
						);
					})}
				</div>
			)}

			{lines.length > 0 && (
				<button type="button" onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 py-3 mt-1 transition-colors">
					{expanded ? t.hideDetails : t.viewDetails}
					<ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
				</button>
			)}

			<div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5">
				{expanded && (
					<div className="flex justify-between text-sm text-gray-600">
						<span>{t.subtotal}</span>
						<span>{fmt(subTotalWithTax)}</span>
					</div>
				)}
				<div className="flex justify-between text-sm text-gray-600">
					<span>{t.shipping}</span>
					<span>{shippingWithTax > 0 ? fmt(shippingWithTax) : t.free}</span>
				</div>
				<div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 mt-1.5 border-t border-gray-200">
					<span>{t.total}</span>
					<span>{fmt(totalWithTax)}</span>
				</div>
			</div>
		</div>
	);
}
