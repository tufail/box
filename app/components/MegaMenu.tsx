import { useFetcher, useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import { Fragment, useState, useRef, useEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import type { MegaMenuData, MegaMenuItem, MegaMenuLink, MegaMenuSection } from "../graphql/megamenu";
import type { BrandValue } from "../graphql/brand";
import { ArrowRight, Bone, Brain, ChevronDown, ChevronRight, Droplets, Dumbbell, Heart, HeartPulse, Moon, Search, ShieldCheck, Smile, X, Zap } from "lucide-react";
import { getLocaleFromPathname, localizePath } from "~/lib/i18n";
import { TOP_BRANDS } from "~/lib/brands";
import BrandLogo from "~/components/BrandLogo";

function itemHref(item: Pick<MegaMenuItem, "url">): string {
	return item.url ?? "#";
}

function linkHref(link: Pick<MegaMenuLink, "url">): string {
	return link.url ?? "#";
}

// "All ..." / "Shop All ..." links (e.g. "Shop All Protein") at the start or end of a list get a highlight.
function isAllLink(label: string, index: number, total: number): boolean {
	return /^(shop\s+)?all(\s|$)/i.test(label.trim()) && (index === 0 || index === total - 1);
}

function sectionHref(section: Pick<MegaMenuSection, "url">): string | null {
	return section.url || null;
}

// Styled to match the other top-nav items (same trigger button, same hover-dropdown positioning).
function BrandsDropdown() {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const ref = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const fetcher = useFetcher<{ brands: BrandValue[] }>();
	const locale = getLocaleFromPathname(useLocation().pathname);

	function cancelClose() {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}
	function openNow() {
		cancelClose();
		setOpen(true);
		// Client-side only — the full brand list isn't part of the page's SSR payload,
		// it's fetched lazily the first time this dropdown is actually opened. Loads
		// the locale-matching /brands route so its own loader resolves the right language.
		if (fetcher.state === "idle" && !fetcher.data) fetcher.load(localizePath("/brands", locale));
	}
	function scheduleClose() {
		cancelClose();
		closeTimer.current = setTimeout(() => {
			setOpen(false);
			setSearch("");
		}, 150);
	}

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
				setSearch("");
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	useEffect(() => () => cancelClose(), []);

	const allBrands = fetcher.data?.brands ?? [];
	const loading = fetcher.state !== "idle" && !fetcher.data;

	const filtered = search.trim() ? allBrands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase())) : allBrands;

	const grouped = filtered.reduce<Record<string, BrandValue[]>>((acc, brand) => {
		const key = /^[0-9]/.test(brand.name) ? "#" : brand.name[0].toUpperCase();
		if (!acc[key]) acc[key] = [];
		acc[key].push(brand);
		return acc;
	}, {});

	const close = () => {
		setOpen(false);
		setSearch("");
	};

	return (
		<div
			ref={ref}
			className="relative"
			onMouseEnter={openNow}
			onMouseLeave={scheduleClose}
			onFocus={openNow}
			onBlur={(e) => {
				if (!ref.current?.contains(e.relatedTarget as Node)) scheduleClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape" && open) {
					close();
					ref.current?.querySelector("button")?.focus();
				}
			}}
		>
			<button type="button" className="font-medium flex items-center gap-1 py-2 group" aria-haspopup="true" aria-expanded={open}>
				<span className="text-black text-sm transition-colors">{locale === "ar" ? "العلامات التجارية" : "Brands"}</span>
				<span className={`text-black transition-all duration-300 ${open ? "-rotate-180" : ""}`}>
					<ChevronDown size={18} strokeWidth={1.5} />
				</span>
			</button>

			{open && (
				<div onMouseEnter={cancelClose} onMouseLeave={scheduleClose} className="absolute start-0 top-full mt-[1px] bg-white border border-gray-200 shadow-xl z-50 flex w-[580px] overflow-hidden">
					{/* Left — searchable alphabetical list */}
					<div className="w-[240px] flex-shrink-0 border-e border-gray-100 flex flex-col">
						<div className="p-3 border-b border-gray-100">
							<div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 bg-white">
								<Search size={14} strokeWidth={1.5} className="text-gray-400 flex-shrink-0" />
								<input type="text" placeholder={locale === "ar" ? "ابحث عن العلامات التجارية" : "Search for brands"} value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm flex-1 outline-none bg-transparent placeholder-gray-400" autoComplete="off" />
							</div>
						</div>
						<div className="overflow-y-auto max-h-[340px]">
							{loading && <p className="px-4 py-6 text-sm text-gray-400 text-center">{locale === "ar" ? "جارٍ تحميل العلامات التجارية…" : "Loading brands…"}</p>}
							{!loading &&
								Object.keys(grouped)
									.sort()
									.map((letter) => (
										<div key={letter}>
											<div className="px-4 py-1 text-xs font-bold text-gray-400 bg-gray-50">{letter}</div>
											{grouped[letter].map((brand) => (
												<Link key={brand.code} to={`/brands/${brand.code}`} className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:text-black hover:bg-stone-50 transition-colors" onClick={close}>
													{brand.name}
													<ChevronDown size={13} strokeWidth={1.5} className="-rotate-90 rtl:rotate-90 text-gray-300" />
												</Link>
											))}
										</div>
									))}
							{!loading && filtered.length === 0 && <p className="px-4 py-6 text-sm text-gray-400 text-center">{locale === "ar" ? "لم يتم العثور على علامات تجارية" : "No brands found"}</p>}
						</div>
					</div>

					{/* Right — top brands grid */}
					<div className="flex-1 p-4 bg-stone-100">
						<div className="flex items-center justify-between mb-3">
							<p className="text-sm font-bold text-gray-800">{locale === "ar" ? "أشهر العلامات التجارية" : "Top Brands"}</p>
							<Link to="/brands" onClick={close} className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
								{locale === "ar" ? "جميع العلامات التجارية" : "All Brands"}
								<ChevronRight size={12} strokeWidth={2} className="rtl:rotate-180" />
							</Link>
						</div>
						<div className="grid grid-cols-3 gap-3">
							{TOP_BRANDS.map((brand) => (
								<Link key={brand.code} to={`/brands/${brand.code}`} className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-lg border border-gray-100 hover:border-primary hover:shadow-sm transition-all group" onClick={close}>
									<BrandLogo code={brand.code} name={brand.name} className="w-full h-14" />
								</Link>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

type SectionIconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;

// Brand artwork (public/images/icons) for sections Lucide has no good icon for.
const imageIcon = (src: string): SectionIconComponent => ({ size = 24 }) => <img src={src} alt="" width={size} height={size} className="object-contain" />;
const Stomach = imageIcon("/images/icons/stomach.png");
const Lotus = imageIcon("/images/icons/lotus.png");

// Protein bottle (cap + neck + labelled body); Lucide has no supplement-bottle icon.
const ProteinBottle: SectionIconComponent = ({ size = 24, strokeWidth = 1.5 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
		<rect x="9" y="2.5" width="6" height="2.5" rx="0.8" />
		<path d="M10 5v1.5C8 7.2 7 8.3 7 10v8.5a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V10c0-1.7-1-2.8-3-3.5V5" />
		<rect x="9" y="11.5" width="6" height="5" rx="1" />
	</svg>
);
// Fallback icon for the circular header badge when the CMS section has no icon uploaded,
// picked from the section title so it at least matches what the section is about.
const SECTION_ICON_RULES: [RegExp, SectionIconComponent][] = [
	[/brain|cognitive|mind|memory|focus/i, Brain],
	[/emotion|mood|stress|well-?being/i, Smile],
	[/sleep|relax/i, Moon],
	[/gut|digest|probiotic|bloat/i, Stomach],
	[/immun/i, ShieldCheck],
	[/bone|joint|cartilage/i, Bone],
	[/hair|skin|nail|beauty|collagen/i, Lotus],
	[/heart|cardio/i, HeartPulse],
	[/energy|endurance|stamina/i, Zap],
	[/hydrat|electrolyte/i, Droplets],
	[/protein/i, ProteinBottle],
	[/creatine|strength|muscle|performance|gainer/i, Dumbbell],
];

function sectionIcon(title: string | null): SectionIconComponent {
	return SECTION_ICON_RULES.find(([re]) => re.test(title ?? ""))?.[1] ?? Heart;
}

// Desktop dropdown panel: link columns (icon badge + title + links), with the first
// column that carries a promo image rendered as the featured card on the end side.
function DesktopPanel({ item, locale, onNavigate }: { item: MegaMenuItem; locale: string; onNavigate: () => void }) {
	const columns = [...item.columns].sort((a, b) => a.position - b.position);
	const promo = columns.find((c) => c.promoAssetPreview);
	const linkColumns = columns.filter((c) => c.sections.length > 0).slice(0, 5);
	const viewAll = locale === "ar" ? `عرض كل ${item.label}` : `Shop all ${item.label}`;

	return (
		<div className="bg-white border border-stone-200 shadow-xl rounded-b-xl overflow-hidden flex">
			<div className="flex-1 min-w-0 grid divide-x divide-stone-100 rtl:divide-x-reverse" style={{ gridTemplateColumns: `repeat(${Math.max(linkColumns.length, 1)}, minmax(0, 1fr))` }}>
				{linkColumns.map((col, ci) => (
					<div key={ci} className="flex flex-col gap-5 px-5 py-6">
						{col.sections.map((section, si) => {
							const headerHref = sectionHref(section);
							const Icon = sectionIcon(section.title);
							const header = (
								<span className="flex items-center gap-2">
									<span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
										{section.iconAssetPreview ? <img src={section.iconAssetPreview} alt="" className="h-5 w-5 object-contain" /> : <Icon size={18} strokeWidth={1.5} />}
									</span>
									<span className="flex flex-col min-w-0">
										{section.title && <span className="text-sm font-extrabold uppercase tracking-wide text-primary leading-tight">{section.title}</span>}
										{section.subtitle && <span className="mt-0.5 text-xs text-gray-500 leading-snug">{section.subtitle}</span>}
									</span>
								</span>
							);
							return (
								<div key={si} className="flex flex-col gap-2">
									{headerHref ? (
										<Link to={headerHref} onClick={onNavigate} className="block hover:opacity-80 transition-opacity">
											{header}
										</Link>
									) : (
										header
									)}
									<ul>
										{section.links.map((link, li) => {
											// "All ..." / "Shop All ..." links (e.g. "Shop All Protein") at the start or end of a list get a highlight.
											const isAll = isAllLink(link.label, li, section.links.length);
											return (
											<li key={li}>
												<Link to={linkHref(link)} onClick={onNavigate} className={`group flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors ${isAll ? "bg-primary/5 text-primary hover:bg-primary/10" : "text-gray-800 hover:bg-stone-50 hover:text-primary"}`}>
													<span>{link.label}</span>
													<ChevronRight size={14} strokeWidth={1.5} className="flex-shrink-0 text-gray-400 group-hover:text-primary rtl:rotate-180" />
												</Link>
											</li>
											);
										})}
									</ul>
								</div>
							);
						})}
					</div>
				))}
			</div>

			{promo && (
				<div className="w-[300px] xl:w-[340px] flex-shrink-0 p-3 flex flex-col gap-2 bg-rose-50/60">
					<Link to={promo.promoUrl ?? itemHref(item)} onClick={onNavigate} className="group relative block h-[240px] overflow-hidden rounded-xl bg-rose-100">
						<img src={promo.promoAssetPreview ?? ""} alt={promo.promoLabel ?? (locale === "ar" ? "عرض ترويجي" : "Promotion")} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
						{promo.promoLabel && <span className="absolute inset-x-0 top-0 p-4 text-2xl font-extrabold leading-tight text-primary">{promo.promoLabel}</span>}
					</Link>
					<Link to={itemHref(item)} onClick={onNavigate} className="inline-flex items-center gap-1 px-1 text-sm font-semibold text-primary hover:underline">
						{viewAll}
						<ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
					</Link>
				</div>
			)}
		</div>
	);
}

interface MegaMenuProps {
	megaMenu: MegaMenuData["getMegaMenu"];
	mobileOpen?: boolean;
	onMobileClose?: () => void;
}

export default function MegaMenu({ megaMenu, mobileOpen = false, onMobileClose }: MegaMenuProps) {
	const [desktopOpen, setDesktopOpen] = useState<number | null>(null);
	// "brands" is a sentinel alongside the category-item indices — the mobile
	// "Shop by Brands" row is one more accordion entry in the same single-open
	// list, not a separate toggle state.
	const [mobileExpandedItem, setMobileExpandedItem] = useState<number | "brands" | null>(null);
	const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);
	const [mounted, setMounted] = useState(false);
	const locale = getLocaleFromPathname(useLocation().pathname);

	const menuRef = useRef<HTMLDivElement>(null);
	const desktopCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	function cancelCloseDesktop() {
		if (desktopCloseTimer.current) {
			clearTimeout(desktopCloseTimer.current);
			desktopCloseTimer.current = null;
		}
	}
	function openDesktop(index: number) {
		cancelCloseDesktop();
		setDesktopOpen(index);
	}
	function scheduleCloseDesktop() {
		cancelCloseDesktop();
		desktopCloseTimer.current = setTimeout(() => setDesktopOpen(null), 150);
	}

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

	useEffect(() => () => cancelCloseDesktop(), []);

	// Reset accordion when panel closes
	useEffect(() => {
		if (!mobileOpen) {
			setMobileExpandedItem(null);
			setMobileExpandedSection(null);
		}
	}, [mobileOpen]);

	function toggleMobileBrands() {
		setMobileExpandedItem(mobileExpandedItem === "brands" ? null : "brands");
	}

	// Portal the mobile panel to <body> so it isn't affected by the header's
	// scroll-hide transform (a transform on an ancestor would otherwise hijack
	// the containing block for this panel's position:fixed).
	useEffect(() => {
		setMounted(true);
	}, []);

	const mobilePanel = (
		<div className="md:hidden">
			{/* Backdrop */}
			<div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={onMobileClose} />
			{/* Panel */}
			<div className={`fixed top-0 start-0 h-full w-72 bg-white z-50 shadow-xl transition-transform duration-300 flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"}`}>
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
					<span className="font-semibold text-base text-gray-900">{locale === "ar" ? "القائمة" : "Menu"}</span>
					<button onClick={onMobileClose} className="text-gray-500 hover:text-gray-700 transition-colors" aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"}>
						<X size={20} strokeWidth={1.5} />
					</button>
				</div>
				<ul className="overflow-y-auto flex-1">
					{sidebarItems.map((item, index) => {
						// Mirrors the desktop dropdown: item -> sections (parent) -> links (child), each
						// level collapsible. A section's own title+url is its category link; section.links
						// is the optional second level. Untitled sections just list their links directly.
						const sections = [...item.columns].sort((a, b) => a.position - b.position).flatMap((col) => col.sections.filter((sec) => sec.title || sec.links.length > 0));
						const hasSections = sections.length > 0;
						const isExpanded = mobileExpandedItem === index;
						const renderLinks = (links: MegaMenuLink[]) =>
							links.map((link, li) => (
								<li key={li}>
									<Link to={linkHref(link)} className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${isAllLink(link.label, li, links.length) ? "bg-primary/5 text-primary" : "text-gray-600 hover:text-black"}`} onClick={onMobileClose}>
										{link.label}
									</Link>
								</li>
							));
						return (
							<li key={index} className="border-b border-gray-100 last:border-b-0">
								<div className="flex items-center">
									<Link to={itemHref(item)} className="flex-1 px-4 py-3 text-sm font-medium text-gray-800 hover:text-black transition-colors" onClick={onMobileClose}>
										{item.label}
									</Link>
									{hasSections && (
										<button className="px-4 py-3 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setMobileExpandedItem(isExpanded ? null : index)} aria-expanded={isExpanded} aria-label={isExpanded ? (locale === "ar" ? "طي" : "Collapse") : locale === "ar" ? "توسيع" : "Expand"}>
											<ChevronDown size={16} strokeWidth={1.5} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
										</button>
									)}
								</div>
								{hasSections && isExpanded && (
									<ul className="bg-gray-50 border-t border-gray-100 px-4 py-1">
										{sections.map((section, si) => {
											const key = `${index}-${si}`;
											const sectionOpen = mobileExpandedSection === key;
											if (!section.title) return <Fragment key={key}>{renderLinks(section.links)}</Fragment>;
											const hasChildren = section.links.length > 0;
											const headerHref = sectionHref(section);
											return (
												<li key={key} className="border-b border-gray-100 last:border-b-0">
													<div className="flex items-center">
														<Link to={headerHref ?? "#"} className="flex-1 min-w-0 py-2.5 text-sm font-semibold text-primary" onClick={onMobileClose}>
															{section.title}
															{section.subtitle && <span className="block text-xs font-normal text-gray-500">{section.subtitle}</span>}
														</Link>
														{hasChildren && (
															<button className="ps-4 py-2.5 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setMobileExpandedSection(sectionOpen ? null : key)} aria-expanded={sectionOpen} aria-label={sectionOpen ? (locale === "ar" ? "طي" : "Collapse") : locale === "ar" ? "توسيع" : "Expand"}>
																<ChevronDown size={15} strokeWidth={1.5} className={`transition-transform duration-200 ${sectionOpen ? "rotate-180" : ""}`} />
															</button>
														)}
													</div>
													{hasChildren && sectionOpen && <ul className="mb-2 ms-1 border-s border-gray-200 ps-3">{renderLinks(section.links)}</ul>}
												</li>
											);
										})}
									</ul>
								)}
							</li>
						);
					})}

					{/* Shop by Brands — mobile only had the mega-menu's own category
					    items; there was no way to reach brands from here at all short
					    of the desktop-only header dropdown. Same accordion pattern as
					    the category rows above (collapsed until tapped). Shows the
					    same curated TOP_BRANDS set as the desktop dropdown and the
					    /brands page's Trending row, not the full catalogue — "Show
					    All" is what links to the full /brands page. */}
					<li className="border-b border-gray-100">
						<div className="flex items-center">
							<button className="flex-1 flex items-center justify-between px-4 py-3 text-start" onClick={toggleMobileBrands} aria-expanded={mobileExpandedItem === "brands"}>
								<span className="text-sm font-medium text-gray-800">{locale === "ar" ? "تسوق حسب الماركات" : "Shop by Brands"}</span>
								<ChevronDown size={16} strokeWidth={1.5} className={`text-gray-400 transition-transform duration-200 ${mobileExpandedItem === "brands" ? "rotate-180" : ""}`} />
							</button>
						</div>
						{mobileExpandedItem === "brands" && (
							<div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
								<Link to="/brands" onClick={onMobileClose} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline mb-3">
									{locale === "ar" ? "عرض الكل" : "Show All"}
									<ArrowRight size={13} strokeWidth={2} className="rtl:rotate-180" />
								</Link>
								<div className="grid grid-cols-3 gap-2">
									{TOP_BRANDS.map((brand) => (
										<Link
											key={brand.code}
											to={`/brands/${brand.code}`}
											onClick={onMobileClose}
											className="flex flex-col items-center rounded-lg border border-gray-200 bg-white hover:border-primary transition-colors overflow-hidden"
										>
											<BrandLogo code={brand.code} name={brand.name} className="w-full h-10" rounded="rounded-none" padding="p-0" />
											<span className="text-[11px] font-medium text-gray-700 text-center truncate w-full px-1 py-1">{brand.name}</span>
										</Link>
									))}
								</div>
							</div>
						)}
					</li>
				</ul>
			</div>
		</div>
	);

	return (
		<>
			{mounted && createPortal(mobilePanel, document.body)}

			{/* ── Desktop nav row — inline, sits next to the logo in the header ──── */}
			<div className="hidden md:flex items-center gap-6 lg:gap-8" ref={menuRef}>
				<BrandsDropdown />

				{navItems.map((item, index) => {
					const hasDropdown = item.columns.length > 0;
					return (
						<div
							key={index}
							onMouseEnter={() => hasDropdown && openDesktop(index)}
							onMouseLeave={scheduleCloseDesktop}
							onFocus={() => hasDropdown && openDesktop(index)}
							onBlur={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleCloseDesktop();
							}}
							onKeyDown={(e) => {
								if (e.key === "Escape" && desktopOpen === index) {
									setDesktopOpen(null);
									(e.currentTarget.querySelector("a") as HTMLElement | null)?.focus();
								}
							}}
						>
							<div className="font-medium flex items-center gap-1 py-2 group">
								<Link to={itemHref(item)} className="text-black text-sm transition-colors" aria-expanded={hasDropdown ? desktopOpen === index : undefined} aria-haspopup={hasDropdown ? "true" : undefined}>
									{item.label}
								</Link>
								{hasDropdown && (
									<span className={`text-black transition-all duration-300 ${desktopOpen === index ? "-rotate-180" : ""}`}>
										<ChevronDown size={18} strokeWidth={1.5} />
									</span>
								)}
							</div>

							{hasDropdown && (
								<div onMouseEnter={cancelCloseDesktop} onMouseLeave={scheduleCloseDesktop} className={`absolute start-0 top-full w-full transition-all duration-300 z-50 ${desktopOpen === index ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
									<DesktopPanel item={item} locale={locale} onNavigate={() => setDesktopOpen(null)} />
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
}
