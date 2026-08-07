import { useRef, useState, useEffect } from "react";
import type { MegaMenuData } from "~/graphql/megamenu";
import type { ActiveCustomer } from "~/graphql/checkout";
import type { PageSection } from "~/graphql/pages";
import type { BannerItem } from "~/graphql/banner";
import MegaMenu from "../components/MegaMenu";
import SearchBox from "../components/SearchBox";
import CartSidePanel from "../components/CartSidePanel";
import Footer from "../components/Footer";
import SeoFooterContent from "../components/SeoFooterContent";
import { useCart } from "../context/CartContext";
import { Link, useFetcher, useLocation, useNavigate } from "react-router";
import LocaleLink from "../components/LocaleLink";
import { CircleUser, ChevronDown, ChevronRight, Languages, Heart, Menu, ShoppingCart, ShieldCheck, Tag, Truck, X, Check, Search } from "lucide-react";
import SocialAuthButtons from "../components/SocialAuthButtons";
import SearchOverlay from "../components/SearchOverlay";
import { useWishlist } from "../context/WishlistContext";
import { getLocaleFromPathname, stripLocalePrefix, toggleLocalePath } from "~/lib/i18n";
import { useFocusTrap } from "~/hooks/useFocusTrap";

interface MainLayoutProps {
	children: React.ReactNode;
	megaMenu: MegaMenuData["getMegaMenu"];
	activeCustomer: ActiveCustomer | null;
	pageSections: PageSection[];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const LAYOUT_COPY = {
	en: {
		freeDelivery: "FREE DELIVERY ON ORDERS OVER QAR 99",
		authentic: "100% Authentic Products",
		fastShipping: "Fast Shipping Across Qatar",
		skipToContent: "Skip to content",
		openMenu: "Open menu",
		search: "Search",
		wishlist: "Wishlist",
		openCart: "Open cart",
		account: "Account",
		login: "Login",
		myAccount: "My Account",
		myOrders: "My Orders",
		myAddresses: "My Addresses",
		logout: "Logout",
		completeProfileTitle: "Complete your profile",
		completeProfileSubtitle: "We just need your name to finish setting up your account.",
		firstName: "First Name",
		lastName: "Last Name",
		profileUpdated: "Profile updated!",
		continue: "Continue",
		saving: "Saving…",
		saveAndContinue: "Save & Continue",
		skipForNow: "Skip for now",
		close: "Close",
		accountCreated: "Account created!",
		verifyEmailPrompt: "Please check your email to verify your account, then log in.",
		goToLogin: "Go to Login",
		loginTab: "Login",
		registerTab: "Register",
		orSignInWithEmail: "Or sign in with email",
		emailAddress: "Email Address",
		password: "Password",
		forgotPassword: "Forgot password?",
		signingIn: "Signing in…",
		orSignUpWithEmail: "Or sign up with email",
		phoneNumber: "Phone Number",
		minPasswordChars: "Minimum 8 characters",
		emailMeOffers: "Email me with news and offers",
		subscribeAgreement: "By subscribing you agree to our",
		privacyPolicy: "Privacy Policy",
		unsubscribeNote: ". You can unsubscribe at any time.",
		creatingAccount: "Creating account…",
		createAccount: "Create Account",
		createAccountAgreement: "By creating an account you agree to our",
		termsAndConditions: "Terms & Conditions",
		and: "and",
	},
	ar: {
		freeDelivery: "توصيل مجاني للطلبات فوق 99 ريال قطري",
		authentic: "منتجات أصلية 100%",
		fastShipping: "شحن سريع في جميع أنحاء قطر",
		skipToContent: "التخطي إلى المحتوى",
		openMenu: "فتح القائمة",
		search: "بحث",
		wishlist: "المفضلة",
		openCart: "فتح السلة",
		account: "الحساب",
		login: "تسجيل الدخول",
		myAccount: "حسابي",
		myOrders: "طلباتي",
		myAddresses: "عناويني",
		logout: "تسجيل الخروج",
		completeProfileTitle: "أكمل ملفك الشخصي",
		completeProfileSubtitle: "نحتاج فقط إلى اسمك لإتمام إعداد حسابك.",
		firstName: "الاسم الأول",
		lastName: "اسم العائلة",
		profileUpdated: "تم تحديث الملف الشخصي!",
		continue: "متابعة",
		saving: "جارٍ الحفظ…",
		saveAndContinue: "حفظ ومتابعة",
		skipForNow: "تخطي الآن",
		close: "إغلاق",
		accountCreated: "تم إنشاء الحساب!",
		verifyEmailPrompt: "يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك، ثم تسجيل الدخول.",
		goToLogin: "الذهاب لتسجيل الدخول",
		loginTab: "تسجيل الدخول",
		registerTab: "إنشاء حساب",
		orSignInWithEmail: "أو سجّل الدخول عبر البريد الإلكتروني",
		emailAddress: "البريد الإلكتروني",
		password: "كلمة المرور",
		forgotPassword: "نسيت كلمة المرور؟",
		signingIn: "جارٍ تسجيل الدخول…",
		orSignUpWithEmail: "أو أنشئ حسابًا عبر البريد الإلكتروني",
		phoneNumber: "رقم الهاتف",
		minPasswordChars: "8 أحرف على الأقل",
		emailMeOffers: "أرسلوا لي الأخبار والعروض عبر البريد الإلكتروني",
		subscribeAgreement: "بالاشتراك، فإنك توافق على",
		privacyPolicy: "سياسة الخصوصية",
		unsubscribeNote: ". يمكنك إلغاء الاشتراك في أي وقت.",
		creatingAccount: "جارٍ إنشاء الحساب…",
		createAccount: "إنشاء حساب",
		createAccountAgreement: "بإنشاء حساب، فإنك توافق على",
		termsAndConditions: "الشروط والأحكام",
		and: "و",
	},
} as const;

// â"€â"€ Auth Modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// ── Complete Profile Modal (shown after social login when name is missing) ─────

function CompleteProfileModal({ onClose }: { onClose: () => void }) {
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const fetcher = useFetcher<{ customer?: unknown; error?: string }>();
	const loading = fetcher.state !== "idle";
	const t = LAYOUT_COPY[getLocaleFromPathname(useLocation().pathname)];
	const dialogRef = useRef<HTMLDivElement>(null);
	useFocusTrap(dialogRef, true, onClose);

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
				<div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="complete-profile-title" tabIndex={-1} className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
					<div className="mb-4">
						<h2 id="complete-profile-title" className="text-lg font-bold text-gray-900">{t.completeProfileTitle}</h2>
						<p className="text-sm text-gray-500 mt-1">{t.completeProfileSubtitle}</p>
					</div>

					{done ? (
						<div className="text-center py-4">
							<Check size={32} className="text-green-500 mx-auto mb-2" />
							<p className="font-semibold text-gray-900 mb-4">{t.profileUpdated}</p>
							<button onClick={onClose} className="bg-primary text-white px-6 py-2 rounded text-sm font-medium hover:bg-primary/90 transition-colors">
								{t.continue}
							</button>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label htmlFor="complete-profile-firstName" className="block text-sm font-medium text-gray-700 mb-1">
										{t.firstName} <span className="text-red-500">*</span>
									</label>
									<input id="complete-profile-firstName" name="firstName" type="text" required autoComplete="given-name" className={inputCls} />
								</div>
								<div>
									<label htmlFor="complete-profile-lastName" className="block text-sm font-medium text-gray-700 mb-1">
										{t.lastName} <span className="text-red-500">*</span>
									</label>
									<input id="complete-profile-lastName" name="lastName" type="text" required autoComplete="family-name" className={inputCls} />
								</div>
							</div>
							{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">{error}</div>}
							<button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-2.5 rounded hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm">
								{loading ? t.saving : t.saveAndContinue}
							</button>
							<button type="button" onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
								{t.skipForNow}
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
	const t = LAYOUT_COPY[getLocaleFromPathname(useLocation().pathname)];
	const dialogRef = useRef<HTMLDivElement>(null);
	useFocusTrap(dialogRef, true, onClose);

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
			<div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />

			{/* Centering wrapper â€" scrolls when card is taller than viewport */}
			<div className="flex min-h-full items-center justify-center p-4">
				{/* Card */}
				<div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" tabIndex={-1} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10 animate-drop-in">
					<button onClick={onClose} className="absolute top-4 end-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label={t.close}>
						<X size={20} />
					</button>

					<h2 id="auth-modal-title" className="text-xl font-bold text-gray-900 mb-5">{t.myAccount}</h2>

					{registered ? (
						<div className="text-center py-6">
							<div className="w-12 h-12 bg-green-100 rounded flex items-center justify-center mx-auto mb-3">
								<Check size={24} className="text-green-600" />
							</div>
							<p className="font-semibold text-gray-900 mb-1">{t.accountCreated}</p>
							<p className="text-sm text-gray-500 mb-4">{t.verifyEmailPrompt}</p>
							<button
								onClick={() => {
									setRegistered(false);
									setTab("login");
									setError(null);
								}}
								className="text-primary text-sm font-medium hover:underline"
							>
								{t.goToLogin}
							</button>
						</div>
					) : (
						<>
							{/* Tab bar — sliding pill indicator */}
							<div className="relative flex mb-5 bg-gray-100 rounded-full p-1">
								<div className="absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out" style={{ width: "calc(50% - 4px)", transform: tab === "register" ? "translateX(100%)" : "translateX(0)" }} />
								{(["login", "register"] as const).map((tabKey) => (
									<button
										key={tabKey}
										type="button"
										onClick={() => {
											setTab(tabKey);
											setError(null);
										}}
										className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-full transition-colors ${tab === tabKey ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
									>
										{tabKey === "login" ? t.loginTab : t.registerTab}
									</button>
								))}
							</div>

							{tab === "login" && (
								<div>
									<SocialAuthButtons dividerLabel={t.orSignInWithEmail} onSuccess={onSocialSuccess} />
									<form onSubmit={handleLogin} className="space-y-4">
										<div>
											<label htmlFor="login-email" className={labelCls}>
												{t.emailAddress} <span className="text-red-500">*</span>
											</label>
											<input id="login-email" name="email" type="email" required autoComplete="email" className={inputCls} />
										</div>
										<div>
											<div className="flex items-center justify-between mb-1">
												<label htmlFor="login-password" className={labelCls} style={{ marginBottom: 0 }}>
													{t.password} <span className="text-red-500">*</span>
												</label>
												<a href="/forgot-password" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
													{t.forgotPassword}
												</a>
											</div>
											<input id="login-password" name="password" type="password" required autoComplete="current-password" className={inputCls} />
										</div>
										{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>}
										<button type="submit" disabled={loading} className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
											{loading ? t.signingIn : t.loginTab}
										</button>
									</form>
								</div>
							)}

							{tab === "register" && (
								<div>
									<SocialAuthButtons dividerLabel={t.orSignUpWithEmail} onSuccess={onSocialSuccess} emailOffers={newsletter} />
									<form onSubmit={handleRegister} className="space-y-4">
										<div className="grid grid-cols-2 gap-3">
											<div>
												<label htmlFor="register-firstName" className={labelCls}>
													{t.firstName} <span className="text-red-500">*</span>
												</label>
												<input id="register-firstName" name="firstName" type="text" required autoComplete="given-name" className={inputCls} />
											</div>
											<div>
												<label htmlFor="register-lastName" className={labelCls}>
													{t.lastName} <span className="text-red-500">*</span>
												</label>
												<input id="register-lastName" name="lastName" type="text" required autoComplete="family-name" className={inputCls} />
											</div>
										</div>
										<div>
											<label htmlFor="register-emailAddress" className={labelCls}>
												{t.emailAddress} <span className="text-red-500">*</span>
											</label>
											<input id="register-emailAddress" name="emailAddress" type="email" required autoComplete="email" className={inputCls} />
										</div>
										<div>
											<label htmlFor="register-phoneNumber" className={labelCls}>{t.phoneNumber}</label>
											<input id="register-phoneNumber" name="phoneNumber" type="tel" placeholder="+974 xxxx xxxx" autoComplete="tel" className={inputCls} />
										</div>
										<div>
											<label htmlFor="register-password" className={labelCls}>
												{t.password} <span className="text-red-500">*</span>
											</label>
											<input id="register-password" name="password" type="password" required autoComplete="new-password" placeholder={t.minPasswordChars} className={inputCls} />
										</div>

										{/* Newsletter consent */}
										<div>
											<label htmlFor="register-newsletter" className="flex items-start gap-2.5 cursor-pointer select-none">
												<input id="register-newsletter" type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="peer sr-only" />
												<div className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-md border flex items-center justify-center transition-colors bg-white border-gray-300 peer-checked:bg-lime-300 peer-checked:border-lime-300 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1">{newsletter && <Check size={12} strokeWidth={3} className="text-black" />}</div>
												<input type="hidden" name="emailOffers" value={newsletter ? "true" : "false"} />
												<span className="text-sm text-gray-700">{t.emailMeOffers}</span>
											</label>
											<p className="text-xs text-gray-400 mt-1.5 ms-7">
												{t.subscribeAgreement}{" "}
												<Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
													{t.privacyPolicy}
												</Link>
												{t.unsubscribeNote}
											</p>
										</div>

										{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>}
										<button type="submit" disabled={loading} className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
											{loading ? t.creatingAccount : t.createAccount}
										</button>
										<p className="text-center text-xs text-gray-400">
											{t.createAccountAgreement}{" "}
											<Link to="/terms" className="underline hover:text-gray-600 transition-colors">
												{t.termsAndConditions}
											</Link>{" "}
											{t.and}{" "}
											<Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
												{t.privacyPolicy}
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

// ── Top bar news pills ──────────────────────────────────────────────────────
// Fetched client-side (not in the root loader) so it doesn't add a blocking
// GraphQL round-trip to every single page's SSR — mirrors HomeBanner.tsx's
// fetch-from-/api/banner/:slug pattern. Shows a shimmer while loading (same
// treatment as HomeBanner/HomeTrendingBanners) and renders nothing once
// loaded if the "top-bar-items" banner group in the Admin banner plugin has
// no items — no static text fallback.
function TopBarNewsPills() {
	const [items, setItems] = useState<BannerItem[] | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/banner/top-bar-items")
			.then((r): Promise<{ items: BannerItem[] } | null> => (r.ok ? r.json() : Promise.resolve(null)))
			.then((data) => {
				if (!cancelled) setItems(data?.items ?? []);
			})
			.catch(() => {
				if (!cancelled) setItems([]);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (items && items.length > 0) {
		const renderPill = (item: BannerItem, key: string) => {
			const href = item.url?.trim();
			// Outlined on the bar's own background (not a solid white fill) — a
			// thin border gives the pill its capsule shape without competing
			// with the teal top bar behind it.
			const pillClass = "inline-flex items-center gap-1.5 border border-white/40 text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap hover:bg-white/10 transition-colors flex-shrink-0";
			const titleLower = item.title.toLowerCase();
			const Icon = titleLower.includes("shipping") ? Truck : titleLower.includes("authentic") || titleLower.includes("safe") ? ShieldCheck : Tag;
			const content = (
				<>
					<Icon size={12} strokeWidth={2} className="flex-shrink-0 text-lime-300" />
					<span>{item.title}</span>
					<ChevronRight size={12} strokeWidth={2} className="flex-shrink-0 rtl:rotate-180" />
				</>
			);
			return href ? (
				<a key={key} href={href} className={pillClass}>
					{content}
				</a>
			) : (
				<span key={key} className={pillClass}>
					{content}
				</span>
			);
		};

		return (
			<>
				{/* Mobile — self-scrolling marquee (duplicated track for a seamless loop),
				    not a native drag-to-scroll strip. */}
				<div className="md:hidden overflow-hidden">
					<div className="flex items-center gap-2 w-max animate-marquee">{[...items, ...items].map((item, i) => renderPill(item, `${item.id}-${i}`))}</div>
				</div>
				{/* Desktop — static row, fits without needing to scroll or animate. */}
				<div className="hidden md:flex items-center gap-2 w-max">{items.map((item) => renderPill(item, item.id))}</div>
			</>
		);
	}

	if (items === null) {
		return (
			<div className="flex items-center gap-2 w-max" aria-hidden="true">
				{[80, 96, 72].map((w, i) => (
					<div key={i} className="h-[26px] rounded-full bg-white/15 animate-pulse flex-shrink-0" style={{ width: w }} />
				))}
			</div>
		);
	}

	return null;
}

export default function MainLayout({ children, megaMenu, activeCustomer, pageSections }: MainLayoutProps) {
	const routerLocation = useLocation();
	const { isCartOpen, openCart, closeCart, cartCount } = useCart();
	const { wishlistCount } = useWishlist();
	const [accountOpen, setAccountOpen] = useState(false);
	const [authModalOpen, setAuthModalOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [profilePromptDismissed, setProfilePromptDismissed] = useState(false);
	const [headerVisible, setHeaderVisible] = useState(true);
	const lastScrollY = useRef(0);
	const navigate = useNavigate();
	// Derived straight from the URL (/ar/* prefix), not client state — this is
	// what actually determines which translated content the current page shows,
	// so it can never drift out of sync the way a separate cookie/state could.
	const currentLang = getLocaleFromPathname(routerLocation.pathname);
	const t = LAYOUT_COPY[currentLang];

	// Show profile completion prompt when user is logged in but name is missing
	// (common after social OAuth where provider didn't supply name fields)
	const needsProfileCompletion = !!activeCustomer && !profilePromptDismissed && (!activeCustomer.firstName?.trim() || !activeCustomer.lastName?.trim());
	const accountRef = useRef<HTMLDivElement>(null);
	const logoutFetcher = useFetcher();

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
				setAccountOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Hide the sticky header on scroll-down, reveal it again on scroll-up.
	useEffect(() => {
		let ticking = false;
		function handleScroll() {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				const currentY = window.scrollY;
				if (currentY < 80) {
					setHeaderVisible(true);
				} else if (currentY > lastScrollY.current) {
					setHeaderVisible(false);
				} else if (currentY < lastScrollY.current) {
					setHeaderVisible(true);
				}
				lastScrollY.current = currentY;
				ticking = false;
			});
		}
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Real navigation to the equivalent page in the other locale (not a machine
	// translation overlay) — Vendure serves genuinely translated content for
	// whichever language the URL resolves to, via /ar/* (see app/lib/i18n.ts).
	function toggleLanguage() {
		const nextLang = currentLang === "en" ? "ar" : "en";
		navigate(toggleLocalePath(routerLocation.pathname, routerLocation.search, nextLang));
	}

	return (
		<div className="min-h-screen flex flex-col">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[300] focus:bg-white focus:text-primary focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-semibold"
			>
				{t.skipToContent}
			</a>
			<div className="py-2" style={{ backgroundColor: "#214d54" }}>
				<div className="container mx-auto px-4 flex items-center gap-4">
					<div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
						<TopBarNewsPills />
					</div>
					<button onClick={toggleLanguage} translate="no" className="border rounded-xl px-2 flex-shrink-0 flex items-center gap-1.5 text-white hover:text-black hover:bg-white cursor-pointer transition-colors text-sm">
						<Languages size={16} strokeWidth={1.5} />
						{currentLang === "en" ? (
							<span lang="ar" className="font-arabic">
								العربية
							</span>
						) : (
							<span>English</span>
						)}
					</button>
				</div>
			</div>
			<header className={`bg-white border-b border-stone-200 shadow-md sticky top-0 z-40 transition-transform duration-300 ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}>
				<div className="container mx-auto px-4 py-2 flex items-center gap-2 lg:gap-4 relative">
					<div className="flex items-center gap-2 flex-shrink-0">
						<button className="md:hidden text-gray-600 hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(true)} aria-label={t.openMenu} aria-haspopup="true" aria-expanded={mobileMenuOpen}>
							<Menu size={22} strokeWidth={1.5} />
						</button>
						<LocaleLink to="/" className="font-bold text-xl md:ms-0">
							<img src="/images/logo.png" alt="NutriBox Logo" width={772} height={223} className="h-6 md:h-12 w-auto inline-block" />
						</LocaleLink>
					</div>
					<MegaMenu megaMenu={megaMenu} mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
					<div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
						<button onClick={() => setSearchOpen(true)} className="hidden md:inline-flex text-gray-600 hover:text-primary hover:scale-110 transition-all duration-200 cursor-pointer" aria-label={t.search}>
							<Search size={22} strokeWidth={1.5} />
						</button>
						<LocaleLink to="/wishlist" className="text-gray-600 relative hover:text-primary hover:scale-110 transition-all duration-200 inline-block" aria-label={t.wishlist}>
							<Heart size={24} strokeWidth={1.5} />
							{wishlistCount > 0 && <span className="absolute bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center -top-1.5 -end-1.5 pointer-events-none">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
						</LocaleLink>
						<button onClick={openCart} className="relative flex items-center justify-center w-9 h-9 rounded-full bg-lime-300 text-black hover:brightness-95 hover:scale-110 transition-all duration-200 cursor-pointer" aria-label={t.openCart}>
							<ShoppingCart size={20} strokeWidth={1.5} />
							<span className="absolute bg-black text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center -top-1 -end-1 pointer-events-none">{cartCount > 99 ? "99+" : cartCount}</span>
						</button>

						{activeCustomer ? (
							<div
								className="relative"
								ref={accountRef}
								onKeyDown={(e) => {
									if (e.key === "Escape" && accountOpen) {
										setAccountOpen(false);
										(e.currentTarget.querySelector("button") as HTMLElement | null)?.focus();
									}
								}}
							>
								<button onClick={() => setAccountOpen((o) => !o)} className="flex items-center gap-1.5 text-gray-600 hover:text-primary hover:scale-110 transition-all duration-200 cursor-pointer" aria-label={t.account} aria-haspopup="true" aria-expanded={accountOpen}>
									<CircleUser size={24} strokeWidth={1.5} />
									<span className="hidden md:inline text-sm font-medium">{activeCustomer.firstName || t.account}</span>
									<ChevronDown size={14} strokeWidth={1.5} className={`hidden md:inline-block transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`} />
								</button>

								{accountOpen && (
									<div className="absolute end-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50 py-1">
										<Link to="/account" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
											{t.myAccount}
										</Link>
										<Link to="/account/orders" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
											{t.myOrders}
										</Link>
										<Link to="/account/addresses" onClick={() => setAccountOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
											{t.myAddresses}
										</Link>
										<hr className="my-1 border-gray-200" />
										<button
											type="button"
											onClick={() => {
												setAccountOpen(false);
												logoutFetcher.submit({ _intent: "logout" }, { method: "post", encType: "application/json", action: "/api/auth" });
											}}
											className="w-full text-start px-4 py-2 text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
										>
											{t.logout}
										</button>
									</div>
								)}
							</div>
						) : (
							<button onClick={() => setAuthModalOpen(true)} className="flex items-center gap-1.5 text-black hover:text-primary hover:scale-110 transition-all duration-200 cursor-pointer" aria-label={t.login}>
								<CircleUser size={24} strokeWidth={1.5} />
								<span className="hidden md:inline text-sm font-medium">{t.login}</span>
							</button>
						)}
					</div>
				</div>

				{/* mobile search */}
				<div className="md:hidden px-4 pb-3">
					<SearchBox />
				</div>
			</header>

			<main id="main-content" tabIndex={-1}>{children}</main>

			{stripLocalePrefix(routerLocation.pathname) === "/" && <SeoFooterContent megaMenu={megaMenu} />}

			<Footer pageSections={pageSections} />

			<CartSidePanel isOpen={isCartOpen} onClose={closeCart} />

			<SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

			{authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

			{needsProfileCompletion && <CompleteProfileModal onClose={() => setProfilePromptDismissed(true)} />}
		</div>
	);
}
