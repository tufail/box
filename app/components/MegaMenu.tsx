import { Link } from "react-router";
import { useState, useRef, useEffect } from "react";

export default function MegaMenu() {
	const [desktopOpen, setDesktopOpen] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setDesktopOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const categories = [
		{
			title: "Electronics",
			items: [
				{ name: "Phones", slug: "phones" },
				{ name: "Laptops", slug: "laptops" },
				{ name: "Tablets", slug: "tablets" },
			],
		},
		{
			title: "Fashion",
			items: [
				{ name: "Men", slug: "men" },
				{ name: "Women", slug: "women" },
				{ name: "Kids", slug: "kids" },
			],
		},
		{
			title: "Home",
			items: [
				{ name: "Furniture", slug: "furniture" },
				{ name: "Decor", slug: "decor" },
				{ name: "Kitchen", slug: "kitchen" },
			],
		},
	];

	return (
		<nav className="bg-white shadow-md relative z-50">
			<div className="container mx-auto px-4">
				<div className="flex relative items-center h-16">
					{/* Logo */}
					<Link to="/" className="text-xl font-bold">
						MyStore
					</Link>

					{/* Desktop Menu */}
					<div className="hidden md:flex gap-8" ref={menuRef}>
						<div onMouseEnter={() => setDesktopOpen(true)} onMouseLeave={() => setDesktopOpen(false)}>
							<button className="font-medium flex items-center gap-1" aria-expanded={desktopOpen} aria-haspopup="true">
								Products
								<span className="text-xs">▼</span>
							</button>

							{/* Mega Panel */}
							<div className={`absolute left-0 top-full w-screen max-w-full bg-white shadow-xl mt-0 transition-all duration-300 ${desktopOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}>
								<div className="grid grid-cols-4 gap-8 p-8">
									{categories.map((cat) => (
										<div key={cat.title}>
											<h3 className="font-semibold mb-4">{cat.title}</h3>
											<ul className="space-y-2">
												{cat.items.map((item) => (
													<li key={item.slug}>
														<Link to={`/category/${item.slug}`} className="hover:text-blue-600 transition-colors">
															{item.name}
														</Link>
													</li>
												))}
											</ul>
										</div>
									))}

									{/* Promo Column */}
									<div className="bg-gray-100 p-6 rounded-xl">
										<h3 className="font-semibold mb-2">Special Offer</h3>
										<p className="text-sm mb-4">Get 30% off selected items.</p>
										<Link to="/offers" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
											Shop Now
										</Link>
									</div>
								</div>
							</div>
						</div>

						<Link to="/about" className="font-medium">
							About
						</Link>
					</div>

					{/* Mobile Button */}
					<button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen}>
						☰
					</button>
				</div>
			</div>

			{/* Mobile Menu */}
			{mobileOpen && (
				<div className="md:hidden bg-white border-t">
					<div className="px-4 py-4 space-y-6">
						{categories.map((cat) => (
							<div key={cat.title}>
								<h3 className="font-semibold mb-2">{cat.title}</h3>
								<ul className="space-y-2">
									{cat.items.map((item) => (
										<li key={item.slug}>
											<Link to={`/category/${item.slug}`} className="block text-gray-700" onClick={() => setMobileOpen(false)}>
												{item.name}
											</Link>
										</li>
									))}
								</ul>
							</div>
						))}

						<Link to="/about" className="block font-medium" onClick={() => setMobileOpen(false)}>
							About
						</Link>
					</div>
				</div>
			)}
		</nav>
	);
}
