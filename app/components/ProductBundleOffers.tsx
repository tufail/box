import { useEffect, useState, Fragment } from "react";
import { useFetcher, Link } from "react-router";
import { ShoppingCart, Zap } from "lucide-react";
import { useCart } from "~/context/CartContext";
import { useNotification } from "~/context/NotificationContext";
import type { BundleOffer, BundleOfferItem } from "~/graphql/bundle";
import { formatBundleDiscount } from "~/graphql/bundle";

// ─── Fetch cache ──────────────────────────────────────────────────────────────

const bundleCache = new Map<string, Promise<BundleOffer[]>>();

function fetchBundleOffers(productId: string): Promise<BundleOffer[]> {
	if (!bundleCache.has(productId)) {
		bundleCache.set(
			productId,
			fetch(`/api/bundle?productId=${encodeURIComponent(productId)}`)
				.then((r) => (r.ok ? (r.json() as Promise<{ productBundleOffers: BundleOffer[] }>) : Promise.resolve({ productBundleOffers: [] })))
				.then((d) => d.productBundleOffers ?? [])
				.catch(() => []),
		);
	}
	return bundleCache.get(productId)!;
}

function useBundleOffers(productId: string) {
	const [bundles, setBundles] = useState<BundleOffer[] | null>(null);
	useEffect(() => {
		let cancelled = false;
		fetchBundleOffers(productId).then((data) => {
			if (!cancelled) setBundles(data);
		});
		return () => {
			cancelled = true;
		};
	}, [productId]);
	return bundles;
}

// ─── Add-to-cart hook ─────────────────────────────────────────────────────────

function useAddBundle(triggerVariantId: string) {
	const fetcher = useFetcher<{ addBundleToCart?: { bundleGroupId: string; bundleName: string; status: string }; error?: string }>();
	const { openCart, refreshCart } = useCart();
	const { notify } = useNotification();

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.addBundleToCart) {
			notify(`${fetcher.data.addBundleToCart.bundleName} added to cart ✓`, "success");
			refreshCart();
			openCart();
		} else if (fetcher.data.error) {
			notify("Could not add bundle to cart — please try again", "error");
		}
	}, [fetcher.state, fetcher.data]);

	return {
		submit: (bundleDefinitionId: string, selectedVariantIds: string[]) => fetcher.submit({ _intent: "addBundle", bundleDefinitionId, triggerVariantId, selectedVariantIds }, { method: "POST", action: "/api/bundle", encType: "application/json" }),
		isLoading: fetcher.state !== "idle",
	};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveBundleImage(preview: string, vendureBase: string): string {
	if (!preview) return "";
	if (preview.startsWith("http")) return preview;
	const base = vendureBase.replace(/\/shop-api\/?$/, "").replace(/\/$/, "");
	// Ensure the path starts with /assets/
	const path = preview.startsWith("/assets/") ? preview : preview.startsWith("/") ? `/assets${preview}` : `/assets/${preview}`;
	return `${base}${path}`;
}

function formatPrice(minor: number, currency: string) {
	return `${currency} ${(minor / 100).toFixed(2)}`;
}

function isInStock(stockLevel: string) {
	if (stockLevel === "OUT_OF_STOCK") return false;
	const n = Number(stockLevel);
	return isNaN(n) ? stockLevel !== "OUT_OF_STOCK" : n > 0;
}

// ─── Item card ────────────────────────────────────────────────────────────────

function BundleItemCard({ item, selected, onToggle, compact = false, vendureBase }: { item: BundleOfferItem; selected: boolean; onToggle: () => void; compact?: boolean; vendureBase: string }) {
	const inStock = isInStock(item.stockLevel);
	const imgSize = "aspect-square w-full";
	const width = compact ? "w-[110px]" : "w-[130px]";

	return (
		<div
			className={`relative flex-shrink-0 ${width} rounded-xl border bg-white overflow-hidden transition-all duration-200
      ${selected ? "border-primary shadow-sm" : "border-gray-200"}`}
		>
			{/* Product image */}
			<Link to={`/products/${item.productSlug}`} className={`block ${imgSize} bg-gray-50 overflow-hidden`}>
				{item.featuredAsset ? (
					<img src={resolveBundleImage(item.featuredAsset.preview, vendureBase ?? "")} alt={item.productName} className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-200" />
				) : (
					<div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center gap-1">
						<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0121 4.5v15A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3z" />
						</svg>
						<span className="text-[10px] text-gray-300 font-medium">No image</span>
					</div>
				)}
			</Link>

			{/* Info */}
			<div className="p-2">
				<Link to={`/products/${item.productSlug}`} className="text-[11px] font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2 leading-snug block mb-1">
					{item.variantName}
				</Link>

				{item.priceWithTax > 0 && <span className="text-xs font-bold text-primary block">{formatPrice(item.priceWithTax, item.currencyCode)}</span>}

				{item.requiredQuantity > 1 && <p className="text-[10px] text-gray-400 mt-0.5">Qty: {item.requiredQuantity}</p>}

				{/* Add/Remove toggle button — top left */}
				{item.required ? null : (
					<div className="flex items-center justify-center mt-2">
						<button
							onClick={onToggle}
							className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors duration-150
						 bg-primary text-white border-primary hover:bg-primary/80`}
						>
							{selected ? "- Remove" : "+ Add"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Bundle card (shared for both placements) ─────────────────────────────────

function BundleCard({ bundle, triggerVariantId, triggerVariantPrice, compact = false, vendureBase, triggerImage }: { bundle: BundleOffer; triggerVariantId: string; triggerVariantPrice: number; compact?: boolean; vendureBase: string; triggerImage?: string }) {
	const { submit, isLoading } = useAddBundle(triggerVariantId);
	const sortedItems = [...bundle.items].sort((a, b) => a.sortOrder - b.sortOrder);
	console.log(bundle);
	const [selectedOptional, setSelectedOptional] = useState<Set<string>>(() => new Set(sortedItems.filter((i) => !i.required).map((i) => i.productVariantId)));

	const isSelected = (item: BundleOfferItem) => item.required || selectedOptional.has(item.productVariantId);
	const selectedItems = sortedItems.filter(isSelected);
	const selectedCount = selectedItems.length;
	const discountLabel = formatBundleDiscount(bundle.discountType, bundle.discountValue);

	// Sum prices of selected bundle items (the additional products, not the trigger/parent)
	const bundleItemsTotal = selectedItems.reduce((sum, item) => {
		return sum + (item.priceWithTax || 0) * item.requiredQuantity;
	}, 0);

	// Always add the selected parent/trigger variant price on top
	const totalPrice = bundleItemsTotal + (triggerVariantPrice || 0);
	const currency = sortedItems[0]?.currencyCode ?? "QAR";
	const allSelected = selectedCount === sortedItems.length;

	// Calculate actual savings based on selected items' prices
	const calculatedSavings = totalPrice > 0 ? (bundle.discountType === "PERCENTAGE" ? (totalPrice * bundle.discountValue) / 100 : bundle.discountType === "FIXED_AMOUNT" ? bundle.discountValue * 100 : 0) : 0;
	const savingsDisplay = calculatedSavings > 0 ? `${currency} -${(calculatedSavings / 100).toFixed(2)}` : discountLabel;
	const discountedTotal = totalPrice > 0 ? `${currency} ${((totalPrice - calculatedSavings) / 100).toFixed(2)}` : null;
	function toggle(id: string) {
		setSelectedOptional((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}

	function handleAdd() {
		if (selectedCount === 0) return;
		// Pass only the selected variant IDs — server decides what to add
		submit(
			bundle.id,
			selectedItems.map((i) => i.productVariantId),
		);
	}

	if (bundle.bundleType === "FIXED_BUNDLE") {
		return (
			<div className="bg-white p-4 border border-gray-200 rounded overflow-hidden">
				<div className="pt-3 pb-2">
					<div className="flex gap-2 w-full overflow-x-auto pb-1 scrollbar-hide">
						<div className="aspect-square w-[120px] flex-shrink-0 bg-gray-50 overflow-hidden">
							{triggerImage ? (
								<img src={resolveBundleImage(triggerImage, vendureBase)} alt="Main product" className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-200" />
							) : (
								<div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center gap-1">
									<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0121 4.5v15A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3z" />
									</svg>
									<span className="text-[10px] text-gray-300 font-medium">No image</span>
								</div>
							)}
						</div>
						<div className="w-4 flex-shrink-0 flex items-center justify-center text-gray-400">+</div>
						{sortedItems.map((item, i) => (
							<Fragment key={item.productVariantId}>
								<Link to={`/products/${item.productSlug}`} className="block aspect-square w-[120px] flex-shrink-0 bg-gray-50 overflow-hidden">
									{item.featuredAsset ? (
										<img src={resolveBundleImage(item.featuredAsset.preview, vendureBase ?? "")} alt={item.productName} className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-200" />
									) : (
										<div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
												<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0121 4.5v15A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3z" />
											</svg>
											<span className="text-[10px] text-gray-300 font-medium">No image</span>
										</div>
									)}
								</Link>
								{sortedItems.length - 1 !== i && <div className="w-4 flex-shrink-0 flex items-center justify-center text-gray-400">+</div>}
							</Fragment>
						))}
					</div>
					<div>
						<div className="text-sm mt-2 font-semibold text-black">Combo with:</div>
						<Link to={`/products/${bundle.items[0].productSlug}`} className="text-sm text-blue-700 hover:text-black transition-colors line-clamp-2 leading-snug block">
							{bundle.items[0].productName}
						</Link>
						<div className="text-sm text-gray-500 mt-0.5 bg-stone-100 p-2 rounded">{bundle.description}</div>
						<div className="text-lg font-bold text-black mt-0.5">Combo Price: {discountedTotal}</div>
					</div>
				</div>
				{/* Footer */}
				<div className="pb-3 pt-1.5">
					<button onClick={handleAdd} disabled={isLoading || selectedCount === 0} className="w-full flex items-center justify-center gap-2 border-2 border-[#3b8578] text-[#3b8578] bg-white hover:bg-[#3b8578] hover:text-white font-semibold text-sm py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed">
						{isLoading ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <ShoppingCart size={15} />}
						{isLoading ? "Adding…" : `Add all items to cart`}
					</button>
				</div>
			</div>
		);
	} else {
		return (
			<div className="bg-white border border-gray-200 rounded-md overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-primary to-primary/70 px-3 py-2 flex items-center justify-between rounded-t-md">
					<div className="flex items-center gap-1.5">
						<Zap size={12} className="text-amber-300 fill-amber-300 flex-shrink-0" />
						<span className="text-white font-extrabold text-xs">{bundle.name}</span>
					</div>
					<span className="bg-amber-400 text-gray-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">{savingsDisplay}</span>
				</div>
				{/* Items row */}
				<div className="p-4 pb-2">
					<div className="flex gap-2 justify-between overflow-x-auto pb-1 scrollbar-hide">
						{sortedItems.map((item) => (
							<BundleItemCard key={item.productVariantId} item={item} selected={isSelected(item)} onToggle={() => toggle(item.productVariantId)} compact={compact} vendureBase={vendureBase} />
						))}
					</div>
				</div>
				{/* Footer */}
				<div className="p-4 pt-1.5">
					<button onClick={handleAdd} disabled={isLoading || selectedCount === 0} className="w-full flex items-center justify-center gap-2 border-2 border-[#3b8578] text-[#3b8578] bg-white hover:bg-[#3b8578] hover:text-white font-semibold text-sm py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed">
						{isLoading ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <ShoppingCart size={15} />}
						{isLoading ? "Adding…" : discountedTotal ? `Add all items - ${discountedTotal}` : "Add all items"}
					</button>
				</div>
			</div>
		);
	}
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
	productId: string;
	triggerVariantId: string;
	triggerVariantPrice: number;
	triggerImage?: string;
	placement: "inline" | "below";
	vendureBase: string;
}

export default function ProductBundleOffers({ productId, triggerVariantId, triggerVariantPrice, triggerImage, placement, vendureBase }: Props) {
	const bundles = useBundleOffers(productId);

	if (!bundles || bundles.length === 0) return null;

	if (placement === "inline") {
		const inlineBundles = bundles.filter((b) => b.items.length <= 2);
		if (inlineBundles.length === 0) return null;
		return (
			<div className="mt-2 flex flex-col gap-3">
				{inlineBundles.map((bundle) => (
					<BundleCard key={bundle.id} bundle={bundle} triggerVariantId={triggerVariantId} triggerVariantPrice={triggerVariantPrice} compact vendureBase={vendureBase} triggerImage={triggerImage} />
				))}
			</div>
		);
	}

	const belowBundles = bundles;
	if (belowBundles.length === 0) return null;

	return (
		<div className="mt-4">
			<div className="flex flex-col gap-3">
				{belowBundles.map((bundle) => (
					<BundleCard key={bundle.id} bundle={bundle} triggerVariantId={triggerVariantId} triggerVariantPrice={triggerVariantPrice} vendureBase={vendureBase} triggerImage={triggerImage} />
				))}
			</div>
		</div>
	);
}
