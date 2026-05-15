import type { Route } from "./+types/products.$slug";
import { useState, useEffect } from "react";
import { Heart, Share2, CheckCircle, XCircle, Minus, Plus, Info, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import Breadcrumb, { type BreadcrumbItem } from "~/components/Breadcrumb";
import { PRODUCT_DETAIL_QUERY, type ProductDetailData, type ProductDetailVariant } from "~/graphql/product";

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveImage(preview: string, vendureBase: string) {
	return preview.startsWith("http") ? preview : `${vendureBase}${preview}`;
}

function formatQAR(cents: number) {
	const val = cents / 100;
	return `QAR ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)}`;
}

function isInStock(stockLevel: string) {
	if (stockLevel === "OUT_OF_STOCK") return false;
	const n = Number(stockLevel);
	return isNaN(n) ? stockLevel !== "OUT_OF_STOCK" : n > 0;
}

function getOptionGroups(variants: ProductDetailVariant[]) {
	const map = new Map<string, { label: string; values: string[] }>();
	for (const v of variants) {
		for (const opt of v.options) {
			const gCode = opt.group.code;
			if (!map.has(gCode)) map.set(gCode, { label: opt.group.name, values: [] });
			if (!map.get(gCode)!.values.includes(opt.name)) map.get(gCode)!.values.push(opt.name);
		}
	}
	return [...map.entries()].map(([code, { label, values }]) => ({ code, label, values }));
}

function findVariant(variants: ProductDetailVariant[], selected: Record<string, string>) {
	return variants.find((v) => v.options.every((opt) => selected[opt.group.code] === opt.name)) ?? null;
}

function findVariantForValue(variants: ProductDetailVariant[], selected: Record<string, string>, groupCode: string, value: string) {
	return variants.find(
		(v) =>
			v.options.some((o) => o.group.code === groupCode && o.name === value) &&
			v.options.every((o) => o.group.code === groupCode || selected[o.group.code] === o.name)
	) ?? null;
}

function groupHasPriceVariation(variants: ProductDetailVariant[], selected: Record<string, string>, groupCode: string, values: string[]) {
	const prices = values.map((v) => findVariantForValue(variants, selected, groupCode, v)?.price).filter((p): p is number => p !== undefined);
	return new Set(prices).size > 1;
}

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs) {
	const p = (data as { product?: { name: string; customFields?: { metaTitle?: string | null; metaDescription?: string | null } | null } } | undefined)?.product;
	return [{ title: p?.customFields?.metaTitle ?? (p ? `${p.name} — PHQ` : "Product — PHQ") }, { name: "description", content: p?.customFields?.metaDescription ?? "" }];
}

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const slug = params.slug!;
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	try {
		const { data } = await graphqlRequest<ProductDetailData>(env, PRODUCT_DETAIL_QUERY, { slug }, { request });
		if (!data.product) throw new Response("Not Found", { status: 404 });
		return { product: data.product, vendureBase };
	} catch (e) {
		if (e instanceof Response) throw e;
		throw new Response("Not Found", { status: 404 });
	}
}

// ── Image gallery ──────────────────────────────────────────────────────────

function Gallery({ images, variantImages, vendureBase, name }: { images: string[]; variantImages: string[]; vendureBase: string; name: string }) {
	const [active, setActive] = useState(0);

	// Merge: variant images first, then product images (dedup by url)
	const combined = [...variantImages, ...images].filter((src, i, arr) => arr.indexOf(src) === i);
	const resolved = combined.map((s) => resolveImage(s, vendureBase));

	// When variant changes, reset to its first image (index 0 after merge)
	useEffect(() => { setActive(0); }, [variantImages]);

	const currentIdx = Math.min(active, resolved.length - 1);

	return (
		<div className="flex flex-col gap-3">
			<div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
				<img src={resolved[currentIdx]} alt={name} className="w-full h-full object-contain p-4" />

				{/* Carousel prev/next */}
				{resolved.length > 1 && (
					<>
						<button
							onClick={() => setActive(Math.max(0, currentIdx - 1))}
							disabled={currentIdx === 0}
							className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30"
							aria-label="Previous image"
						>
							<ChevronLeft size={16} />
						</button>
						<button
							onClick={() => setActive(Math.min(resolved.length - 1, currentIdx + 1))}
							disabled={currentIdx === resolved.length - 1}
							className="absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30"
							aria-label="Next image"
						>
							<ChevronRight size={16} />
						</button>
					</>
				)}

				{/* Action buttons — absolute top-right of image */}
				<div className="absolute top-3 right-3 flex flex-col gap-2">
					<button className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-colors" aria-label="Wishlist">
						<Heart size={15} />
					</button>
					<button className="w-9 h-9 rounded-full bg-primary/90 backdrop-blur-sm text-white shadow-sm flex items-center justify-center hover:bg-primary transition-colors" aria-label="Share">
						<Share2 size={15} />
					</button>
				</div>
			</div>

			{/* Thumbnail strip */}
			{resolved.length > 1 && (
				<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
					{resolved.map((src, i) => (
						<button key={i} onClick={() => setActive(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${active === i ? "border-primary" : "border-gray-200 hover:border-gray-400"}`}>
							<img src={src} alt="" className="w-full h-full object-contain p-1" />
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ loaderData }: Route.ComponentProps) {
	const { product, vendureBase } = loaderData;

	const optionGroups = getOptionGroups(product.variants);
	const initialSelected = Object.fromEntries(optionGroups.map((g) => [g.code, g.values[0]]));
	const [selected, setSelected] = useState<Record<string, string>>(initialSelected);
	const [qty, setQty] = useState(1);

	const activeVariant = optionGroups.length > 0 ? findVariant(product.variants, selected) : (product.variants[0] ?? null);

	const price = activeVariant?.price ?? null;
	const rrp = activeVariant?.customFields?.rrp ?? null;
	const hasDiscount = rrp !== null && price !== null && rrp > price;
	const discountPct = hasDiscount ? Math.round(100 - (price! / rrp!) * 100) : 0;
	const inStock = activeVariant ? isInStock(activeVariant.stockLevel) : false;

	// Images
	const allImages: string[] = [];
	if (product.featuredAsset) allImages.push(product.featuredAsset.preview);
	for (const a of product.assets) {
		if (!allImages.includes(a.preview)) allImages.push(a.preview);
	}

	// Brand from facetValues
	const brand = product.facetValues.find((f) => f.facet.name.toLowerCase() === "brand")?.name ?? null;

	// Breadcrumb
	const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];
	if (product.collections.length > 0) {
		const col = product.collections[product.collections.length - 1];
		breadcrumbs.push({ label: col.name, href: `/collections/${col.slug}` });
	}
	breadcrumbs.push({ label: product.name });

	const videoUrl = product.customFields?.videoUrl ?? null;
	const additionalInfo = product.customFields?.additionalInfo ?? null;

	return (
		<div className="container mx-auto px-4 py-6">
			{/* Breadcrumb */}
			<div className="mb-5">
				<Breadcrumb items={breadcrumbs} />
			</div>

			{/* ── Outer 2-col: image=1/3  detail=2/3 ── */}
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-start">
				{/* Image column — 1/3 */}
				<div>
					<Gallery
								images={allImages}
								variantImages={[
									...(activeVariant?.featuredAsset ? [activeVariant.featuredAsset.preview] : []),
									...(activeVariant?.assets?.map((a) => a.preview) ?? []),
								]}
								vendureBase={vendureBase}
								name={product.name}
							/>
				</div>

				{/* Detail column — 2/3 */}
				<div className="flex flex-col">
					{/* Title — full width of detail column */}
					<div className="flex items-start justify-between gap-4 mb-4">
						<div>
							<h1 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h1>
							{brand && (
								<p className="text-sm text-gray-500">
									by <span className="text-primary font-medium">{brand}</span>
								</p>
							)}
						</div>
					</div>

					{/* Stock status row — top + bottom border */}
					<div className="border-t border-b border-gray-200 py-3 flex items-center justify-between mb-5">
						<div className="flex items-center gap-1.5">
							{inStock ? (
								<>
									<CheckCircle size={15} className="text-green-500" />
									<span className="text-sm font-medium text-green-600">In stock</span>
								</>
							) : (
								<>
									<XCircle size={15} className="text-red-400" />
									<span className="text-sm font-medium text-red-500">Out of stock</span>
								</>
							)}
						</div>

						{activeVariant?.sku && <span className="text-xs text-gray-400">SKU: {activeVariant.sku}</span>}
					</div>

					{/* Inner 2-col: options | price card */}
					<div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 items-start">
						{/* Left — Option selectors + Quality Promise */}
						<div className="flex flex-col gap-4">
							{optionGroups.map((group) => {
								const showPrice = groupHasPriceVariation(product.variants, selected, group.code, group.values);
								return (
									<div key={group.code}>
										<div className="text-sm text-gray-600 mb-2">
											{group.label}: <span className="font-semibold text-gray-900">{selected[group.code]}</span>
										</div>
										<div className="flex flex-wrap gap-2">
											{group.values.map((val) => {
												const matchedVariant = findVariantForValue(product.variants, selected, group.code, val);
												const available = matchedVariant ? isInStock(matchedVariant.stockLevel) : false;
												const isActive = selected[group.code] === val;
												return (
													<button key={val} disabled={!available} onClick={() => setSelected((prev) => ({ ...prev, [group.code]: val }))} className={`px-4 py-2.5 rounded-lg border text-sm transition-colors text-center min-w-[80px] ${isActive ? "border-primary bg-white text-gray-900 font-semibold ring-2 ring-primary" : available ? "border-gray-300 text-gray-700 hover:border-primary hover:text-primary bg-white" : "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"}`}>
														<span className="block">{val}</span>
														{showPrice && <span className={`block text-xs mt-0.5 ${isActive ? "text-primary font-medium" : available ? "text-gray-500" : "text-gray-300"}`}>{available && matchedVariant ? formatQAR(matchedVariant.price) : "—"}</span>}
													</button>
												);
											})}
										</div>
									</div>
								);
							})}

							{/* Quality Promise */}
							<div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
								<ShieldCheck size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
								<div>
									<p className="text-sm font-semibold text-green-700">Quality Promise</p>
									<p className="text-xs text-green-600 mt-0.5">This product is guaranteed authentic and backed by our easy returns &amp; refunds policy.</p>
								</div>
							</div>

							{/* Product-level additional info */}
							{additionalInfo && (
								<div
									className="prose prose-sm max-w-none text-gray-600 border-t border-gray-100 pt-4"
									dangerouslySetInnerHTML={{ __html: additionalInfo }}
								/>
							)}
						</div>

						{/* Right — Price card (sticky) */}
						<div className="md:sticky md:top-6">
							<div className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white flex flex-col gap-4">
								{/* Price */}
								<div>
									<div className="text-2xl font-bold text-gray-900">{price !== null ? formatQAR(price) : "—"}</div>
									{hasDiscount && rrp !== null && (
										<div className="flex items-center gap-2 mt-1 flex-wrap">
											<span className="text-sm text-gray-400 line-through">{formatQAR(rrp)}</span>
											<span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">{discountPct}% Off</span>
										</div>
									)}
								</div>

								{/* Free shipping */}
								<div className="flex items-center gap-1.5 text-sm text-gray-500">
									<span>Free shipping</span>
									<Info size={13} className="text-gray-400" />
								</div>

								<hr className="border-gray-100" />

								{/* Quantity stepper */}
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
										<button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Decrease">
											<Minus size={13} />
										</button>
										<span className="w-7 text-center text-sm font-semibold select-none">{qty}</span>
										<button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Increase">
											<Plus size={13} />
										</button>
									</div>
								</div>

								{/* Add to Cart */}
								<button disabled={!inStock} className="w-full bg-primary hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-full transition-colors">
									{inStock ? "Add to Cart" : "Out of Stock"}
								</button>

								{/* Trust badges */}
								<ul className="space-y-1.5">
									{["Express delivery within 2 hours", "Secure Payment (Debit/Credit Card or COD)", "Easy & Hassle-Free Returns Within 48 Hours"].map((item) => (
										<li key={item} className="flex items-start gap-2 text-xs text-gray-500">
											<span className="text-primary mt-0.5">•</span>
											{item}
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
					{/* end inner 2-col */}
				</div>
				{/* end detail column */}
			</div>

			{/* ── Description + variant details ── */}
			{(product.description || videoUrl || activeVariant?.customFields?.additionalInfo) && (
				<div className="mt-12 border-t border-gray-100 pt-10">
					<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 items-start">

						{/* Left — product description + details + video */}
						<div className="space-y-10">
							{product.description && (
								<div>
									<h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
									<div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: product.description }} />
								</div>
							)}

							{videoUrl && (
								<div>
									<h2 className="text-xl font-bold text-gray-900 mb-4">Product Video</h2>
									<div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
										<iframe src={videoUrl} title={`${product.name} video`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
									</div>
								</div>
							)}
						</div>

						{/* Right — variant-specific additional info (reactive to selected options) */}
						{activeVariant?.customFields?.additionalInfo && (
							<div className="lg:sticky lg:top-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
								<h2 className="text-base font-bold text-gray-900 mb-3">
									{activeVariant.name} — Details
								</h2>
								<div
									className="prose prose-sm max-w-none text-gray-600"
									dangerouslySetInnerHTML={{ __html: activeVariant.customFields.additionalInfo }}
								/>
							</div>
						)}

					</div>
				</div>
			)}
		</div>
	);
}
