import type { Route } from "./+types/brands";
import { useMemo, useRef, useState } from "react";
import Link from "~/components/LocaleLink";
import { ChevronLeft, ChevronRight, Globe, ShieldCheck, Truck } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import Breadcrumb from "~/components/Breadcrumb";
import { GET_BRAND_FACET_QUERY, GET_BRAND_PRODUCT_COUNT_QUERY, type BrandFacetData, type BrandProductCountData, type BrandValue } from "~/graphql/brand";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, hreflangTags } from "~/lib/i18n";
import { TOP_BRANDS } from "~/lib/brands";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: `Shop by Brand - ${SITE_NAME}`,
		description: `Browse all brands available at ${SITE_NAME} - authentic sports nutrition, beauty, and wellness products with fast delivery in Qatar.`,
		breadcrumbHome: "Home",
		breadcrumbBrands: "Brands",
		eyebrow: "Trusted Worldwide",
		heroTitlePlain: "Brands ",
		heroTitleAccent: "We Love",
		subtitle: "Discover authentic sports nutrition, beauty, and wellness brands trusted worldwide.",
		authentic: "100% Authentic",
		authenticSub: "Genuine Products",
		delivery: "Fast Qatar Delivery",
		deliverySub: "Across Doha & Beyond",
		global: "Global Brands",
		globalSub: "Nutrition, Beauty & Wellness",
		trending: "Trending Brands",
		trendingSub: "Most popular and trusted brands in Qatar",
		popularBadge: "Popular in Qatar",
		allBrands: "All Brands",
		allBrandsSub: "Explore our complete range of nutrition, beauty, and wellness brands",
		browseAlpha: "Browse by alphabet",
		all: "All",
		products: "Products",
		noneFound: "No brands found",
	},
	ar: {
		title: `تسوق حسب الماركة - ${SITE_NAME}`,
		description: `تصفح جميع الماركات المتوفرة في ${SITE_NAME} - منتجات تغذية رياضية وجمال وعافية أصلية مع توصيل سريع في قطر.`,
		breadcrumbHome: "الرئيسية",
		breadcrumbBrands: "الماركات",
		eyebrow: "موثوق عالمياً",
		heroTitlePlain: "ماركات ",
		heroTitleAccent: "نحبها",
		subtitle: "اكتشف ماركات التغذية الرياضية والجمال والعافية الأصلية الموثوقة عالمياً.",
		authentic: "أصلي 100%",
		authenticSub: "منتجات أصلية",
		delivery: "توصيل سريع في قطر",
		deliverySub: "الدوحة وما حولها",
		global: "ماركات عالمية",
		globalSub: "تغذية وجمال وعافية",
		trending: "الماركات الرائجة",
		trendingSub: "أشهر الماركات الموثوقة في قطر",
		popularBadge: "شائع في قطر",
		allBrands: "جميع الماركات",
		allBrandsSub: "تصفح مجموعتنا الكاملة من ماركات التغذية والجمال والعافية",
		browseAlpha: "تصفح حسب الحروف",
		all: "الكل",
		products: "منتج",
		noneFound: "لم يتم العثور على ماركات",
	},
} as const;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function meta({ loaderData }: Route.MetaArgs) {
	const locale = loaderData?.locale ?? "en";
	const { title, description } = COPY[locale];
	const canonicalUrl = loaderData?.canonicalUrl ?? `${SITE_URL}/brands`;
	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...hreflangTags(SITE_URL, "/brands"),
		{ property: "og:type", content: "website" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:site_name", content: SITE_NAME },
		{ name: "twitter:card", content: "summary" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const url = new URL(request.url);
	const locale = getLocaleFromPathname(url.pathname);
	const canonicalUrl = `${url.origin}${localizePath("/brands", locale)}`;
	try {
		const { data } = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, {
			request,
			cf: { cacheTtl: 300, cacheEverything: true },
		});
		const brands: BrandValue[] = [...(data.facets.items[0]?.values ?? [])].sort((a, b) => a.name.localeCompare(b.name));

		// Real product counts only for the small curated Trending set — see
		// GET_BRAND_PRODUCT_COUNT_QUERY's own comment for why this isn't done
		// for all ~65 brands (the backend's facet-count aggregation caps out at
		// 50 total values, and fanning out 65 individual queries per page load
		// would be a Cloudflare Worker reliability risk for a page that isn't
		// even the one showing them).
		const byCode = new Map(brands.map((b) => [b.code, b]));
		const trendingResults = await Promise.allSettled(
			TOP_BRANDS.map((tb) => {
				const brand = byCode.get(tb.code);
				if (!brand) return Promise.resolve(null);
				return graphqlRequest<BrandProductCountData>(env, GET_BRAND_PRODUCT_COUNT_QUERY, { facetValueId: brand.id }, { request, cf: { cacheTtl: 600, cacheEverything: true } });
			}),
		);
		const trending = TOP_BRANDS.map((tb, i) => {
			const brand = byCode.get(tb.code);
			if (!brand) return null;
			const result = trendingResults[i];
			const count = result.status === "fulfilled" && result.value ? result.value.data.search.totalItems : null;
			return { ...tb, id: brand.id, count };
		}).filter((b): b is NonNullable<typeof b> => b !== null);

		return { brands, trending, canonicalUrl, locale };
	} catch {
		return { brands: [], trending: [], canonicalUrl, locale };
	}
}

// Same /images/brands/{code}.jpg convention already used by MegaMenu.tsx's
// brand tiles — only some brands have a real logo file. A missing one falls
// back to a single-letter monogram (not the full name) since the name
// doesn't fit legibly in a small square and just wraps/truncates awkwardly.
function BrandLogo({ code, name, className }: { code: string; name: string; className?: string }) {
	return (
		<div className={`relative bg-gray-50 rounded-lg overflow-hidden ${className ?? ""}`}>
			<img
				src={`/images/brands/${code}.jpg`}
				alt={name}
				className="w-full h-full object-contain p-2"
				loading="lazy"
				onError={(e) => {
					e.currentTarget.style.display = "none";
					const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
					if (fallback) fallback.style.display = "flex";
				}}
			/>
			<span style={{ display: "none" }} className="absolute inset-0 items-center justify-center bg-lime-300">
				<span className="font-heading font-extrabold text-black text-lg">{name.trim()[0]?.toUpperCase()}</span>
			</span>
		</div>
	);
}

export default function BrandsPage({ loaderData }: Route.ComponentProps) {
	const { brands, trending, canonicalUrl, locale } = loaderData;
	const t = COPY[locale];
	const [activeLetter, setActiveLetter] = useState<string | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);

	const availableLetters = useMemo(() => new Set(brands.map((b) => b.name[0]?.toUpperCase())), [brands]);
	const filteredBrands = useMemo(() => (activeLetter ? brands.filter((b) => b.name[0]?.toUpperCase() === activeLetter) : brands), [brands, activeLetter]);

	function scrollTrending(direction: 1 | -1) {
		scrollerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
	}

	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeHomeUrl(SITE_URL, locale) },
			{ "@type": "ListItem", position: 2, name: t.breadcrumbBrands, item: canonicalUrl },
		],
	};

	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name: t.breadcrumbBrands,
		numberOfItems: brands.length,
		itemListElement: brands.map((brand, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: brand.name,
			url: `${SITE_URL}${localizePath(`/brands/${brand.code}`, locale)}`,
		})),
	};

	return (
		<div>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
			{brands.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />}

			<div className="container mx-auto px-4 pt-6">
				<Breadcrumb items={[{ label: t.breadcrumbHome, href: "/" }, { label: t.breadcrumbBrands }]} />
			</div>

			{/* ── Hero ── */}
			<div className="container mx-auto px-4 mt-4">
				<div className="relative overflow-hidden rounded-2xl">
					<img src="/images/brands-banner.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchPriority="high" />
					<div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
					<div className="relative px-6 py-10 sm:px-10 sm:py-14 max-w-2xl">
						<div className="flex items-center gap-2 mb-3">
							<span className="h-px w-6 bg-lime-300" />
							<span className="text-[11px] font-bold tracking-[0.2em] uppercase text-lime-300">{t.eyebrow}</span>
						</div>
						<h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white leading-[1.05] text-balance">
							{t.heroTitlePlain}
							<span className="text-lime-300">{t.heroTitleAccent}</span>
						</h1>
						<p className="text-white/80 text-sm sm:text-base mt-3 max-w-md">{t.subtitle}</p>

						<div className="flex flex-wrap gap-x-8 gap-y-4 mt-8">
							{[
								{ Icon: ShieldCheck, label: t.authentic, sub: t.authenticSub },
								{ Icon: Truck, label: t.delivery, sub: t.deliverySub },
								{ Icon: Globe, label: t.global, sub: t.globalSub },
							].map(({ Icon, label, sub }) => (
								<div key={label} className="flex items-center gap-2.5">
									<span className="w-9 h-9 rounded-full border border-lime-300/40 flex items-center justify-center flex-shrink-0">
										<Icon size={16} className="text-lime-300" strokeWidth={2} />
									</span>
									<div>
										<div className="text-white text-xs font-bold leading-tight">{label}</div>
										<div className="text-white/60 text-[11px] leading-tight">{sub}</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4">
				{/* ── Trending brands ── */}
				{trending.length > 0 && (
					<div className="mt-10">
						<div className="flex items-end justify-between gap-4 mb-4">
							<div>
								<h2 className="font-heading text-xl sm:text-2xl font-extrabold text-black flex items-center gap-2">
									<span aria-hidden="true">🔥</span>
									{t.trending}
								</h2>
								<p className="text-gray-500 text-sm mt-1">{t.trendingSub}</p>
							</div>
							<div className="hidden sm:flex items-center gap-2 flex-shrink-0">
								<button type="button" onClick={() => scrollTrending(-1)} aria-label="Previous" className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-black hover:text-black transition-colors">
									<ChevronLeft size={16} className="rtl:rotate-180" />
								</button>
								<button type="button" onClick={() => scrollTrending(1)} aria-label="Next" className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-black hover:text-black transition-colors">
									<ChevronRight size={16} className="rtl:rotate-180" />
								</button>
							</div>
						</div>

						<div ref={scrollerRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
							{trending.map((brand) => (
								<Link
									key={brand.code}
									to={`/brands/${brand.code}`}
									className="group relative flex-shrink-0 w-40 sm:w-44 snap-start bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black transition-all overflow-hidden"
								>
									<BrandLogo code={brand.code} name={brand.name} className="h-28 w-full" />
									{brand.popular && <span className="absolute top-2 start-2 bg-lime-300 text-black text-[10px] font-bold px-2 py-1 rounded-full">{t.popularBadge}</span>}
									<div className="p-3">
										<div className="text-sm font-bold text-gray-900 truncate group-hover:text-black">{brand.name}</div>
										<div className="text-xs text-gray-400 mt-0.5">{brand.count !== null ? `${brand.count}+ ${t.products}` : ""}</div>
									</div>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* ── All brands ── */}
				<div className="mt-12 mb-10">
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
						<div>
							<h2 className="font-heading text-xl sm:text-2xl font-extrabold text-black">{t.allBrands}</h2>
							<p className="text-gray-500 text-sm mt-1">{t.allBrandsSub}</p>
						</div>
						<div className="flex flex-col items-start sm:items-end gap-1.5">
							<span className="text-xs text-gray-400 font-medium">{t.browseAlpha}</span>
							<div className="flex flex-wrap gap-1 max-w-full">
								<button
									type="button"
									onClick={() => setActiveLetter(null)}
									className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${activeLetter === null ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
								>
									{t.all}
								</button>
								{ALPHABET.map((letter) => {
									const disabled = !availableLetters.has(letter);
									return (
										<button
											key={letter}
											type="button"
											disabled={disabled}
											onClick={() => setActiveLetter(letter)}
											className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
												activeLetter === letter ? "bg-black text-white" : disabled ? "text-gray-300 cursor-not-allowed" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
											}`}
										>
											{letter}
										</button>
									);
								})}
							</div>
						</div>
					</div>

					{filteredBrands.length === 0 ? (
						<div className="text-center py-24 text-gray-400">
							<p className="text-lg font-semibold text-gray-600 mb-1">{t.noneFound}</p>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
							{filteredBrands.map((brand) => (
								<Link
									key={brand.id}
									to={`/brands/${brand.code}`}
									className="group flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black transition-all p-3"
								>
									<BrandLogo code={brand.code} name={brand.name} className="w-14 h-14 flex-shrink-0" />
									<div className="min-w-0 flex-1">
										<div className="text-sm font-semibold text-gray-800 group-hover:text-black truncate">{brand.name}</div>
									</div>
									<ChevronRight size={16} className="text-gray-300 group-hover:text-black transition-colors flex-shrink-0 rtl:rotate-180" />
								</Link>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
