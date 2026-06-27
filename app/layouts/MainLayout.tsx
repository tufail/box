import { useRef, useState, useEffect } from "react";
import type { MegaMenuData } from "~/graphql/megamenu";
import type { ActiveCustomer } from "~/graphql/checkout";
import type { PageSection } from "~/graphql/pages";
import MegaMenu from "../components/MegaMenu";
import SearchBox from "../components/SearchBox";
import CartSidePanel from "../components/CartSidePanel";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { Link, useFetcher } from "react-router";
import { CircleUser, Globe, Heart, Menu, ShoppingCart, X, Check, ChevronDown, Search } from "lucide-react";
import SocialAuthButtons from "../components/SocialAuthButtons";
import { useWishlist } from "../context/WishlistContext";

interface MainLayoutProps {
	children: React.ReactNode;
	megaMenu: MegaMenuData["getMegaMenu"];
	activeCustomer: ActiveCustomer | null;
	pageSections: PageSection[];
}

// â"€â"€ Auth Modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// ── Complete Profile Modal (shown after social login when name is missing) ─────

function CompleteProfileModal({ onClose }: { onClose: () => void }) {
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const fetcher = useFetcher<{ customer?: unknown; error?: string }>();
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.error) {
			setError(fetcher.data.error);
			return;
		}
		if (fetcher.data.customer) setDone(true);
	}, [fetcher.data, fetcher.state]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const fd = new FormData(e.currentTarget);
		fetcher.submit(
			{
				_intent: "updateProfile",
				firstName: fd.get("firstName") as string,
				lastName: fd.get("lastName") as string,
			},
			{ method: "post", encType: "application/json", action: "/api/account" },
		);
	}

	const inputCls = "w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="fixed inset-0 bg-black/50" />
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
					<div className="mb-4">
						<h2 className="text-lg font-bold text-gray-900">Complete your profile</h2>
						<p className="text-sm text-gray-500 mt-1">We just need your name to finish setting up your account.</p>
					</div>

					{done ? (
						<div className="text-center py-4">
							<Check size={32} className="text-green-500 mx-auto mb-2" />
							<p className="font-semibold text-gray-900 mb-4">Profile updated!</p>
							<button onClick={onClose} className="bg-primary text-white px-6 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors">
								Continue
							</button>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										First Name <span className="text-red-500">*</span>
									</label>
									<input name="firstName" type="text" required autoComplete="given-name" className={inputCls} />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Last Name <span className="text-red-500">*</span>
									</label>
									<input name="lastName" type="text" required autoComplete="family-name" className={inputCls} />
								</div>
							</div>
							{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
							<button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-2.5 rounded hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm">
								{loading ? "Saving…" : "Save & Continue"}
							</button>
							<button type="button" onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
								Skip for now
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Auth Modal ────────────────────────────────────────────────────────────────

function AuthModal({ onClose }: { onClose: () => void }) {
	const [tab, setTab] = useState<"login" | "register">("login");
	const [error, setError] = useState<string | null>(null);
	const [registered, setRegistered] = useState(false);
	const [newsletter, setNewsletter] = useState(true);
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
			emailOffers: fd.get("emailOffers") as string,
		};
		const phone = fd.get("phoneNumber") as string;
		if (phone) body.phoneNumber = phone;
		submit(body);
	}

	const inputCls = "w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
	const labelCls = "block text-sm font-medium text-gray-700 mb-1";
	const onSocialSuccess = () => {
		onClose();
		window.location.reload();
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			{/* Backdrop */}
			<div className="fixed inset-0 bg-black/50" onClick={onClose} />

			{/* Centering wrapper â€" scrolls when card is taller than viewport */}
			<div className="flex min-h-full items-center justify-center p-4">
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
								<div>
									<SocialAuthButtons dividerLabel="Or sign in with email" onSuccess={onSocialSuccess} />
									<form onSubmit={handleLogin} className="space-y-4">
										<div>
											<label className={labelCls}>
												Email Address <span className="text-red-500">*</span>
											</label>
											<input name="email" type="email" required className={inputCls} />
										</div>
										<div>
											<div className="flex items-center justify-between mb-1">
												<label className={labelCls} style={{ marginBottom: 0 }}>
													Password <span className="text-red-500">*</span>
												</label>
												<a href="/forgot-password" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
													Forgot password?
												</a>
											</div>
											<input name="password" type="password" required className={inputCls} />
										</div>
										{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>}
										<button type="submit" disabled={loading} className="w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
											{loading ? "Signing in…" : "Login"}
										</button>
									</form>
								</div>
							)}

							{tab === "register" && (
								<div>
									<SocialAuthButtons dividerLabel="Or sign up with email" onSuccess={onSocialSuccess} emailOffers={newsletter} />
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

										{/* Newsletter consent */}
										<div>
											<label className="flex items-start gap-2.5 cursor-pointer select-none" onClick={() => setNewsletter((v) => !v)}>
												<div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors bg-white ${newsletter ? "border-primary" : "border-gray-300"}`}>{newsletter && <Check size={12} strokeWidth={3} className="text-primary" />}</div>
												<input type="hidden" name="emailOffers" value={newsletter ? "true" : "false"} />
												<span className="text-sm text-gray-700">Email me with news and offers</span>
											</label>
											<p className="text-xs text-gray-400 mt-1.5 ml-7">
												By subscribing you agree to our{" "}
												<Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
													Privacy Policy
												</Link>
												. You can unsubscribe at any time.
											</p>
										</div>

										{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>}
										<button type="submit" disabled={loading} className="w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
											{loading ? "Creating account…" : "Create Account"}
										</button>
										<p className="text-center text-xs text-gray-400">
											By creating an account you agree to our{" "}
											<Link to="/terms" className="underline hover:text-gray-600 transition-colors">
												Terms & Conditions
											</Link>{" "}
											and{" "}
											<Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
												Privacy Policy
											</Link>
											.
										</p>
									</form>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
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

function BrandsDropdown() {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const ref = useRef<HTMLDivElement>(null);

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
		<div ref={ref} className="relative hidden md:block flex-shrink-0 ml-2 lg:ml-10 mr-[-8px]" onMouseEnter={() => setOpen(true)} onMouseLeave={() => { setOpen(false); setSearch(""); }}>
			<button
				className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded text-primary transition-colors"
				aria-expanded={open}
			>
				Brands
				<ChevronDown size={15} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
			</button>

			{open && (
				<div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 shadow-2xl rounded-lg z-50 flex w-[580px] overflow-hidden">
					{/* Left — searchable alphabetical list */}
					<div className="w-[240px] flex-shrink-0 border-r border-gray-100 flex flex-col">
						<div className="p-3 border-b border-gray-100">
							<div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 bg-white">
								<Search size={14} className="text-gray-400 flex-shrink-0" />
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
											className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:text-primary hover:bg-stone-50 transition-colors"
											onClick={close}
										>
											{brand.name}
											<ChevronDown size={13} className="-rotate-90 text-gray-300" />
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
									<div className="w-full h-14 rounded flex items-center justify-center bg-gray-50 text-xs font-bold text-gray-400 group-hover:text-primary transition-colors text-center px-1">
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

export default function MainLayout({ children, megaMenu, activeCustomer, pageSections }: MainLayoutProps) {
	const { isCartOpen, openCart, closeCart, cartCount } = useCart();
	const { wishlistCount } = useWishlist();
	const [accountOpen, setAccountOpen] = useState(false);
	const [authModalOpen, setAuthModalOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [currentLang, setCurrentLang] = useState<"en" | "ar">("en");
	const [profilePromptDismissed, setProfilePromptDismissed] = useState(false);

	// Show profile completion prompt when user is logged in but name is missing
	// (common after social OAuth where provider didn't supply name fields)
	const needsProfileCompletion = !!activeCustomer && !profilePromptDismissed && (!activeCustomer.firstName?.trim() || !activeCustomer.lastName?.trim());
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
			<div className="bg-[#3b8578] py-2 relative">
				<p className="text-xs font-semibold text-white text-center tracking-wide uppercase px-16">FREE DELIVERY ON ORDERS OVER QAR 99&nbsp;&nbsp;|&nbsp;&nbsp;100% Authentic Products&nbsp;&nbsp;|&nbsp;&nbsp;Fast Shipping Across Qatar</p>
				<button onClick={toggleLanguage} translate="no" className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/70 hover:text-white transition-colors text-xs">
					<Globe size={12} />
					{currentLang === "en" ? (
						<span lang="ar" className="font-arabic">
							العربية
						</span>
					) : (
						<span>English</span>
					)}
				</button>
			</div>
			<header className="bg-stone-100 border-b border-stone-200 sticky top-0 z-40">
				<div className="container mx-auto px-4 py-2 flex items-center gap-2 lg:gap-4">
					<div className="flex items-center gap-2 flex-shrink-0">
						<button className="md:hidden text-gray-600 hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
							<Menu size={22} />
						</button>
						<Link to="/" className="font-bold text-xl md:ml-0">
							<img src="/images/logo.png" alt="PHQ Logo" width={772} height={223} className="h-7 md:h-12 w-auto inline-block" />
						</Link>
					</div>
					<BrandsDropdown />
					<Link
						to="/collections?offers=true"
						className="hidden md:relative md:inline-flex items-center px-[26px] py-[5px] text-gray-900 text-sm font-bold capitalize hover:opacity-90 transition-opacity flex-shrink-0"
						style={{ transform: "rotate(-3deg)" }}
					>
						<svg
							className="absolute inset-0 w-full h-full overflow-visible"
							viewBox="0 0 100 34"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							<defs>
								<filter id="brush-rough" x="-15%" y="-40%" width="130%" height="180%">
									<feTurbulence type="fractalNoise" baseFrequency="0.055 0.25" numOctaves="4" seed="5" result="noise" />
									<feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
								</filter>
								<linearGradient id="brush-grad" x1="0%" y1="0%" x2="100%" y2="100%">
									<stop offset="0%" stopColor="#d97706" />
									<stop offset="50%" stopColor="#f59e0b" />
									<stop offset="100%" stopColor="#fcd34d" />
								</linearGradient>
							</defs>
							<path
								d="M4,17 C6,9 16,2 36,3 C53,4 66,2 80,3 C91,4 98,8 97,17 C96,25 89,30 80,31 C66,32 53,29 36,31 C16,32 6,25 4,17 Z"
								fill="url(#brush-grad)"
								filter="url(#brush-rough)"
							/>
						</svg>
						<span className="relative">offers</span>
					</Link>
					<div className="flex-1 hidden md:block mr-2 lg:mr-20">
						<SearchBox />
					</div>
					<div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
						<Link to="/wishlist" className="text-gray-600 relative hover:text-primary transition-colors" aria-label="Wishlist">
							<Heart size={24} />
							{wishlistCount > 0 && <span className="absolute bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center -top-1.5 -right-1.5 pointer-events-none">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
						</Link>
						<button onClick={openCart} className="text-gray-600 relative hover:text-primary transition-colors cursor-pointer" aria-label="Open cart">
							<ShoppingCart size={24} />
							<span className="absolute bg-amber-500 text-gray-900 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center -top-1.5 -right-1.5 pointer-events-none">{cartCount > 99 ? "99+" : cartCount}</span>
						</button>

						{activeCustomer ? (
							<div className="relative" ref={accountRef}>
								<button onClick={() => setAccountOpen((o) => !o)} className="flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors cursor-pointer" aria-label="Account">
									<CircleUser size={24} />
									<span className="hidden md:inline text-sm font-medium">{activeCustomer.firstName || "Account"}</span>
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
							<button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors cursor-pointer" aria-label="Login">
								<CircleUser size={24} />
								<span className="hidden md:inline text-sm font-medium">Login</span>
							</button>
						)}
					</div>
				</div>

				{/* mobile search */}
				<div className="md:hidden px-4 pb-3">
					<SearchBox />
				</div>

				<MegaMenu megaMenu={megaMenu} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
			</header>

			<main>{children}</main>

			<Footer pageSections={pageSections} />

			<CartSidePanel isOpen={isCartOpen} onClose={closeCart} />

			{authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

			{needsProfileCompletion && <CompleteProfileModal onClose={() => setProfilePromptDismissed(true)} />}
		</div>
	);
}
