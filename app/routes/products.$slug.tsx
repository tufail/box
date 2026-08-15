import type { Route } from "./+types/products.$slug";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useFetcher, useRouteLoaderData, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { ActiveCustomer } from "~/graphql/checkout";
import { useCart } from "~/context/CartContext";
import { Heart, Share2, CheckCircle, XCircle, Minus, Plus, ShieldCheck, ChevronLeft, ChevronRight, Link2, Star, TrendingUp, ThumbsUp, ThumbsDown, BadgeCheck, ImagePlus, ChevronDown, Maximize2, X, Truck, Info, CreditCard, RotateCcw } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import Breadcrumb, { type BreadcrumbItem } from "~/components/Breadcrumb";
import HomeTopSelling from "~/components/HomeTopSelling";
import ProductBundleOffers from "~/components/ProductBundleOffers";
import SortDropdown from "~/components/SortDropdown";
import ProductHighlights from "~/components/ProductHighlights";
import ProductComparisonTable from "~/components/ProductComparisonTable";
import ProductQA from "~/components/ProductQA";
import { PRODUCT_DETAIL_QUERY, PRODUCT_DETAIL_BY_VARIANT_SLUG_QUERY, SEARCH_TOP_SELLING, PRODUCT_RATING_SUMMARY_QUERY, relatedProductToSearchItem, type ProductDetailData, type ProductDetailByVariantSlugData, type ProductDetailItem, type ProductDetailVariant, type SearchProductItem, type SearchProductsData, type SearchTopSellingVariables, type ProductRatingSummaryData, type ProductRatingSummary, type ReviewItem, type ReviewSortOrder, type VariantRanking } from "~/graphql/product";
import VendureImage, { vendureImageUrl } from "~/components/VendureImage";
import type { AddToCartResult, AddToCartOrderResult, InsufficientStockError } from "~/graphql/order";
import { getAddToCartErrorMessage } from "~/graphql/order";
import type { SubscriptionPlan } from "~/graphql/subscription";
import { useNotification } from "~/context/NotificationContext";
import { useWishlist, type WishlistItem } from "~/context/WishlistContext";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, stripLocalePrefix, hreflangTags } from "~/lib/i18n";
import { formatPrice as formatCurrency } from "~/lib/currency";
import type { BannerItem } from "~/graphql/banner";

const WHATSAPP_NUMBER = "+97470157900"; // replace with business WhatsApp number (country code + number, no +)

// Fixed order matching PDP_COPY's trustBadges() output: delivery, payment, returns.
const TRUST_BADGE_ICONS = [Truck, CreditCard, RotateCcw];

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const PDP_COPY = {
	en: {
		previousImage: "Previous image",
		nextImage: "Next image",
		scrollThumbnailsPrev: "Scroll thumbnails left",
		scrollThumbnailsNext: "Scroll thumbnails right",
		goToImage: (n: number) => `Go to image ${n}`,
		viewFullScreen: "View full screen",
		removeFromWishlist: "Remove from wishlist",
		addToWishlist: "Add to wishlist",
		share: "Share",
		copied: "Copied!",
		copyLink: "Copy Link",
		close: "Close",
		tabDescription: "Description",
		tabDisclaimer: "Disclaimer",
		tabQA: "Q & A",
		noDescription: "No description available for this product.",
		noDisclaimer: "No disclaimer available for this product.",
		noQA: "No questions have been asked about this product yet.",
		inStock: "In stock",
		outOfStock: "Out of stock",
		sku: "SKU",
		soldLast30Days: (n: string) => `${n}+ sold in last 30 days`,
		soldOutBadge: "Sold Out",
		qualityPromise: "Quality Promise",
		qualityPromiseBody: "This product is guaranteed authentic and backed by our easy returns & refunds policy.",
		productHighlights: "Product Highlights",
		productRankings: "Product rankings:",
		rankIn: (rank: number) => `#${rank} in`,
		shippingInfo: "Shipping Info",
		shippingInfoPrefix: "Free shipping on orders over",
		shippingInfoSuffixExpress: ". Quick delivery within 2 hours.",
		shippingInfoSuffixStandard: ". Standard delivery within Qatar in 2–6 business days.",
		decrease: "Decrease",
		increase: "Increase",
		outOfStockBtn: "Out of Stock",
		adding: "Adding...",
		addedToCart: "Added to Cart ✓",
		failedTryAgain: "Failed — try again",
		addToCart: "Add to Cart",
		quickDelivery: "Quick Delivery",
		percentOff: (n: number) => `${n}% Off`,
		by: "by",
		whatsappEnquiry: "WhatsApp Enquiry",
		trustBadges: (express: boolean) => [express ? "Quick delivery within 2 hours" : "Standard delivery within Qatar in 2–6 business days", "Secure Payment (Debit/Credit Card or COD)", "Easy & Hassle-Free Returns Within 48 Hours"],
		productVideo: "Product Video",
		youMay: "You May",
		alsoLike: "also like",
		verified: "Verified",
		helpfulQuestion: "Helpful?",
		helpfulSuffix: "helpful",
		seeCustomerReviews: "See customer reviews",
		customerReviews: "Customer Reviews",
		noOneReviewedYet: "Looks like no one reviewed this product yet.",
		writeAReview: "Write a Review",
		filter: "Filter",
		verifiedOnly: "Verified only",
		withPhotos: "With photos",
		noReviewsYet: "No reviews yet.",
		moreReviews: (n: string) => `More Reviews (${n})`,
		reviews: "reviews",
		reviewsCap: "Reviews",
		starsOutOf5: (n: number) => `${n} out of 5 stars`,
		ratingSummary: "Rating summary",
		customerReviewsAria: "Customer reviews",
		sortMostRelevant: "Most Relevant",
		sortNewest: "Newest",
		sortHighestRated: "Highest Rated",
		sortLowestRated: "Lowest Rated",
		sortMostHelpful: "Most Helpful",
		selectFrequency: "Select Frequency:",
		subscribeAndSave: "Subscribe & Save",
		saveAmount: (amount: string) => `Save ${amount}`,
		deliverEvery: "Deliver Every",
		recommended: "(recommended)",
		skipModifyCancel: "Skip, modify or cancel at any time",
		oneTimePurchase: "One-Time Purchase",
		freeTrialDays: (n: number) => `Includes a ${n}-day free trial`,
	},
	ar: {
		previousImage: "الصورة السابقة",
		nextImage: "الصورة التالية",
		scrollThumbnailsPrev: "تمرير الصور المصغرة لليسار",
		scrollThumbnailsNext: "تمرير الصور المصغرة لليمين",
		goToImage: (n: number) => `الانتقال إلى الصورة ${n}`,
		viewFullScreen: "عرض بملء الشاشة",
		removeFromWishlist: "إزالة من المفضلة",
		addToWishlist: "إضافة إلى المفضلة",
		share: "مشاركة",
		copied: "تم النسخ!",
		copyLink: "نسخ الرابط",
		close: "إغلاق",
		tabDescription: "الوصف",
		tabDisclaimer: "إخلاء المسؤولية",
		tabQA: "الأسئلة والأجوبة",
		noDescription: "لا يوجد وصف متاح لهذا المنتج.",
		noDisclaimer: "لا يوجد إخلاء مسؤولية متاح لهذا المنتج.",
		noQA: "لم يتم طرح أي أسئلة حول هذا المنتج بعد.",
		inStock: "متوفر",
		outOfStock: "غير متوفر",
		sku: "رمز المنتج",
		soldLast30Days: (n: string) => `تم بيع ${n}+ خلال آخر 30 يومًا`,
		soldOutBadge: "نفدت الكمية",
		qualityPromise: "ضمان الجودة",
		qualityPromiseBody: "هذا المنتج مضمون الأصالة ومدعوم بسياسة الإرجاع والاسترداد السهلة لدينا.",
		productHighlights: "أبرز مميزات المنتج",
		productRankings: "تصنيفات المنتج:",
		rankIn: (rank: number) => `#${rank} في`,
		shippingInfo: "معلومات الشحن",
		shippingInfoPrefix: "شحن مجاني للطلبات فوق",
		shippingInfoSuffixExpress: ". توصيل سريع خلال ساعتين.",
		shippingInfoSuffixStandard: ". التوصيل القياسي داخل قطر خلال 2-6 أيام عمل.",
		decrease: "إنقاص",
		increase: "زيادة",
		outOfStockBtn: "غير متوفر",
		adding: "جارٍ الإضافة...",
		addedToCart: "تمت الإضافة إلى السلة ✓",
		failedTryAgain: "فشلت العملية — حاول مرة أخرى",
		addToCart: "أضف إلى السلة",
		quickDelivery: "توصيل سريع",
		percentOff: (n: number) => `خصم ${n}%`,
		by: "بواسطة",
		whatsappEnquiry: "استفسار عبر واتساب",
		trustBadges: (express: boolean) => [express ? "توصيل سريع خلال ساعتين" : "التوصيل القياسي داخل قطر خلال 2-6 أيام عمل", "دفع آمن (بطاقة ائتمان/خصم أو الدفع عند الاستلام)", "إرجاع سهل وميسّر خلال 48 ساعة"],
		productVideo: "فيديو المنتج",
		youMay: "قد",
		alsoLike: "يعجبك أيضًا",
		verified: "موثّق",
		helpfulQuestion: "مفيد؟",
		helpfulSuffix: "مفيد",
		seeCustomerReviews: "عرض تقييمات العملاء",
		customerReviews: "تقييمات العملاء",
		noOneReviewedYet: "يبدو أنه لم يقم أحد بتقييم هذا المنتج بعد.",
		writeAReview: "أضف تقييمًا",
		filter: "تصفية",
		verifiedOnly: "الموثّقة فقط",
		withPhotos: "مع صور",
		noReviewsYet: "لا توجد تقييمات بعد.",
		moreReviews: (n: string) => `المزيد من التقييمات (${n})`,
		reviews: "تقييمات",
		reviewsCap: "تقييمات",
		starsOutOf5: (n: number) => `${n} من 5 نجوم`,
		ratingSummary: "ملخص التقييمات",
		customerReviewsAria: "تقييمات العملاء",
		sortMostRelevant: "الأكثر صلة",
		sortNewest: "الأحدث",
		sortHighestRated: "الأعلى تقييمًا",
		sortLowestRated: "الأقل تقييمًا",
		sortMostHelpful: "الأكثر فائدة",
		selectFrequency: "اختر عدد مرات التوصيل:",
		subscribeAndSave: "اشترك ووفّر",
		saveAmount: (amount: string) => `وفّر ${amount}`,
		deliverEvery: "التوصيل كل",
		recommended: "(موصى به)",
		skipModifyCancel: "يمكنك التخطي أو التعديل أو الإلغاء في أي وقت",
		oneTimePurchase: "شراء لمرة واحدة",
		freeTrialDays: (n: number) => `يشمل تجربة مجانية لمدة ${n} يومًا`,
	},
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveImage(preview: string, vendureBase: string) {
	// The local dev backend (running on Windows) sometimes returns asset preview
	// paths with backslashes (a Node path.join artifact on that OS) — normalized
	// defensively here regardless of environment, since a malformed image URL in
	// JSON-LD/og:image silently breaks rich results either way.
	const normalized = preview.replace(/\\/g, "/");
	return normalized.startsWith("http") ? normalized : `${vendureBase}${normalized}`;
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

// Variant.name is already a complete, well-formed title (e.g. "Dymatize ISO100
// ... - 5 lbs Cookies & Cream - 74 Servings") — used as-is rather than
// recombined with product.name. Only whitespace artifacts from the backend
// (e.g. a stray tab before "75 Servings") are normalized here.
function variantDisplayTitle(variant: ProductDetailVariant | null) {
	return variant?.name ? variant.name.replace(/\s+/g, " ").trim() : null;
}

// Renders a plan's interval as a human-readable "Deliver Every" label, e.g.
// intervalCount=2, interval=WEEKLY -> "2 weeks" / "أسبوعين".
function intervalLabel(plan: SubscriptionPlan, locale: "en" | "ar") {
	const n = plan.intervalCount;
	const unitsEn: Record<SubscriptionPlan["interval"], [string, string]> = {
		DAILY: ["day", "days"],
		WEEKLY: ["week", "weeks"],
		BIWEEKLY: ["2 weeks", "2 weeks"],
		MONTHLY: ["month", "months"],
		QUARTERLY: ["quarter", "quarters"],
		SEMI_ANNUAL: ["6 months", "6 months"],
		ANNUAL: ["year", "years"],
	};
	const unitsAr: Record<SubscriptionPlan["interval"], string> = {
		DAILY: "يوم",
		WEEKLY: "أسبوع",
		BIWEEKLY: "أسبوعين",
		MONTHLY: "شهر",
		QUARTERLY: "ربع سنة",
		SEMI_ANNUAL: "6 أشهر",
		ANNUAL: "سنة",
	};
	if (locale === "ar") {
		return n > 1 && plan.interval !== "BIWEEKLY" ? `${n} ${unitsAr[plan.interval]}` : unitsAr[plan.interval];
	}
	const [singular, plural] = unitsEn[plan.interval];
	if (plan.interval === "BIWEEKLY" || plan.interval === "SEMI_ANNUAL") return plural;
	return n > 1 ? `${n} ${plural}` : singular;
}

// Custom "Deliver Every" plan picker — replaces a native <select> (which can't be
// fully styled, especially its options popup) with the same accessible, keyboard-
// navigable, click-outside-to-close pattern already used by SortDropdown, just
// with trigger/list markup that fits inline inside the stone-100 box instead of
// SortDropdown's standalone pill button.
function PlanFrequencySelect({ plans, value, onChange, disabled, locale, recommendedLabel }: { plans: SubscriptionPlan[]; value: string | null; onChange: (id: string) => void; disabled: boolean; locale: "en" | "ar"; recommendedLabel: string }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const currentIndex = plans.findIndex((p) => p.id === value);
	const current = plans[currentIndex] ?? plans[0];

	function optionLabel(plan: SubscriptionPlan, i: number) {
		return `${intervalLabel(plan, locale)}${i === 0 && plans.length > 1 ? ` ${recommendedLabel}` : ""}`;
	}

	function closeAndFocusTrigger() {
		setOpen(false);
		triggerRef.current?.focus();
	}
	function select(index: number) {
		onChange(plans[index].id);
		closeAndFocusTrigger();
	}
	function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
		if (disabled) return;
		if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setOpen(true);
			requestAnimationFrame(() => optionRefs.current[Math.max(currentIndex, 0)]?.focus());
		}
	}
	function onListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		const focusedIndex = optionRefs.current.findIndex((el) => el === document.activeElement);
		if (e.key === "Escape") {
			e.preventDefault();
			closeAndFocusTrigger();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			optionRefs.current[(focusedIndex + 1) % plans.length]?.focus();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			optionRefs.current[(focusedIndex - 1 + plans.length) % plans.length]?.focus();
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (focusedIndex >= 0) select(focusedIndex);
		} else if (e.key === "Tab") {
			setOpen(false);
		}
	}

	if (plans.length === 0) return null;

	return (
		<div ref={ref} className="relative">
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				onClick={() => setOpen((o) => !o)}
				onKeyDown={onTriggerKeyDown}
				aria-haspopup="listbox"
				aria-expanded={open}
				className="w-full flex items-center justify-between gap-2 text-sm font-medium text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span>{current ? optionLabel(current, currentIndex < 0 ? 0 : currentIndex) : ""}</span>
				<ChevronDown size={14} className={`text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
			</button>

			{open && !disabled && (
				<div role="listbox" onKeyDown={onListKeyDown} className="absolute start-0 end-0 top-full mt-2 bg-white border border-gray-200 shadow-lg rounded-xl z-30 py-1 max-h-64 overflow-auto">
					{plans.map((p, i) => (
						<button
							key={p.id}
							ref={(el) => {
								optionRefs.current[i] = el;
							}}
							type="button"
							role="option"
							aria-selected={p.id === value}
							onClick={() => select(i)}
							className={`w-full text-start px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${p.id === value ? "font-bold text-gray-900" : "text-gray-700"}`}
						>
							{optionLabel(p, i)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({ loaderData }: Route.MetaArgs) {
	const product = loaderData?.product;
	const canonicalUrl = loaderData?.canonicalUrl ?? "";
	const vendureBase = loaderData?.vendureBase ?? "";
	const variantName = loaderData?.activeVariantName ?? null;

	if (!product) return [{ title: "Product — NutriBox Qatar" }];

	const baseTitle = variantName ?? product.customFields?.metaTitle ?? product.name;
	const title = `${baseTitle} — NutriBox Qatar`;
	const rawDescription = product.customFields?.metaDescription ?? product.description.replace(/<[^>]+>/g, "").trim();
	const description = rawDescription.slice(0, 160);
	// Prefer the specific variant's own image (e.g. the flavor being viewed) — only
	// fall back to the product's generic image when the variant has none of its own.
	const activeVariant = loaderData?.selectedVariantId ? product.variants.find((v) => v.id === loaderData.selectedVariantId) : null;
	const imagePreview = activeVariant?.featuredAsset?.preview ?? product.featuredAsset?.preview;
	const image = imagePreview ? resolveImage(imagePreview, vendureBase) : "";
	const brand = product.facetValues.find((f) => f.facet.code === "brands")?.name ?? null;
	const canonicalPath = canonicalUrl ? stripLocalePrefix(new URL(canonicalUrl).pathname) : "";

	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...(canonicalPath ? hreflangTags(SITE_URL, canonicalPath) : []),
		// Open Graph
		{ property: "og:type", content: "product" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:site_name", content: "NutriBox Qatar" },
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
	const locale = getLocaleFromPathname(url.pathname);
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

		const activeVariant = activeVariantId ? (product.variants.find((v) => v.id === activeVariantId) ?? product.variants[0]) : product.variants[0];
		// A raw variant id isn't a resolvable path on its own — fall back to the bare
		// product URL if this variant's slug hasn't been backfilled/indexed yet.
		const canonicalUrl = activeVariant?.customFields?.slug ? `${url.origin}${localizePath(`/products/${activeVariant.customFields.slug}`, locale)}` : `${url.origin}${localizePath(`/products/${product.slug}`, locale)}`;

		// Real co-purchase recommendations ("customers who bought this also bought").
		// Empty until orders with 2+ products have been paid (cold start for a young
		// store) — the component fetches a same-collection fallback client-side in
		// that case instead of blocking SSR with an extra query on every request.
		const similarProducts: SearchProductItem[] = product.relatedProducts
			.map(relatedProductToSearchItem)
			.filter((p): p is SearchProductItem => p !== null && p.inStock)
			.slice(0, 8);
		const collectionSlug = product.collections[0]?.slug ?? null;

		const [summaryResult, currentProductResult] = await Promise.allSettled([
			graphqlRequest<ProductRatingSummaryData>(env, PRODUCT_RATING_SUMMARY_QUERY, { slug: product.slug }, { request }),
			// Dedicated search for current product to get sold count + best seller data
			graphqlRequest<SearchProductsData, SearchTopSellingVariables>(env, SEARCH_TOP_SELLING, { input: { term: product.name, groupByProduct: false, take: 5 } }, { request }),
		]);

		// Find current product in the dedicated search result (term: product.name)
		const currentProductItems = currentProductResult.status === "fulfilled" ? currentProductResult.value.data.search.items : [];
		const currentInSearch = currentProductItems.find((p) => p.slug === product.slug);

		const soldCount30d: number = currentInSearch?.customProductMappings?.soldCount30d ?? 0;
		const bestSellerRank: number | null = currentInSearch?.customProductMappings?.bestSellerRank ?? null;
		const bestSellerCollection: string | null = currentInSearch?.customProductMappings?.bestSellerCollection ?? null;
		const bestSellerCollectionSlug: string | null = currentInSearch?.customProductMappings?.bestSellerCollectionSlug ?? null;

		const ratingSummary: ProductRatingSummary | null = summaryResult.status === "fulfilled" ? (summaryResult.value.data.productRatingSummaryBySlug ?? null) : null;

		const activeVariantName = variantDisplayTitle(activeVariant);

		// Comparison table data is fetched client-side (ProductComparisonTable, via
		// /api/product-comparison) — it's a supplementary section, not something
		// every visitor needs immediately, so it shouldn't hold up the PDP's own
		// SSR render. Only cheap, already-in-hand values are computed here: the
		// group id (gates whether the component renders at all) and the flavor
		// option name (so a cross-brand comparison matches Chocolate-vs-Chocolate,
		// not whichever variant happened to be listed first).
		const comparisonGroupId = product.customFields?.comparisonGroupId ?? null;
		const comparisonFlavorOption = activeVariant?.options.find((o) => /flavor/i.test(o.group.code) || /flavor/i.test(o.group.name))?.name ?? null;

		return { product, vendureBase, similarProducts, similarCollectionSlug: collectionSlug, selectedVariantId: activeVariant?.id ?? null, canonicalUrl, activeVariantName, ratingSummary, soldCount30d, bestSellerRank, bestSellerCollection, bestSellerCollectionSlug, comparisonGroupId, comparisonFlavorOption, locale };
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
	const thumbStripRef = useRef<HTMLDivElement>(null);
	const thumbRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
	const [canScrollThumbsPrev, setCanScrollThumbsPrev] = useState(false);
	const [canScrollThumbsNext, setCanScrollThumbsNext] = useState(false);
	const { toggle, isWishlisted } = useWishlist();
	const wishlisted = isWishlisted(wishlistItem.variantId);
	const t = PDP_COPY[getLocaleFromPathname(useLocation().pathname)];

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

	const updateThumbScrollState = useCallback(() => {
		const el = thumbStripRef.current;
		if (!el) return;
		setCanScrollThumbsPrev(el.scrollLeft > 4);
		setCanScrollThumbsNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
	}, []);

	useEffect(() => {
		updateThumbScrollState();
		window.addEventListener("resize", updateThumbScrollState);
		return () => window.removeEventListener("resize", updateThumbScrollState);
	}, [updateThumbScrollState, resolved.length]);

	function scrollThumbs(direction: "prev" | "next") {
		thumbStripRef.current?.scrollBy({ left: direction === "prev" ? -160 : 160, behavior: "smooth" });
	}

	// Keep the active thumbnail visible when it's changed from outside the strip
	// itself — e.g. the main image's prev/next controls or a variant swap —
	// not just when a thumbnail is clicked directly.
	useEffect(() => {
		thumbRefs.current.get(currentIdx)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
	}, [currentIdx]);

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
					{resolved[currentIdx] ? (
						<VendureImage key={resolved[currentIdx]} src={resolved[currentIdx]} vendureBase={vendureBase} alt={name} width={900} height={900} objectFit="contain" eager={currentIdx === 0} imgClassName="mix-blend-multiply" />
					) : (
						<div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl font-bold bg-gray-50">{name[0]}</div>
					)}

					{/* Carousel prev/next */}
					{resolved.length > 1 && (
						<>
							<button onClick={() => setActive(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} className="absolute start-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30" aria-label={t.previousImage}>
								<ChevronLeft size={16} className="rtl:rotate-180" />
							</button>
							<button onClick={() => setActive(Math.min(resolved.length - 1, currentIdx + 1))} disabled={currentIdx === resolved.length - 1} className="absolute end-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors disabled:opacity-30" aria-label={t.nextImage}>
								<ChevronRight size={16} className="rtl:rotate-180" />
							</button>
						</>
					)}
				</div>

				{/* Action buttons — outside overflow-hidden so the share dropdown can overflow */}
				<div className="absolute top-3 end-3 flex flex-col gap-2 z-10">
					{resolved.length > 0 && (
						<button onClick={() => setLightboxOpen(true)} className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-600 hover:text-primary transition-colors" aria-label={t.viewFullScreen}>
							<Maximize2 size={15} />
						</button>
					)}
					<button onClick={() => toggle(wishlistItem)} className={`w-9 h-9 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors ${wishlisted ? "bg-white text-red-500" : "bg-white/90 text-gray-400 hover:text-red-500"}`} aria-label={wishlisted ? t.removeFromWishlist : t.addToWishlist}>
						<Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
					</button>
					<div className="relative" ref={shareRef}>
						<button onClick={() => setShowShare((s) => !s)} className={`w-9 h-9 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center transition-colors ${showShare ? "bg-white text-primary" : "bg-white/90 text-gray-600 hover:text-primary"}`} aria-label={t.share}>
							<Share2 size={15} />
						</button>

						{/* Share dropdown — absolute from the button, so it never widens the parent */}
						{showShare && (
							<div className="absolute end-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20">
								{shareLinks.map((link) => (
									<a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setShowShare(false)} className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${link.color}`}>
										{link.icon}
										{link.label}
									</a>
								))}
								<button onClick={handleCopy} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 w-full transition-colors border-t border-gray-100">
									<Link2 size={15} className="flex-shrink-0" />
									{copied ? t.copied : t.copyLink}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Thumbnail strip */}
			{resolved.length > 1 && (
				<div className="relative">
					{canScrollThumbsPrev && (
						<button onClick={() => scrollThumbs("prev")} aria-label={t.scrollThumbnailsPrev} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-2 rtl:translate-x-2 z-10 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors">
							<ChevronLeft size={14} className="rtl:rotate-180" />
						</button>
					)}

					<div ref={thumbStripRef} onScroll={updateThumbScrollState} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
						{resolved.map((src, i) => (
							<button
								key={i}
								ref={(el) => {
									if (el) thumbRefs.current.set(i, el);
									else thumbRefs.current.delete(i);
								}}
								onClick={() => setActive(i)}
								aria-label={t.goToImage(i + 1)}
								aria-current={active === i}
								className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-colors bg-stone-100 ${active === i ? "border-black" : "border-stone-200 hover:border-gray-400"}`}
							>
								<img src={vendureImageUrl(src, vendureBase, { preset: "small", format: "webp" })} alt="" className="w-full h-full object-contain p-1 mix-blend-multiply" loading="lazy" decoding="async" />
							</button>
						))}
					</div>

					{canScrollThumbsNext && (
						<button onClick={() => scrollThumbs("next")} aria-label={t.scrollThumbnailsNext} className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-2 rtl:-translate-x-2 z-10 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors">
							<ChevronRight size={14} className="rtl:rotate-180" />
						</button>
					)}
				</div>
			)}

			{lightboxOpen && <GalleryLightbox images={resolved} vendureBase={vendureBase} name={name} initialIndex={currentIdx} onClose={() => setLightboxOpen(false)} />}
		</div>
	);
}

// ── Full-screen gallery lightbox with prev/next + click-to-zoom ────────────
function GalleryLightbox({ images, vendureBase, name, initialIndex, onClose }: { images: string[]; vendureBase: string; name: string; initialIndex: number; onClose: () => void }) {
	const [index, setIndex] = useState(initialIndex);
	const [zoomed, setZoomed] = useState(false);
	const [origin, setOrigin] = useState("50% 50%");
	const [mounted, setMounted] = useState(false);
	const t = PDP_COPY[getLocaleFromPathname(useLocation().pathname)];

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
				<button onClick={onClose} className="w-9 h-9 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center text-white transition-colors" aria-label={t.close}>
					<X size={18} />
				</button>
			</div>

			<div className="relative flex-1 flex items-center justify-center px-4 sm:px-10 min-h-0">
				{images.length > 1 && (
					<button onClick={goPrev} className="absolute start-2 sm:start-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors z-10" aria-label={t.previousImage}>
						<ChevronLeft size={20} className="rtl:rotate-180" />
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
					<img src={vendureImageUrl(images[index], vendureBase, { preset: "xlarge", format: "webp" })} alt={name} className="w-full h-full object-contain select-none transition-transform duration-300 ease-out" style={{ transform: zoomed ? "scale(2.2)" : "scale(1)", transformOrigin: origin }} draggable={false} />
				</div>

				{images.length > 1 && (
					<button onClick={goNext} className="absolute end-2 sm:end-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-sm hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors z-10" aria-label={t.nextImage}>
						<ChevronRight size={20} className="rtl:rotate-180" />
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
							aria-label={t.goToImage(i + 1)}
						/>
					))}
				</div>
			)}
		</div>,
		document.body,
	);
}

// ── Product info tabs (Description / Full Specs / Warnings) ────────────────

function ProductInfoTabs({ description, warnings, productId, productSlug }: { description: string; warnings: string; productId: string; productSlug: string }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = PDP_COPY[locale];
	const TABS = [
		{ key: "description", label: t.tabDescription, content: description, emptyText: t.noDescription },
		{ key: "warnings", label: t.tabDisclaimer, content: warnings, emptyText: t.noDisclaimer },
		{ key: "qa", label: t.tabQA, content: null as string | null, emptyText: t.noQA },
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
				<div className="absolute top-1 bottom-1 start-1 rounded-full bg-black transition-transform duration-300 ease-out" style={{ width: TAB_WIDTH, transform: `translateX(${(locale === "ar" ? -1 : 1) * activeIndex * TAB_WIDTH}px)` }} />
				{TABS.map((t) => (
					<button key={t.key} type="button" onClick={() => setActive(t.key)} style={{ width: TAB_WIDTH }} className={`relative z-10 py-2.5 text-sm font-bold rounded-full transition-colors whitespace-nowrap text-center ${active === t.key ? "text-white" : "text-gray-600 hover:text-black"}`}>
						{t.label}
					</button>
				))}
			</div>

			{active === "qa" ? (
				<div className="w-full max-w-2xl mx-auto text-start">
					<ProductQA productId={productId} productSlug={productSlug} embedded />
				</div>
			) : (
				<div className="prose prose-sm max-w-2xl w-full mx-auto text-start text-gray-600 prose-ul:ps-5 prose-ol:ps-5 prose-li:my-1">{activeTab.content ? <div dangerouslySetInnerHTML={{ __html: activeTab.content }} /> : <p className="text-gray-400 italic text-center">{activeTab.emptyText}</p>}</div>
			)}
		</div>
	);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ loaderData }: Route.ComponentProps) {
	const { product, vendureBase, similarProducts: initialSimilarProducts, similarCollectionSlug, selectedVariantId, canonicalUrl, ratingSummary, soldCount30d: initialSold, bestSellerRank: initialRank, bestSellerCollection: initialCollection, bestSellerCollectionSlug: initialCollectionSlug, comparisonGroupId, comparisonFlavorOption, locale } = loaderData;
	const t = PDP_COPY[locale];

	const optionGroups = getOptionGroups(product.variants);
	const initialSelected = (() => {
		if (selectedVariantId) {
			const v = product.variants.find((v) => v.id === selectedVariantId);
			if (v) return Object.fromEntries(v.options.map((o) => [o.group.code, o.name]));
		}
		return Object.fromEntries(optionGroups.map((g) => [g.code, g.values[0]]));
	})();
	const [purchaseType, setPurchaseType] = useState<"subscribe" | "once">("once");
	const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [selected, setSelected] = useState<Record<string, string>>(initialSelected);
	const [qty, setQty] = useState(1);
	const [cartFeedback, setCartFeedback] = useState<"idle" | "success" | "error">("idle");
	const cartFetcher = useFetcher<AddToCartResult & { error?: string }>();
	const { openCart, setCartCount } = useCart();
	const { notify } = useNotification();

	const activeVariant = optionGroups.length > 0 ? findVariant(product.variants, selected) : (product.variants[0] ?? null);
	// Driven by the raw sellable quantity, not stockLevel — stockLevel reports
	// untracked-inventory variants as always IN_STOCK regardless of real stock,
	// which would wrongly promise Express delivery on those.
	const isExpressDelivery = (activeVariant?.stockQty ?? 0) > 0;

	// Rankings come from the dedicated variantRankings query (client-side, updates on variant switch)
	const [variantRankings, setVariantRankings] = useState<VariantRanking[]>([]);
	// sold30Days comes from SSR search index (product-level); best seller badge from SSR too
	const sold30Days = initialSold;
	const bestSellerInfo = initialRank != null && initialCollection ? { rank: initialRank, collection: initialCollection, slug: initialCollectionSlug } : null;

	useEffect(() => {
		if (!activeVariant?.id) return;
		fetch(`/api/variant-rankings?variantId=${encodeURIComponent(activeVariant.id)}&lang=${locale}`)
			.then((r) => r.json() as Promise<{ rankings: VariantRanking[] }>)
			.then((d) => setVariantRankings(d.rankings ?? []))
			.catch(() => setVariantRankings([]));
	}, [activeVariant?.id, locale]);

	// Cold-start fallback for "similar products": SSR only sends real co-purchase
	// data (product.relatedProducts). When that's empty — no paid multi-item
	// orders yet for this store — fetch a same-collection fallback client-side
	// instead of paying for that extra search query on every SSR request.
	const [similarProducts, setSimilarProducts] = useState<SearchProductItem[]>(initialSimilarProducts);
	useEffect(() => {
		setSimilarProducts(initialSimilarProducts);
		if (initialSimilarProducts.length > 0 || !similarCollectionSlug) return;
		let cancelled = false;
		fetch(`/api/concern-products?collectionSlug=${encodeURIComponent(similarCollectionSlug)}&take=9&lang=${locale}`)
			.then((r) => r.json() as Promise<{ items: SearchProductItem[] }>)
			.then((d) => {
				if (cancelled) return;
				setSimilarProducts((d.items ?? []).filter((p) => p.slug !== product.slug).slice(0, 8));
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [initialSimilarProducts, similarCollectionSlug, product.slug, locale]);

	// Free-shipping threshold shown in the Add to Cart tooltip — fetched from the
	// same "top-bar-items" banner group as the header's top bar, so the two never
	// drift apart (previously this was a hardcoded placeholder amount here).
	const [freeShippingThreshold, setFreeShippingThreshold] = useState<string | null>(null);
	useEffect(() => {
		let cancelled = false;
		fetch("/api/banner/top-bar-items")
			.then((r): Promise<{ items: BannerItem[] } | null> => (r.ok ? r.json() : Promise.resolve(null)))
			.then((data) => {
				if (cancelled) return;
				const item = data?.items.find((i) => /\d/.test(i.title));
				const amount = item?.title.match(/[\d,.]+/)?.[0];
				if (amount) setFreeShippingThreshold(amount);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	// Subscribe & Save — which plans (if any) this variant is eligible for.
	// Empty array = variant isn't enrolled in any subscription plan on the backend.
	useEffect(() => {
		if (!activeVariant?.id) return;
		let cancelled = false;
		fetch(`/api/subscription-plans?variantId=${encodeURIComponent(activeVariant.id)}&lang=${locale}`)
			.then((r) => r.json() as Promise<{ plans: SubscriptionPlan[] }>)
			.then((d) => {
				if (cancelled) return;
				const plans = (d.plans ?? []).filter((p) => p.isActive);
				setSubscriptionPlans(plans);
				setSelectedPlanId(plans[0]?.id ?? null);
				setPurchaseType(plans.length > 0 ? "subscribe" : "once");
			})
			.catch(() => {
				if (cancelled) return;
				setSubscriptionPlans([]);
				setSelectedPlanId(null);
				setPurchaseType("once");
			});
		return () => {
			cancelled = true;
		};
	}, [activeVariant?.id, locale]);

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

	// Subscribe & Save
	const selectedPlan = subscriptionPlans.find((p) => p.id === selectedPlanId) ?? null;
	const subscribePrice = selectedPlan && price !== null ? Math.round(price * (1 - selectedPlan.discountPercent / 100)) : null;

	// Images
	const allImages: string[] = [];
	if (product.featuredAsset) allImages.push(product.featuredAsset.preview);
	for (const a of product.assets) {
		if (!allImages.includes(a.preview)) allImages.push(a.preview);
	}

	// Brand/category from facetValues
	const brandFacetValue = product.facetValues.find((f) => f.facet.code === "brands");
	const brand = brandFacetValue?.name ?? null;
	const category = product.facetValues.find((f) => f.facet.name.toLowerCase() === "category")?.name ?? null;

	// Breadcrumb
	const breadcrumbs: BreadcrumbItem[] = [{ label: locale === "ar" ? "الرئيسية" : "Home", href: "/" }];
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
			url: v.customFields?.slug ? `${siteOrigin}${localizePath(`/products/${v.customFields.slug}`, locale)}` : canonicalUrl,
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
	const activeVariantName = variantDisplayTitle(activeVariant);
	const jsonLdName = isVariantPage && activeVariantName ? activeVariantName : product.name;
	// Structured-data description should summarize the product, not reproduce the
	// full page body — prefer the AI Overview field (written specifically for AI
	// assistants/AI search overviews reading this markup), then the curated meta
	// description (same one used in <meta name="description">, written for classic
	// search snippets instead), and only fall back to a truncated plain-text product
	// description when neither curated field has been filled in yet.
	const jsonLdDescription = (product.customFields?.aiOverview || product.customFields?.metaDescription || product.description.replace(/<[^>]+>/g, "").trim()).slice(0, 500);

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Product",
		name: jsonLdName,
		description: jsonLdDescription,
		url: canonicalUrl,
		...(product.featuredAsset?.preview && {
			image: resolveImage(product.featuredAsset.preview, vendureBase),
		}),
		...(activeVariant?.sku && { sku: activeVariant.sku, mpn: activeVariant.sku }),
		...(activeVariant?.customFields?.gtin12 && { gtin12: activeVariant.customFields.gtin12 }),
		...(activeVariant?.customFields?.sizeSpecifications && { size: activeVariant.customFields.sizeSpecifications }),
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
			item: crumb.href ? `${siteOrigin}${localizePath(crumb.href, locale)}` : canonicalUrl,
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
					<div className="lg:sticky lg:top-[116px] self-start min-w-0">
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
							<h1 className="font-heading text-xl md:text-3xl font-extrabold text-black leading-snug">{activeVariantName || product.name}</h1>
							{brand && (
								<p className="text-sm text-gray-500">
									{t.by} <Link to={`/brands/${brandFacetValue!.code}`} className="text-blue-600 font-medium hover:underline">{brand}</Link>
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
												<span className="text-xs font-medium text-green-600">{t.inStock}</span>
											</>
										) : (
											<>
												<XCircle size={15} className="text-red-400" />
												<span className="text-xs font-medium text-red-500">{t.outOfStock}</span>
											</>
										)}
									</div>
									<div className="inline-flex gap-2">
										{activeVariant?.sku && (
											<span className="text-xs text-gray-400">
												{t.sku}: {activeVariant.sku}
											</span>
										)}
										{sold30Days > 0 && (
											<span className="flex items-center gap-1.5 text-xs font-normal text-red-600">
												<TrendingUp size={15} className="text-red-500" />
												{t.soldLast30Days(sold30Days.toLocaleString())}
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
													// Tiny per-option thumbnail — only for products the merchandising team
													// has flagged as featured, since most option pills are plain text.
													const thumbSrc = product.customFields?.isFeatured ? matchedVariant?.featuredAsset?.preview : null;
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
															className={`relative rounded-full border text-sm transition-colors min-w-[80px] ${thumbSrc ? "flex items-center gap-2.5 text-start ps-1.5 pe-4 py-1.5" : "text-center px-4 py-2.5"} ${isActive ? "border-primary bg-white text-black font-bold ring-2 ring-primary" : available ? "border-gray-300 text-gray-700 hover:border-primary hover:text-primary bg-white" : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50 pointer-events-none"}`}
														>
															{thumbSrc && <img src={vendureImageUrl(thumbSrc, vendureBase, { preset: "tiny", format: "webp" })} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100 bg-white" />}
															<span className={thumbSrc ? "flex flex-col leading-tight" : "block"}>
																<span className="block">{val}</span>
																{available && showPrice && <span className={`block text-xs ${thumbSrc ? "" : "mt-0.5"} ${isActive ? "text-primary font-medium" : "text-gray-500"}`}>{matchedVariant ? formatCurrency(matchedVariant.price, matchedVariant.currencyCode, locale) : "—"}</span>}
															</span>
															{!available && (
																<>
																	<span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
																		<span className="absolute top-1/2 left-1/2 w-[140%] h-px bg-gray-300 -translate-x-1/2 -translate-y-1/2 rotate-[-24deg]" />
																	</span>
																	<span className="absolute -top-1.5 end-1 bg-gray-700 text-white text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shadow-sm leading-none">{t.soldOutBadge}</span>
																</>
															)}
														</Link>
													);
												})}
											</div>
										</div>
									);
								})}

								<ProductHighlights highlights={activeVariant?.highlights ?? []} title={t.productHighlights} />
								{/* Product-level additional info */}
								{additionalInfo && <div className="prose prose-sm max-w-none text-gray-600 border-t border-gray-100 pt-4" dangerouslySetInnerHTML={{ __html: additionalInfo }} />}
								{/* ── Sales & Rankings ── */}
								{variantRankings.length > 0 && (
									<div className="mt-2">
										<h4 className="text-orange-500 text-sm font-bold">{t.productRankings}</h4>
										{variantRankings.map((r) => (
											<div className="flex text-[12px] font-semibold" key={r.collectionSlug}>
												<span className="me-1">{t.rankIn(r.rank)} </span>
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
								<div className="relative bg-white border border-gray-300 rounded-2xl p-5 flex flex-col gap-4">
									{/* Price — hidden when Subscribe & Save is available, since that box
									    already shows its own (crossed-out / discounted) price breakdown */}
									{subscriptionPlans.length === 0 && (
										<div>
											<div className="text-2xl font-black text-black">{price !== null ? formatCurrency(price, activeVariant?.currencyCode ?? "QAR", locale) : "—"}</div>
											{hasDiscount && rrp !== null && (
												<div className="flex items-center gap-2 mt-1 flex-wrap">
													<span className="text-sm text-gray-400 line-through">{formatCurrency(rrp, activeVariant?.currencyCode ?? "QAR", locale)}</span>
													<span className="bg-lime-300 text-black text-xs font-bold px-2 py-0.5 rounded-full">{t.percentOff(discountPct)}</span>
												</div>
											)}
										</div>
									)}

									<div className="flex flex-col gap-3">
										{subscriptionPlans.length > 0 && (
											<div className="w-full max-w-xl mx-auto">
												<div className="flex justify-between items-center mb-3">
													<h3 className="text-sm font-black tracking-wider text-gray-800 uppercase">{t.selectFrequency}</h3>
												</div>

												<div className="flex flex-col gap-3">
													<div onClick={() => setPurchaseType("subscribe")} className={`relative cursor-pointer rounded-xl border p-4 transition-colors duration-150 ${purchaseType === "subscribe" ? "border-primary ring-1 ring-lime-400" : "border-gray-300"}`}>
														{price !== null && subscribePrice !== null && (
															<span className="absolute -top-3 end-4 bg-lime-300 text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
																{t.saveAmount(formatCurrency(price - subscribePrice, activeVariant?.currencyCode ?? "QAR", locale))}
															</span>
														)}
														<div className="flex items-start gap-3">
															<div className="mt-1 shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-gray-400 bg-white">{purchaseType === "subscribe" && <div className="w-3 h-3 rounded-full bg-lime-500" />}</div>

															<div className="w-full">
																<div className="flex justify-between items-baseline">
																	<div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">{t.subscribeAndSave}</div>
																	{price !== null && subscribePrice !== null && (
																		<div className="text-right">
																			<div className="text-xs text-gray-500 line-through font-medium">{formatCurrency(price, activeVariant?.currencyCode ?? "QAR", locale)}</div>
																			<div className="text-lg font-extrabold text-orange-500 leading-tight">{formatCurrency(subscribePrice, activeVariant?.currencyCode ?? "QAR", locale)}</div>
																		</div>
																	)}
																</div>

																<div className="mt-4 bg-stone-100 border border-gray-300 rounded-xl p-3 relative">
																	<label className="block text-[10px] font-black tracking-widest text-gray-500 uppercase mb-1">{t.deliverEvery}</label>
																	<PlanFrequencySelect plans={subscriptionPlans} value={selectedPlanId} onChange={setSelectedPlanId} disabled={purchaseType !== "subscribe"} locale={locale} recommendedLabel={t.recommended} />
																</div>

																{selectedPlan && selectedPlan.trialDays > 0 && <p className="text-xs text-emerald-600 mt-2 font-medium">{t.freeTrialDays(selectedPlan.trialDays)}</p>}

																<p className="text-xs text-gray-500 mt-3 italic">{t.skipModifyCancel}</p>
															</div>
														</div>
													</div>

													<div onClick={() => setPurchaseType("once")} className={`cursor-pointer rounded-xl border p-4 bg-stone-100 transition-colors duration-150 ${purchaseType === "once" ? "border-lime-100 ring-1 ring-lime-500" : "border-gray-300"}`}>
														<div className="flex items-center justify-between gap-3">
															<div className="flex items-center gap-3">
																<div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-gray-400 bg-white">{purchaseType === "once" && <div className="w-3 h-3 rounded-full bg-lime-500" />}</div>
																<span className="font-bold text-gray-900 text-sm">{t.oneTimePurchase}</span>
															</div>
															<span className="font-extrabold text-gray-900 text-base">{price !== null ? formatCurrency(price, activeVariant?.currencyCode ?? "QAR", locale) : "—"}</span>
														</div>
													</div>
												</div>
											</div>
										)}
										{/* Quantity stepper + shipping info */}
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center border border-gray-300 bg-white rounded-full overflow-hidden">
												<button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label={t.decrease}>
													<Minus size={13} />
												</button>
												<span className="w-7 text-center text-sm font-semibold select-none">{qty}</span>
												<button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors" aria-label={t.increase}>
													<Plus size={13} />
												</button>
											</div>

											<div className="relative group">
												<button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-primary transition-colors cursor-default">
													<Truck size={15} />
													{t.shippingInfo}
													<Info size={13} className="text-gray-400" />
												</button>
												<div className="absolute end-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-600 leading-relaxed opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-20">
													{t.shippingInfoPrefix} <span className="font-bold text-black">QAR {freeShippingThreshold ?? "150"}</span>
													{isExpressDelivery ? t.shippingInfoSuffixExpress : t.shippingInfoSuffixStandard}
												</div>
											</div>
										</div>

										{/* Add to Cart */}
										<button
											disabled={!inStock || cartFetcher.state !== "idle"}
											onClick={() => {
												if (!activeVariant || !inStock) return;
												const payload: { productVariantId: string; quantity: number; subscriptionPlanId?: string } = { productVariantId: activeVariant.id, quantity: qty };
												if (purchaseType === "subscribe" && selectedPlanId) payload.subscriptionPlanId = selectedPlanId;
												cartFetcher.submit(payload, { method: "POST", action: "/api/cart", encType: "application/json" });
											}}
											className={`w-full text-white font-bold text-base py-4 rounded transition-colors cursor-pointer ${!inStock ? "bg-gray-300 cursor-not-allowed" : cartFeedback === "success" ? "bg-green-600" : cartFeedback === "error" ? "bg-red-500 hover:bg-red-600" : "bg-[#3b8578] hover:bg-[#2e6b61] disabled:bg-gray-300 disabled:cursor-not-allowed"} rounded-full`}
										>
											{!inStock ? t.outOfStockBtn : cartFetcher.state !== "idle" ? t.adding : cartFeedback === "success" ? t.addedToCart : cartFeedback === "error" ? t.failedTryAgain : t.addToCart}
										</button>

										{isExpressDelivery && (
											<span
												className="absolute top-0 start-4 -translate-y-1/2 z-10 bg-yellow-400 text-black text-[9px] font-extrabold italic lowercase tracking-wide ps-2.5 pe-4 py-0.5 rounded-s-sm"
												style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }}
											>
												{t.quickDelivery}
											</span>
										)}
									</div>
								</div>
								{/* Bundle offers */}
								<ProductBundleOffers productId={product.id} triggerVariantId={activeVariant?.id ?? ""} triggerVariantPrice={activeVariant?.priceWithTax || activeVariant?.price || 0} triggerImage={activeVariant?.featuredAsset?.preview || product.featuredAsset?.preview} placement="below" vendureBase={vendureBase} />

								{/* WhatsApp Inquiry */}
								{/* <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in this product and would like to enquire:\n\n*${product.name}*\n\n${typeof window !== "undefined" ? window.location.href : ""}`)}`} target="_blank" rel="noopener noreferrer" translate="no" className="flex mt-4 items-center justify-center gap-2 w-full bg-green-500 hover:bg-[#128C7E] text-white font-semibold text-sm py-3 rounded-full transition-colors">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
										<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
									</svg>
									{t.whatsappEnquiry}
								</a> */}
								{/* Quality Promise — sits in the cart column, right above the trust badges */}
								<div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mt-5">
									<ShieldCheck size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
									<div>
										<p className="text-sm font-semibold text-green-700">{t.qualityPromise}</p>
										<p className="text-xs text-green-600 mt-0.5">{t.qualityPromiseBody}</p>
									</div>
								</div>

								{/* Trust badges */}
								<ul className="space-y-1.5 mt-3">
									{t.trustBadges(isExpressDelivery).map((item, i) => {
										const Icon = TRUST_BADGE_ICONS[i];
										return (
											<li key={item} className="flex items-center gap-2 text-xs text-gray-500">
												<Icon size={14} className="text-primary flex-shrink-0" />
												{item}
											</li>
										);
									})}
								</ul>
							</div>
						</div>
						{/* end inner 2-col */}
					</div>
					{/* end detail column */}
				</div>

				{/* ── Description / Disclaimer / Q&A tabs + Nutrition Facts ──
				    Prefer the selected variant's own values; fall back to the product's
				    defaults only when this variant hasn't got its own override. */}
				{(() => {
					const nutritionInfo = activeVariant?.customFields?.keyInfo ?? "";
					const variantInfo = activeVariant?.customFields?.additionalInfo ?? "";
					const disclaimer = product.customFields?.disclaimer ?? "";
					if (!product.description && !nutritionInfo && !disclaimer) return null;
					return (
						<div className="mt-12 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 items-start">
							<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
								<ProductInfoTabs description={variantInfo ? `${variantInfo}${product.description ? ` ${product.description}` : ""}` : (product.description ?? "")} warnings={disclaimer} productId={product.id} productSlug={product.slug} />
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
						<h2 className="font-heading text-xl font-extrabold text-black mb-4">{t.productVideo}</h2>
						<div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-sm max-w-2xl">
							<iframe src={videoUrl} title={`${product.name} video`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
						</div>
					</div>
				)}
			</div>
			{/* ── Comparison table ── */}
			{comparisonGroupId && (
				<div className="container mx-auto px-4 mt-12">
					<ProductComparisonTable comparisonGroupId={comparisonGroupId} flavorOption={comparisonFlavorOption} vendureBase={vendureBase} currentProductId={product.id} />
				</div>
			)}
			{/* ── Ratings & Reviews ── */}
			<div className="container mx-auto px-4 mt-12 mb-10">{ratingSummary && ratingSummary.totalReviews > 0 ? <RatingPanel summary={ratingSummary} productSlug={product.slug} /> : <NoReviews productSlug={product.slug} />}</div>

			{similarProducts.length > 0 && (
				<HomeTopSelling
					products={similarProducts}
					vendureBase={vendureBase}
					title={
						<>
							<strong>{t.youMay}</strong> <span className="font-light">{t.alsoLike}</span>
						</>
					}
				/>
			)}
		</>
	);
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function Stars({ value, size = 14 }: { value: number; size?: number }) {
	const t = PDP_COPY[getLocaleFromPathname(useLocation().pathname)];
	return (
		<span className="flex items-center gap-0.5" aria-label={t.starsOutOf5(value)}>
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

function formatDate(iso: string, locale: "en" | "ar" = "en") {
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

function ReviewCard({ review, compact = false, onVote, isLoggedIn }: { review: ReviewItem; compact?: boolean; onVote?: (id: string, vote: "HELPFUL" | "NOT_HELPFUL") => void; isLoggedIn?: boolean }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = PDP_COPY[locale];
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
						{t.verified}
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
					<span> · {formatDate(review.createdAt, locale)}</span>
				</div>
				{onVote && isLoggedIn ? (
					<div className="flex items-center gap-3 text-xs text-gray-400">
						<span>{t.helpfulQuestion}</span>
						<button onClick={() => onVote(review.id, "HELPFUL")} className={`flex items-center gap-1 hover:text-green-600 transition-colors ${review.myVote === "HELPFUL" ? "text-green-600 font-medium" : ""}`}>
							<ThumbsUp size={12} /> {review.helpfulCount}
						</button>
						<button onClick={() => onVote(review.id, "NOT_HELPFUL")} className={`flex items-center gap-1 hover:text-red-500 transition-colors ${review.myVote === "NOT_HELPFUL" ? "text-red-500 font-medium" : ""}`}>
							<ThumbsDown size={12} /> {review.notHelpfulCount}
						</button>
					</div>
				) : review.helpfulCount > 0 ? (
					<span className="text-xs text-gray-400 flex items-center gap-1">
						<ThumbsUp size={11} /> {review.helpfulCount} {t.helpfulSuffix}
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
	const t = PDP_COPY[getLocaleFromPathname(useLocation().pathname)];

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
				<span className="text-sm text-gray-600 font-medium">
					{summary.totalReviews.toLocaleString()} {t.reviewsCap}
				</span>
				<ChevronDown size={13} className={`text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
			</button>

			{open && (
				<div className="absolute start-0 top-full z-30 w-64 pt-1" role="dialog" aria-label={t.ratingSummary}>
					<div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-4">
						{/* Score row */}
						<div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
							<span className="text-3xl font-black text-gray-900">{summary.averageRating.toFixed(1)}</span>
							<div>
								<Stars value={summary.averageRating} size={14} />
								<p className="text-xs text-gray-400 mt-0.5">
									{summary.totalReviews.toLocaleString()} {t.reviews}
								</p>
							</div>
						</div>

						{/* Distribution bars */}
						<div className="space-y-1.5 mb-4">
							{[5, 4, 3, 2, 1].map((star) => {
								const count = summary.distribution.find((d) => d.rating === star)?.count ?? 0;
								const pct = Math.round((count / maxCount) * 100);
								return (
									<div key={star} className="flex items-center gap-2">
										<span className="text-xs text-gray-500 w-4 text-end shrink-0">{star}</span>
										<Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
										<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
											<div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
										</div>
										<span className="text-xs text-gray-400 w-10 shrink-0 text-end">{count.toLocaleString()}</span>
									</div>
								);
							})}
						</div>

						<Link to={`/products/${productSlug}/reviews`} onClick={() => setOpen(false)} className="block w-full text-center bg-[#3b8578] hover:bg-[#2e6b61] text-white text-sm font-semibold py-2.5 rounded-full transition-colors">
							{t.seeCustomerReviews}
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}

// ── No Reviews ───────────────────────────────────────────────────────────────

function NoReviews({ productSlug }: { productSlug: string }) {
	const t = PDP_COPY[getLocaleFromPathname(useLocation().pathname)];
	return (
		<section aria-label={t.customerReviewsAria}>
			<h2 className="font-heading text-xl font-extrabold text-black mb-6">{t.customerReviews}</h2>
			<div className="border border-dashed border-amber-300 rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-5 bg-amber-50/40">
				<div className="flex items-center gap-1">
					{[1, 2, 3, 4, 5].map((s) => (
						<Star key={s} size={28} className="text-amber-300" strokeWidth={1.5} />
					))}
				</div>
				<p className="text-gray-500 text-sm">{t.noOneReviewedYet}</p>
				<Link to={`/products/${productSlug}/reviews#write`} className="bg-black hover:bg-gray-800 text-white font-semibold text-sm px-8 py-2.5 rounded-full transition-colors">
					{t.writeAReview}
				</Link>
			</div>
		</section>
	);
}

// ── Rating Panel ────────────────────────────────────────────────────────────

function getSortOptions(t: (typeof PDP_COPY)[keyof typeof PDP_COPY]): { value: ReviewSortOrder; label: string }[] {
	return [
		{ value: "MOST_RELEVANT", label: t.sortMostRelevant },
		{ value: "NEWEST", label: t.sortNewest },
		{ value: "HIGHEST_RATED", label: t.sortHighestRated },
		{ value: "LOWEST_RATED", label: t.sortLowestRated },
		{ value: "MOST_HELPFUL", label: t.sortMostHelpful },
	];
}

function RatingPanel({ summary, productSlug }: { summary: ProductRatingSummary; productSlug: string }) {
	const t = PDP_COPY[getLocaleFromPathname(useLocation().pathname)];
	const SORT_OPTIONS = getSortOptions(t);
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
		<section aria-label={t.customerReviewsAria}>
			{/* Header */}
			<div className="flex items-center justify-between gap-4 mb-6">
				<h2 className="font-heading text-xl font-extrabold text-black">{t.customerReviews}</h2>
				<Link to={`/products/${productSlug}/reviews#write`} className="shrink-0 bg-black hover:bg-gray-800 text-white font-semibold text-sm px-5 py-2 rounded-full transition-colors">
					{t.writeAReview}
				</Link>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
				{/* Left sidebar */}
				<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
					<div className="flex flex-col items-center py-2">
						<span className="text-5xl font-black text-gray-900">{summary.averageRating.toFixed(1)}</span>
						<Stars value={summary.averageRating} size={18} />
						<span className="text-xs text-gray-500 mt-1">
							{summary.totalReviews.toLocaleString()} {t.reviews}
						</span>
					</div>

					<div className="space-y-1.5">
						{[5, 4, 3, 2, 1].map((star) => {
							const count = summary.distribution.find((d) => d.rating === star)?.count ?? 0;
							const pct = Math.round((count / maxCount) * 100);
							return (
								<Link key={star} to={`/products/${productSlug}/reviews?rating=${star}`} className="flex items-center gap-2 group rounded-lg px-1 py-0.5 hover:bg-gray-50 transition-colors">
									<span className="text-xs text-gray-500 w-4 text-end shrink-0">{star}</span>
									<Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
									<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
										<div className="h-full bg-amber-400 rounded-full group-hover:bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
									</div>
									<span className="text-xs text-gray-400 w-12 shrink-0 text-end">{count.toLocaleString()}</span>
								</Link>
							);
						})}
					</div>

					<div>
						<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.filter}</p>
						<div className="space-y-1">
							<Link to={`/products/${productSlug}/reviews?verified=true`} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
								<BadgeCheck size={13} />
								{t.verifiedOnly}
							</Link>
							<Link to={`/products/${productSlug}/reviews?images=true`} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
								<ImagePlus size={13} />
								{t.withPhotos}
							</Link>
						</div>
					</div>
				</div>

				{/* Right — sort + reviews */}
				<div id="reviews" className="space-y-3">
					<div className="flex items-center justify-between gap-3 pb-1">
						<span className="text-sm text-gray-500">
							{totalReviews.toLocaleString()} {t.reviews}
						</span>
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
						<p className="text-sm text-gray-400 py-4">{t.noReviewsYet}</p>
					)}

					{totalReviews > 5 && (
						<div className="pt-2">
							<Link to={`/products/${productSlug}/reviews`} className="w-full block text-center bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold text-sm py-3 rounded-full transition-colors">
								{t.moreReviews(totalReviews.toLocaleString())}
							</Link>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
