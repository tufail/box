import { Link } from "react-router";
import { useState, useRef, useEffect } from "react";
import type { MegaMenuData, MegaMenuItem } from "../graphql/megamenu";
import { ChevronDown, Menu, X } from "lucide-react";

function itemHref(item: Pick<MegaMenuItem, "url" | "collectionSlug">): string {
	if (item.collectionSlug) return `/collections/${item.collectionSlug}`;
	return item.url ?? "#";
}

interface MegaMenuProps {
	megaMenu: MegaMenuData["getMegaMenu"];
	mobileOpen?: boolean;
	onMobileClose?: () => void;
}

export default function MegaMenu({ megaMenu, mobileOpen = false, onMobileClose }: MegaMenuProps) {
	const [desktopOpen, setDesktopOpen] = useState<number | null>(null);
	const [shopByOpen, setShopByOpen] = useState(false);
	const [shopByActiveTab, setShopByActiveTab] = useState(0);
	const [mobileExpandedItem, setMobileExpandedItem] = useState<number | null>(null);

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

	// Reset accordion when panel closes
	useEffect(() => {
		if (!mobileOpen) setMobileExpandedItem(null);
	}, [mobileOpen]);

	const activeItem = sidebarItems[shopByActiveTab] ?? null;

	return (
		<>
			{/* ── Mobile slide-in panel ─────────────────────────────────────────── */}
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
							<X size={20} />
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
											className="flex-1 px-4 py-3 text-sm font-medium text-gray-800 hover:text-primary transition-colors"
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
												<ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
											</button>
										)}
									</div>
									{hasLinks && isExpanded && (
										<ul className="bg-gray-50 border-t border-gray-100 px-4 py-1">
											{links.map((link, li) => (
												<li key={li} className="border-b border-gray-100 last:border-b-0">
													<Link
														to={itemHref(link)}
														className="block text-sm text-gray-600 hover:text-primary transition-colors py-2"
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

			{/* ── Desktop nav bar ───────────────────────────────────────────────── */}
			<nav className="hidden md:block bg-white border-t border-b border-gray-200 z-50">
				<div className="container mx-auto px-4 relative">
					<div className="flex items-center h-12" ref={menuRef}>
						{/* Shop By button — desktop (hover) */}
						<div ref={shopByRef} onMouseEnter={() => setShopByOpen(true)} onMouseLeave={() => setShopByOpen(false)}>
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
								<div className="absolute left-0 top-full mt-[1px] bg-white border border-gray-200 shadow-xl z-50 flex w-full">
									{/* Left tab list */}
									<ul className="w-[180px] flex-shrink-0 border-r border-gray-100 py-2">
										{sidebarItems.map((item, index) => (
											<li key={index}>
												<button
													className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${shopByActiveTab === index ? "bg-gray-50 text-primary font-medium border-l-2 border-primary" : "hover:bg-gray-50 hover:text-primary border-l-2 border-transparent"}`}
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
										<div className="flex-1 p-5 grid grid-cols-5 gap-6">
											{[...activeItem.columns]
												.sort((a, b) => a.position - b.position)
												.map((col, ci) => (
													<div key={ci} className="flex flex-col gap-4">
														{col.sections.length > 0 && (
															<div className="flex flex-col gap-4">
																{col.sections.map((section, si) => (
																	<div key={si}>
																		{section.title && <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{section.title}</p>}
																		<ul className="space-y-1">
																			{section.links.map((link, li) => (
																				<li key={li}>
																					<Link to={itemHref(link)} className="text-sm text-gray-700 hover:text-primary transition-colors block py-0.5" onClick={() => setShopByOpen(false)}>
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
															<Link to={col.promoUrl ?? "#"} className="block group rounded-lg overflow-hidden border border-gray-100 hover:border-primary transition-colors mt-auto" onClick={() => setShopByOpen(false)}>
																<img src={col.promoAssetPreview} alt={col.promoLabel ?? "Promotion"} className="w-full h-[100px] object-cover group-hover:scale-105 transition-transform duration-300" />
																{col.promoLabel && <p className="text-xs font-medium text-center py-2 px-3 bg-gray-50 group-hover:text-primary transition-colors">{col.promoLabel}</p>}
															</Link>
														)}
													</div>
												))}
											{activeItem.columns.length === 0 && (
												<Link to={itemHref(activeItem)} className="text-sm text-primary hover:underline self-start" onClick={() => setShopByOpen(false)}>
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
								<div key={index} onMouseEnter={() => hasDropdown && setDesktopOpen(index)} onMouseLeave={() => setDesktopOpen(null)}>
									<button className="font-medium flex items-center gap-1 py-2 group ml-8" aria-expanded={desktopOpen === index} aria-haspopup={hasDropdown ? "true" : undefined}>
										<Link to={itemHref(item)} className="text-black text-sm group-hover:text-primary transition-colors">
											{item.label}
										</Link>
										{hasDropdown && (
											<span className={`group-hover:text-primary transition-all duration-300 ${desktopOpen === index ? "-rotate-180" : ""}`}>
												<ChevronDown size={18} />
											</span>
										)}
									</button>

									{hasDropdown && (
										<div className={`absolute left-0 top-full bg-white border border-gray-200 shadow-xl transition-all duration-300 z-50 w-full ${desktopOpen === index ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
											<div className="grid grid-cols-5 gap-6 p-6 divide-x divide-gray-100">
												{[...item.columns]
													.sort((a, b) => a.position - b.position)
													.map((col, ci) => (
														<div key={ci} className="flex flex-col gap-4 pl-8 first:pl-0">
															{col.sections.length > 0 && (
																<div className="flex flex-col gap-4">
																	{col.sections.map((section, si) => (
																		<div key={si}>
																			{section.title && <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{section.title}</p>}
																			<ul className="space-y-1">
																				{section.links.map((link, li) => (
																					<li key={li}>
																						<Link to={itemHref(link)} className="text-sm text-gray-700 hover:text-primary transition-colors block py-0.5" onClick={() => setDesktopOpen(null)}>
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
																<Link to={col.promoUrl ?? "#"} className="block group rounded-lg overflow-hidden border border-gray-100 hover:border-primary transition-colors mt-auto" onClick={() => setDesktopOpen(null)}>
																	<img src={col.promoAssetPreview} alt={col.promoLabel ?? "Promotion"} className="w-full h-[120px] object-cover group-hover:scale-105 transition-transform duration-300" />
																	{col.promoLabel && <p className="text-xs font-medium text-center py-2 px-3 bg-gray-50 group-hover:text-primary transition-colors">{col.promoLabel}</p>}
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
			</nav>
		</>
	);
}
