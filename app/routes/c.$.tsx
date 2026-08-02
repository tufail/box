import type { Route } from "./+types/c.$";
import { useSearchParams, redirect } from "react-router";
import Link from "~/components/LocaleLink";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import ProductCard from "~/components/ProductCard";
import Breadcrumb, { type BreadcrumbItem } from "~/components/Breadcrumb";
import SortDropdown from "~/components/SortDropdown";
import {
  COLLECTION_PAGE_QUERY,
  COLLECTION_FACETS_QUERY,
  buildCollectionPath,
  type CollectionPageData,
  type CollectionPageFacetValue,
  type CollectionPageVariables,
  type CollectionFacetsData,
} from "~/graphql/collection";
import type { SortKey } from "~/graphql/product";
import { vendureImageUrl } from "~/components/VendureImage";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, stripLocalePrefix, hreflangTags, type Locale } from "~/lib/i18n";
import { SHOP_COPY, productCountLabel } from "~/lib/shopCopy";

const PAGE_SIZE = 24;

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: { breadcrumbHome: "Home" },
  ar: { breadcrumbHome: "الرئيسية" },
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

// ── Types ──────────────────────────────────────────────────────────────────

interface FacetGroup {
  facetId: string;
  facetName: string;
  values: { id: string; name: string; count: number }[];
}

// ── Marquee hero (shown when the collection has no banner image) ────────────

function CollectionMarqueeHero({ title }: { title: string }) {
  const REPEAT = 4;
  const track = Array.from({ length: REPEAT * 2 }, (_, i) => (
    <span key={i} className="flex items-center gap-6 flex-shrink-0">
      <span className="font-heading text-2xl sm:text-4xl font-black uppercase bg-gradient-to-r from-lime-600 via-gray-900 to-[#224d53] bg-clip-text text-transparent">
        {title}
      </span>
      <span className="w-2 h-2 rounded-full bg-lime-300 flex-shrink-0" />
    </span>
  ));

  return (
    <div className="relative w-full h-14 sm:h-20 rounded-2xl overflow-hidden mb-4" aria-hidden="true">
      <div className="absolute -top-8 left-1/4 w-28 h-28 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-1/4 w-32 h-32 rounded-full bg-[#3b8578]/30 blur-3xl pointer-events-none" />

      <div className="absolute inset-0 flex items-center">
        <div className="flex items-center gap-6 w-max animate-marquee">{track}</div>
      </div>
    </div>
  );
}

// ── Sub-collection nav (1st-level children as scrollable link buttons) ──────

function SubCollectionNav({ children, vendureBase, locale }: { children: { id: string; name: string; slug: string; featuredAsset: { preview: string } | null }[]; vendureBase: string; locale: Locale }) {
  const scrollLeftLabel = locale === "ar" ? "التمرير لليسار" : "Scroll left";
  const scrollRightLabel = locale === "ar" ? "التمرير لليمين" : "Scroll right";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState, children.length]);

  function scrollByAmount(direction: "left" | "right") {
    scrollRef.current?.scrollBy({ left: direction === "left" ? -240 : 240, behavior: "smooth" });
  }

  if (children.length === 0) return null;

  return (
    <div className="relative mb-6">
      <div ref={scrollRef} onScroll={updateScrollState} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {children.map((child) => (
          <Link
            key={child.id}
            to={`/c/${child.slug}`}
            className="flex-shrink-0 flex items-center gap-2 ps-1.5 pe-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:border-black hover:shadow-md transition-all text-sm font-semibold text-gray-700 hover:text-black"
          >
            {child.featuredAsset ? (
              <img src={vendureImageUrl(child.featuredAsset.preview, vendureBase, { preset: "thumb", format: "webp" })} alt="" className="w-7 h-7 rounded-full object-cover bg-stone-100 flex-shrink-0" loading="lazy" />
            ) : (
              <span className="w-7 h-7 rounded-full bg-stone-100 flex-shrink-0" />
            )}
            {child.name}
          </Link>
        ))}
      </div>

      {canScrollLeft && (
        <>
          <div className="absolute start-0 top-0 bottom-2 w-10 bg-gradient-to-r from-stone-100 to-transparent pointer-events-none rtl:bg-gradient-to-l" />
          <button onClick={() => scrollByAmount("left")} aria-label={scrollLeftLabel} className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-2 rtl:translate-x-2 z-20 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronLeft size={14} className="rtl:rotate-180" />
          </button>
        </>
      )}
      {canScrollRight && (
        <>
          <div className="absolute end-0 top-0 bottom-2 w-10 bg-gradient-to-l from-stone-100 to-transparent pointer-events-none rtl:bg-gradient-to-r" />
          <button onClick={() => scrollByAmount("right")} aria-label={scrollRightLabel} className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-2 rtl:-translate-x-2 z-20 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronRight size={14} className="rtl:rotate-180" />
          </button>
        </>
      )}
    </div>
  );
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
  const collection = loaderData?.collection;
  const locale = loaderData?.locale ?? "en";
  const name = collection?.name ?? (locale === "ar" ? "قسم" : "Collection");
  const title = `${name} — ${SITE_NAME}`;
  const rawDescription = collection?.description?.replace(/<[^>]+>/g, "").trim();
  const fallbackDescription =
    locale === "ar"
      ? `تسوق منتجات ${name} الأصلية من ${SITE_NAME} — أصلية 100%، وتوصيل سريع لجميع أنحاء قطر.`
      : `Shop authentic ${name} products at ${SITE_NAME} — 100% genuine, fast delivery across Qatar.`;
  const description = rawDescription ? rawDescription.slice(0, 160) : fallbackDescription;
  const canonicalUrl = loaderData?.canonicalUrl ?? "";
  const image = loaderData?.collectionImage ?? "";

  if (!collection) return [{ title }, { name: "robots", content: "noindex, follow" }];

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
    ...(image ? [{ property: "og:image", content: image }] : []),
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(image ? [{ name: "twitter:image", content: image }] : []),
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ params, request, context }: Route.LoaderArgs) {
  // "*" is everything after /c/ (or /ar/c/) — e.g. "health-supplements/creatine".
  // Vendure collection slugs are globally unique, so only the last segment is
  // actually used to look the collection up; the rest of the path is purely for
  // a human/SEO-readable deep URL, canonicalized below via redirect.
  const path = params["*"] ?? "";
  const segments = path.split("/").filter(Boolean);
  const slug = segments[segments.length - 1] ?? "";
  const url = new URL(request.url);
  const locale = getLocaleFromPathname(url.pathname);
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

    // Canonicalize: if the visited path doesn't match the collection's real
    // ancestor chain, redirect to the correct deep URL (avoids duplicate-content
    // across multiple paths reaching the same collection). Locale-aware so an
    // /ar/c/... visit redirects to another /ar/c/... URL, never back to English.
    if (data.collection?.breadcrumbs?.length) {
      const canonicalPath = localizePath(buildCollectionPath(data.collection.breadcrumbs), locale);
      if (canonicalPath !== `${localizePath("/c/" + path, locale)}`) {
        throw redirect(`${canonicalPath}${url.search}`, 301);
      }
    }

    const allFacetValues = facetsResult.status === "fulfilled"
      ? facetsResult.value.data.search.facetValues
      : data.search.facetValues;

    const canonicalUrl = `${url.origin}${data.collection ? localizePath(buildCollectionPath(data.collection.breadcrumbs), locale) : localizePath("/c/" + path, locale)}`;
    const collectionImage = data.collection?.featuredAsset?.preview
      ? vendureImageUrl(data.collection.featuredAsset.preview, vendureBase, { preset: "xlarge", format: "jpg" })
      : null;

    return { ...data.search, collection: data.collection, sort, page, fv, vendureBase, allFacetValues, canonicalUrl, collectionImage, locale };
  } catch (e) {
    if (e instanceof Response) throw e;
    return { totalItems: 0, items: [], facetValues: [], allFacetValues: [], collection: null, sort, page, fv, vendureBase, canonicalUrl: `${url.origin}${localizePath("/c/" + path, locale)}`, collectionImage: null, locale };
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

export default function CollectionPage({ loaderData }: Route.ComponentProps) {
  const { totalItems, items, facetValues, allFacetValues, collection, sort, page, fv, vendureBase, canonicalUrl, collectionImage, locale } = loaderData;
  const t = SHOP_COPY[locale];
  const { breadcrumbHome } = COPY[locale];
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

  // Build breadcrumb from Vendure's collection.breadcrumbs — each ancestor links to
  // its own deep path (built progressively from the same breadcrumb chain).
  const breadcrumbs: BreadcrumbItem[] = [{ label: breadcrumbHome, href: "/" }];
  if (collection?.breadcrumbs) {
    const realCrumbs = collection.breadcrumbs.filter((c) => c.name !== "__root_collection__");
    realCrumbs.forEach((crumb, i) => {
      breadcrumbs.push({
        label: crumb.name,
        href: i === realCrumbs.length - 1 ? undefined : `/c/${realCrumbs.slice(0, i + 1).map((c) => c.slug).join("/")}`,
      });
    });
  } else if (collection) {
    breadcrumbs.push({ label: collection.name });
  }

  // JSON-LD — BreadcrumbList mirrors the visual breadcrumb trail; CollectionPage +
  // ItemList give search engines/AI crawlers the collection's identity and a
  // sample of what it contains without needing to parse the product grid markup.
  const jsonLd = collection && [
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
      name: collection.name,
      url: canonicalUrl,
      ...(collectionImage && { image: collectionImage }),
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
      {jsonLd && jsonLd.map((schema, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}

      {/* ── Breadcrumb ── */}
      <div className="mb-4">
        <Breadcrumb items={breadcrumbs} />
      </div>

      {/* ── Collection header ── */}
      {collection && (
        <div className="mb-6">
          {collection.customFields?.banner?.source ? (
            <div className="w-full rounded overflow-hidden mb-4 bg-gray-100">
              <img
                src={collection.customFields.banner.source}
                alt={collection.name}
                className="w-full h-auto object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          ) : (
            <CollectionMarqueeHero title={collection.name} />
          )}
          <h1 className={`text-2xl font-bold text-gray-900 ${collection.customFields?.banner?.source ? "" : "sr-only"}`}>{collection.name}</h1>
          {collection.description && (
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">{collection.description}</p>
          )}
        </div>
      )}

      {/* ── Sub-collections (1st-level children) ── */}
      {collection && <SubCollectionNav children={collection.children} vendureBase={vendureBase} locale={locale} />}

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
