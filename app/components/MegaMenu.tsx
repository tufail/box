import { Link } from "react-router";
import { useState, useRef, useEffect } from "react";
import type { MegaMenuData, MegaMenuItem } from "../graphql/megamenu";
import { ChevronDown, Menu } from "lucide-react";

function itemHref(item: Pick<MegaMenuItem, "url" | "collectionSlug">): string {
  if (item.collectionSlug) return `/collections/${item.collectionSlug}`;
  return item.url ?? "#";
}

export default function MegaMenu({ megaMenu }: { megaMenu: MegaMenuData["getMegaMenu"] }) {
  const [desktopOpen, setDesktopOpen] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopByOpen, setShopByOpen] = useState(false);
  const [shopByActiveTab, setShopByActiveTab] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const shopByRef = useRef<HTMLDivElement>(null);

  const allItems = megaMenu?.items ?? [];
  const navItems = allItems.filter((i) => !i.excludeFromNav);
  const sidebarItems = allItems;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDesktopOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeItem = sidebarItems[shopByActiveTab] ?? null;

  return (
    <nav className="bg-white border-t border-b border-gray-200 relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex relative items-center h-10 md:h-12">

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
            <span>Shop By</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8" ref={menuRef}>

            {/* Shop By button — desktop (hover) */}
            <div
              ref={shopByRef}
              className="relative"
              onMouseEnter={() => setShopByOpen(true)}
              onMouseLeave={() => setShopByOpen(false)}
            >
              <button
                className={`flex items-center gap-2 font-medium text-sm border-r border-gray-200 pr-6 h-12 transition-colors ${shopByOpen ? "text-primary" : "hover:text-primary"}`}
                aria-expanded={shopByOpen}
                aria-label="Shop By"
              >
                <Menu size={18} />
                Shop By
              </button>

              {/* Desktop Shop By panel */}
              {shopByOpen && sidebarItems.length > 0 && (
                <div className="absolute left-0 top-full mt-[1px] bg-white border border-gray-200 shadow-xl z-50 flex min-w-[560px]">
                  {/* Left tab list */}
                  <ul className="w-[180px] flex-shrink-0 border-r border-gray-100 py-2">
                    {sidebarItems.map((item, index) => (
                      <li key={index}>
                        <button
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                            shopByActiveTab === index
                              ? "bg-gray-50 text-primary font-medium border-l-2 border-primary"
                              : "hover:bg-gray-50 hover:text-primary border-l-2 border-transparent"
                          }`}
                          onMouseEnter={() => setShopByActiveTab(index)}
                          onClick={() => setShopByActiveTab(index)}
                        >
                          {item.label}
                          <ChevronDown size={14} className="-rotate-90 opacity-40" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Right content */}
                  {activeItem && (
                    <div className="flex-1 p-5 flex gap-6 flex-wrap">
                      {[...activeItem.columns]
                        .sort((a, b) => a.position - b.position)
                        .map((col, ci) => (
                          <div key={ci} className="min-w-[140px] flex flex-col gap-4">
                            {col.sections.length > 0 && (
                              <div className="flex flex-col gap-4">
                                {col.sections.map((section, si) => (
                                  <div key={si}>
                                    {section.title && (
                                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                        {section.title}
                                      </p>
                                    )}
                                    <ul className="space-y-1">
                                      {section.links.map((link, li) => (
                                        <li key={li}>
                                          <Link
                                            to={itemHref(link)}
                                            className="text-sm text-gray-700 hover:text-primary transition-colors block py-0.5"
                                            onClick={() => setShopByOpen(false)}
                                          >
                                            {link.label}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            )}
                            {col.promoAssetPreview && (
                              <Link
                                to={col.promoUrl ?? "#"}
                                className="block group rounded-lg overflow-hidden border border-gray-100 hover:border-primary transition-colors mt-auto"
                                onClick={() => setShopByOpen(false)}
                              >
                                <img
                                  src={col.promoAssetPreview}
                                  alt={col.promoLabel ?? "Promotion"}
                                  className="w-full h-[100px] object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {col.promoLabel && (
                                  <p className="text-xs font-medium text-center py-2 px-3 bg-gray-50 group-hover:text-primary transition-colors">
                                    {col.promoLabel}
                                  </p>
                                )}
                              </Link>
                            )}
                          </div>
                        ))}
                      {activeItem.columns.length === 0 && (
                        <Link
                          to={itemHref(activeItem)}
                          className="text-sm text-primary hover:underline self-start"
                          onClick={() => setShopByOpen(false)}
                        >
                          View all {activeItem.label}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top nav items with hover dropdowns */}
            {navItems.map((item, index) => {
              const hasDropdown = item.columns.length > 0;
              return (
                <div
                  key={index}
                  onMouseEnter={() => hasDropdown && setDesktopOpen(index)}
                  onMouseLeave={() => setDesktopOpen(null)}
                >
                  <button
                    className="font-medium flex items-center gap-1 py-2 group"
                    aria-expanded={desktopOpen === index}
                    aria-haspopup={hasDropdown ? "true" : undefined}
                  >
                    <Link
                      to={itemHref(item)}
                      className="text-black text-sm group-hover:text-primary transition-colors"
                    >
                      {item.label}
                    </Link>
                    {hasDropdown && (
                      <span className={`group-hover:text-primary transition-all duration-300 ${desktopOpen === index ? "-rotate-180" : ""}`}>
                        <ChevronDown size={18} />
                      </span>
                    )}
                  </button>

                  {hasDropdown && (
                    <div
                      className={`absolute left-0 top-full bg-white border border-gray-200 shadow-xl mt-[1px] transition-all duration-300 z-50 ${
                        desktopOpen === index
                          ? "opacity-100 visible translate-y-0"
                          : "opacity-0 invisible -translate-y-2"
                      }`}
                    >
                      <div className="flex gap-0 p-6">
                        {[...item.columns]
                          .sort((a, b) => a.position - b.position)
                          .map((col, ci) => (
                            <div key={ci} className="min-w-[160px] pr-8 last:pr-0 border-r border-gray-100 last:border-r-0 mr-8 last:mr-0 flex flex-col gap-4">
                              {col.sections.length > 0 && (
                                <div className="flex flex-col gap-4">
                                  {col.sections.map((section, si) => (
                                    <div key={si}>
                                      {section.title && (
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                          {section.title}
                                        </p>
                                      )}
                                      <ul className="space-y-1">
                                        {section.links.map((link, li) => (
                                          <li key={li}>
                                            <Link
                                              to={itemHref(link)}
                                              className="text-sm text-gray-700 hover:text-primary transition-colors block py-0.5"
                                              onClick={() => setDesktopOpen(null)}
                                            >
                                              {link.label}
                                            </Link>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {col.promoAssetPreview && (
                                <Link
                                  to={col.promoUrl ?? "#"}
                                  className="block group rounded-lg overflow-hidden border border-gray-100 hover:border-primary transition-colors mt-auto"
                                  onClick={() => setDesktopOpen(null)}
                                >
                                  <img
                                    src={col.promoAssetPreview}
                                    alt={col.promoLabel ?? "Promotion"}
                                    className="w-full h-[120px] object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  {col.promoLabel && (
                                    <p className="text-xs font-medium text-center py-2 px-3 bg-gray-50 group-hover:text-primary transition-colors">
                                      {col.promoLabel}
                                    </p>
                                  )}
                                </Link>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-4 space-y-4">
            {sidebarItems.map((item, index) => (
              <div key={index}>
                <Link
                  to={itemHref(item)}
                  className="font-semibold block mb-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
                {item.columns.length > 0 && (
                  <ul className="pl-3 border-l border-gray-200 space-y-1">
                    {item.columns
                      .sort((a, b) => a.position - b.position)
                      .flatMap((col) => col.sections.flatMap((sec) => sec.links))
                      .map((link, li) => (
                        <li key={li}>
                          <Link
                            to={itemHref(link)}
                            className="text-sm text-gray-600 hover:text-primary block py-0.5"
                            onClick={() => setMobileOpen(false)}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
