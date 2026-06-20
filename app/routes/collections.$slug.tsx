import type { Route } from "./+types/collections.$slug";
import { useSearchParams } from "react-router";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import ProductCard from "~/components/ProductCard";
import Breadcrumb, { type BreadcrumbItem } from "~/components/Breadcrumb";
import {
  COLLECTION_PAGE_QUERY,
  COLLECTION_FACETS_QUERY,
  type CollectionPageData,
  type CollectionPageFacetValue,
  type CollectionPageVariables,
  type CollectionFacetsData,
} from "~/graphql/collection";
import type { SortKey } from "~/graphql/product";

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Latest" },
  { value: "sales_desc", label: "Best Sellers" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function sortToInput(sort: SortKey): CollectionPageVariables["input"]["sort"] {
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

function groupFacets(facetValues: CollectionPageFacetValue[]): FacetGroup[] {
  const map = new Map<string, FacetGroup>();
  for (const { facetValue, count } of facetValues) {
    const { id: facetId, name: facetName } = facetValue.facet;
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
  const name = loaderData?.collection?.name ?? "Collection";
  return [{ title: `${name} — PHQ` }];
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

  const sortInput = sortToInput(sort);
  const input: CollectionPageVariables["input"] = {
    collectionSlug: slug,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    ...(sortInput && { sort: sortInput }),
    ...(fv.length > 0 && { facetValueIds: fv, facetValueOperator: "OR" }),
  };

  // Fetch all facets without any active filters so the sidebar never collapses
  const facetsInput = { collectionSlug: slug, take: 0, groupByProduct: true };

  try {
    const [mainResult, facetsResult] = await Promise.allSettled([
      graphqlRequest<CollectionPageData, CollectionPageVariables>(env, COLLECTION_PAGE_QUERY, { slug, input }, { request }),
      graphqlRequest<CollectionFacetsData>(env, COLLECTION_FACETS_QUERY, { input: facetsInput }, { request }),
    ]);

    if (mainResult.status === "rejected") throw mainResult.reason;
    const { data } = mainResult.value;
    const allFacetValues = facetsResult.status === "fulfilled"
      ? facetsResult.value.data.search.facetValues
      : data.search.facetValues;

    return { ...data.search, collection: data.collection, sort, page, fv, vendureBase, allFacetValues };
  } catch {
    return { totalItems: 0, items: [], facetValues: [], allFacetValues: [], collection: null, sort, page, fv, vendureBase };
  }
}

// ── Filter sidebar ─────────────────────────────────────────────────────────

interface FilterSidebarProps {
  facetGroups: FacetGroup[];
  filteredIds: Set<string>;
  activeFv: string[];
  onToggle: (id: string) => void;
  onClearAll: () => void;
}

function FilterSidebar({ facetGroups, filteredIds, activeFv, onToggle, onClearAll }: FilterSidebarProps) {
  return (
    <div>
      {activeFv.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Active filters</span>
            <button onClick={onClearAll} className="text-xs text-primary hover:underline">Clear all</button>
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
                      className="accent-primary w-4 h-4 rounded flex-shrink-0"
                    />
                    <span className={`flex-1 text-sm transition-colors ${isActive ? "text-primary font-medium" : "text-gray-700 group-hover:text-primary"}`}>
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

export default function CollectionPage({ loaderData }: Route.ComponentProps) {
  const { totalItems, items, facetValues, allFacetValues, collection, sort, page, fv, vendureBase } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  // Build sidebar from the unfiltered facet list so nothing disappears on selection
  const facetGroups = groupFacets(allFacetValues ?? facetValues);
  // IDs present in the current filtered result — used to dim unavailable options
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

  // Build breadcrumb from Vendure's collection.breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];
  if (collection?.breadcrumbs) {
    for (const crumb of collection.breadcrumbs) {
      if (crumb.name === "__root_collection__") continue;
      breadcrumbs.push({
        label: crumb.name,
        href: crumb.slug === collection.slug ? undefined : `/collections/${crumb.slug}`,
      });
    }
  } else if (collection) {
    breadcrumbs.push({ label: collection.name });
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ── Breadcrumb ── */}
      <div className="mb-4">
        <Breadcrumb items={breadcrumbs} />
      </div>

      {/* ── Collection header ── */}
      {collection && (
        <div className="mb-6">
          {collection.customFields?.banner?.source && (
            <div className="w-full rounded overflow-hidden mb-4 bg-gray-100">
              <img
                src={collection.customFields.banner.source}
                alt={collection.name}
                className="w-full h-auto object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
          {collection.description && (
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">{collection.description}</p>
          )}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <p className="text-sm text-gray-500">{totalItems} product{totalItems !== 1 ? "s" : ""}</p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filters
            {(fv as string[]).length > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold rounded w-4 h-4 flex items-center justify-center">
                {(fv as string[]).length}
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
            filteredIds={filteredIds}
            activeFv={fv as string[]}
            onToggle={toggleFacet}
            onClearAll={clearAllFacets}
          />
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {items.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-semibold text-gray-600 mb-1">No products found</p>
              <p className="text-sm">Try clearing some filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((product) => (
                <ProductCard key={product.productVariantId} product={product} vendureBase={vendureBase} showVariantName forceAddToCart variantId={product.productVariantId} />
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
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-bold text-gray-800">Filters</span>
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
