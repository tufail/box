import { useRef, useState, useEffect } from "react";
import type { MegaMenuData } from "~/graphql/megamenu";
import type { ActiveCustomer } from "~/graphql/checkout";
import MegaMenu from "../components/MegaMenu";
import SearchBox from "../components/SearchBox";
import CartSidePanel from "../components/CartSidePanel";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { Link, useFetcher } from "react-router";
import { CircleUser, Globe, Menu, ShoppingCart, X, Check, Truck, ShieldCheck } from "lucide-react";

interface MainLayoutProps {
	children: React.ReactNode;
	megaMenu: MegaMenuData["getMegaMenu"];
	activeCustomer: ActiveCustomer | null;
}

// ── Auth Modal ────────────────────────────────────────────────────────────────

function AuthModal({ onClose }: { onClose: () => void }) {
	const [tab, setTab] = useState<"login" | "register">("login");
	const [error, setError] = useState<string | null>(null);
	const [registered, setRegistered] = useState(false);
	const fetcher = useFetcher<{ error?: string; registered?: boolean }>();
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		const d = fetcher.data;
		if (d.error) {
			setError(d.error);
			return;
		}
		if (d.registered) {
			setRegistered(true);
		}
	}, [fetcher.data, fetcher.state]);

	function submit(body: Record<string, string>) {
		setError(null);
		fetcher.submit(body, {
			method: "post",
			encType: "application/json",
			action: "/api/auth",
		});
	}

	function handleLogin(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		submit({
			_intent: "login",
			username: fd.get("email") as string,
			password: fd.get("password") as string,
		});
	}

	function handleRegister(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const body: Record<string, string> = {
			_intent: "register",
			firstName: fd.get("firstName") as string,
			lastName: fd.get("lastName") as string,
			emailAddress: fd.get("emailAddress") as string,
			password: fd.get("password") as string,
		};
		const phone = fd.get("phoneNumber") as string;
		if (phone) body.phoneNumber = phone;
		submit(body);
	}

	const inputCls = "w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
	const labelCls = "block text-sm font-medium text-gray-700 mb-1";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />

			{/* Card */}
			<div className="relative bg-white rounded shadow-xl w-full max-w-md p-6 z-10">
				<button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
					<X size={20} />
				</button>

				<h2 className="text-xl font-bold text-gray-900 mb-5">My Account</h2>

				{registered ? (
					<div className="text-center py-6">
						<div className="w-12 h-12 bg-green-100 rounded flex items-center justify-center mx-auto mb-3">
							<Check size={24} className="text-green-600" />
						</div>
						<p className="font-semibold text-gray-900 mb-1">Account created!</p>
						<p className="text-sm text-gray-500 mb-4">Please check your email to verify your account, then log in.</p>
						<button
							onClick={() => {
								setRegistered(false);
								setTab("login");
								setError(null);
							}}
							className="text-primary text-sm font-medium hover:underline"
						>
							Go to Login
						</button>
					</div>
				) : (
					<>
						{/* Tab bar */}
						<div className="flex gap-1 mb-5 bg-gray-100 rounded p-1">
							{(["login", "register"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => {
										setTab(t);
										setError(null);
									}}
									className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
								>
									{t === "login" ? "Login" : "Register"}
								</button>
							))}
						</div>

						{tab === "login" && (
							<form onSubmit={handleLogin} className="space-y-4">
								<div>
									<label className={labelCls}>
										Email Address <span className="text-red-500">*</span>
									</label>
									<input name="email" type="email" required className={inputCls} />
								</div>
								<div>
									<label className={labelCls}>
										Password <span className="text-red-500">*</span>
									</label>
									<input name="password" type="password" required className={inputCls} />
								</div>
								{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>}
								<button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-3 rounded hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
									{loading ? "Signing in…" : "Login"}
								</button>
							</form>
						)}

						{tab === "register" && (
							<form onSubmit={handleRegister} className="space-y-4">
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className={labelCls}>
											First Name <span className="text-red-500">*</span>
										</label>
										<input name="firstName" type="text" required className={inputCls} />
									</div>
									<div>
										<label className={labelCls}>
											Last Name <span className="text-red-500">*</span>
										</label>
										<input name="lastName" type="text" required className={inputCls} />
									</div>
								</div>
								<div>
									<label className={labelCls}>
										Email Address <span className="text-red-500">*</span>
									</label>
									<input name="emailAddress" type="email" required className={inputCls} />
								</div>
								<div>
									<label className={labelCls}>Phone Number</label>
									<input name="phoneNumber" type="tel" placeholder="+974 xxxx xxxx" className={inputCls} />
								</div>
								<div>
									<label className={labelCls}>
										Password <span className="text-red-500">*</span>
									</label>
									<input name="password" type="password" required placeholder="Minimum 8 characters" className={inputCls} />
								</div>
								{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>}
								<button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-3 rounded hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
									{loading ? "Creating account…" : "Create Account"}
								</button>
							</form>
						)}
					</>
				)}
			</div>
		</div>
	);
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function MainLayout({ children, megaMenu, activeCustomer }: MainLayoutProps) {
	const { isCartOpen, openCart, closeCart, cartCount } = useCart();
	const [accountOpen, setAccountOpen] = useState(false);
	const [authModalOpen, setAuthModalOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [currentLang, setCurrentLang] = useState<"en" | "ar">("en");
	const accountRef = useRef<HTMLDivElement>(null);
	const logoutFetcher = useFetcher();

	useEffect(() => {
		const match = document.cookie.match(/googtrans=\/en\/(ar|en)/);
		if (match?.[1] === "ar") setCurrentLang("ar");
	}, []);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
				setAccountOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function toggleLanguage() {
		const nextLang = currentLang === "en" ? "ar" : "en";
		const expiredDate = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
		const host = location.hostname;

		if (nextLang === "ar") {
			document.cookie = `googtrans=/en/ar; path=/`;
			document.cookie = `googtrans=/en/ar; path=/; domain=${host}`;
		} else {
			document.cookie = `googtrans=; ${expiredDate}; path=/`;
			document.cookie = `googtrans=; ${expiredDate}; path=/; domain=${host}`;
		}

		window.location.reload();
	}

	return (
		<div className="min-h-screen flex flex-col">
			<div className="bg-black py-1">
				<div className="container text-sm text-white mx-auto px-4 grid grid-cols-3 items-center">
					<div className="flex items-center gap-1.5">
						<ShieldCheck size={13} className="text-primary flex-shrink-0" />
						<span>100% Authentic Products</span>
					</div>
					<div className="flex items-center justify-center gap-1.5">
						<Truck size={13} className="text-primary flex-shrink-0" />
						<span>FREE Delivery Over QAR 99 in Doha</span>
					</div>
					<div className="flex justify-end">
						<button onClick={toggleLanguage} translate="no" className="flex items-center gap-1 text-white hover:text-primary transition-colors">
							<Globe size={14} />
							{currentLang === "en" ? (
								<span lang="ar" className="font-arabic">العربية</span>
							) : (
								<span>English</span>
							)}
						</button>
					</div>
				</div>
			</div>
			<header className="bg-white border-b border-gray-200">
				<div className="container mx-auto px-4 pt-3 pb-3 md:pt-4 md:pb-2 flex justify-between items-center">
					<div className="flex items-center gap-2">
						<button className="md:hidden text-gray-600 hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
							<Menu size={22} />
						</button>
						<Link to="/" className="font-bold text-xl md:ml-0">
							<img src="/images/logo.svg" alt="PHQ Logo" width={260} height={56} className="h-8 md:h-14 md:min-w-[260px] inline-block mr-2 md:mt-[-12px]" />
						</Link>
					</div>
					<div className="w-1/2 hidden md:block">
						<SearchBox />
					</div>
					<div className="flex items-center gap-5">
						<button onClick={openCart} className="text-gray-600 relative hover:text-primary transition-colors cursor-pointer" aria-label="Open cart">
							<ShoppingCart size={26} />
							<span className="absolute bg-primary text-white text-xs rounded h-5 w-5 flex items-center justify-center -top-2 -right-2 pointer-events-none">{cartCount > 99 ? "99+" : cartCount}</span>
						</button>

						{activeCustomer ? (
							/* ── Logged-in dropdown ── */
							<div className="relative" ref={accountRef}>
								<button onClick={() => setAccountOpen((o) => !o)} className="text-gray-600 hover:text-primary transition-colors cursor-pointer" aria-label="Account">
									<CircleUser size={26} />
								</button>

								{accountOpen && (
									<div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50 py-1">
										<Link to="/account" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
											My Account
										</Link>
										<Link to="/account/orders" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
											My Orders
										</Link>
										<Link to="/account/addresses" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
											My Addresses
										</Link>
										<hr className="my-1 border-gray-200" />
										<button
											type="button"
											onClick={() => {
												setAccountOpen(false);
												logoutFetcher.submit({ _intent: "logout" }, { method: "post", encType: "application/json", action: "/api/auth" });
											}}
											className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
										>
											Logout
										</button>
									</div>
								)}
							</div>
						) : (
							/* ── Guest: open auth modal ── */
							<button onClick={() => setAuthModalOpen(true)} className="text-gray-600 hover:text-primary transition-colors cursor-pointer" aria-label="Account">
								<CircleUser size={26} />
							</button>
						)}
					</div>
				</div>
				<MegaMenu megaMenu={megaMenu} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
			</header>

			<main>{children}</main>

			<Footer />

			<CartSidePanel isOpen={isCartOpen} onClose={closeCart} />

			{authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
		</div>
	);
}
