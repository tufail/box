import type { Route } from "./+types/brands.$slug.$category";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import ProductCard from "~/components/ProductCard";
import Breadcrumb from "~/components/Breadcrumb";
import SortDropdown from "~/components/SortDropdown";
import Pagination from "~/components/Pagination";
import FilterSidebar, { groupFacets } from "~/components/FacetFilters";
import BrandNavBar from "~/components/BrandNavBar";
import { GET_BRAND_FACET_QUERY, BRAND_CATEGORIES_QUERY, MIN_INDEXABLE_BRAND_CATEGORY_PRODUCTS, brandCategoryPath, topBrandCategories, type BrandFacetData, type BrandCategoriesData } from "~/graphql/brand";
import { COLLECTION_PAGE_QUERY, COLLECTION_FACETS_QUERY, buildCollectionPath, type CollectionPageData, type CollectionFacetsData, type CollectionPageVariables } from "~/graphql/collection";
import type { SortKey } from "~/graphql/product";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, stripLocalePrefix, hreflangTags, type Locale } from "~/lib/i18n";
import { SHOP_COPY, productCountLabel } from "~/lib/shopCopy";

// Brand x category landing page (e.g. /brands/dymatize/protein): the same
// product search the brand and collection pages use, scoped by BOTH the brand's
// facet value and the collection slug. Exists so "<brand> <category>" searches
// have a page that matches them exactly, instead of only the broad brand page.

const PAGE_SIZE = 24;

const COPY = {
	en: {
		home: "Home",
		brands: "Brands",
		intro: (brand: string, category: string, count: number) =>
			`Browse ${count} authentic ${brand} ${category} products at ${SITE_NAME}, with delivery across Qatar.`,
	},
	ar: {
		home: "الرئيسية",
		brands: "الماركات",
		intro: (brand: string, category: string, count: number) =>
			`تصفح ${count} منتج ${category} أصلي من ${brand} في ${SITE_NAME} مع التوصيل في جميع أنحاء قطر.`,
	},
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

function sortToInput(sort: SortKey): CollectionPageVariables["input"]["sort"] {
	if (sort === "sales_desc") return { salesCount: "DESC" };
	if (sort === "name_asc") return { name: "ASC" };
	if (sort === "price_asc") return { price: "ASC" };
	if (sort === "price_desc") return { price: "DESC" };
	return undefined;
}

export function meta({ loaderData }: Route.MetaArgs) {
	if (!loaderData) return [{ title: SITE_NAME }, { name: "robots", content: "noindex, follow" }];
	const { brandName, categoryName, locale, canonicalUrl, totalItems, items } = loaderData;
	const title = `${brandName} ${categoryName} - ${SITE_NAME}`;
	const description =
		locale === "ar"
			? `تسوق ${categoryName} من ${brandName} الأصلي من متجر ${SITE_NAME}. أفضل الأسعار. ✓ تسوق آمن ✓ توصيل إلى الدوحة وجميع أنحاء الدولة.`
			: `Shop authentic ${brandName} ${categoryName} at ${SITE_NAME} store. Best prices. ✓ Secure Shopping ✓ Delivery to Doha & nationwide.`;
	const canonicalPath = stripLocalePrefix(new URL(canonicalUrl).pathname);
	// Thin pages and out-of-range ?page=N (no items) stay out of the index.
	const indexable = totalItems >= MIN_INDEXABLE_BRAND_CATEGORY_PRODUCTS && items.length > 0;

	return [
		{ title },
		{ name: "description", content: description },
		...(indexable ? [] : [{ name: "robots", content: "noindex, follow" }]),
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...hreflangTags(SITE_URL, canonicalPath),
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

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const { slug, category } = params;
	const url = new URL(request.url);
	const sort = (url.searchParams.get("sort") ?? "sales_desc") as SortKey;
	const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
	const fv = url.searchParams.get("fv")?.split(",").filter(Boolean) ?? [];
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");
	const locale = getLocaleFromPathname(url.pathname);

	const { data: facetData } = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, {
		request,
		cf: { cacheTtl: 300, cacheEverything: true },
	});
	const brand = facetData.facets.items[0]?.values.find((v) => v.code === slug);
	if (!brand) throw new Response("Not Found", { status: 404 });

	const sortInput = sortToInput(sort);
	const input: CollectionPageVariables["input"] = {
		collectionSlug: category,
		facetValueIds: [brand.id, ...fv],
		facetValueOperator: "AND",
		groupByProduct: false,
		take: PAGE_SIZE,
		skip: (page - 1) * PAGE_SIZE,
		...(sortInput && { sort: sortInput }),
	};

	// Sidebar facets come from the brand+category scope with no extra filters
	// applied, so the groups never collapse as filters get picked.
	const facetsInput = { collectionSlug: category, facetValueIds: [brand.id], groupByProduct: true, take: 0 };
	const [{ data }, facetsResult, categoriesResult] = await Promise.all([
		graphqlRequest<CollectionPageData, CollectionPageVariables>(env, COLLECTION_PAGE_QUERY, { slug: category, input }, { request }),
		graphqlRequest<CollectionFacetsData>(env, COLLECTION_FACETS_QUERY, { input: facetsInput }, { request }).catch(() => null),
		graphqlRequest<BrandCategoriesData>(
			env,
			BRAND_CATEGORIES_QUERY,
			{ input: { facetValueIds: [brand.id], groupByProduct: true, take: 0 } },
			{ request, cf: { cacheTtl: 300, cacheEverything: true } },
		).catch(() => null),
	]);
	// All collections this brand sells in (current one highlighted), and every
	// brand for the Brand dropdown.
	const categories = topBrandCategories(categoriesResult?.data.search.collections ?? [], 40).map((c) => ({
		key: c.collection.id,
		label: c.collection.name,
		href: brandCategoryPath(slug, c.collection.slug),
		count: c.count,
		active: c.collection.slug === category,
	}));
	const brandLinks = (facetData.facets.items[0]?.values ?? []).map((v) => ({ key: v.code, label: v.name, href: `/brands/${v.code}` }));
	// Unknown category, or a brand/category pair with no products: a real 404
	// rather than an indexable empty page, since any brand x category URL is
	// otherwise reachable. (Only when no filters are active -- a filter that
	// matches nothing is just an empty result, not a missing page.)
	if (!data.collection || (data.search.totalItems === 0 && fv.length === 0)) throw new Response("Not Found", { status: 404 });
	const allFacetValues = facetsResult?.data.search.facetValues ?? data.search.facetValues;

	const canonicalPath = localizePath(`/brands/${slug}/${category}`, locale);
	const canonicalUrl = `${url.origin}${canonicalPath}${page > 1 ? `?page=${page}` : ""}`;

	return {
		totalItems: data.search.totalItems,
		items: data.search.items,
		brandName: brand.name,
		brandCode: slug,
		categoryName: data.collection.name,
		categoryPath: buildCollectionPath(data.collection.breadcrumbs),
		facetValues: data.search.facetValues,
		allFacetValues,
		categories,
		brandLinks,
		fv,
		sort,
		page,
		vendureBase,
		canonicalUrl,
		locale,
	};
}

export default function BrandCategoryPage({ loaderData }: Route.ComponentProps) {
	const { totalItems, items, brandName, brandCode, categoryName, categoryPath, facetValues, allFacetValues, categories, brandLinks, fv, sort, page, vendureBase, canonicalUrl, locale } = loaderData;
	const [searchParams, setSearchParams] = useSearchParams();
	const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
	const t = SHOP_COPY[locale];
	const copy = COPY[locale];
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);
	const heading = `${brandName} ${categoryName}`;

	// "brand" is excluded (page is already scoped to one brand),.
	const facetGroups = groupFacets(allFacetValues, ["brand", "brands"]);
	const filteredIds = new Set(facetValues.map((f) => f.facetValue.id));

	function updateParam(key: string, value: string | null) {
		const next = new URLSearchParams(searchParams);
		if (!value) next.delete(key);
		else next.set(key, value);
		if (key !== "page") next.delete("page");
		setSearchParams(next);
	}
	function toggleFacet(id: string) {
		const next = fv.includes(id) ? fv.filter((x) => x !== id) : [...fv, id];
		updateParam("fv", next.join(",") || null);
	}
	const clearAll = () => updateParam("fv", null);

	const breadcrumbs = [
		{ label: copy.home, href: "/" },
		{ label: copy.brands, href: "/brands" },
		{ label: brandName, href: `/brands/${brandCode}` },
		{ label: categoryName },
	];

	const jsonLd = [
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: breadcrumbs.map((crumb, i) => ({
				"@type": "ListItem",
				position: i + 1,
				name: crumb.label,
				item: crumb.href ? `${SITE_URL}${localizePath(crumb.href, locale)}` : canonicalUrl,
			})),
		},
		{
			"@context": "https://schema.org",
			"@type": "CollectionPage",
			name: heading,
			url: canonicalUrl,
			mainEntity: {
				"@type": "ItemList",
				numberOfItems: totalItems,
				itemListElement: items.slice(0, 24).map((item, i) => ({
					"@type": "ListItem",
					position: i + 1,
					url: `${SITE_URL}${localizePath(`/products/${item.customProductVariantMappings?.slug || item.slug}`, locale)}`,
				})),
			},
		},
	];

	return (
		<div className="container mx-auto px-4 py-6">
			{jsonLd.map((schema, i) => (
				<script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
			))}

			<div className="mb-4">
				<Breadcrumb items={breadcrumbs} />
			</div>

			<h1 className="font-heading text-2xl md:text-3xl font-extrabold text-black mb-2">{heading}</h1>
			<p className="text-sm text-gray-600 mb-6 max-w-3xl">{copy.intro(brandName, categoryName, totalItems)}</p>

			<div className="flex items-center justify-between flex-wrap gap-3 mb-6">
				<p className="text-sm text-gray-500">{productCountLabel(totalItems, locale)}</p>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setMobileFiltersOpen(true)}
						className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors"
					>
						<SlidersHorizontal size={14} />
						{t.filters}
						{fv.length > 0 && <span className="bg-primary text-white text-[10px] font-bold rounded w-4 h-4 flex items-center justify-center">{fv.length}</span>}
					</button>
					<SortDropdown options={getSortOptions(locale)} value={sort as SortKey} onChange={(v) => updateParam("sort", v)} />
				</div>
			</div>

			<div className="flex gap-6 items-start">
				<aside className="hidden lg:block w-52 flex-shrink-0">
					<div className="text-sm font-semibold text-gray-800 mb-4">{t.filters}</div>
					<FilterSidebar facetGroups={facetGroups} filteredIds={filteredIds} activeFv={fv} onToggle={toggleFacet} onClearAll={clearAll} locale={locale} />
				</aside>

				<div className="flex-1 min-w-0">
					<BrandNavBar brandName={brandName} brands={brandLinks} collections={categories} locale={locale} />

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
					<Pagination page={page} totalPages={totalPages} locale={locale} />
				</div>
			</div>

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
								activeFv={fv}
								onToggle={(id) => { toggleFacet(id); setMobileFiltersOpen(false); }}
								onClearAll={() => { clearAll(); setMobileFiltersOpen(false); }}
								locale={locale}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
