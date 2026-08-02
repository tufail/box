import type { Route } from "./+types/brands.$slug";
import { useSearchParams } from "react-router";
import { useState } from "react";
import { SlidersHorizontal, X, Check, Tag } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import ProductCard from "~/components/ProductCard";
import Breadcrumb from "~/components/Breadcrumb";
import SortDropdown from "~/components/SortDropdown";
import {
	GET_BRAND_FACET_QUERY,
	BRAND_PRODUCTS_QUERY,
	type BrandFacetData,
	type BrandPageData,
	type BrandPageVariables,
	type BrandPageFacetValue,
} from "~/graphql/brand";
import { COLLECTION_FACETS_QUERY, type CollectionFacetsData } from "~/graphql/collection";
import type { SortKey } from "~/graphql/product";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, stripLocalePrefix, hreflangTags, type Locale } from "~/lib/i18n";
import { SHOP_COPY, productCountLabel } from "~/lib/shopCopy";

const PAGE_SIZE = 24;

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: { breadcrumbHome: "Home", breadcrumbBrands: "Brands" },
	ar: { breadcrumbHome: "الرئيسية", breadcrumbBrands: "الماركات" },
} as const;

function getSortOptions(locale: Locale): { value: SortKey; label: string }[] {
	const t = SHOP_COPY[locale];
	return [
		{ value: "default", label: t.sortLatest },
		{ value: "sales_desc", label: t.sortBestSellers },
		{ value: "name_asc", label: t.sortNameAsc },
		{ value: "price_asc", label: t.sortPriceAsc },
		{ value: "price_desc", label: t.sortPriceDesc },
	];
}

function sortToInput(sort: SortKey): BrandPageVariables["input"]["sort"] {
	if (sort === "sales_desc") return { salesCount: "DESC" };
	if (sort === "name_asc") return { name: "ASC" };
	if (sort === "price_asc") return { price: "ASC" };
	if (sort === "price_desc") return { price: "DESC" };
	return undefined;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface FacetGroup {
	facetId: string;
	facetName: string;
	values: { id: string; name: string; count: number }[];
}

// "Brand" is excluded from the sidebar — the page is already scoped to one
// brand, so re-showing it as a filterable group would just be a no-op.
function groupFacets(facetValues: BrandPageFacetValue[]): FacetGroup[] {
	const map = new Map<string, FacetGroup>();
	for (const { facetValue, count } of facetValues) {
		const { id: facetId, name: facetName } = facetValue.facet;
		if (facetName.toLowerCase() === "brand") continue;
		if (!map.has(facetId)) map.set(facetId, { facetId, facetName, values: [] });
		map.get(facetId)!.values.push({ id: facetValue.id, name: facetValue.name, count });
	}
	return [...map.values()].sort((a, b) => {
		const aIsCat = a.facetName.toLowerCase() === "category";
		const bIsCat = b.facetName.toLowerCase() === "category";
		if (aIsCat && !bIsCat) return -1;
		if (!aIsCat && bIsCat) return 1;
		return 0;
	});
}

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({ loaderData }: Route.MetaArgs) {
	const brandName = loaderData?.brandName ?? "Brand";
	const locale = loaderData?.locale ?? "en";
	const title = `${brandName} — ${SITE_NAME}`;
	const description =
		locale === "ar"
			? `تسوق منتجات ${brandName} الأصلية من ${SITE_NAME} — توصيل سريع في قطر.`
			: `Shop authentic ${brandName} products at ${SITE_NAME} — fast delivery in Qatar.`;
	const canonicalUrl = loaderData?.canonicalUrl ?? "";
	const canonicalPath = canonicalUrl ? stripLocalePrefix(new URL(canonicalUrl).pathname) : "";

	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...(canonicalPath ? hreflangTags(SITE_URL, canonicalPath) : []),
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

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const slug = params.slug!;
	const url = new URL(request.url);
	const sort = (url.searchParams.get("sort") ?? "sales_desc") as SortKey;
	const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
	const fv = url.searchParams.get("fv")?.split(",").filter(Boolean) ?? [];

	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");
	const locale = getLocaleFromPathname(url.pathname);
	const canonicalUrl = `${url.origin}${localizePath(`/brands/${slug}`, locale)}`;

	try {
		const { data: facetData } = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, {
			request,
			cf: { cacheTtl: 300, cacheEverything: true },
		});
		const brand = facetData.facets.items[0]?.values.find((v) => v.code === slug);
		if (!brand) throw new Response("Not Found", { status: 404 });

		const sortInput = sortToInput(sort);
		// A brand page has no field but facetValueIds to scope by (unlike
		// collections, which scope via collectionSlug) — so any extra sidebar
		// selections are AND'd in alongside the brand's own id, rather than
		// OR'd, so an extra filter narrows results instead of widening them
		// to other brands too.
		const input: BrandPageVariables["input"] = {
			facetValueIds: [brand.id, ...fv],
			facetValueOperator: "AND",
			groupByProduct: false,
			take: PAGE_SIZE,
			skip: (page - 1) * PAGE_SIZE,
			...(sortInput && { sort: sortInput }),
		};

		// Facets scoped to just this brand (no `fv`) so the sidebar never
		// collapses as filters are picked.
		const facetsInput = { facetValueIds: [brand.id], groupByProduct: true, take: 0 };

		const [mainResult, facetsResult] = await Promise.allSettled([
			graphqlRequest<BrandPageData, BrandPageVariables>(env, BRAND_PRODUCTS_QUERY, { input }, { request }),
			graphqlRequest<CollectionFacetsData>(env, COLLECTION_FACETS_QUERY, { input: facetsInput }, { request }),
		]);

		if (mainResult.status === "rejected") throw mainResult.reason;
		const { data } = mainResult.value;
		const allFacetValues = facetsResult.status === "fulfilled" ? facetsResult.value.data.search.facetValues : [];

		return { ...data.search, brandName: brand.name, sort, page, fv, vendureBase, allFacetValues, canonicalUrl, locale };
	} catch (e) {
		if (e instanceof Response) throw e;
		return { totalItems: 0, items: [], facetValues: [], brandName: slug, sort, page, fv, vendureBase, allFacetValues: [], canonicalUrl, locale };
	}
}

// ── Filter sidebar ─────────────────────────────────────────────────────────

interface FilterSidebarProps {
	facetGroups: FacetGroup[];
	filteredIds: Set<string>;
	activeFv: string[];
	onToggle: (id: string) => void;
	onClearAll: () => void;
	locale: Locale;
}

function FilterSidebar({ facetGroups, filteredIds, activeFv, onToggle, onClearAll, locale }: FilterSidebarProps) {
	const t = SHOP_COPY[locale];
	return (
		<div>
			{activeFv.length > 0 && (
				<div className="mb-5">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs text-gray-400 uppercase tracking-wide">{t.activeFilters}</span>
						<button onClick={onClearAll} className="text-xs text-primary hover:underline">{t.clearAll}</button>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{activeFv.map((id) => {
							const allValues = facetGroups.flatMap((g) => g.values);
							const match = allValues.find((v) => v.id === id);
							return match ? (
								<button
									key={id}
									onClick={() => onToggle(id)}
									className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
								>
									{match.name}
									<X size={10} />
								</button>
							) : null;
						})}
					</div>
				</div>
			)}

			{facetGroups.map((group) => (
				<div key={group.facetId} className="mb-5">
					<div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2.5">
						{group.facetName}
					</div>
					<ul className="space-y-2">
						{group.values.map((v) => {
							const isActive = activeFv.includes(v.id);
							const unavailable = activeFv.length > 0 && !filteredIds.has(v.id) && !isActive;
							return (
								<li key={v.id}>
									<label className={`flex items-center gap-2.5 cursor-pointer group ${unavailable ? "opacity-40" : ""}`}>
										<input
											type="checkbox"
											checked={isActive}
											onChange={() => onToggle(v.id)}
											className="sr-only"
										/>
										<span className={`flex items-center justify-center w-5 h-5 rounded-md border flex-shrink-0 transition-colors ${isActive ? "bg-lime-300 border-lime-300" : "bg-white border-gray-300 group-hover:border-gray-400"}`}>
											{isActive && <Check size={13} strokeWidth={3} className="text-black" />}
										</span>
										<span className={`flex-1 text-sm transition-colors ${isActive ? "text-gray-900 font-semibold" : "text-gray-700 group-hover:text-gray-900"}`}>
											{v.name}
										</span>
										<span className="text-xs text-gray-400">{v.count}</span>
									</label>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function BrandPage({ loaderData }: Route.ComponentProps) {
	const { totalItems, items, facetValues, brandName, sort, page, fv, vendureBase, allFacetValues, canonicalUrl, locale } = loaderData;
	const [searchParams, setSearchParams] = useSearchParams();
	const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

	const totalPages = Math.ceil(totalItems / PAGE_SIZE);
	const facetGroups = groupFacets(allFacetValues ?? facetValues);
	const filteredIds = new Set((facetValues ?? []).map((f) => f.facetValue.id));

	function updateParam(key: string, value: string | null) {
		const next = new URLSearchParams(searchParams);
		if (!value) next.delete(key); else next.set(key, value);
		if (key !== "page") next.delete("page");
		setSearchParams(next, { preventScrollReset: false });
	}

	function toggleFacet(id: string) {
		const next = (fv as string[]).includes(id)
			? (fv as string[]).filter((x) => x !== id)
			: [...(fv as string[]), id];
		updateParam("fv", next.join(",") || null);
	}

	function clearAllFacets() {
		updateParam("fv", null);
	}

	const t = SHOP_COPY[locale];
	const { breadcrumbHome, breadcrumbBrands } = COPY[locale];
	const breadcrumbs = [
		{ label: breadcrumbHome, href: "/" },
		{ label: breadcrumbBrands, href: "/brands" },
		{ label: brandName },
	];

	const siteOrigin = canonicalUrl ? new URL(canonicalUrl).origin : "";
	const jsonLd = [
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: breadcrumbs.map((crumb, i) => ({
				"@type": "ListItem",
				position: i + 1,
				name: crumb.label,
				item: crumb.href ? `${siteOrigin}${localizePath(crumb.href, locale)}` : canonicalUrl,
			})),
		},
		{
			"@context": "https://schema.org",
			"@type": "CollectionPage",
			name: brandName,
			url: canonicalUrl,
			mainEntity: {
				"@type": "ItemList",
				numberOfItems: totalItems,
				itemListElement: items.slice(0, 24).map((item, i) => ({
					"@type": "ListItem",
					position: i + 1,
					url: `${siteOrigin}${localizePath(`/products/${item.customProductVariantMappings?.slug || item.slug}`, locale)}`,
				})),
			},
		},
	];

	return (
		<div className="container mx-auto px-4 py-6">
			{jsonLd.map((schema, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}

			<div className="mb-4">
				<Breadcrumb items={breadcrumbs} />
			</div>

			<div className="mb-6 flex items-center gap-3">
				<span className="w-11 h-11 rounded-full bg-lime-300 flex items-center justify-center flex-shrink-0">
					<Tag size={18} className="text-black" strokeWidth={1.5} />
				</span>
				<h1 className="font-heading text-2xl md:text-3xl font-extrabold text-black">{brandName}</h1>
			</div>

			{/* ── Top bar ── */}
			<div className="flex items-center justify-between flex-wrap gap-3 mb-6">
				<p className="text-sm text-gray-500">{productCountLabel(totalItems, locale)}</p>

				<div className="flex items-center gap-3">
					<button
						onClick={() => setMobileFiltersOpen(true)}
						className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors"
					>
						<SlidersHorizontal size={14} />
						{t.filters}
						{(fv as string[]).length > 0 && (
							<span className="bg-primary text-white text-[10px] font-bold rounded w-4 h-4 flex items-center justify-center">
								{(fv as string[]).length}
							</span>
						)}
					</button>

					<SortDropdown options={getSortOptions(locale)} value={sort as SortKey} onChange={(v) => updateParam("sort", v)} />
				</div>
			</div>

			{/* ── Layout ── */}
			<div className="flex gap-6 items-start">
				{/* Desktop sidebar */}
				<aside className="hidden lg:block w-52 flex-shrink-0">
					<div className="text-sm font-semibold text-gray-800 mb-4">{t.filters}</div>
					<FilterSidebar
						facetGroups={facetGroups}
						filteredIds={filteredIds}
						activeFv={fv as string[]}
						onToggle={toggleFacet}
						onClearAll={clearAllFacets}
						locale={locale}
					/>
				</aside>

				{/* Product grid */}
				<div className="flex-1 min-w-0">
					{items.length === 0 ? (
						<div className="text-center py-24 text-gray-400">
							<p className="text-lg font-semibold text-gray-600 mb-1">{t.noProductsFound}</p>
							<p className="text-sm">{t.tryClearingFilters}</p>
						</div>
					) : (
						<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
							{items.map((product) => (
								<ProductCard key={product.productVariantId} product={product} vendureBase={vendureBase} />
							))}
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex justify-center items-center gap-3 mt-10">
							<button
								disabled={page === 1}
								onClick={() => updateParam("page", String((page as number) - 1))}
								className="px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{t.prev}
							</button>
							<span className="text-sm text-gray-600">{t.pageOf(page as number, totalPages)}</span>
							<button
								disabled={page === totalPages}
								onClick={() => updateParam("page", String((page as number) + 1))}
								className="px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{t.next}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Mobile filter drawer */}
			{mobileFiltersOpen && (
				<div className="fixed inset-0 z-[300] lg:hidden">
					<div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
					<div className="absolute end-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
						<div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
							<span className="font-bold text-gray-800">{t.filters}</span>
							<button onClick={() => setMobileFiltersOpen(false)} className="text-gray-400 hover:text-gray-700">
								<X size={20} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto px-5 py-4">
							<FilterSidebar
								facetGroups={facetGroups}
								filteredIds={filteredIds}
								activeFv={fv as string[]}
								onToggle={(id) => { toggleFacet(id); setMobileFiltersOpen(false); }}
								onClearAll={() => { clearAllFacets(); setMobileFiltersOpen(false); }}
								locale={locale}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
