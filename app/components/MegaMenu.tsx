import { Link } from "react-router";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { MegaMenuData, MegaMenuItem } from "../graphql/megamenu";
import { ChevronDown, Search, X } from "lucide-react";

function itemHref(item: Pick<MegaMenuItem, "url" | "collectionSlug">): string {
	if (item.collectionSlug) return `/c/${item.collectionSlug}`;
	return item.url ?? "#";
}

const ALL_BRANDS = [
	{ name: "Allmax", slug: "allmax" },
	{ name: "AS-IT-IS Nutrition", slug: "as-it-is-nutrition" },
	{ name: "Avvatar", slug: "avvatar" },
	{ name: "Beast Life", slug: "beast-life" },
	{ name: "BPI Sports", slug: "bpi-sports" },
	{ name: "BSN", slug: "bsn" },
	{ name: "Cellucor", slug: "cellucor" },
	{ name: "Dymatize", slug: "dymatize" },
	{ name: "GAT Sport", slug: "gat-sport" },
	{ name: "GNC", slug: "gnc" },
	{ name: "MuscleTech", slug: "muscletech" },
	{ name: "MusclePharm", slug: "musclepharm" },
	{ name: "MyProtein", slug: "myprotein" },
	{ name: "Optimum Nutrition", slug: "optimum-nutrition" },
	{ name: "Scitec Nutrition", slug: "scitec-nutrition" },
	{ name: "Universal Nutrition", slug: "universal-nutrition" },
];

const TOP_BRANDS = [
	{ name: "Optimum Nutrition", slug: "optimum-nutrition" },
	{ name: "MuscleTech", slug: "muscletech" },
	{ name: "BSN", slug: "bsn" },
	{ name: "MyProtein", slug: "myprotein" },
	{ name: "Dymatize", slug: "dymatize" },
	{ name: "GNC", slug: "gnc" },
];

// Styled to match the other top-nav items (same trigger button, same hover-dropdown positioning).
function BrandsDropdown() {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const ref = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	function cancelClose() {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}
	function openNow() {
		cancelClose();
		setOpen(true);
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

	const filtered = search.trim()
		? ALL_BRANDS.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
		: ALL_BRANDS;

	const grouped = filtered.reduce<Record<string, typeof ALL_BRANDS>>((acc, brand) => {
		const key = /^[0-9]/.test(brand.name) ? "#" : brand.name[0].toUpperCase();
		if (!acc[key]) acc[key] = [];
		acc[key].push(brand);
		return acc;
	}, {});

	const close = () => { setOpen(false); setSearch(""); };

	return (
		<div ref={ref} className="relative" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
			<button className="font-medium flex items-center gap-1 py-2 group" aria-expanded={open}>
				<span className="text-black text-sm transition-colors">Brands</span>
				<span className={`text-black transition-all duration-300 ${open ? "-rotate-180" : ""}`}>
					<ChevronDown size={18} strokeWidth={1.5} />
				</span>
			</button>

			{open && (
				<div
					onMouseEnter={cancelClose}
					onMouseLeave={scheduleClose}
					className="absolute left-0 top-full mt-[1px] bg-white border border-gray-200 shadow-xl z-50 flex w-[580px] overflow-hidden">
					{/* Left — searchable alphabetical list */}
					<div className="w-[240px] flex-shrink-0 border-r border-gray-100 flex flex-col">
						<div className="p-3 border-b border-gray-100">
							<div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 bg-white">
								<Search size={14} strokeWidth={1.5} className="text-gray-400 flex-shrink-0" />
								<input
									type="text"
									placeholder="Search for brands"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="text-sm flex-1 outline-none bg-transparent placeholder-gray-400"
									autoComplete="off"
								/>
							</div>
						</div>
						<div className="overflow-y-auto max-h-[340px]">
							{Object.keys(grouped).sort().map((letter) => (
								<div key={letter}>
									<div className="px-4 py-1 text-xs font-bold text-gray-400 bg-gray-50">{letter}</div>
									{grouped[letter].map((brand) => (
										<Link
											key={brand.slug}
											to={`/collections?brand=${brand.slug}`}
											className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:text-black hover:bg-stone-50 transition-colors"
											onClick={close}
										>
											{brand.name}
											<ChevronDown size={13} strokeWidth={1.5} className="-rotate-90 text-gray-300" />
										</Link>
									))}
								</div>
							))}
							{filtered.length === 0 && (
								<p className="px-4 py-6 text-sm text-gray-400 text-center">No brands found</p>
							)}
						</div>
					</div>

					{/* Right — top brands grid */}
					<div className="flex-1 p-4 bg-stone-100">
						<p className="text-sm font-bold text-gray-800 mb-3">Top Brands</p>
						<div className="grid grid-cols-3 gap-3">
							{TOP_BRANDS.map((brand) => (
								<Link
									key={brand.slug}
									to={`/collections?brand=${brand.slug}`}
									className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-lg border border-gray-100 hover:border-primary hover:shadow-sm transition-all group"
									onClick={close}
								>
									<div className="w-full h-14 rounded flex items-center justify-center bg-gray-50 text-xs font-bold text-gray-400 group-hover:text-black transition-colors text-center px-1">
										{brand.name}
									</div>
								</Link>
							))}
						</div>
					</div>
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
	const [mobileExpandedItem, setMobileExpandedItem] = useState<number | null>(null);
	const [mounted, setMounted] = useState(false);

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
		if (!mobileOpen) setMobileExpandedItem(null);
	}, [mobileOpen]);

	// Portal the mobile panel to <body> so it isn't affected by the header's
	// scroll-hide transform (a transform on an ancestor would otherwise hijack
	// the containing block for this panel's position:fixed).
	useEffect(() => {
		setMounted(true);
	}, []);

	const mobilePanel = (
		<div className="md:hidden">
				{/* Backdrop */}
				<div
					className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
					onClick={onMobileClose}
				/>
				{/* Panel */}
				<div className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl transition-transform duration-300 flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
					<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
						<span className="font-semibold text-base text-gray-900">Menu</span>
						<button onClick={onMobileClose} className="text-gray-500 hover:text-gray-700 transition-colors" aria-label="Close menu">
							<X size={20} strokeWidth={1.5} />
						</button>
					</div>
					<ul className="overflow-y-auto flex-1">
						{sidebarItems.map((item, index) => {
							const links = [...item.columns]
								.sort((a, b) => a.position - b.position)
								.flatMap((col) => col.sections.flatMap((sec) => sec.links));
							const hasLinks = links.length > 0;
							const isExpanded = mobileExpandedItem === index;
							return (
								<li key={index} className="border-b border-gray-100 last:border-b-0">
									<div className="flex items-center">
										<Link
											to={itemHref(item)}
											className="flex-1 px-4 py-3 text-sm font-medium text-gray-800 hover:text-black transition-colors"
											onClick={onMobileClose}
										>
											{item.label}
										</Link>
										{hasLinks && (
											<button
												className="px-4 py-3 text-gray-400 hover:text-gray-600 transition-colors"
												onClick={() => setMobileExpandedItem(isExpanded ? null : index)}
												aria-label={isExpanded ? "Collapse" : "Expand"}
											>
												<ChevronDown size={16} strokeWidth={1.5} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
											</button>
										)}
									</div>
									{hasLinks && isExpanded && (
										<ul className="bg-gray-50 border-t border-gray-100 px-4 py-1">
											{links.map((link, li) => (
												<li key={li} className="border-b border-gray-100 last:border-b-0">
													<Link
														to={itemHref(link)}
														className="block text-sm text-gray-600 hover:text-black transition-colors py-2"
														onClick={onMobileClose}
													>
														{link.label}
													</Link>
												</li>
											))}
										</ul>
									)}
								</li>
							);
						})}
					</ul>
				</div>
			</div>
	);

	return (
		<>
			{mounted && createPortal(mobilePanel, document.body)}

			{/* ── Desktop nav row — inline, sits next to the logo in the header ──── */}
			<div className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center" ref={menuRef}>
				<BrandsDropdown />

				{navItems.map((item, index) => {
					const hasDropdown = item.columns.length > 0;
					return (
						<div key={index} onMouseEnter={() => hasDropdown && openDesktop(index)} onMouseLeave={scheduleCloseDesktop}>
							<button className="font-medium flex items-center gap-1 py-2 group" aria-expanded={desktopOpen === index} aria-haspopup={hasDropdown ? "true" : undefined}>
								<Link to={itemHref(item)} className="text-black text-sm transition-colors">
									{item.label}
								</Link>
								{hasDropdown && (
									<span className={`text-black transition-all duration-300 ${desktopOpen === index ? "-rotate-180" : ""}`}>
										<ChevronDown size={18} strokeWidth={1.5} />
									</span>
								)}
							</button>

							{hasDropdown && (
								<div
									onMouseEnter={cancelCloseDesktop}
									onMouseLeave={scheduleCloseDesktop}
									className={`absolute left-0 top-full bg-white border border-gray-200 shadow-xl transition-all duration-300 z-50 w-full ${desktopOpen === index ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
									<div className="grid grid-cols-5 gap-6 p-6 divide-x divide-gray-100">
										{[...item.columns]
											.sort((a, b) => a.position - b.position)
											.map((col, ci) => (
												<div key={ci} className="flex flex-col gap-4 pl-8 first:pl-0">
													{col.sections.length > 0 && (
														<div className="flex flex-col gap-4">
															{col.sections.map((section, si) => (
																<div key={si}>
																	{section.title && <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{section.title}</p>}
																	<ul className="space-y-1">
																		{section.links.map((link, li) => (
																			<li key={li}>
																				<Link to={itemHref(link)} className="text-sm text-gray-700 hover:text-black transition-colors block py-0.5" onClick={() => setDesktopOpen(null)}>
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
														<Link to={col.promoUrl ?? "#"} className="block group rounded overflow-hidden border border-gray-100 hover:border-primary transition-colors mt-auto" onClick={() => setDesktopOpen(null)}>
															<img src={col.promoAssetPreview} alt={col.promoLabel ?? "Promotion"} className="w-full h-[120px] object-cover group-hover:scale-105 transition-transform duration-300" />
															{col.promoLabel && <p className="text-xs font-medium text-center py-2 px-3 bg-gray-50 group-hover:text-black transition-colors">{col.promoLabel}</p>}
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
		</>
	);
}
