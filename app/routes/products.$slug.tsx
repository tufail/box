import type { Route } from "./+types/products.$slug";
import { useState, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useCart } from "~/context/CartContext";
import { Heart, Share2, CheckCircle, XCircle, Minus, Plus, ShieldCheck, ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import Breadcrumb, { type BreadcrumbItem } from "~/components/Breadcrumb";
import HomeTopSelling from "~/components/HomeTopSelling";
import ProductBundleOffers from "~/components/ProductBundleOffers";
import { PRODUCT_DETAIL_QUERY, SEARCH_TOP_SELLING, type ProductDetailData, type ProductDetailItem, type ProductDetailVariant, type SearchProductItem, type SearchProductsData, type SearchTopSellingVariables } from "~/graphql/product";
import VendureImage, { vendureImageUrl } from "~/components/VendureImage";
import type { AddToCartResult, AddToCartOrderResult, InsufficientStockError } from "~/graphql/order";
import { getAddToCartErrorMessage } from "~/graphql/order";
import { useNotification } from "~/context/NotificationContext";
import { useWishlist, type WishlistItem } from "~/context/WishlistContext";

const WHATSAPP_NUMBER = "97412345678"; // replace with business WhatsApp number (country code + number, no +)

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
	return variants.find((v) => v.options.some((o) => o.group.code === groupCode && o.name === value) && v.options.every((o) => o.group.code === groupCode || selected[o.group.code] === o.name)) ?? null;
}

function groupHasPriceVariation(variants: ProductDetailVariant[], selected: Record<string, string>, groupCode: string, values: string[]) {
	const prices = values.map((v) => findVariantForValue(variants, selected, groupCode, v)?.price).filter((p): p is number => p !== undefined);
	return new Set(prices).size > 1;
}

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({ loaderData }: Route.MetaArgs) {
	const product = loaderData?.product;
	const canonicalUrl = loaderData?.canonicalUrl ?? "";
	const vendureBase = loaderData?.vendureBase ?? "";
	const variantName = loaderData?.activeVariantName ?? null;

	if (!product) return [{ title: "Product — PHQ" }];

	const baseTitle = product.customFields?.metaTitle ?? product.name;
	const title = variantName ? `${baseTitle} — ${variantName} — PHQ` : `${baseTitle} — PHQ`;
	const rawDescription = product.customFields?.metaDescription ?? product.description.replace(/<[^>]+>/g, "").trim();
	const description = rawDescription.slice(0, 160);
	const image = product.featuredAsset?.preview ? resolveImage(product.featuredAsset.preview, vendureBase) : "";
	const brand = product.facetValues.find((f: { name: string; facet: { name: string } }) => f.facet.name.toLowerCase() === "brand")?.name ?? null;

	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		// Open Graph
		{ property: "og:type", content: "product" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:site_name", content: "PHQ" },
		...(image ? [{ property: "og:image", content: image }] : []),
		// Twitter
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		...(image ? [{ name: "twitter:image", content: image }] : []),
		// Product-specific OG
		...(brand ? [{ property: "product:brand", content: brand }] : []),
	];
}

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const slug = params.slug!;
	const url = new URL(request.url);
	const selectedVariantId = url.searchParams.get("variant") ?? null;
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	try {
		const { data } = await graphqlRequest<ProductDetailData>(env, PRODUCT_DETAIL_QUERY, { slug }, { request });
		if (!data.product) throw new Response("Not Found", { status: 404 });

		const activeVariant = selectedVariantId ? (data.product.variants.find((v) => v.id === selectedVariantId) ?? data.product.variants[0]) : data.product.variants[0];
		const canonicalUrl = activeVariant ? `${url.origin}/products/${slug}?variant=${activeVariant.id}` : `${url.origin}/products/${slug}`;

		let similarProducts: SearchProductItem[] = [];
		const collectionSlug = data.product.collections[0]?.slug;
		if (collectionSlug) {
			try {
				const { data: simData } = await graphqlRequest<SearchProductsData, SearchTopSellingVariables>(env, SEARCH_TOP_SELLING, { input: { collectionSlug, groupByProduct: true, take: 9, sort: { salesCount: "DESC" } } }, { request });
				similarProducts = simData.search.items.filter((p) => p.slug !== slug).slice(0, 8);
			} catch {
				// non-critical
			}
		}

		return { product: data.product, vendureBase, similarProducts, selectedVariantId: activeVariant?.id ?? null, canonicalUrl, activeVariantName: activeVariant?.name ?? null };
	} catch (e) {
		if (e instanceof Response) throw e;
		throw new Response("Not Found", { status: 404 });
	}
}

export function shouldRevalidate({ nextUrl, currentUrl, defaultShouldRevalidate }: { nextUrl: URL; currentUrl: URL; defaultShouldRevalidate: boolean }) {
	// Variant switches update only ?variant= on the same path — all data is already loaded
	if (nextUrl.pathname === currentUrl.pathname) return false;
	return defaultShouldRevalidate;
}

// ── Image gallery ──────────────────────────────────────────────────────────

function Gallery({ images, variantImages, vendureBase, name, shareUrl, wishlistItem }: { images: string[]; variantImages: string[]; vendureBase: string; name: string; shareUrl: string; wishlistItem: WishlistItem }) {
	const [active, setActive] = useState(0);
	const [showShare, setShowShare] = useState(false);
	const [copied, setCopied] = useState(false);
	const { toggle, isWishlisted } = useWishlist();
	const wishlisted = isWishlisted(wishlistItem.variantId);

	// Merge: variant images first, then product images (dedup by url)
	const combined = [...variantImages, ...images].filter((src, i, arr) => arr.indexOf(src) === i);
	const resolved = combined.map((s) => resolveImage(s, vendureBase));

	// When variant changes, reset to its first image (index 0 after merge)
	useEffect(() => {
		setActive(0);
	}, [variantImages]);

	const currentIdx = Math.min(active, resolved.length - 1);

	const handleCopy = () => {
		if (typeof navigator !== "undefined") {
			navigator.clipboard.writeText(shareUrl).then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			});
		}
	};

	const shareLinks = [
		{
			label: "WhatsApp",
			href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
			color: "text-green-600 hover:bg-green-50",
			icon: (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
					<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
				</svg>
			),
		},
		{
			label: "Facebook",
			href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
			color: "text-blue-600 hover:bg-blue-50",
			icon: (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
					<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
				</svg>
			),
		},
		{
			label: "X (Twitter)",
			href: `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(name)}`,
			color: "text-gray-900 hover:bg-gray-50",
			icon: (
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
					<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
				</svg>
			),
		},
	];

	return (
		<div className="flex flex-col gap-3">
			{/* Outer relative wrapper so action buttons sit outside the overflow-hidden image box */}
			<div className="relative">
				<div className="relative aspect-square rounded-xl overflow-hidden bg-stone-100">
					<VendureImage key={resolved[currentIdx]} src={resolved[currentIdx]} vendureBase={vendureBase} alt={name} width={600} height={600} objectFit="contain" eager={currentIdx === 0} imgClassName="mix-blend-multiply" />

					{/* Carousel prev/next */}
					{resolved.length > 1 && (
						<>
							<button onClick={() => setActive(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30" aria-label="Previous image">
								<ChevronLeft size={16} />
							</button>
							<button onClick={() => setActive(Math.min(resolved.length - 1, currentIdx + 1))} disabled={currentIdx === resolved.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30" aria-label="Next image">
								<ChevronRight size={16} />
							</button>
						</>
					)}
				</div>

				{/* Action buttons — outside overflow-hidden so the share dropdown can overflow */}
				<div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
					<button onClick={() => toggle(wishlistItem)} className={`w-9 h-9 rounded backdrop-blur-sm border shadow-sm flex items-center justify-center transition-colors ${wishlisted ? "bg-white border-red-200 text-red-500" : "bg-white/80 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200"}`} aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
						<Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
					</button>
					<div className="relative">
						<button onClick={() => setShowShare((s) => !s)} className={`w-9 h-9 rounded backdrop-blur-sm text-white shadow-sm flex items-center justify-center transition-colors ${showShare ? "bg-primary" : "bg-primary/90 hover:bg-primary"}`} aria-label="Share">
							<Share2 size={15} />
						</button>

						{/* Share dropdown — absolute from the button, so it never widens the parent */}
						{showShare && (
							<div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-20">
								{shareLinks.map((link) => (
									<a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setShowShare(false)} className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${link.color}`}>
										{link.icon}
										{link.label}
									</a>
								))}
								<button onClick={handleCopy} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 w-full transition-colors border-t border-gray-100">
									<Link2 size={15} className="flex-shrink-0" />
									{copied ? "Copied!" : "Copy Link"}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Thumbnail strip */}
			{resolved.length > 1 && (
				<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
					{resolved.map((src, i) => (
						<button key={i} onClick={() => setActive(i)} className={`w-16 h-16 rounded overflow-hidden border-2 flex-shrink-0 transition-colors bg-stone-100 ${active === i ? "border-primary" : "border-stone-200 hover:border-gray-400"}`}>
							<img src={vendureImageUrl(src, vendureBase, { w: 64, h: 64, format: "webp", mode: "resize" })} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" loading="lazy" decoding="async" />
						</button>
					))}
				</div>
			)}
		</div>
	);
}
// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ loaderData }: Route.ComponentProps) {
	const { product, vendureBase, similarProducts, selectedVariantId, canonicalUrl } = loaderData;

	const optionGroups = getOptionGroups(product.variants);
	const initialSelected = (() => {
		if (selectedVariantId) {
			const v = product.variants.find((v) => v.id === selectedVariantId);
			if (v) return Object.fromEntries(v.options.map((o) => [o.group.code, o.name]));
		}
		return Object.fromEntries(optionGroups.map((g) => [g.code, g.values[0]]));
	})();
	const [selected, setSelected] = useState<Record<string, string>>(initialSelected);
	const [qty, setQty] = useState(1);
	const [cartFeedback, setCartFeedback] = useState<"idle" | "success" | "error">("idle");
	const cartFetcher = useFetcher<AddToCartResult & { error?: string }>();
	const navigate = useNavigate();
	const { openCart, setCartCount } = useCart();
	const { notify } = useNotification();

	const activeVariant = optionGroups.length > 0 ? findVariant(product.variants, selected) : (product.variants[0] ?? null);

	useEffect(() => {
		if (cartFetcher.state !== "idle" || !cartFetcher.data) return;
		const item = cartFetcher.data.addItemToOrder;
		if (!item) return;

		if (item.__typename === "Order") {
			setCartCount((item as AddToCartOrderResult).totalQuantity);
			setCartFeedback("success");
			openCart();
			const t = setTimeout(() => setCartFeedback("idle"), 2500);
			return () => clearTimeout(t);
		}

		// InsufficientStockError: partial success — some qty was added
		if (item.__typename === "InsufficientStockError") {
			const err = item as InsufficientStockError;
			if (err.quantityAvailable > 0 && err.order) {
				setCartCount(err.order.totalQuantity);
				openCart();
			}
			notify(getAddToCartErrorMessage(item)!, "warning");
		} else {
			notify(getAddToCartErrorMessage(item)!, "error");
		}

		setCartFeedback("error");
		const t = setTimeout(() => setCartFeedback("idle"), 3000);
		return () => clearTimeout(t);
	}, [cartFetcher.state, cartFetcher.data]);

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

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: product.name,
		description: product.description.replace(/<[^>]+>/g, "").trim(),
		url: canonicalUrl,
		...(product.featuredAsset?.preview && {
			image: resolveImage(product.featuredAsset.preview, vendureBase),
		}),
		...(brand && { brand: { "@type": "Brand", name: brand } }),
		offers: product.variants.map((v) => ({
			"@type": "Offer",
			price: (v.price / 100).toFixed(2),
			priceCurrency: v.currencyCode || "QAR",
			sku: v.sku,
			availability: isInStock(v.stockLevel) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
			itemCondition: "https://schema.org/NewCondition",
		})),
	};

	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
			<div className="container mx-auto px-4 py-6">
				{/* Breadcrumb */}
				<div className="mb-5">
					<Breadcrumb items={breadcrumbs} />
				</div>

				{/* ── Outer 2-col: image=1/3  detail=2/3 ── */}
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-start">
					{/* Image column — 1/3 */}
					<div className="lg:sticky lg:top-[116px] self-start">
						<Gallery
							images={allImages}
							variantImages={[...(activeVariant?.featuredAsset ? [activeVariant.featuredAsset.preview] : []), ...(activeVariant?.assets?.map((a: { preview: string }) => a.preview) ?? [])]}
							vendureBase={vendureBase}
							name={product.name}
							shareUrl={canonicalUrl}
							wishlistItem={{
								variantId: activeVariant?.id ?? "",
								productSlug: product.slug,
								name: product.name,
								price: activeVariant?.price ?? 0,
								currencyCode: activeVariant?.currencyCode ?? "QAR",
								image: product.featuredAsset?.preview ?? "",
								vendureBase,
							}}
						/>
					</div>

					{/* Detail column — 2/3 */}
					<div className="flex flex-col">
						{/* Inner 2-col: [title + stock + options] | price card */}
						<div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 items-start">
							{/* Left — Title + Stock + Option selectors + Quality Promise */}
							<div className="flex flex-col gap-4">
								{/* Title */}
								<div>
									<h1 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h1>
									{brand && (
										<p className="text-sm text-gray-500">
											by <span className="text-primary font-medium">{brand}</span>
										</p>
									)}
								</div>

								{/* Stock status */}
								<div className="border-t border-b border-gray-200 py-2.5 flex items-center justify-between">
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
														<button
															key={val}
															disabled={!available}
															onClick={() => {
																const newSelected = { ...selected, [group.code]: val };
																setSelected(newSelected);
																const newVariant = findVariant(product.variants, newSelected);
																if (newVariant) {
																	navigate(`/products/${product.slug}?variant=${newVariant.id}`, { replace: true, preventScrollReset: true });
																}
															}}
															className={`px-4 py-2.5 rounded-full border text-sm transition-colors text-center min-w-[80px] ${isActive ? "border-primary bg-white text-gray-900 font-semibold ring-2 ring-primary" : available ? "border-gray-300 text-gray-700 hover:border-primary hover:text-primary bg-white" : "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"}`}
														>
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
								<div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded px-4 py-3">
									<ShieldCheck size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-semibold text-green-700">Quality Promise</p>
										<p className="text-xs text-green-600 mt-0.5">This product is guaranteed authentic and backed by our easy returns &amp; refunds policy.</p>
									</div>
								</div>

								{/* Product-level additional info */}
								{additionalInfo && <div className="prose prose-sm max-w-none text-gray-600 border-t border-gray-100 pt-4" dangerouslySetInnerHTML={{ __html: additionalInfo }} />}
								{/* Key info — full width below the 2-col grid */}
								{activeVariant?.customFields?.keyInfo && <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: activeVariant.customFields.keyInfo }} />}
							</div>

							{/* Right — Price card (sticky) */}
							<div className="md:sticky md:top-6">
								<div className="border border-gray-200 rounded-md p-5 bg-white flex flex-col gap-4">
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

									<div className="flex flex-row gap-3">
										{/* Quantity stepper */}
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
												<button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Decrease">
													<Minus size={13} />
												</button>
												<span className="w-7 text-center text-sm font-semibold select-none">{qty}</span>
												<button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Increase">
													<Plus size={13} />
												</button>
											</div>
										</div>

										{/* Add to Cart */}
										<button
											disabled={!inStock || cartFetcher.state !== "idle"}
											onClick={() => {
												if (!activeVariant || !inStock) return;
												cartFetcher.submit({ productVariantId: activeVariant.id, quantity: qty }, { method: "POST", action: "/api/cart", encType: "application/json" });
											}}
											className={`w-full text-white font-semibold text-sm py-3 rounded transition-colors cursor-pointer ${!inStock ? "bg-gray-300 cursor-not-allowed" : cartFeedback === "success" ? "bg-green-600" : cartFeedback === "error" ? "bg-red-500 hover:bg-red-600" : "bg-[#3b8578] hover:bg-[#2e6b61] disabled:bg-gray-300 disabled:cursor-not-allowed"} rounded-full`}
										>
											{!inStock ? "Out of Stock" : cartFetcher.state !== "idle" ? "Adding..." : cartFeedback === "success" ? "Added to Cart ✓" : cartFeedback === "error" ? "Failed — try again" : "Add to Cart"}
										</button>
									</div>
								</div>
								{/* Bundle offers */}
								<ProductBundleOffers productId={product.id} triggerVariantId={activeVariant?.id ?? ""} triggerVariantPrice={activeVariant?.priceWithTax || activeVariant?.price || 0} triggerImage={activeVariant?.featuredAsset?.preview || product.featuredAsset?.preview} placement="below" vendureBase={vendureBase} />

								{/* WhatsApp Inquiry */}
								<a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in this product and would like to enquire:\n\n*${product.name}*\n\n${typeof window !== "undefined" ? window.location.href : ""}`)}`} target="_blank" rel="noopener noreferrer" translate="no" className="flex mt-4 items-center justify-center gap-2 w-full bg-green-500 hover:bg-[#128C7E] text-white font-semibold text-sm py-3 rounded-full transition-colors">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
										<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
									</svg>
									WhatsApp Enquiry
								</a>
								{/* Trust badges */}
								<ul className="space-y-1.5 mt-5">
									{["Express delivery within 2 hours", "Secure Payment (Debit/Credit Card or COD)", "Easy & Hassle-Free Returns Within 48 Hours"].map((item) => (
										<li key={item} className="flex items-start gap-2 text-xs text-gray-500">
											<span className="text-primary mt-0.5">•</span>
											{item}
										</li>
									))}
								</ul>
							</div>
						</div>
						{/* end inner 2-col */}
					</div>
					{/* end detail column */}
				</div>

				{/* ── Description + variant details ── */}
				{(product.description || videoUrl || activeVariant?.customFields?.additionalInfo || activeVariant?.customFields?.keyInfo) && (
					<div className="mt-12">
						<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 items-start">
							{/* Left — product description + details + video */}
							<div className="space-y-10">
								{product.description && <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: product.description }} />}

								{videoUrl && (
									<div>
										<h2 className="text-xl font-bold text-gray-900 mb-4">Product Video</h2>
										<div className="aspect-video rounded overflow-hidden bg-gray-100">
											<iframe src={videoUrl} title={`${product.name} video`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
										</div>
									</div>
								)}
							</div>

							{/* Right — variant additionalInfo beside product description */}
							{activeVariant?.customFields?.additionalInfo && (
								<div className="lg:sticky lg:top-6">
									<div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: activeVariant.customFields.additionalInfo }} />
								</div>
							)}
						</div>
					</div>
				)}
			</div>
			{similarProducts.length > 0 && (
				<HomeTopSelling
					products={similarProducts}
					vendureBase={vendureBase}
					title={
						<>
							<strong>You May</strong> <span className="font-light">also like</span>
						</>
					}
				/>
			)}
		</>
	);
}
