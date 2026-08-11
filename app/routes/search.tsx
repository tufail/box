import type { Route } from "./+types/search";
import { useSearchParams } from "react-router";
import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import Breadcrumb from "~/components/Breadcrumb";
import { graphqlRequest } from "workers/graphqlClient";
import ProductCard from "~/components/ProductCard";
import {
  SEARCH_PAGE_QUERY,
  type SearchPageData,
  type SearchPageFacetValue,
  type SearchPageVariables,
  type SortKey,
} from "~/graphql/product";

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "sales_desc", label: "Best Sellers" },
  { value: "rating_desc", label: "Highest Rated" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function sortToInput(sort: SortKey) {
  if (sort === "name_asc") return { name: "ASC" as const };
  if (sort === "price_asc") return { price: "ASC" as const };
  if (sort === "price_desc") return { price: "DESC" as const };
  if (sort === "rating_desc") return { avgRating: "DESC" as const };
  return { salesCount: "DESC" as const };
}

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs) {
  const q = (data as { q?: string } | undefined)?.q ?? "";
  return [
    { title: q ? `Search: ${q} — NutriBox` : "Search — NutriBox" },
    // Search-result URLs are unbounded (any query string) and mostly thin/duplicate
    // content — kept crawlable (not blocked in robots.txt) so this tag is actually
    // seen, but excluded from the index; "follow" still passes link equity through
    // to the product/collection pages linked from the results.
    { name: "robots", content: "noindex, follow" },
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const sort = (url.searchParams.get("sort") ?? "sales_desc") as SortKey;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const fv = url.searchParams.get("fv")?.split(",").filter(Boolean) ?? [];
  const onSale = url.searchParams.get("onSale") === "1";
  const bundle = url.searchParams.get("bundle") === "1";

  const env = context.cloudflare.env;
  const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

  const input: SearchPageVariables["input"] = {
    term: q || undefined,
    groupByProduct: false,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    sort: sortToInput(sort),
    ...(fv.length > 0 && { facetValueIds: fv, facetValueOperator: "AND" }),
    ...(onSale && { isOnSale: true }),
    ...(bundle && { isBundle: true }),
  };

  try {
    const { data } = await graphqlRequest<SearchPageData, SearchPageVariables>(
      env,
      SEARCH_PAGE_QUERY,
      { input },
      { request }
    );
    return { ...data.search, q, sort, page, fv, onSale, bundle, vendureBase };
  } catch {
    return { totalItems: 0, items: [], facetValues: [], collections: [], q, sort, page, fv, onSale, bundle, vendureBase };
  }
}

// ── Filter sidebar ─────────────────────────────────────────────────────────

interface FilterSidebarProps {
  facetGroups: FacetGroup[];
  facetValues: SearchPageFacetValue[];
  activeFv: string[];
  onToggle: (id: string) => void;
  onSale: boolean;
  bundle: boolean;
  onToggleOnSale: () => void;
  onToggleBundle: () => void;
}

function FilterSidebar({ facetGroups, facetValues, activeFv, onToggle, onSale, bundle, onToggleOnSale, onToggleBundle }: FilterSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const hasActive = activeFv.length > 0 || onSale || bundle;
  return (
    <div>
      {hasActive && (
        <div className="mb-5">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Active</div>
          <div className="flex flex-wrap gap-1.5">
            {onSale && (
              <button
                onClick={onToggleOnSale}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                On Sale
                <X size={10} />
              </button>
            )}
            {bundle && (
              <button
                onClick={onToggleBundle}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                Bundle Deals
                <X size={10} />
              </button>
            )}
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

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2.5">Quick Filters</div>
        <ul className="space-y-2">
          <li>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={onSale} onChange={onToggleOnSale} className="accent-primary w-4 h-4 rounded flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700 group-hover:text-primary transition-colors">On Sale</span>
            </label>
          </li>
          <li>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={bundle} onChange={onToggleBundle} className="accent-primary w-4 h-4 rounded flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700 group-hover:text-primary transition-colors">Bundle Deals</span>
            </label>
          </li>
        </ul>
      </div>

      {facetGroups.map((group) => {
        const isCollapsed = collapsed[group.facetId];
        return (
          <div key={group.facetId} className="mb-5">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [group.facetId]: !prev[group.facetId] }))}
              className="w-full flex items-center justify-between mb-2.5 group/header"
              aria-expanded={!isCollapsed}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 group-hover/header:text-gray-700">{group.facetName}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${!isCollapsed ? "rotate-180" : ""}`} />
            </button>
            {!isCollapsed && (
              <ul className="space-y-2 max-h-52 overflow-y-auto pe-1 scrollbar-thin">
                {group.values.map((v) => (
                  <li key={v.id}>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={activeFv.includes(v.id)}
                        onChange={() => onToggle(v.id)}
                        className="accent-primary w-4 h-4 rounded flex-shrink-0"
                      />
                      <span className="flex-1 text-sm text-gray-700 group-hover:text-primary transition-colors">
                        {v.name} <span className="text-gray-400">({v.count})</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { totalItems, items, facetValues, q, sort, page, fv, onSale, bundle, vendureBase } = loaderData;
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

  function toggleOnSale() {
    updateParam("onSale", onSale ? null : "1");
  }

  function toggleBundle() {
    updateParam("bundle", bundle ? null : "1");
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ── Breadcrumb ── */}
      <div className="mb-4">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: q ? `Search results for "${q}"` : "All Products" },
          ]}
        />
      </div>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {q ? (
              <>Results for <span className="text-primary">"{q}"</span></>
            ) : (
              "All Products"
            )}
          </h1>
          <p className="text-sm text-gray-500">{totalItems} product{totalItems !== 1 ? "s" : ""} found</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filters
            {(fv as string[]).length + (onSale ? 1 : 0) + (bundle ? 1 : 0) > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold rounded w-4 h-4 flex items-center justify-center">
                {(fv as string[]).length + (onSale ? 1 : 0) + (bundle ? 1 : 0)}
              </span>
            )}
          </button>

          <select
            value={sort as string}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="flex gap-6 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="text-sm font-semibold text-gray-800 mb-4">Filters</div>
          <FilterSidebar
            facetGroups={facetGroups}
            facetValues={facetValues}
            activeFv={fv as string[]}
            onToggle={toggleFacet}
            onSale={onSale as boolean}
            bundle={bundle as boolean}
            onToggleOnSale={toggleOnSale}
            onToggleBundle={toggleBundle}
          />
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {items.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-semibold text-gray-600 mb-1">No products found</p>
              {q && <p className="text-sm">Try a different search term or clear some filters.</p>}
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
                className="px-4 py-2 rounded border border-gray-300 text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => updateParam("page", String((page as number) + 1))}
                className="px-4 py-2 rounded border border-gray-300 text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[300] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-gray-800">Filters</span>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterSidebar
                facetGroups={facetGroups}
                facetValues={facetValues}
                activeFv={fv as string[]}
                onToggle={(id) => {
                  toggleFacet(id);
                  setMobileFiltersOpen(false);
                }}
                onSale={onSale as boolean}
                bundle={bundle as boolean}
                onToggleOnSale={() => {
                  toggleOnSale();
                  setMobileFiltersOpen(false);
                }}
                onToggleBundle={() => {
                  toggleBundle();
                  setMobileFiltersOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
