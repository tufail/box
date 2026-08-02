import type { Route } from "./+types/collections";
import { useSearchParams } from "react-router";
import { useState } from "react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import Breadcrumb from "~/components/Breadcrumb";
import { graphqlRequest } from "workers/graphqlClient";
import ProductCard from "~/components/ProductCard";
import SortDropdown from "~/components/SortDropdown";
import {
  SEARCH_PAGE_QUERY,
  type SearchPageData,
  type SearchPageFacetValue,
  type SearchPageVariables,
  type SortKey,
} from "~/graphql/product";
import { SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, stripLocalePrefix, hreflangTags, type Locale } from "~/lib/i18n";
import { SHOP_COPY, productCountLabel } from "~/lib/shopCopy";

const PAGE_SIZE = 24;

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    title: "All Products — NutriBox Qatar",
    description: "Browse our full catalogue of authentic health, fitness, and nutrition products. Fast delivery across Qatar.",
    breadcrumbHome: "Home",
    breadcrumbAll: "All Products",
    h1: "All Products",
    subtitle: "Browse our full catalogue",
  },
  ar: {
    title: "جميع المنتجات — NutriBox قطر",
    description: "تصفح كامل تشكيلتنا من منتجات الصحة واللياقة والتغذية الأصلية. توصيل سريع لجميع أنحاء قطر.",
    breadcrumbHome: "الرئيسية",
    breadcrumbAll: "جميع المنتجات",
    h1: "جميع المنتجات",
    subtitle: "تصفح كامل تشكيلتنا",
  },
} as const;

function getSortOptions(locale: Locale): { value: SortKey; label: string }[] {
  const t = SHOP_COPY[locale];
  return [
    { value: "sales_desc", label: t.sortBestSellers },
    { value: "default", label: t.sortLatest },
    { value: "name_asc", label: t.sortNameAsc },
    { value: "price_asc", label: t.sortPriceAsc },
    { value: "price_desc", label: t.sortPriceDesc },
  ];
}

function sortToInput(sort: SortKey): SearchPageVariables["input"]["sort"] {
  if (sort === "sales_desc") return { salesCount: "DESC" };
  if (sort === "name_asc") return { name: "ASC" };
  if (sort === "price_asc") return { price: "ASC" };
  if (sort === "price_desc") return { price: "DESC" };
  return undefined;
}

interface FacetGroup {
  facetId: string;
  facetName: string;
  values: { id: string; name: string; count: number }[];
}

function groupFacets(facetValues: SearchPageFacetValue[]): FacetGroup[] {
  const map = new Map<string, FacetGroup>();
  for (const { facetValue, count } of facetValues) {
    const { id: facetId, name: facetName } = facetValue.facet;
    if (!map.has(facetId)) map.set(facetId, { facetId, facetName, values: [] });
    map.get(facetId)!.values.push({ id: facetValue.id, name: facetValue.name, count });
  }
  return [...map.values()];
}

export function meta({ loaderData }: Route.MetaArgs) {
  const locale = loaderData?.locale ?? "en";
  const { title, description } = COPY[locale];
  const canonicalUrl = loaderData?.canonicalUrl ?? `${SITE_URL}/collections`;
  const canonicalPath = stripLocalePrefix(new URL(canonicalUrl).pathname);
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link" as const, rel: "canonical", href: canonicalUrl },
    ...(canonicalPath ? hreflangTags(SITE_URL, canonicalPath) : []),
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonicalUrl },
    { property: "og:site_name", content: "NutriBox Qatar" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const sort = (url.searchParams.get("sort") ?? "sales_desc") as SortKey;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const fv = url.searchParams.get("fv")?.split(",").filter(Boolean) ?? [];
  const locale = getLocaleFromPathname(url.pathname);
  const canonicalUrl = `${url.origin}${localizePath("/collections", locale)}`;

  const env = context.cloudflare.env;
  const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

  const sortInput = sortToInput(sort);
  const input: SearchPageVariables["input"] = {
    groupByProduct: false,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    ...(sortInput && { sort: sortInput }),
    ...(fv.length > 0 && { facetValueIds: fv, facetValueOperator: "AND" }),
  };

  try {
    const { data } = await graphqlRequest<SearchPageData, SearchPageVariables>(
      env,
      SEARCH_PAGE_QUERY,
      { input },
      { request }
    );
    return { ...data.search, sort, page, fv, vendureBase, canonicalUrl, locale };
  } catch {
    return { totalItems: 0, items: [], facetValues: [], collections: [], sort, page, fv, vendureBase, canonicalUrl, locale };
  }
}

interface FilterSidebarProps {
  facetGroups: FacetGroup[];
  facetValues: SearchPageFacetValue[];
  activeFv: string[];
  onToggle: (id: string) => void;
  locale: Locale;
}

function FilterSidebar({ facetGroups, facetValues, activeFv, onToggle, locale }: FilterSidebarProps) {
  const t = SHOP_COPY[locale];
  return (
    <div>
      {activeFv.length > 0 && (
        <div className="mb-5">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t.activeFilters}</div>
          <div className="flex flex-wrap gap-1.5">
            {activeFv.map((id) => {
              const match = facetValues.find((f) => f.facetValue.id === id);
              return match ? (
                <button
                  key={id}
                  onClick={() => onToggle(id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {match.facetValue.name}
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
              return (
                <li key={v.id}>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
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

export default function AllProductsPage({ loaderData }: Route.ComponentProps) {
  const { totalItems, items, facetValues, sort, page, fv, vendureBase, canonicalUrl, locale } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const facetGroups = groupFacets(facetValues);

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

  const t = SHOP_COPY[locale];
  const { breadcrumbHome, breadcrumbAll, h1, subtitle } = COPY[locale];
  const siteOrigin = canonicalUrl ? new URL(canonicalUrl).origin : "";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: breadcrumbHome, item: localeHomeUrl(siteOrigin || SITE_URL, locale) },
      { "@type": "ListItem", position: 2, name: breadcrumbAll, item: canonicalUrl },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: breadcrumbAll,
    numberOfItems: totalItems,
    itemListElement: items.slice(0, 24).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteOrigin}${localizePath(`/products/${item.customProductVariantMappings?.slug || item.slug}`, locale)}`,
    })),
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <div className="mb-4">
        <Breadcrumb items={[{ label: breadcrumbHome, href: "/" }, { label: breadcrumbAll }]} />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{h1}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

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

      <div className="flex gap-6 items-start">
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="text-sm font-semibold text-gray-800 mb-4">{t.filters}</div>
          <FilterSidebar
            facetGroups={facetGroups}
            facetValues={facetValues}
            activeFv={fv as string[]}
            onToggle={toggleFacet}
            locale={locale}
          />
        </aside>

        <div className="flex-1 min-w-0">
          {items.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-semibold text-gray-600 mb-1">{t.noProductsFound}</p>
              <p className="text-sm">{t.tryClearingFilters}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((product) => (
                <ProductCard
                  key={product.productVariantId}
                  product={product}
                  vendureBase={vendureBase}
                />
              ))}
            </div>
          )}

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
                facetValues={facetValues}
                activeFv={fv as string[]}
                onToggle={(id) => { toggleFacet(id); setMobileFiltersOpen(false); }}
                locale={locale}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
