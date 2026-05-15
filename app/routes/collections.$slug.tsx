import type { Route } from "./+types/collections.$slug";
import { useSearchParams } from "react-router";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import ProductCard from "~/components/ProductCard";
import Breadcrumb, { type BreadcrumbItem } from "~/components/Breadcrumb";
import {
  COLLECTION_PAGE_QUERY,
  type CollectionPageData,
  type CollectionPageFacetValue,
  type CollectionPageVariables,
} from "~/graphql/collection";
import type { SortKey } from "~/graphql/product";

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "sales_desc", label: "Best Sellers" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function sortToInput(sort: SortKey) {
  if (sort === "name_asc") return { name: "ASC" as const };
  if (sort === "price_asc") return { price: "ASC" as const };
  if (sort === "price_desc") return { price: "DESC" as const };
  return { salesCount: "DESC" as const };
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
  return [...map.values()];
}

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs) {
  const name = (data as { collection?: { name: string } } | undefined)?.collection?.name ?? "Collection";
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

  const input: CollectionPageVariables["input"] = {
    collectionSlug: slug,
    groupByProduct: true,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    sort: sortToInput(sort),
    ...(fv.length > 0 && { facetValueIds: fv, facetValueOperator: "AND" }),
  };

  try {
    const { data } = await graphqlRequest<CollectionPageData, CollectionPageVariables>(
      env,
      COLLECTION_PAGE_QUERY,
      { slug, input },
      { request }
    );
    return { ...data.search, collection: data.collection, sort, page, fv, vendureBase };
  } catch {
    return { totalItems: 0, items: [], facetValues: [], collection: null, sort, page, fv, vendureBase };
  }
}

// ── Filter sidebar ─────────────────────────────────────────────────────────

interface FilterSidebarProps {
  facetGroups: FacetGroup[];
  facetValues: CollectionPageFacetValue[];
  activeFv: string[];
  onToggle: (id: string) => void;
}

function FilterSidebar({ facetGroups, facetValues, activeFv, onToggle }: FilterSidebarProps) {
  return (
    <div>
      {activeFv.length > 0 && (
        <div className="mb-5">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Active</div>
          <div className="flex flex-wrap gap-1.5">
            {activeFv.map((id) => {
              const match = facetValues.find((f) => f.facetValue.id === id);
              return match ? (
                <button
                  key={id}
                  onClick={() => onToggle(id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
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
                    {v.name}
                  </span>
                  <span className="text-xs text-gray-400">{v.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CollectionPage({ loaderData }: Route.ComponentProps) {
  const { totalItems, items, facetValues, collection, sort, page, fv, vendureBase } = loaderData;
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
          {collection.featuredAsset?.preview && (
            <div className="w-full h-40 md:h-56 rounded-xl overflow-hidden mb-4 bg-gray-100">
              <img
                src={collection.featuredAsset.preview}
                alt={collection.name}
                className="w-full h-full object-cover"
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
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filters
            {(fv as string[]).length > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {(fv as string[]).length}
              </span>
            )}
          </button>

          <select
            value={sort as string}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
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
                <ProductCard key={product.productId} product={product} vendureBase={vendureBase} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-10">
              <button
                disabled={page === 1}
                onClick={() => updateParam("page", String((page as number) - 1))}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => updateParam("page", String((page as number) + 1))}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                facetValues={facetValues}
                activeFv={fv as string[]}
                onToggle={(id) => { toggleFacet(id); setMobileFiltersOpen(false); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
