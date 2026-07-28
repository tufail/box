import type { Route } from "./+types/products.$slug";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useFetcher, Link, useRouteLoaderData } from "react-router";
import type { ActiveCustomer } from "~/graphql/checkout";
import { useCart } from "~/context/CartContext";
import { Heart, Share2, CheckCircle, XCircle, Minus, Plus, ShieldCheck, ChevronLeft, ChevronRight, Link2, Star, TrendingUp, ThumbsUp, ThumbsDown, BadgeCheck, ImagePlus, ChevronDown, Sun, Leaf, Droplet, Maximize2, X, Truck, Info } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import Breadcrumb, { type BreadcrumbItem } from "~/components/Breadcrumb";
import HomeTopSelling from "~/components/HomeTopSelling";
import ProductBundleOffers from "~/components/ProductBundleOffers";
import SortDropdown from "~/components/SortDropdown";
import ProductHighlights, { type HighlightItem } from "~/components/ProductHighlights";
import { PRODUCT_DETAIL_QUERY, PRODUCT_DETAIL_BY_VARIANT_SLUG_QUERY, SEARCH_TOP_SELLING, PRODUCT_RATING_SUMMARY_QUERY, type ProductDetailData, type ProductDetailByVariantSlugData, type ProductDetailItem, type ProductDetailVariant, type SearchProductItem, type SearchProductsData, type SearchTopSellingVariables, type ProductRatingSummaryData, type ProductRatingSummary, type ReviewItem, type ReviewSortOrder, type VariantRanking } from "~/graphql/product";
import VendureImage, { vendureImageUrl } from "~/components/VendureImage";
import type { AddToCartResult, AddToCartOrderResult, InsufficientStockError } from "~/graphql/order";
import { getAddToCartErrorMessage } from "~/graphql/order";
import { useNotification } from "~/context/NotificationContext";
import { useWishlist, type WishlistItem } from "~/context/WishlistContext";
import { SITE_NAME } from "~/lib/seo";

const WHATSAPP_NUMBER = "97412345678"; // replace with business WhatsApp number (country code + number, no +)

// TODO: placeholder data — replace with real values once the "highlights" custom
// field is confirmed on the backend and mapped from `product.customFields`.
const DUMMY_HIGHLIGHTS: HighlightItem[] = [
	{ type: "gauge", label: "Potency", value: 75, displayValue: "High" },
	{ type: "icon", label: "Best Time to Take", icon: <Sun size={24} className="text-amber-600" />, value: "Morning", iconBg: "#fef3c7" },
	{ type: "icon", label: "Dietary Type", icon: <Leaf size={24} className="text-green-600" />, value: "Vegan", iconBg: "#dcfce7" },
	{ type: "tags", label: "Certifications", tags: [{ text: "GMP Certified", color: "#0ea5e9" }, { text: "Non-GMO", color: "#8b5cf6" }] },
	{ type: "gauge", label: "Absorption Speed", value: 85, displayValue: "Fast" },
	{ type: "icon", label: "Serving Form", icon: <Droplet size={24} className="text-blue-600" />, value: "Powder", iconBg: "#dbeafe" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveImage(preview: string, vendureBase: string) {
	// The local dev backend (running on Windows) sometimes returns asset preview
	// paths with backslashes (a Node path.join artifact on that OS) — normalized
	// defensively here regardless of environment, since a malformed image URL in
	// JSON-LD/og:image silently breaks rich results either way.
	const normalized = preview.replace(/\\/g, "/");
	return normalized.startsWith("http") ? normalized : `${vendureBase}${normalized}`;
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

	if (!product) return [{ title: "Product — NutriBox" }];

	const baseTitle = product.customFields?.metaTitle ?? product.name;
	const title = variantName ? `${baseTitle} — ${variantName} — NutriBox` : `${baseTitle} — NutriBox`;
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
		{ property: "og:site_name", content: "NutriBox" },
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
	const slugParam = params.slug!;
	const url = new URL(request.url);
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	try {
		// $slug is either a product's own slug (bare product page, defaults to its
		// first variant) or a specific variant's full slug (e.g.
		// "whey-protein-chocolate-2kg") — try the product lookup first since it's
		// the common case, then fall back to the variant lookup.
		let product: ProductDetailItem | null = null;
		let activeVariantId: string | null = null;

		const { data } = await graphqlRequest<ProductDetailData>(env, PRODUCT_DETAIL_QUERY, { slug: slugParam }, { request });
		if (data.product) {
			product = data.product;
		} else {
			const { data: variantData } = await graphqlRequest<ProductDetailByVariantSlugData>(env, PRODUCT_DETAIL_BY_VARIANT_SLUG_QUERY, { slug: slugParam }, { request });
			if (variantData.productVariantBySlug) {
				product = variantData.productVariantBySlug.product;
				activeVariantId = variantData.productVariantBySlug.id;
			}
		}
		if (!product) throw new Response("Not Found", { status: 404 });

		const activeVariant = activeVariantId
			? (product.variants.find((v) => v.id === activeVariantId) ?? product.variants[0])
			: product.variants[0];
		// A raw variant id isn't a resolvable path on its own — fall back to the bare
		// product URL if this variant's slug hasn't been backfilled/indexed yet.
		const canonicalUrl = activeVariant?.customFields?.slug
			? `${url.origin}/products/${activeVariant.customFields.slug}`
			: `${url.origin}/products/${product.slug}`;

		const collectionSlug = product.collections[0]?.slug;
		const [simResult, summaryResult, currentProductResult] = await Promise.allSettled([
			collectionSlug ? graphqlRequest<SearchProductsData, SearchTopSellingVariables>(env, SEARCH_TOP_SELLING, { input: { collectionSlug, groupByProduct: true, take: 9, sort: { salesCount: "DESC" } } }, { request }) : Promise.resolve(null),
			graphqlRequest<ProductRatingSummaryData>(env, PRODUCT_RATING_SUMMARY_QUERY, { slug: product.slug }, { request }),
			// Dedicated search for current product to get sold count + best seller data
			graphqlRequest<SearchProductsData, SearchTopSellingVariables>(env, SEARCH_TOP_SELLING, { input: { term: product.name, groupByProduct: true, take: 5 } }, { request }),
		]);

		const allSearchItems = simResult.status === "fulfilled" && simResult.value ? simResult.value.data.search.items : [];
		const similarProducts: SearchProductItem[] = allSearchItems.filter((p) => p.slug !== product.slug).slice(0, 8);

		// Find current product in the dedicated search result (term: product.name)
		const currentProductItems = currentProductResult.status === "fulfilled" ? currentProductResult.value.data.search.items : [];
		const currentInSearch = currentProductItems.find((p) => p.slug === product.slug) ?? allSearchItems.find((p) => p.slug === product.slug); // fallback to similar results

		const soldCount30d: number = currentInSearch?.customProductMappings?.soldCount30d ?? 0;
		const bestSellerRank: number | null = currentInSearch?.customProductMappings?.bestSellerRank ?? null;
		const bestSellerCollection: string | null = currentInSearch?.customProductMappings?.bestSellerCollection ?? null;
		const bestSellerCollectionSlug: string | null = currentInSearch?.customProductMappings?.bestSellerCollectionSlug ?? null;

		const ratingSummary: ProductRatingSummary | null = summaryResult.status === "fulfilled" ? (summaryResult.value.data.productRatingSummaryBySlug ?? null) : null;

		// Variant.name is Vendure's auto-generated "Product Name - Option" string, which
		// would duplicate the product name if appended as-is — use just the option values
		// (e.g. "Strawberry, 5 lbs") as the distinguishing suffix instead.
		const activeVariantName = activeVariant?.options?.length ? activeVariant.options.map((o) => o.name).join(", ") : null;

		return { product, vendureBase, similarProducts, selectedVariantId: activeVariant?.id ?? null, canonicalUrl, activeVariantName, ratingSummary, soldCount30d, bestSellerRank, bestSellerCollection, bestSellerCollectionSlug };
	} catch (e) {
		if (e instanceof Response) throw e;
		throw new Response("Not Found", { status: 404 });
	}
}

// ── Image gallery ──────────────────────────────────────────────────────────

function Gallery({ images, variantImages, vendureBase, name, shareUrl, wishlistItem }: { images: string[]; variantImages: string[]; vendureBase: string; name: string; shareUrl: string; wishlistItem: WishlistItem }) {
	const [active, setActive] = useState(0);
	const [showShare, setShowShare] = useState(false);
	const [copied, setCopied] = useState(false);
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const shareRef = useRef<HTMLDivElement>(null);
	const { toggle, isWishlisted } = useWishlist();
	const wishlisted = isWishlisted(wishlistItem.variantId);

	// Close the share dropdown on outside click
	useEffect(() => {
		if (!showShare) return;
		const onClickOutside = (e: MouseEvent) => {
			if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
				setShowShare(false);
			}
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [showShare]);

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
				<div className="relative aspect-square rounded-2xl overflow-hidden bg-white">
					<VendureImage key={resolved[currentIdx]} src={resolved[currentIdx]} vendureBase={vendureBase} alt={name} width={900} height={900} objectFit="contain" eager={currentIdx === 0} imgClassName="mix-blend-multiply" />

					{/* Carousel prev/next */}
					{resolved.length > 1 && (
						<>
							<button onClick={() => setActive(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30" aria-label="Previous image">
								<ChevronLeft size={16} />
							</button>
							<button onClick={() => setActive(Math.min(resolved.length - 1, currentIdx + 1))} disabled={currentIdx === resolved.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30" aria-label="Next image">
								<ChevronRight size={16} />
							</button>
						</>
					)}
				</div>

				{/* Action buttons — outside overflow-hidden so the share dropdown can overflow */}
				<div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
					<button onClick={() => setLightboxOpen(true)} className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors" aria-label="View full screen">
						<Maximize2 size={15} />
					</button>
					<button onClick={() => toggle(wishlistItem)} className={`w-9 h-9 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors ${wishlisted ? "bg-white text-red-500" : "bg-white/90 text-gray-400 hover:text-red-500"}`} aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
						<Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
					</button>
					<div className="relative" ref={shareRef}>
						<button onClick={() => setShowShare((s) => !s)} className={`w-9 h-9 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors ${showShare ? "bg-white text-primary" : "bg-white/90 text-gray-600 hover:text-primary"}`} aria-label="Share">
							<Share2 size={15} />
						</button>

						{/* Share dropdown — absolute from the button, so it never widens the parent */}
						{showShare && (
							<div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20">
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
						<button key={i} onClick={() => setActive(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-colors bg-stone-100 ${active === i ? "border-black" : "border-stone-200 hover:border-gray-400"}`}>
							<img src={vendureImageUrl(src, vendureBase, { w: 64, h: 64, format: "webp", mode: "resize" })} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" loading="lazy" decoding="async" />
						</button>
					))}
				</div>
			)}

			{lightboxOpen && (
				<GalleryLightbox images={resolved} vendureBase={vendureBase} name={name} initialIndex={currentIdx} onClose={() => setLightboxOpen(false)} />
			)}
		</div>
	);
}

// ── Full-screen gallery lightbox with prev/next + click-to-zoom ────────────
function GalleryLightbox({ images, vendureBase, name, initialIndex, onClose }: { images: string[]; vendureBase: string; name: string; initialIndex: number; onClose: () => void }) {
	const [index, setIndex] = useState(initialIndex);
	const [zoomed, setZoomed] = useState(false);
	const [origin, setOrigin] = useState("50% 50%");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const goPrev = useCallback(() => {
		setZoomed(false);
		setIndex((i) => (i - 1 + images.length) % images.length);
	}, [images.length]);

	const goNext = useCallback(() => {
		setZoomed(false);
		setIndex((i) => (i + 1) % images.length);
	}, [images.length]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			else if (e.key === "ArrowLeft") goPrev();
			else if (e.key === "ArrowRight") goNext();
		};
		window.addEventListener("keydown", onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [goPrev, goNext, onClose]);

	const updateOrigin = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		setOrigin(`${x}% ${y}%`);
	};

	if (!mounted) return null;

	return createPortal(
		<div className="fixed inset-0 z-[999] bg-stone-100 flex flex-col animate-fade-in">
			<div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
				<span className="text-gray-500 text-sm font-medium">
					{index + 1} / {images.length}
				</span>
				<button onClick={onClose} className="w-9 h-9 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center text-white transition-colors" aria-label="Close">
					<X size={18} />
				</button>
			</div>

			<div className="relative flex-1 flex items-center justify-center px-4 sm:px-10 min-h-0">
				{images.length > 1 && (
					<button onClick={goPrev} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors z-10" aria-label="Previous image">
						<ChevronLeft size={20} />
					</button>
				)}

				<div
					className={`relative w-full h-full max-w-5xl max-h-[88vh] overflow-hidden ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
					onClick={(e) => {
						updateOrigin(e);
						setZoomed((z) => !z);
					}}
					onMouseMove={(e) => zoomed && updateOrigin(e)}
				>
					<img
						src={vendureImageUrl(images[index], vendureBase, { w: 1200, h: 1200, format: "webp", mode: "resize" })}
						alt={name}
						className="w-full h-full object-contain select-none transition-transform duration-300 ease-out"
						style={{ transform: zoomed ? "scale(2.2)" : "scale(1)", transformOrigin: origin }}
						draggable={false}
					/>
				</div>

				{images.length > 1 && (
					<button onClick={goNext} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors z-10" aria-label="Next image">
						<ChevronRight size={20} />
					</button>
				)}
			</div>

			{images.length > 1 && (
				<div className="flex items-center justify-center gap-1.5 py-2 flex-shrink-0">
					{images.map((_, i) => (
						<button
							key={i}
							onClick={() => {
								setZoomed(false);
								setIndex(i);
							}}
							className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-black" : "w-1.5 bg-gray-300 hover:bg-gray-400"}`}
							aria-label={`Go to image ${i + 1}`}
						/>
					))}
				</div>
			)}
		</div>,
		document.body
	);
}

// ── Product info tabs (Description / Full Specs / Warnings) ────────────────

function ProductInfoTabs({ description, warnings, qa = "" }: { description: string; warnings: string; qa?: string }) {
	const TABS = [
		{ key: "description", label: "Description", content: description, emptyText: "No description available for this product." },
		{ key: "warnings", label: "Disclaimer", content: warnings, emptyText: "No disclaimer available for this product." },
		{ key: "qa", label: "Q & A", content: qa, emptyText: "No questions have been asked about this product yet." },
	] as const;
	const [active, setActive] = useState<(typeof TABS)[number]["key"]>("description");
	const activeIndex = TABS.findIndex((t) => t.key === active);
	const activeTab = TABS[activeIndex];
	// Fixed pixel width (not percentage) so the pill always lines up exactly with its
	// button, regardless of how much the label text varies in length between tabs.
	const TAB_WIDTH = 128;

	return (
		<div className="flex flex-col items-center text-center">
			{/* Sliding pill tab bar */}
			<div className="relative inline-flex bg-white border border-gray-200 shadow-sm rounded-full p-1 mb-6">
				<div
					className="absolute top-1 bottom-1 left-1 rounded-full bg-black transition-transform duration-300 ease-out"
					style={{ width: TAB_WIDTH, transform: `translateX(${activeIndex * TAB_WIDTH}px)` }}
				/>
				{TABS.map((t) => (
					<button
						key={t.key}
						type="button"
						onClick={() => setActive(t.key)}
						style={{ width: TAB_WIDTH }}
						className={`relative z-10 py-2.5 text-sm font-bold rounded-full transition-colors whitespace-nowrap text-center ${active === t.key ? "text-white" : "text-gray-600 hover:text-black"}`}
					>
						{t.label}
					</button>
				))}
			</div>

			<div className="prose prose-sm max-w-2xl w-full mx-auto text-left text-gray-600 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-1">
				{activeTab.content ? (
					<div dangerouslySetInnerHTML={{ __html: activeTab.content }} />
				) : (
					<p className="text-gray-400 italic text-center">{activeTab.emptyText}</p>
				)}
			</div>
		</div>
	);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ loaderData }: Route.ComponentProps) {
	const { product, vendureBase, similarProducts, selectedVariantId, canonicalUrl, ratingSummary, soldCount30d: initialSold, bestSellerRank: initialRank, bestSellerCollection: initialCollection, bestSellerCollectionSlug: initialCollectionSlug } = loaderData;

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
	const { openCart, setCartCount } = useCart();
	const { notify } = useNotification();

	const activeVariant = optionGroups.length > 0 ? findVariant(product.variants, selected) : (product.variants[0] ?? null);

	// Rankings come from the dedicated variantRankings query (client-side, updates on variant switch)
	const [variantRankings, setVariantRankings] = useState<VariantRanking[]>([]);
	// sold30Days comes from SSR search index (product-level); best seller badge from SSR too
	const sold30Days = initialSold;
	const bestSellerInfo = initialRank != null && initialCollection ? { rank: initialRank, collection: initialCollection, slug: initialCollectionSlug } : null;

	useEffect(() => {
		if (!activeVariant?.id) return;
		fetch(`/api/variant-rankings?variantId=${encodeURIComponent(activeVariant.id)}`)
			.then((r) => r.json() as Promise<{ rankings: VariantRanking[] }>)
			.then((d) => setVariantRankings(d.rankings ?? []))
			.catch(() => setVariantRankings([]));
	}, [activeVariant?.id]);

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

	// Brand/category from facetValues
	const brand = product.facetValues.find((f) => f.facet.name.toLowerCase() === "brand")?.name ?? null;
	const category = product.facetValues.find((f) => f.facet.name.toLowerCase() === "category")?.name ?? null;

	// Breadcrumb
	const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];
	if (product.collections.length > 0) {
		const col = product.collections[product.collections.length - 1];
		breadcrumbs.push({ label: col.name, href: `/c/${col.slug}` });
	}
	breadcrumbs.push({ label: product.name });

	const videoUrl = product.customFields?.videoUrl ?? null;
	const additionalInfo = product.customFields?.additionalInfo ?? null;

	// Google explicitly disallows aggregateRating markup with zero reviews (it's
	// grounds for a manual structured-data action), so this needs an actual review
	// count, not just a truthy summary object — the backend always returns an
	// aggregateRating shape even when nobody's reviewed the product yet.
	const ar = ratingSummary && Number(ratingSummary.aggregateRating?.reviewCount) > 0 ? ratingSummary.aggregateRating : null;

	const siteOrigin = canonicalUrl ? new URL(canonicalUrl).origin : "";
	const seller = { "@type": "Organization", name: SITE_NAME };

	function offerFor(v: ProductDetailVariant) {
		return {
			"@type": "Offer",
			url: v.customFields?.slug ? `${siteOrigin}/products/${v.customFields.slug}` : canonicalUrl,
			price: (v.price / 100).toFixed(2),
			priceCurrency: v.currencyCode || "QAR",
			sku: v.sku,
			availability: isInStock(v.stockLevel) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
			itemCondition: "https://schema.org/NewCondition",
			seller,
		};
	}

	// The canonical URL only points at a single variant when that variant has its
	// own slug (customFields.slug) — in that case this page describes ONE product
	// (that variant), so the offer list should have exactly one entry, not every
	// flavor/size. Products without per-variant slugs fall back to a shared
	// product-level URL where multiple offers (one per variant) are the correct
	// representation, since the page itself covers the whole variant set.
	const isVariantPage = !!activeVariant?.customFields?.slug;
	const activeVariantName = activeVariant?.options?.length ? activeVariant.options.map((o) => o.name).join(", ") : null;
	const jsonLdName = isVariantPage && activeVariantName ? `${product.name} — ${activeVariantName}` : product.name;
	// Structured-data description should summarize the product, not reproduce the
	// full page body — prefer the curated meta description (same one used in <meta
	// name="description">) and fall back to a truncated plain-text product description.
	const jsonLdDescription = (product.customFields?.metaDescription || product.description.replace(/<[^>]+>/g, "").trim()).slice(0, 300);

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: jsonLdName,
		description: jsonLdDescription,
		url: canonicalUrl,
		...(product.featuredAsset?.preview && {
			image: resolveImage(product.featuredAsset.preview, vendureBase),
		}),
		...(activeVariant?.sku && { sku: activeVariant.sku }),
		...(brand && { brand: { "@type": "Brand", name: brand } }),
		...(category && { category }),
		...(ar && {
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: String(ar.ratingValue),
				reviewCount: String(ar.reviewCount),
				bestRating: String(ar.bestRating),
				worstRating: String(ar.worstRating),
			},
		}),
		offers: isVariantPage && activeVariant ? offerFor(activeVariant) : product.variants.map(offerFor),
	};

	// Breadcrumb trail as structured data too, for the same rich-result/AI-context
	// reasons as the Product schema above (siteOrigin computed above, alongside
	// the Product offers).
	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: breadcrumbs.map((crumb, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: crumb.label,
			item: crumb.href ? `${siteOrigin}${crumb.href}` : canonicalUrl,
		})),
	};

	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
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
								variantSlug: activeVariant?.customFields?.slug ?? null,
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
						{/* Title — full width */}
						<div className="mb-4">
							<h1 className="font-heading text-3xl md:text-4xl font-extrabold text-black leading-snug">{activeVariantName ? `${product.name} — ${activeVariantName}` : product.name}</h1>
							{brand && (
								<p className="text-sm text-gray-500">
									by <span className="text-primary font-medium">{brand}</span>
								</p>
							)}
							{ratingSummary && ratingSummary.totalReviews > 0 && (
								<div className="mt-1.5">
									<RatingSummaryBadge summary={ratingSummary} productSlug={product.slug} />
								</div>
							)}
						</div>

						{/* Inner 2-col: [stock + options] | price card */}
						<div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 items-start">
							{/* Left — Stock + Option selectors + Quality Promise */}
							<div className="flex flex-col gap-4">
								{/* Stock status */}
								<div className="border-t border-b border-gray-200 py-2.5 flex items-center justify-between">
									<div className="flex items-center gap-1.5">
										{inStock ? (
											<>
												<CheckCircle size={15} className="text-green-500" />
												<span className="text-xs font-medium text-green-600">In stock</span>
											</>
										) : (
											<>
												<XCircle size={15} className="text-red-400" />
												<span className="text-xs font-medium text-red-500">Out of stock</span>
											</>
										)}
									</div>
									<div className="inline-flex gap-2">
										{activeVariant?.sku && <span className="text-xs text-gray-400">SKU: {activeVariant.sku}</span>}
										{sold30Days > 0 && (
											<span className="flex items-center gap-1.5 text-xs font-normal text-red-600">
												<TrendingUp size={15} className="text-red-500" />
												{sold30Days.toLocaleString()}+ sold in last 30 days
											</span>
										)}
									</div>
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
													const variantHref = `/products/${matchedVariant?.customFields?.slug || product.slug}`;
													return (
														<Link
															key={val}
															to={variantHref}
															replace
															preventScrollReset
															aria-disabled={!available}
															onClick={(e) => {
																if (!available || !matchedVariant) {
																	e.preventDefault();
																	return;
																}
																setSelected({ ...selected, [group.code]: val });
															}}
															className={`relative px-4 py-2.5 rounded-full border text-sm transition-colors text-center min-w-[80px] ${isActive ? "border-primary bg-white text-black font-bold ring-2 ring-primary" : available ? "border-gray-300 text-gray-700 hover:border-primary hover:text-primary bg-white" : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50 pointer-events-none"}`}
														>
															<span className="block">{val}</span>
															{!available ? (
																<>
																	<span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
																		<span className="absolute top-1/2 left-1/2 w-[140%] h-px bg-gray-300 -translate-x-1/2 -translate-y-1/2 rotate-[-24deg]" />
																	</span>
																	<span className="absolute -top-1.5 right-1 bg-gray-700 text-white text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shadow-sm leading-none">Sold Out</span>
																</>
															) : (
																showPrice && <span className={`block text-xs mt-0.5 ${isActive ? "text-primary font-medium" : "text-gray-500"}`}>{matchedVariant ? formatQAR(matchedVariant.price) : "—"}</span>
															)}
														</Link>
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
								{additionalInfo && <div className="prose prose-sm max-w-none text-gray-600 border-t border-gray-100 pt-4" dangerouslySetInnerHTML={{ __html: additionalInfo }} />}
								{/* ── Sales & Rankings ── */}
								{variantRankings.length > 0 && (
									<div className="mt-2">
										<h4 className="text-orange-500 text-sm font-bold">Product rankings:</h4>
										{variantRankings.map((r) => (
											<div className="flex text-[12px] font-semibold" key={r.collectionSlug}>
												<span className="mr-1">#{r.rank} in </span>
												<Link to={`/c/${r.collectionSlug}`} className="text-blue-700 hover:underline">
													{r.collectionName}
												</Link>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Right — Price card (sticky) */}
							<div className="md:sticky md:top-6">
								<div className="bg-white border border-gray-300 rounded-2xl p-5 flex flex-col gap-4">
									{/* Price */}
									<div>
										<div className="text-2xl font-black text-black">{price !== null ? formatQAR(price) : "—"}</div>
										{hasDiscount && rrp !== null && (
											<div className="flex items-center gap-2 mt-1 flex-wrap">
												<span className="text-sm text-gray-400 line-through">{formatQAR(rrp)}</span>
												<span className="bg-lime-300 text-black text-xs font-bold px-2 py-0.5 rounded-full">{discountPct}% Off</span>
											</div>
										)}
									</div>

									<div className="flex flex-col gap-3">
										{/* Quantity stepper + shipping info */}
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center border border-gray-300 bg-white rounded-full overflow-hidden">
												<button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Decrease">
													<Minus size={13} />
												</button>
												<span className="w-7 text-center text-sm font-semibold select-none">{qty}</span>
												<button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Increase">
													<Plus size={13} />
												</button>
											</div>

											{/* TODO: placeholder copy — replace with real shipping/free-shipping-threshold config once available from the backend */}
											<div className="relative group">
												<button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-primary transition-colors cursor-default">
													<Truck size={15} />
													Shipping Info
													<Info size={13} className="text-gray-400" />
												</button>
												<div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-600 leading-relaxed opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-20">
													Free shipping on orders over <span className="font-bold text-black">QAR 150</span>. Standard delivery within Qatar in 2–4 business days.
												</div>
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

				{/* ── Highlights (placeholder data — see DUMMY_HIGHLIGHTS) ── */}
				<ProductHighlights title={product.name} items={DUMMY_HIGHLIGHTS} />

				{/* ── Description / Disclaimer / Q&A tabs + Nutrition Facts ──
				    Prefer the selected variant's own values; fall back to the product's
				    defaults only when this variant hasn't got its own override. */}
				{(() => {
					const nutritionInfo = activeVariant?.customFields?.additionalInfo || product.customFields?.additionalInfo || "";
					const disclaimer = activeVariant?.customFields?.keyInfo ?? "";
					if (!product.description && !nutritionInfo && !disclaimer) return null;
					return (
						<div className="mt-12 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 items-start">
							<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
								<ProductInfoTabs
									description={product.description ?? ""}
									warnings={disclaimer}
								/>
							</div>

							{/* Nutrition Facts */}
							{nutritionInfo && (
								<div className="lg:sticky lg:top-6">
									<div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: nutritionInfo }} />
								</div>
							)}
						</div>
					);
				})()}

				{/* ── Product video ── */}
				{videoUrl && (
					<div className="mt-12">
						<h2 className="font-heading text-xl font-extrabold text-black mb-4">Product Video</h2>
						<div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-sm max-w-2xl">
							<iframe src={videoUrl} title={`${product.name} video`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
						</div>
					</div>
				)}
			</div>
			{/* ── Ratings & Reviews ── */}
			<div className="container mx-auto px-4 mt-12">{ratingSummary && ratingSummary.totalReviews > 0 ? <RatingPanel summary={ratingSummary} productSlug={product.slug} /> : <NoReviews productSlug={product.slug} />}</div>

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

// ── Shared helpers ──────────────────────────────────────────────────────────

function Stars({ value, size = 14 }: { value: number; size?: number }) {
	return (
		<span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
			{[1, 2, 3, 4, 5].map((s) => {
				const fill = value >= s ? 1 : value >= s - 0.5 ? 0.5 : 0;
				return (
					<span key={s} className="relative inline-block" style={{ width: size, height: size }}>
						<Star size={size} className="text-gray-200" fill="currentColor" />
						{fill > 0 && (
							<span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
								<Star size={size} className="text-amber-400" fill="currentColor" />
							</span>
						)}
					</span>
				);
			})}
		</span>
	);
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function ReviewCard({ review, compact = false, onVote, isLoggedIn }: { review: ReviewItem; compact?: boolean; onVote?: (id: string, vote: "HELPFUL" | "NOT_HELPFUL") => void; isLoggedIn?: boolean }) {
	return (
		<div className={`border border-gray-100 rounded-xl p-4 md:p-5 bg-white ${compact ? "" : "shadow-sm"}`}>
			<div className="flex items-start justify-between gap-3 mb-2">
				<div>
					<Stars value={review.rating} size={13} />
					{review.title && <p className="font-semibold text-sm text-gray-900 mt-1">{review.title}</p>}
				</div>
				{review.isVerifiedPurchase && (
					<span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5 shrink-0">
						<BadgeCheck size={11} />
						Verified
					</span>
				)}
			</div>
			<p className={`text-sm text-gray-700 leading-relaxed ${compact ? "line-clamp-4" : ""}`}>{review.body}</p>
			{review.images.length > 0 && (
				<div className="flex gap-2 mt-3 flex-wrap">
					{review.images.slice(0, 4).map((img, i) => (
						<img key={i} src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-100" loading="lazy" />
					))}
				</div>
			)}
			<div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 flex-wrap gap-2">
				<div className="text-xs text-gray-400">
					<span className="font-medium text-gray-600">{review.authorName}</span>
					{review.authorLocation && <span> · {review.authorLocation}</span>}
					<span> · {formatDate(review.createdAt)}</span>
				</div>
				{onVote && isLoggedIn ? (
					<div className="flex items-center gap-3 text-xs text-gray-400">
						<span>Helpful?</span>
						<button onClick={() => onVote(review.id, "HELPFUL")} className={`flex items-center gap-1 hover:text-green-600 transition-colors ${review.myVote === "HELPFUL" ? "text-green-600 font-medium" : ""}`}>
							<ThumbsUp size={12} /> {review.helpfulCount}
						</button>
						<button onClick={() => onVote(review.id, "NOT_HELPFUL")} className={`flex items-center gap-1 hover:text-red-500 transition-colors ${review.myVote === "NOT_HELPFUL" ? "text-red-500 font-medium" : ""}`}>
							<ThumbsDown size={12} /> {review.notHelpfulCount}
						</button>
					</div>
				) : review.helpfulCount > 0 ? (
					<span className="text-xs text-gray-400 flex items-center gap-1">
						<ThumbsUp size={11} /> {review.helpfulCount} helpful
					</span>
				) : null}
			</div>
		</div>
	);
}

// ── No Reviews ───────────────────────────────────────────────────────────────

// ── Rating Summary Badge (hover dropdown) ────────────────────────────────────

function RatingSummaryBadge({ summary, productSlug }: { summary: ProductRatingSummary; productSlug: string }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const maxCount = Math.max(...summary.distribution.map((d) => d.count), 1);

	useEffect(() => {
		function onClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	return (
		<div ref={ref} className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
			<button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 cursor-pointer" aria-expanded={open} aria-haspopup="true">
				<Stars value={summary.averageRating} size={14} />
				<span className="text-sm text-gray-600 font-medium">{summary.totalReviews.toLocaleString()} Reviews</span>
				<ChevronDown size={13} className={`text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
			</button>

			{open && (
				<div className="absolute left-0 top-full z-30 w-64 pt-1" role="dialog" aria-label="Rating summary">
					<div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4">
						{/* Score row */}
						<div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
							<span className="text-3xl font-black text-gray-900">{summary.averageRating.toFixed(1)}</span>
							<div>
								<Stars value={summary.averageRating} size={14} />
								<p className="text-xs text-gray-400 mt-0.5">{summary.totalReviews.toLocaleString()} reviews</p>
							</div>
						</div>

						{/* Distribution bars */}
						<div className="space-y-1.5 mb-4">
							{[5, 4, 3, 2, 1].map((star) => {
								const count = summary.distribution.find((d) => d.rating === star)?.count ?? 0;
								const pct = Math.round((count / maxCount) * 100);
								return (
									<div key={star} className="flex items-center gap-2">
										<span className="text-xs text-gray-500 w-4 text-right shrink-0">{star}</span>
										<Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
										<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
											<div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
										</div>
										<span className="text-xs text-gray-400 w-10 shrink-0 text-right">{count.toLocaleString()}</span>
									</div>
								);
							})}
						</div>

						<Link to={`/products/${productSlug}/reviews`} onClick={() => setOpen(false)} className="block w-full text-center bg-[#3b8578] hover:bg-[#2e6b61] text-white text-sm font-semibold py-2.5 rounded-full transition-colors">
							See customer reviews
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}

// ── No Reviews ───────────────────────────────────────────────────────────────

function NoReviews({ productSlug }: { productSlug: string }) {
	return (
		<section aria-label="Customer reviews">
			<h2 className="font-heading text-xl font-extrabold text-black mb-6">Customer Reviews</h2>
			<div className="border border-dashed border-amber-300 rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-5 bg-amber-50/40">
				<div className="flex items-center gap-1">
					{[1, 2, 3, 4, 5].map((s) => (
						<Star key={s} size={28} className="text-amber-300" strokeWidth={1.5} />
					))}
				</div>
				<p className="text-gray-500 text-sm">Looks like no one reviewed this product yet.</p>
				<Link to={`/products/${productSlug}/reviews#write`} className="bg-black hover:bg-gray-800 text-white font-semibold text-sm px-8 py-2.5 rounded-full transition-colors">
					Write a Review
				</Link>
			</div>
		</section>
	);
}

// ── Rating Panel ────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: ReviewSortOrder; label: string }[] = [
	{ value: "MOST_RELEVANT", label: "Most Relevant" },
	{ value: "NEWEST", label: "Newest" },
	{ value: "HIGHEST_RATED", label: "Highest Rated" },
	{ value: "LOWEST_RATED", label: "Lowest Rated" },
	{ value: "MOST_HELPFUL", label: "Most Helpful" },
];

function RatingPanel({ summary, productSlug }: { summary: ProductRatingSummary; productSlug: string }) {
	const maxCount = Math.max(...summary.distribution.map((d) => d.count), 1);

	// Auth
	const rootData = useRouteLoaderData("root") as { activeCustomer: ActiveCustomer | null } | undefined;
	const isLoggedIn = !!rootData?.activeCustomer;

	const [sort, setSort] = useState<ReviewSortOrder>("MOST_RELEVANT");
	const reviewsFetcher = useFetcher<{ reviews: ReviewItem[]; totalItems: number }>();

	// Load reviews on mount
	useEffect(() => {
		reviewsFetcher.load(`/api/product-reviews?slug=${productSlug}&sort=MOST_RELEVANT&take=5`);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	function handleSortChange(newSort: ReviewSortOrder) {
		setSort(newSort);
		reviewsFetcher.load(`/api/product-reviews?slug=${productSlug}&sort=${newSort}&take=5`);
	}

	const reviews: ReviewItem[] = reviewsFetcher.data?.reviews ?? [];
	const totalReviews = reviewsFetcher.data?.totalItems ?? summary.totalReviews;
	const loading = reviewsFetcher.state !== "idle";

	// Optimistic vote overrides: reviewId → patched fields
	const [voteOverrides, setVoteOverrides] = useState<Record<string, Partial<ReviewItem>>>({});

	const voteFetcher = useFetcher<{ ok: boolean }>();
	function handleVote(reviewId: string, vote: "HELPFUL" | "NOT_HELPFUL") {
		const base = reviews.find((x) => x.id === reviewId);
		if (!base) return;
		const current = { ...base, ...voteOverrides[reviewId] };
		const toggling = current.myVote === vote;
		const nextVote = toggling ? null : vote;
		const hDelta = vote === "HELPFUL" ? (toggling ? -1 : 1) : current.myVote === "HELPFUL" ? -1 : 0;
		const nhDelta = vote === "NOT_HELPFUL" ? (toggling ? -1 : 1) : current.myVote === "NOT_HELPFUL" ? -1 : 0;
		setVoteOverrides((prev) => ({
			...prev,
			[reviewId]: { myVote: nextVote, helpfulCount: current.helpfulCount + hDelta, notHelpfulCount: current.notHelpfulCount + nhDelta },
		}));
		voteFetcher.submit({ _intent: "vote", reviewId, vote }, { method: "POST", action: "/api/reviews", encType: "application/json" });
	}

	const displayReviews = reviews.map((r) => (voteOverrides[r.id] ? { ...r, ...voteOverrides[r.id] } : r));

	return (
		<section aria-label="Customer reviews">
			{/* Header */}
			<div className="flex items-center justify-between gap-4 mb-6">
				<h2 className="font-heading text-xl font-extrabold text-black">Customer Reviews</h2>
				<Link to={`/products/${productSlug}/reviews#write`} className="shrink-0 bg-black hover:bg-gray-800 text-white font-semibold text-sm px-5 py-2 rounded-full transition-colors">
					Write a Review
				</Link>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
				{/* Left sidebar */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
					<div className="flex flex-col items-center py-2">
						<span className="text-5xl font-black text-gray-900">{summary.averageRating.toFixed(1)}</span>
						<Stars value={summary.averageRating} size={18} />
						<span className="text-xs text-gray-500 mt-1">{summary.totalReviews.toLocaleString()} reviews</span>
					</div>

					<div className="space-y-1.5">
						{[5, 4, 3, 2, 1].map((star) => {
							const count = summary.distribution.find((d) => d.rating === star)?.count ?? 0;
							const pct = Math.round((count / maxCount) * 100);
							return (
								<Link key={star} to={`/products/${productSlug}/reviews?rating=${star}`} className="flex items-center gap-2 group rounded-lg px-1 py-0.5 hover:bg-gray-50 transition-colors">
									<span className="text-xs text-gray-500 w-4 text-right shrink-0">{star}</span>
									<Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
									<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
										<div className="h-full bg-amber-400 rounded-full group-hover:bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
									</div>
									<span className="text-xs text-gray-400 w-12 shrink-0 text-right">{count.toLocaleString()}</span>
								</Link>
							);
						})}
					</div>

					<div>
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter</p>
						<div className="space-y-1">
							<Link to={`/products/${productSlug}/reviews?verified=true`} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
								<BadgeCheck size={13} />
								Verified only
							</Link>
							<Link to={`/products/${productSlug}/reviews?images=true`} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
								<ImagePlus size={13} />
								With photos
							</Link>
						</div>
					</div>
				</div>

				{/* Right — sort + reviews */}
				<div id="reviews" className="space-y-3">
					<div className="flex items-center justify-between gap-3 pb-1">
						<span className="text-sm text-gray-500">{totalReviews.toLocaleString()} reviews</span>
						<SortDropdown options={SORT_OPTIONS} value={sort} onChange={handleSortChange} />
					</div>

					{loading && reviews.length === 0 ? (
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<div key={i} className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm animate-pulse">
									<div className="h-3 bg-gray-100 rounded w-24 mb-3" />
									<div className="h-3 bg-gray-100 rounded w-full mb-2" />
									<div className="h-3 bg-gray-100 rounded w-3/4" />
								</div>
							))}
						</div>
					) : displayReviews.length > 0 ? (
						displayReviews.map((r) => <ReviewCard key={r.id} review={r} onVote={handleVote} isLoggedIn={isLoggedIn} />)
					) : (
						<p className="text-sm text-gray-400 py-4">No reviews yet.</p>
					)}

					{totalReviews > 5 && (
						<div className="pt-2">
							<Link to={`/products/${productSlug}/reviews`} className="w-full block text-center bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold text-sm py-3 rounded-full transition-colors">
								More Reviews ({totalReviews.toLocaleString()})
							</Link>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
