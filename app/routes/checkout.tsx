import { useState, useEffect, useRef } from "react";
import { useLoaderData, useFetcher, useNavigate, useLocation, redirect } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/checkout";
import { graphqlRequest } from "workers/graphqlClient";
import { ACTIVE_ORDER_QUERY, type ActiveOrder, type ActiveOrderData, type OrderDiscount } from "~/graphql/order";
import { ACTIVE_CUSTOMER_QUERY, type ActiveCustomer, type ShippingMethod, type PaymentMethod } from "~/graphql/checkout";
import { Check, ChevronDown, Truck, CreditCard, ShieldCheck, Package, Tag, X, Repeat, Store, MapPin, Banknote } from "lucide-react";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import SocialAuthButtons from "~/components/SocialAuthButtons";
import { useCart } from "~/context/CartContext";
import { qatarZones } from "~/constants/qatar";
import { SadadCheckoutForm } from "~/components/SadadCheckoutForm";
import type { SadadPaymentMetadata } from "~/types/sadad";
import type { SkipCashCheckoutResult } from "~/graphql/checkout";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";

// Must match the `code` the SkipCash PaymentMethod is created with in the
// Vendure admin (see SKIPCASH_METHOD_CODE in api.checkout.ts).
const SKIPCASH_METHOD_CODE = "skipcash-payment";

// Same accepted-payment-method logos shown in the footer (public/images/payments/).
const PAYMENT_ICON_IDS = [1, 2, 3, 4, 5];

// Confirmed against Vendure Admin: manual-fulfillment shipping method, code "store-pickup".
const STORE_PICKUP_METHOD_CODE = "store-pickup";

// Same store address as Footer.tsx / root.tsx JSON-LD (not extracted to a shared
// constant yet). postalCode is a placeholder (first Doha zone) since no real zone is
// reserved for the store itself — confirm against Vendure eligibility rules if a
// pickup order ever comes back ineligible.
const STORE_PICKUP_ADDRESS = {
	streetLine1: "AK Group Building Office no 2, 2nd Floor Building No. 41, 343 Al Sadd St",
	city: "Doha",
	postalCode: "1",
	countryCode: "QA",
	province: "Doha",
} as const;

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const CHECKOUT_COPY = {
	en: {
		continueShopping: "Continue Shopping",
		customerInformation: "Customer Information",
		shipping: "Shipping",
		payment: "Payment",
		free: "Free",
		processing: "Processing…",
		byContinuing: "By continuing, I agree to the",
		termsAndConditions: "Terms & Conditions",
		and: "and",
		privacyPolicy: "Privacy Policy",
		emailMeOffers: "Stay up to date with exclusive offers and news. Unsubscribe anytime.",
		forgotPassword: "Forgot password?",
		or: "OR",
		continueLabel: "Continue",
		emailAlreadyRegisteredNote: "This email already has an account. Enter your password to continue.",
		useDifferentEmail: "Use a different email",
		shipToAddress: "Ship to Address",
		storePickup: "Store Pickup",
		pickupFromStoreNote: "You'll collect your order from our store:",
		pickupUnavailable: "Store pickup is currently unavailable for this order. Please choose Ship to Address.",
		firstName: "First Name",
		lastName: "Last Name",
		emailAddress: "Email Address",
		password: "Password",
		phoneNumber: "Phone Number",
		loginFailed: "Login failed. Check your credentials.",
		couldNotProceedAsGuest: "Could not proceed as guest.",
		loginAndContinue: "Login & Continue",
		addressLabel: "Address (villa, flat, building & block, etc.)",
		street: "Street",
		municipality: "Municipality",
		zone: "Zone",
		selectMunicipality: "Select Municipality...",
		selectZone: "Select Zone...",
		zoneOption: (n: number) => `Zone ${n}`,
		shippingMethod: "Shipping Method",
		calculatingRates: "Calculating shipping rates…",
		noShippingMethods: "No shipping methods available for this address.",
		couldNotSaveAddress: "Could not save shipping address.",
		couldNotSetShippingMethod: "Could not set shipping method.",
		selectZonePrompt: "Select your delivery zone above to see shipping rates.",
		continueToPayment: "Continue to Payment",
		loadingPaymentOptions: "Loading payment options…",
		noPaymentMethods: "No payment methods available. Make sure a shipping method has been selected.",
		paymentFailed: "Payment failed. Please try again.",
		processingPayment: "Processing Payment…",
		redirectingToSkipCash: "Redirecting to SkipCash secure payment…",
		acceptedPaymentMethods: "Accepted payment methods",
		placeOrder: (price: string) => `Place Order · ${price}`,
		securePaymentNote: "Your payment information is secure and encrypted",
		couponLockedNote: "Coupon codes cannot be changed while payment is in progress.",
		couponCode: "Coupon code",
		apply: "Apply",
		couponApplied: "Coupon applied successfully!",
		invalidCoupon: "Invalid coupon code.",
		orderSummary: "Order Summary",
		item: "item",
		items: "items",
		qty: "Qty",
		subscribeAndSave: "Subscribe & Save",
		saveAmount: (amount: string) => `Save ${amount}`,
		bundleDiscount: "Combo/Bundle Discount",
		discount: "Discount",
		subtotal: "Subtotal",
		total: "Total",
	},
	ar: {
		continueShopping: "متابعة التسوق",
		customerInformation: "معلومات العميل",
		shipping: "الشحن",
		payment: "الدفع",
		free: "مجاني",
		processing: "جارٍ المعالجة…",
		byContinuing: "بالمتابعة، أوافق على",
		termsAndConditions: "الشروط والأحكام",
		and: "و",
		privacyPolicy: "سياسة الخصوصية",
		emailMeOffers: "ابق على اطلاع بأحدث العروض الحصرية والأخبار. يمكنك إلغاء الاشتراك في أي وقت.",
		forgotPassword: "نسيت كلمة المرور؟",
		or: "أو",
		continueLabel: "متابعة",
		emailAlreadyRegisteredNote: "هذا البريد الإلكتروني مسجّل بحساب بالفعل. أدخل كلمة المرور للمتابعة.",
		useDifferentEmail: "استخدام بريد إلكتروني مختلف",
		shipToAddress: "التوصيل إلى عنوان",
		storePickup: "الاستلام من المتجر",
		pickupFromStoreNote: "ستستلم طلبك من متجرنا:",
		pickupUnavailable: "خدمة الاستلام من المتجر غير متاحة حاليًا لهذا الطلب. يرجى اختيار التوصيل إلى عنوان.",
		firstName: "الاسم الأول",
		lastName: "اسم العائلة",
		emailAddress: "البريد الإلكتروني",
		password: "كلمة المرور",
		phoneNumber: "رقم الهاتف",
		loginFailed: "فشل تسجيل الدخول. تحقق من بيانات الاعتماد الخاصة بك.",
		couldNotProceedAsGuest: "تعذّرت المتابعة كزائر.",
		loginAndContinue: "تسجيل الدخول والمتابعة",
		addressLabel: "العنوان (فيلا، شقة، مبنى وبلوك، إلخ.)",
		street: "الشارع",
		municipality: "البلدية",
		zone: "المنطقة",
		selectMunicipality: "اختر البلدية...",
		selectZone: "اختر المنطقة...",
		zoneOption: (n: number) => `المنطقة ${n}`,
		shippingMethod: "طريقة الشحن",
		calculatingRates: "جارٍ حساب أسعار الشحن…",
		noShippingMethods: "لا توجد طرق شحن متاحة لهذا العنوان.",
		couldNotSaveAddress: "تعذّر حفظ عنوان الشحن.",
		couldNotSetShippingMethod: "تعذّر تحديد طريقة الشحن.",
		selectZonePrompt: "اختر منطقة التوصيل أعلاه لرؤية أسعار الشحن.",
		continueToPayment: "المتابعة إلى الدفع",
		loadingPaymentOptions: "جارٍ تحميل خيارات الدفع…",
		noPaymentMethods: "لا توجد طرق دفع متاحة. تأكد من اختيار طريقة شحن.",
		paymentFailed: "فشلت عملية الدفع. يرجى المحاولة مرة أخرى.",
		processingPayment: "جارٍ معالجة الدفع…",
		redirectingToSkipCash: "جارٍ التحويل إلى الدفع الآمن عبر SkipCash…",
		acceptedPaymentMethods: "طرق الدفع المقبولة",
		placeOrder: (price: string) => `إتمام الطلب · ${price}`,
		securePaymentNote: "معلومات الدفع الخاصة بك آمنة ومشفّرة",
		couponLockedNote: "لا يمكن تغيير رموز الخصم أثناء معالجة الدفع.",
		couponCode: "رمز الخصم",
		apply: "تطبيق",
		couponApplied: "تم تطبيق رمز الخصم بنجاح!",
		invalidCoupon: "رمز الخصم غير صالح.",
		orderSummary: "ملخص الطلب",
		item: "عنصر",
		items: "عناصر",
		qty: "الكمية",
		subscribeAndSave: "اشترك ووفّر",
		saveAmount: (amount: string) => `وفّر ${amount}`,
		bundleDiscount: "خصم الباقة/الكومبو",
		discount: "خصم",
		subtotal: "المجموع الفرعي",
		total: "الإجمالي",
	},
} as const;

function itemsCountLabel(n: number, locale: Locale): string {
	if (locale === "en") return `${n} ${n === 1 ? CHECKOUT_COPY.en.item : CHECKOUT_COPY.en.items}`;
	if (n === 1) return "عنصر واحد";
	if (n === 2) return "عنصران";
	if (n >= 3 && n <= 10) return `${n} عناصر`;
	return `${n} عنصرًا`;
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const locale = getLocaleFromPathname(new URL(request.url).pathname);
	const [orderResult, customerResult] = await Promise.allSettled([graphqlRequest<ActiveOrderData>(env, ACTIVE_ORDER_QUERY, undefined, { request }), graphqlRequest<{ activeCustomer: ActiveCustomer | null }>(env, ACTIVE_CUSTOMER_QUERY, undefined, { request })]);

	const activeOrder = orderResult.status === "fulfilled" ? orderResult.value.data.activeOrder : null;
	const activeCustomer = customerResult.status === "fulfilled" ? customerResult.value.data.activeCustomer : null;
	const vendureBase = (env.VENDURE_SHOP_API ?? "http://localhost:3000/shop-api").replace("/shop-api", "");

	if (!activeOrder || activeOrder.totalQuantity === 0) {
		return redirect(localizePath("/", locale));
	}

	return { activeOrder, activeCustomer, vendureBase };
}

export function meta() {
	return [{ title: "Checkout — NutriBox" }, { name: "robots", content: "noindex, nofollow" }];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number, currency: string, locale: Locale) {
	return formatPrice(cents, currency, locale);
}

function resolveImg(preview: string, base: string) {
	return preview.startsWith("http") ? preview : `${base}${preview}`;
}

// Maps an order shipping address or a customer address-book entry to the Shipping step's
// form shape — both share the same field names, just from different API sources.
function addressToShippingValues(addr: { fullName?: string | null; streetLine1: string | null; streetLine2?: string | null; city?: string | null; postalCode?: string | null; phoneNumber?: string | null } | null | undefined): ShippingAddressValues | null {
	if (!addr?.streetLine1) return null;
	const [firstName = "", ...rest] = (addr.fullName ?? "").trim().split(" ");
	return {
		firstName,
		lastName: rest.join(" "),
		streetLine1: addr.streetLine1,
		streetLine2: addr.streetLine2 ?? undefined,
		city: addr.city ?? "",
		postalCode: addr.postalCode ?? "",
		phoneNumber: addr.phoneNumber ?? undefined,
	};
}

// Pre-fills the Shipping step from whatever address the active order already has saved
// server-side (e.g. a returning/refreshed checkout session), instead of starting blank.
function deriveShippingDraft(order: ActiveOrder): ShippingAddressValues | null {
	return addressToShippingValues(order.shippingAddress);
}

// Resumes the checkout wherever the order's own state already left off. Customer info can
// safely auto-complete (it's already confirmed on the order). Shipping stays open and arrives
// pre-filled from order.shippingAddress UNLESS Vendure's own order.state already says shipping
// is finalized (ArrangingPayment) — in that case Payment becomes the active card immediately.
function deriveCheckoutState(order: ActiveOrder, activeCustomer: ActiveCustomer | null, locale: Locale) {
	const orderCustomer = activeCustomer ?? (order.customer ? { firstName: order.customer.firstName, lastName: order.customer.lastName, emailAddress: order.customer.emailAddress } : null);

	const addressDraft = deriveShippingDraft(order);
	const shippingLine = order.shippingLines[0] ?? null;
	const shippingConfirmed = order.state === "ArrangingPayment";

	const completed: number[] = [];
	if (orderCustomer) completed.push(1);
	if (shippingConfirmed) completed.push(2);

	const step = shippingConfirmed ? 3 : orderCustomer ? 2 : 1;

	return {
		step,
		completed,
		orderCustomer,
		shippingAddressDraft: addressDraft,
		shippingMethodDraft: shippingLine?.shippingMethod.id ?? null,
		shippingModeDraft: shippingLine?.shippingMethod.code === STORE_PICKUP_METHOD_CODE ? ("pickup" as const) : ("address" as const),
	};
}

// ── Step section (numbered header + collapsible content, one per step) ────────

function StepSection({ num, label, active, completed, onNavigate, children }: { num: number; label: string; active: boolean; completed: boolean; onNavigate: () => void; children: React.ReactNode }) {
	const clickable = completed && !active;
	const dim = !active && !completed;
	return (
		<div className={`py-6 ${num > 1 ? "border-t border-gray-200" : ""}`}>
			<button type="button" onClick={clickable ? onNavigate : undefined} className={`flex items-center gap-3 w-full text-start ${clickable ? "cursor-pointer" : "cursor-default"}`}>
				<div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${dim ? "bg-gray-200 text-gray-500" : "bg-primary text-white"}`}>{num}</div>
				<span className={`text-lg font-bold ${dim ? "text-gray-400" : "text-gray-900"}`}>{label}</span>
				{!dim && <ChevronDown size={20} className={`ms-auto flex-shrink-0 text-gray-400 transition-transform ${active ? "rotate-180" : ""}`} />}
			</button>
			{active && <div className="mt-5 ps-10">{children}</div>}
		</div>
	);
}

// ── Shared form primitives ────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, name, type = "text", required, placeholder, className = "sm:col-span-2", defaultValue, readOnly }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; className?: string; defaultValue?: string; readOnly?: boolean }) {
	return (
		<div className={className}>
			<label htmlFor={`checkout-${name}`} className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ms-1">*</span>}
			</label>
			<input
				id={`checkout-${name}`}
				name={name}
				type={type}
				required={required}
				placeholder={placeholder}
				defaultValue={defaultValue}
				readOnly={readOnly}
				className={`w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${readOnly ? "bg-gray-50 text-gray-500" : ""}`}
			/>
		</div>
	);
}

function Select({ label, name, autoComplete, placeholder, required, className = "sm:col-span-2", defaultValue = "", onChange, children }: { label: string; name: string; autoComplete?: string; placeholder?: string; required?: boolean; className?: string; defaultValue?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
	return (
		<div className={className}>
			<label htmlFor={`checkout-${name}`} className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ms-1">*</span>}
			</label>
			<div className="relative">
				<select
					id={`checkout-${name}`}
					name={name}
					autoComplete={autoComplete}
					required={required}
					defaultValue={defaultValue}
					onChange={onChange}
					className="w-full appearance-none border border-gray-200 rounded-full ps-4 pe-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
				>
					{placeholder && (
						<option value="" disabled>
							{placeholder}
						</option>
					)}
					{children}
				</select>
				<ChevronDown size={16} className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
			</div>
		</div>
	);
}

function TermsHint({ t }: { t: (typeof CHECKOUT_COPY)[keyof typeof CHECKOUT_COPY] }) {
	return (
		<p className="text-center text-xs text-gray-400 mt-3">
			{t.byContinuing}{" "}
			<Link to="/terms" className="underline hover:text-gray-600 transition-colors">
				{t.termsAndConditions}
			</Link>{" "}
			{t.and}{" "}
			<Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
				{t.privacyPolicy}
			</Link>
			.
		</p>
	);
}

function NewsletterConsent({ checked, onChange, t }: { checked: boolean; onChange: (v: boolean) => void; t: (typeof CHECKOUT_COPY)[keyof typeof CHECKOUT_COPY] }) {
	return (
		<div className="mt-4">
			<label htmlFor="checkout-newsletter" className="flex items-start gap-2.5 cursor-pointer select-none">
				<input id="checkout-newsletter" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
				<div className="mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors bg-white border-gray-300 peer-checked:border-green-500 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1">{checked && <Check size={12} strokeWidth={3} className="text-green-500" />}</div>
				<input type="hidden" name="emailOffers" value={checked ? "true" : "false"} />
				<span className="text-sm text-gray-700">{t.emailMeOffers}</span>
			</label>
		</div>
	);
}

function ErrorBox({ message }: { message: string }) {
	return <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm mt-4">{message}</div>;
}

function SubmitBtn({ label, loading, disabled, t }: { label: string; loading: boolean; disabled?: boolean; t: (typeof CHECKOUT_COPY)[keyof typeof CHECKOUT_COPY] }) {
	return (
		<button type="submit" disabled={loading || disabled} className="mt-5 w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
			{loading ? t.processing : label}
		</button>
	);
}

// ── Step 1: Customer ──────────────────────────────────────────────────────────

interface CustomerSummary {
	firstName: string;
	lastName: string;
	email: string;
	/** Guest checkout only collects email — name is filled in later, at the Shipping step. */
	isGuest?: boolean;
}

function CustomerStep({ initialValues, onComplete }: { initialValues?: { firstName: string; lastName: string; emailAddress: string } | null; onComplete: (s: CustomerSummary) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];

	// One email field handles all three paths. Submitting it always tries the guest path
	// first (setCustomerForOrder) — if that email already belongs to an account, Vendure
	// returns EmailAddressConflictError and a password field appears in place, no separate
	// "are you new or returning" choice required up front.
	const [needsPassword, setNeedsPassword] = useState(false);
	const [newsletterChecked, setNewsletterChecked] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const fetcher = useFetcher<{
		error?: string;
		setCustomerForOrder?: Record<string, unknown>;
		login?: Record<string, unknown>;
		activeCustomer?: { id: string; firstName: string; lastName: string; emailAddress: string } | null;
	}>();
	const submittedEmailRef = useRef("");
	const busy = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		const d = fetcher.data;

		if (d.error) {
			setError(d.error);
			return;
		}

		// Resolved via the activeCustomer fetch triggered below — after either a password
		// login or a social login (LOGIN_MUTATION alone doesn't return a name).
		if (d.activeCustomer) {
			onComplete({ firstName: d.activeCustomer.firstName, lastName: d.activeCustomer.lastName, email: d.activeCustomer.emailAddress });
			return;
		}

		if (d.setCustomerForOrder) {
			const r = d.setCustomerForOrder;
			if (r.__typename === "Order") {
				// Name isn't collected here — only at the Shipping step, where it's
				// re-submitted via the same "guest" intent to fill in the real name.
				onComplete({ firstName: "", lastName: "", email: submittedEmailRef.current, isGuest: true });
			} else if (r.__typename === "EmailAddressConflictError") {
				setNeedsPassword(true);
			} else {
				setError((r.message as string) || t.couldNotProceedAsGuest);
			}
			return;
		}

		if (d.login) {
			const r = d.login;
			if (r.__typename === "CurrentUser") {
				fetcher.load(`/api/checkout?intent=activeCustomer&lang=${locale}`);
			} else {
				setError((r.message as string) || t.loginFailed);
			}
		}
	}, [fetcher.data, fetcher.state]);

	// Passed to SocialAuthButtons instead of leaving onSuccess unset — without this,
	// a successful Google/Facebook login falls back to a full window.location.reload(),
	// which is jarring mid-checkout. This resolves the new session's identity and
	// advances in place instead.
	function handleSocialSuccess() {
		fetcher.load(`/api/checkout?intent=activeCustomer&lang=${locale}`);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const email = (fd.get("email") as string) ?? "";
		setError(null);
		if (!needsPassword) {
			submittedEmailRef.current = email;
			fetcher.submit({ _intent: "guest", firstName: "", lastName: "", emailAddress: email, emailOffers: newsletterChecked ? "true" : "false" }, { method: "post", encType: "application/json", action: "/api/checkout" });
		} else {
			const password = (fd.get("password") as string) ?? "";
			fetcher.submit({ _intent: "login", username: email, password }, { method: "post", encType: "application/json", action: "/api/checkout" });
		}
	}

	return (
		<div className="pt-2">
			<SocialAuthButtons dividerLabel={t.or} onSuccess={handleSocialSuccess} emailOffers={newsletterChecked} />
			<form onSubmit={handleSubmit}>
				<FieldGroup>
					<Field label={t.emailAddress} name="email" type="email" required defaultValue={initialValues?.emailAddress} readOnly={needsPassword} />
					{needsPassword && (
						<div className="sm:col-span-2">
							<div className="flex items-center justify-between mb-1">
								<label htmlFor="checkout-password" className="block text-sm font-medium text-gray-700">
									{t.password}
									<span className="text-red-500 ms-1">*</span>
								</label>
								<Link to="/forgot-password?redirect=/checkout" className="text-xs text-primary hover:underline">
									{t.forgotPassword}
								</Link>
							</div>
							{/* eslint-disable-next-line jsx-a11y/no-autofocus */}
							<input id="checkout-password" name="password" type="password" required autoFocus className="w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
						</div>
					)}
				</FieldGroup>

				{needsPassword ? <p className="text-xs text-gray-500 -mt-2 mb-3">{t.emailAlreadyRegisteredNote}</p> : <NewsletterConsent checked={newsletterChecked} onChange={setNewsletterChecked} t={t} />}

				{error && <ErrorBox message={error} />}
				<SubmitBtn label={needsPassword ? t.loginAndContinue : t.continueLabel} loading={busy} t={t} />
				<TermsHint t={t} />

				{needsPassword && (
					<button
						type="button"
						onClick={() => {
							setNeedsPassword(false);
							setError(null);
						}}
						className="block mx-auto mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
					>
						{t.useDifferentEmail}
					</button>
				)}
			</form>
		</div>
	);
}

// ── Step 2: Shipping (address + method, merged so rates update live once a zone is picked) ──

interface UpdatedOrderTotals {
	shippingWithTax: number;
	totalWithTax: number;
	subTotalWithTax: number;
}

interface ShippingAddressValues {
	firstName: string;
	lastName: string;
	streetLine1: string;
	streetLine2?: string;
	city: string;
	postalCode: string;
	phoneNumber?: string;
}

function ShippingStep({
	currency,
	initialValues,
	initialMethodId,
	initialMode,
	customerName,
	onDraftChange,
	onMethodChange,
	onComplete,
}: {
	currency: string;
	initialValues?: ShippingAddressValues | null;
	initialMethodId?: string | null;
	initialMode?: "address" | "pickup";
	customerName?: { firstName: string; lastName: string; email?: string; isGuest?: boolean } | null;
	onDraftChange?: (values: ShippingAddressValues) => void;
	onMethodChange?: (methodId: string) => void;
	onComplete: (summary: string, method: ShippingMethod, totals: UpdatedOrderTotals) => void;
}) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const [mode, setMode] = useState<"address" | "pickup">(initialMode ?? "address");
	const [error, setError] = useState<string | null>(null);
	const [zoneList, setZoneList] = useState<number[]>(() => {
		if (!initialValues?.city) return [];
		const zone = qatarZones.find((z) => z.municipality === initialValues.city);
		return zone ? zone.zoneCodes : [];
	});
	const [addressSaved, setAddressSaved] = useState(false);
	const [methods, setMethods] = useState<ShippingMethod[]>([]);
	const [selectedMethod, setSelectedMethod] = useState<string | null>(initialMethodId ?? null);
	const formRef = useRef<HTMLFormElement>(null);
	const addressSummaryRef = useRef<string>("");

	const addressFetcher = useFetcher<{ error?: string; setOrderShippingAddress?: Record<string, unknown> }>();
	const methodsFetcher = useFetcher<{ shippingMethods?: ShippingMethod[]; error?: string }>();
	const saveMethodFetcher = useFetcher<{ setOrderShippingMethod?: Record<string, unknown>; error?: string }>();

	const savingAddress = addressFetcher.state !== "idle";
	const loadingMethods = methodsFetcher.state !== "idle";
	const savingMethod = saveMethodFetcher.state !== "idle";
	const busy = savingAddress || loadingMethods || savingMethod;

	// Reads the form's current values and saves the shipping address — used both by the
	// explicit submit button and automatically the moment a zone is picked, so shipping
	// rates can appear without an extra step/click.
	function saveAddress() {
		if (!formRef.current || savingAddress) return false;
		const fd = new FormData(formRef.current);
		const values: ShippingAddressValues = {
			firstName: (fd.get("firstName") as string) ?? "",
			lastName: (fd.get("lastName") as string) ?? "",
			streetLine1: (fd.get("streetLine1") as string) ?? "",
			streetLine2: (fd.get("streetLine2") as string) || undefined,
			city: (fd.get("city") as string) ?? "",
			postalCode: (fd.get("postalCode") as string) ?? "",
			phoneNumber: (fd.get("phoneNumber") as string) || undefined,
		};
		onDraftChange?.(values);
		// Only the zone is required to kick off a live rate quote — name/street can still be
		// blank at this point and get filled in (and re-saved) before the final submit.
		if (!values.postalCode.trim()) return false;

		addressSummaryRef.current = `${values.firstName} ${values.lastName} · ${values.streetLine1}, ${values.city}, ${t.zoneOption(Number(values.postalCode))}`;
		const body: Record<string, string> = { _intent: "setShippingAddress", firstName: values.firstName, lastName: values.lastName, streetLine1: values.streetLine1, city: values.city, countryCode: "QA", province: "Doha", postalCode: values.postalCode };
		if (values.streetLine2) body.streetLine2 = values.streetLine2;
		if (values.phoneNumber) body.phoneNumber = values.phoneNumber;
		setError(null);
		addressFetcher.submit(body, { method: "post", encType: "application/json", action: "/api/checkout" });
		return true;
	}

	// Store Pickup: only firstName/lastName/phoneNumber come from the customer — the rest
	// of the address is the store's own fixed location, not a zone-driven form.
	function savePickupAddress() {
		if (!formRef.current || savingAddress) return;
		const fd = new FormData(formRef.current);
		const firstName = (fd.get("firstName") as string) ?? "";
		const lastName = (fd.get("lastName") as string) ?? "";
		const phoneNumber = (fd.get("phoneNumber") as string) || undefined;
		const values: ShippingAddressValues = { firstName, lastName, phoneNumber, streetLine1: STORE_PICKUP_ADDRESS.streetLine1, city: STORE_PICKUP_ADDRESS.city, postalCode: STORE_PICKUP_ADDRESS.postalCode };
		onDraftChange?.(values);
		addressSummaryRef.current = `${firstName} ${lastName} · ${t.storePickup}`;
		const body: Record<string, string> = { _intent: "setShippingAddress", firstName, lastName, streetLine1: STORE_PICKUP_ADDRESS.streetLine1, city: STORE_PICKUP_ADDRESS.city, countryCode: STORE_PICKUP_ADDRESS.countryCode, province: STORE_PICKUP_ADDRESS.province, postalCode: STORE_PICKUP_ADDRESS.postalCode };
		if (phoneNumber) body.phoneNumber = phoneNumber;
		setError(null);
		addressFetcher.submit(body, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	function handleModeChange(next: "address" | "pickup") {
		if (next === mode) return;
		setMode(next);
		setAddressSaved(false);
		setMethods([]);
		setSelectedMethod(null);
		setError(null);
		if (next === "pickup") savePickupAddress();
	}

	function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const zone = qatarZones.find((z) => z.municipality === e.target.value);
		setZoneList(zone ? zone.zoneCodes : []);
		// Municipality changed — any previously fetched rates are stale
		setAddressSaved(false);
		setMethods([]);
		setSelectedMethod(null);
	}

	function handleZoneChange() {
		setMethods([]);
		setSelectedMethod(null);
		saveAddress();
	}

	// If we already have a zone on mount — whether from the order's own saved address (guest)
	// or the logged-in customer's address book — (re)save it to THIS order first, then fetch
	// rates. A book address isn't attached to the order yet, so we can't just trust it and
	// skip straight to fetching methods; saveAddress() confirms it against the order for real.
	// Resuming a checkout that previously saved a Store Pickup shipping line takes the pickup
	// path instead.
	useEffect(() => {
		if (mode === "pickup") {
			savePickupAddress();
		} else if (initialValues?.postalCode) {
			saveAddress();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (addressFetcher.state !== "idle" || !addressFetcher.data) return;
		const d = addressFetcher.data;
		if (d.error) {
			setError(d.error);
			return;
		}
		if (d.setOrderShippingAddress) {
			const r = d.setOrderShippingAddress;
			if (r.__typename === "Order") {
				setAddressSaved(true);
				methodsFetcher.load(`/api/checkout?intent=shippingMethods&lang=${locale}`);
			} else {
				setError((r.message as string) || t.couldNotSaveAddress);
			}
		}
	}, [addressFetcher.data, addressFetcher.state]);

	// Store Pickup selects the store-pickup-coded method implicitly (no radio list shown);
	// Ship to Address filters that same method OUT of the list the customer picks from.
	useEffect(() => {
		if (!methodsFetcher.data) return;
		if (methodsFetcher.data.shippingMethods) {
			const list = methodsFetcher.data.shippingMethods;
			setMethods(list);
			if (mode === "pickup") {
				const pickupMethod = list.find((m) => m.code === STORE_PICKUP_METHOD_CODE);
				if (pickupMethod) {
					setSelectedMethod(pickupMethod.id);
					onMethodChange?.(pickupMethod.id);
				} else {
					setError(t.pickupUnavailable);
				}
			} else {
				const deliveryOnly = list.filter((m) => m.code !== STORE_PICKUP_METHOD_CODE);
				if (deliveryOnly.length > 0) {
					setSelectedMethod((prev) => {
						const next = prev && deliveryOnly.some((m) => m.id === prev) ? prev : deliveryOnly[0].id;
						onMethodChange?.(next);
						return next;
					});
				}
			}
		}
		if (methodsFetcher.data.error) setError(methodsFetcher.data.error);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [methodsFetcher.data]);

	useEffect(() => {
		if (saveMethodFetcher.state !== "idle" || !saveMethodFetcher.data) return;
		const d = saveMethodFetcher.data;
		if (d.error) {
			setError(d.error);
			return;
		}
		if (d.setOrderShippingMethod) {
			const r = d.setOrderShippingMethod;
			if (r.__typename === "Order") {
				const method = methods.find((m) => m.id === selectedMethod)!;
				const totals: UpdatedOrderTotals = { shippingWithTax: r.shippingWithTax as number, totalWithTax: r.totalWithTax as number, subTotalWithTax: r.subTotalWithTax as number };
				const methodLabel = `${method.name} — ${method.priceWithTax === 0 ? t.free : fmt(method.priceWithTax, currency, locale)}`;
				onComplete(`${addressSummaryRef.current} · ${methodLabel}`, method, totals);
			} else {
				setError((r.message as string) || t.couldNotSetShippingMethod);
			}
		}
	}, [saveMethodFetcher.data, saveMethodFetcher.state]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!addressSaved || !selectedMethod) return;
		setError(null);
		// Guest checkout only collected an email — now that we have their real name for the
		// shipping address, re-submit it via the same "guest" intent so the customer record
		// (not just this order's address) ends up with a real name too. Fire-and-forget: the
		// email was already validated in step 1, so this shouldn't fail in practice.
		if (customerName?.isGuest && customerName.email && formRef.current) {
			const fd = new FormData(formRef.current);
			const firstName = (fd.get("firstName") as string) ?? "";
			const lastName = (fd.get("lastName") as string) ?? "";
			fetch("/api/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ _intent: "guest", firstName, lastName, emailAddress: customerName.email }),
			}).catch(() => {});
		}
		saveMethodFetcher.submit({ _intent: "setShippingMethod", shippingMethodId: selectedMethod }, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	// Safety net: if the zone was picked before the other required fields were filled in
	// (so the auto-save on zone change had nothing to submit), retry once those fields are
	// blurred — keeps rate-fetching fully automatic without a manual "Get Rates" step.
	// Only relevant in address mode — pickup has no zone gate.
	function handleFieldBlur(e: React.FocusEvent<HTMLFormElement>) {
		if (mode !== "address") return;
		const name = (e.target as unknown as { name?: string }).name;
		if (!name) return;
		if (!["firstName", "lastName", "streetLine1", "city"].includes(name)) return;
		if (addressSaved || savingAddress) return;
		if (!(formRef.current?.elements.namedItem("postalCode") as HTMLSelectElement | null)?.value) return;
		saveAddress();
	}

	const deliveryMethods = methods.filter((m) => m.code !== STORE_PICKUP_METHOD_CODE);
	const noMethodsAvailable = mode === "address" && addressSaved && !loadingMethods && deliveryMethods.length === 0;

	return (
		<form ref={formRef} onSubmit={handleSubmit} onBlur={handleFieldBlur} className="pt-2">
			<input type="hidden" name="countryCode" value="QA" />
			<input type="hidden" name="province" value="Doha" />

			{/* Ship to Address / Store Pickup toggle */}
			<div className="grid grid-cols-2 gap-3 mb-6">
				<button type="button" onClick={() => handleModeChange("address")} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-colors ${mode === "address" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
					<Truck size={18} /> {t.shipToAddress}
				</button>
				<button type="button" onClick={() => handleModeChange("pickup")} className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-colors ${mode === "pickup" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
					<Store size={18} /> {t.storePickup}
				</button>
			</div>

			<FieldGroup>
				<Field label={t.firstName} name="firstName" required className="sm:col-span-1" defaultValue={initialValues?.firstName || customerName?.firstName} />
				<Field label={t.lastName} name="lastName" required className="sm:col-span-1" defaultValue={initialValues?.lastName || customerName?.lastName} />

				{mode === "address" ? (
					<>
						<Field label={t.addressLabel} name="streetLine1" required defaultValue={initialValues?.streetLine1} />
						<Field label={t.street} name="streetLine2" className="sm:col-span-2" defaultValue={initialValues?.streetLine2} />
						<Select name="city" autoComplete="locality" placeholder={t.selectMunicipality} required label={t.municipality} className="sm:col-span-1" defaultValue={initialValues?.city} onChange={handleCityChange}>
							{qatarZones.map((z, index) => (
								<option key={index} value={z.municipality}>
									{z.municipality}
								</option>
							))}
						</Select>
						<Select name="postalCode" autoComplete="postal-code" placeholder={t.selectZone} required label={t.zone} className="sm:col-span-1" defaultValue={initialValues?.postalCode} onChange={handleZoneChange}>
							{zoneList.map((zone, index) => (
								<option key={index} value={`${zone}`}>
									{t.zoneOption(zone)}
								</option>
							))}
						</Select>
					</>
				) : (
					<div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
						<MapPin size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-gray-700">{t.pickupFromStoreNote}</p>
							<p className="text-sm text-gray-500 mt-0.5">
								{STORE_PICKUP_ADDRESS.streetLine1}, {STORE_PICKUP_ADDRESS.city}
							</p>
						</div>
					</div>
				)}

				<Field label={t.phoneNumber} name="phoneNumber" type="tel" placeholder="+974 xxxx xxxx" className="sm:col-span-2" required={mode === "pickup"} defaultValue={initialValues?.phoneNumber} />
			</FieldGroup>

			{/* Shipping rates — address mode only; pickup selects its method implicitly */}
			{mode === "address" && (loadingMethods || deliveryMethods.length > 0 || noMethodsAvailable) && (
				<div className="mt-5 pt-5 border-t border-gray-100">
					<p className="text-sm font-semibold text-gray-700 mb-3">{t.shippingMethod}</p>

					{loadingMethods && (
						<div className="flex items-center gap-3 py-4 text-gray-500 text-sm">
							<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
							{t.calculatingRates}
						</div>
					)}

					{noMethodsAvailable && !error && <p className="text-gray-500 text-sm py-2">{t.noShippingMethods}</p>}

					{!loadingMethods && deliveryMethods.length > 0 && (
						<div className="space-y-3">
							{deliveryMethods.map((m) => (
								<label key={m.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedMethod === m.id ? "border-lime-400 bg-lime-50" : "border-gray-200 hover:border-gray-300"}`}>
									<input
										type="radio"
										name="shippingMethod"
										value={m.id}
										checked={selectedMethod === m.id}
										onChange={() => {
											setSelectedMethod(m.id);
											onMethodChange?.(m.id);
										}}
										className="accent-lime-400 flex-shrink-0"
									/>
									<Truck size={20} className="text-gray-400 flex-shrink-0" />
									<div className="flex-1 min-w-0">
										<p className="font-medium text-gray-900">{m.name}</p>
										{/* A <div>, not a <p> — Vendure's description is itself HTML that already
										    includes a <p>, and a <p> can't validly nest inside another <p>.
										    [&_p]:m-0 strips that inner tag's own browser-default margin so the
										    text stays compact instead of picking up extra vertical space. */}
										{m.description && <div className="text-sm text-gray-500 mt-0.5 [&_p]:m-0" dangerouslySetInnerHTML={{ __html: m.description }} />}
									</div>
									<p className="font-semibold text-gray-900 flex-shrink-0">{m.priceWithTax === 0 ? <span className="text-green-600">{t.free}</span> : fmt(m.priceWithTax, currency, locale)}</p>
								</label>
							))}
						</div>
					)}
				</div>
			)}

			{mode === "pickup" && loadingMethods && (
				<div className="flex items-center gap-3 py-4 text-gray-500 text-sm mt-5 pt-5 border-t border-gray-100">
					<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
					{t.calculatingRates}
				</div>
			)}

			{error && <ErrorBox message={error} />}

			{mode === "address" && !addressSaved && !savingAddress && <p className="text-center text-xs text-gray-400 mt-4">{t.selectZonePrompt}</p>}

			<SubmitBtn label={t.continueToPayment} loading={busy} disabled={!selectedMethod || noMethodsAvailable} t={t} />
		</form>
	);
}

// ── Step 4: Payment ───────────────────────────────────────────────────────────

function PaymentStep({ isActive, total, currency, orderCode, onComplete }: { isActive: boolean; total: number; currency: string; orderCode: string; onComplete: (orderCode: string) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const [methods, setMethods] = useState<PaymentMethod[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [sadadMetadata, setSadadMetadata] = useState<SadadPaymentMetadata | null>(null);
	const [skipcashRedirecting, setSkipcashRedirecting] = useState(false);
	const loadFetcher = useFetcher<{ paymentMethods?: PaymentMethod[]; error?: string }>();
	const payFetcher = useFetcher<{
		addPaymentToOrder?: Record<string, unknown>;
		sadadMetadata?: SadadPaymentMetadata;
		skipcashCheckout?: SkipCashCheckoutResult;
		error?: string;
	}>();
	const loading = payFetcher.state !== "idle";
	const loadingMethods = loadFetcher.state !== "idle";

	useEffect(() => {
		if (isActive && methods.length === 0 && loadFetcher.state === "idle") {
			loadFetcher.load(`/api/checkout?intent=paymentMethods&lang=${locale}`);
		}
	}, [isActive, locale]);

	useEffect(() => {
		if (!loadFetcher.data) return;
		if (loadFetcher.data.paymentMethods) {
			const eligible = loadFetcher.data.paymentMethods.filter((m) => m.isEligible);
			// Online Payment (SkipCash) always sorts first, regardless of API order.
			const sorted = eligible.slice().sort((a, b) => Number(b.code === SKIPCASH_METHOD_CODE) - Number(a.code === SKIPCASH_METHOD_CODE));
			setMethods(sorted);
			if (sorted.length > 0) setSelected(sorted[0].code);
		}
		if (loadFetcher.data.error) setError(loadFetcher.data.error);
	}, [loadFetcher.data]);

	useEffect(() => {
		if (payFetcher.state !== "idle" || !payFetcher.data) return;
		const d = payFetcher.data;
		if (d.error) {
			setError(d.error);
			return;
		}
		if (d.sadadMetadata) {
			setSadadMetadata(d.sadadMetadata);
			return;
		}
		if (d.skipcashCheckout) {
			// SkipCash is a hosted redirect, not an embedded form like Sadad — this leaves
			// the SPA entirely. SkipCash's Return URL is a fixed portal setting (no way to
			// embed the order code dynamically), so stash it for checkout.success.tsx to
			// pick back up via sessionStorage when the customer comes back.
			sessionStorage.setItem("pendingOrderCode", orderCode);
			setSkipcashRedirecting(true);
			window.location.href = d.skipcashCheckout.payUrl;
			return;
		}
		if (d.addPaymentToOrder) {
			const r = d.addPaymentToOrder;
			if (r.__typename === "Order") {
				onComplete(r.code as string);
			} else {
				const msg = (r.paymentErrorMessage as string) || (r.eligibilityCheckerMessage as string) || (r.message as string) || t.paymentFailed;
				setError(msg);
			}
		}
	}, [payFetcher.data, payFetcher.state]);

	function handlePay() {
		if (!selected) return;
		setError(null);
		payFetcher.submit({ _intent: "addPayment", method: selected, metadata: {} }, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	const paymentIcons: Record<string, React.ReactNode> = {
		[SKIPCASH_METHOD_CODE]: <CreditCard size={20} className="text-gray-400 flex-shrink-0" />,
		default: <Banknote size={20} className="text-gray-400 flex-shrink-0" />,
	};

	if (sadadMetadata) {
		return <SadadCheckoutForm metadata={sadadMetadata} />;
	}

	if (skipcashRedirecting) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
				<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
				<p className="text-gray-600">{t.redirectingToSkipCash}</p>
			</div>
		);
	}

	return (
		<div className="pt-2">
			{loadingMethods && (
				<div className="flex items-center gap-3 py-6 text-gray-500 text-sm">
					<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
					{t.loadingPaymentOptions}
				</div>
			)}

			{!loadingMethods && methods.length === 0 && !error && <p className="text-gray-500 text-sm py-4">{t.noPaymentMethods}</p>}

			{methods.length > 0 && (
				<div className="grid grid-cols-1 gap-3 mb-2">
					{methods.map((m) => (
						<label key={m.code} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selected === m.code ? "border-lime-400 bg-lime-50" : "border-gray-200 hover:border-gray-300"}`}>
							<input type="radio" name="paymentMethod" value={m.code} checked={selected === m.code} onChange={() => setSelected(m.code)} className="accent-lime-400 flex-shrink-0" />
							{paymentIcons[m.code] ?? paymentIcons.default}
							<div className="flex-1">
								<div className="flex items-center gap-2 flex-wrap">
									<p className="font-medium text-gray-900">{m.name}</p>
									{m.code === SKIPCASH_METHOD_CODE && (
										<div className="flex items-center gap-1" aria-label={t.acceptedPaymentMethods}>
											{PAYMENT_ICON_IDS.map((id) => (
												<img key={id} src={`/images/payments/PAY-${id}.jpg`} alt="" className="border border-[#ccc] object-contain" style={{ height: "24px", width: "40px" }} width={40} height={24} />
											))}
										</div>
									)}
								</div>
								{m.eligibilityMessage && <p className="text-sm text-yellow-600 mt-0.5">{m.eligibilityMessage}</p>}
							</div>
						</label>
					))}
				</div>
			)}

			{error && <ErrorBox message={error} />}

			<button type="button" onClick={handlePay} disabled={!selected || loading || methods.length === 0} className="mt-5 w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3.5 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-base">
				<ShieldCheck size={18} />
				{loading ? t.processingPayment : t.placeOrder(fmt(total, currency, locale))}
			</button>

			<p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
				<ShieldCheck size={12} />
				{t.securePaymentNote}
			</p>
		</div>
	);
}

// ── Coupon Form ───────────────────────────────────────────────────────────────

type CouponUpdate = Pick<ActiveOrder, "totalWithTax" | "subTotalWithTax" | "discounts" | "couponCodes">;

function CouponForm({ orderState, onApplied }: { orderState: string; onApplied: (updates: CouponUpdate) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const [code, setCode] = useState("");
	const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
	const fetcher = useFetcher<{ applyCouponCode?: Record<string, unknown>; error?: string }>();
	const isLocked = orderState === "ArrangingPayment";
	const isBusy = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		const r = fetcher.data.applyCouponCode;
		if (!r) return;
		if (r.__typename === "Order") {
			setCode("");
			setToast({ type: "success", message: t.couponApplied });
			onApplied({
				totalWithTax: r.totalWithTax as number,
				subTotalWithTax: r.subTotalWithTax as number,
				discounts: r.discounts as OrderDiscount[],
				couponCodes: r.couponCodes as string[],
			});
		} else {
			setToast({ type: "error", message: (r.message as string) || t.invalidCoupon });
		}
	}, [fetcher.data, fetcher.state]);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), 4500);
		return () => clearTimeout(timer);
	}, [toast]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!code.trim() || isLocked || isBusy) return;
		fetcher.submit({ _intent: "applyCoupon", couponCode: code.trim() }, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	if (isLocked) {
		return (
			<div className="px-5 py-3 border-t border-gray-100">
				<p className="text-xs text-gray-400 text-center italic">{t.couponLockedNote}</p>
			</div>
		);
	}

	return (
		<div className="px-5 py-4 border-t border-gray-100">
			{toast && (
				<div className={`flex items-start gap-2 mb-3 px-3 py-2 rounded text-sm ${toast.type === "error" ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
					<span className="flex-1">{toast.message}</span>
					<button type="button" onClick={() => setToast(null)} className="flex-shrink-0 opacity-60 hover:opacity-100">
						<X size={14} />
					</button>
				</div>
			)}
			<form onSubmit={handleSubmit} className="flex gap-2">
				<div className="relative flex-1">
					<Tag size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
					<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t.couponCode} className="w-full border border-gray-300 rounded-full ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase placeholder:normal-case" />
				</div>
				<button type="submit" disabled={!code.trim() || isBusy} className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
					{isBusy ? "…" : t.apply}
				</button>
			</form>
		</div>
	);
}

// ── Order Summary Panel ───────────────────────────────────────────────────────

function OrderSummaryPanel({ order, vendureBase, onOrderUpdate }: { order: ActiveOrder; vendureBase: string; onOrderUpdate: (updates: CouponUpdate) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const discounts = order.discounts?.filter((d) => d.amountWithTax < 0) ?? [];
	// Collapsed by default on mobile — only the header + shipping/total show until
	// tapped open. Always fully expanded on desktop regardless of this state.
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="lg:sticky lg:top-6">
			<button type="button" onClick={() => setExpanded((e) => !e)} className="w-full text-start px-5 py-4 border-b border-gray-200 flex items-center gap-2">
				<Package size={18} className="text-gray-500" />
				<h2 className="font-semibold text-gray-900">{t.orderSummary}</h2>
				<span className="ms-auto text-sm text-gray-500">{itemsCountLabel(order.totalQuantity, locale)}</span>
				<ChevronDown size={18} className={`text-gray-400 lg:hidden flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
			</button>

			{/* Coupon form stays out of the collapse — applying a code shouldn't require
			    expanding the full item list first. Rendered once here (not duplicated
			    inside the expanded section below) for both the collapsed and open states. */}
			<div className="lg:hidden px-5 py-3 border-b border-gray-200">
				<CouponForm orderState={order.state} onApplied={onOrderUpdate} />
			</div>

			{/* Condensed summary — mobile only, shown while collapsed */}
			{!expanded && (
				<div className="lg:hidden px-5 py-3 border-b border-gray-200 space-y-1.5">
					<div className="flex justify-between text-sm text-gray-600">
						<span>{t.shipping}</span>
						<span>{order.shippingWithTax > 0 ? fmt(order.shippingWithTax, order.currencyCode, locale) : "—"}</span>
					</div>
					<div className="flex justify-between font-bold text-gray-900 text-base">
						<span>{t.total}</span>
						<span>{fmt(order.totalWithTax, order.currencyCode, locale)}</span>
					</div>
				</div>
			)}

			<div className={`${expanded ? "" : "hidden"} lg:block`}>
			<div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
				{order.lines.map((line) => {
					const img = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview;
					return (
						<div key={line.id} className="flex gap-3 p-4">
							{img ? <img src={resolveImg(img, vendureBase)} alt={line.productVariant.product.name} className="w-14 h-14 object-cover rounded border border-gray-200 flex-shrink-0" /> : <div className="w-14 h-14 bg-gray-100 rounded flex-shrink-0" />}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">{line.productVariant.product.name}</p>
								<p className="text-xs text-gray-500 mt-0.5 truncate">{line.productVariant.name}</p>
								{line.customFields?.subscriptionPlanId && (
									<div className="flex items-center gap-1.5 flex-wrap mt-1">
										<span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
											<Repeat size={10} /> {t.subscribeAndSave}
										</span>
										{line.productVariant.priceWithTax > line.unitPriceWithTax && (
											<span className="text-[10px] font-semibold text-orange-600">
												{t.saveAmount(fmt((line.productVariant.priceWithTax - line.unitPriceWithTax) * line.quantity, order.currencyCode, locale))}
											</span>
										)}
									</div>
								)}
								<p className="text-xs text-gray-400 mt-0.5">{t.qty}: {line.quantity}</p>
							</div>
							<div className="flex flex-col items-end flex-shrink-0">
								{line.discountedLinePriceWithTax < line.linePriceWithTax ? (
									<>
										<span className="text-xs text-gray-400 line-through">{fmt(line.linePriceWithTax, order.currencyCode, locale)}</span>
										<span className="text-sm font-semibold text-green-600">{fmt(line.discountedLinePriceWithTax, order.currencyCode, locale)}</span>
									</>
								) : (
									<span className="text-sm font-semibold text-gray-900">{fmt(line.linePriceWithTax, order.currencyCode, locale)}</span>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Coupon form — between items list and totals on desktop. On mobile it's
			    already shown above (outside the collapse), so it's skipped here to
			    avoid rendering it twice when the mobile summary is expanded. */}
			<div className="hidden lg:block">
				<CouponForm orderState={order.state} onApplied={onOrderUpdate} />
			</div>

			<div className="p-5 border-t border-gray-200 space-y-3">
				{/* Discount lines — before subtotal */}
				{discounts.map((d, i) => (
					<div key={i} className="flex justify-between text-sm text-green-600">
						<span className="flex items-center gap-1 truncate">
							<Package size={12} className="flex-shrink-0" />
							{d.description?.replace(/__bundle_discount_auto__/i, t.bundleDiscount) ?? d.description ?? t.discount}
						</span>
						<span className="flex-shrink-0 ms-2">−{fmt(Math.abs(d.amountWithTax), order.currencyCode, locale)}</span>
					</div>
				))}

				<div className="flex justify-between text-sm text-gray-600">
					<span>{t.subtotal}</span>
					<span>{fmt(order.subTotalWithTax, order.currencyCode, locale)}</span>
				</div>

				<div className="flex justify-between text-sm text-gray-600">
					<span>{t.shipping}</span>
					<span>{order.shippingWithTax > 0 ? fmt(order.shippingWithTax, order.currencyCode, locale) : "—"}</span>
				</div>
				<div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
					<span>{t.total}</span>
					<span>{fmt(order.totalWithTax, order.currencyCode, locale)}</span>
				</div>
			</div>
			</div>
		</div>
	);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
	const { activeOrder: initialOrder, activeCustomer, vendureBase } = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const { setCartCount } = useCart();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];

	const [initialState] = useState(() => deriveCheckoutState(initialOrder!, activeCustomer, locale));
	const [step, setStep] = useState(initialState.step);
	const [completed, setCompleted] = useState<number[]>(initialState.completed);
	const [order, setOrder] = useState(initialOrder!);
	const [customerName, setCustomerName] = useState<{ firstName: string; lastName: string; email?: string; isGuest?: boolean } | null>(initialState.orderCustomer ? { firstName: initialState.orderCustomer.firstName, lastName: initialState.orderCustomer.lastName } : null);
	const [shippingAddressDraft, setShippingAddressDraft] = useState<ShippingAddressValues | null>(initialState.shippingAddressDraft);
	const [shippingMethodDraft, setShippingMethodDraft] = useState<string | null>(initialState.shippingMethodDraft);

	function complete(n: number) {
		setCompleted((prev) => [...new Set([...prev, n])]);
		setStep(n + 1);
	}

	function goTo(n: number) {
		if (completed.includes(n - 1) || n === 1) setStep(n);
	}

	// Breaks out of CheckoutLayout's centered `container mx-auto` so the background
	// reaches the true viewport edges — but only the background. The actual content
	// (form + order summary) is re-contained right below at the exact same width as
	// the header (logo/language toggle), so its left/right edges line up with them
	// instead of floating wider than the rest of the page.
	const fullBleed = "w-screen ml-[calc(-50vw+50%)] mr-[calc(-50vw+50%)]";

	return (
		<CheckoutLayout>
			{/* Cancels <main>'s py-8 for this page only, so the two-tone split runs flush
			    against the header and into the trust-badges bar / footer below, with no
			    visible gray gap. */}
			<div className="-mt-8 -mb-8">
			{/* White is the base layer across the full viewport width; the order summary
			    column paints gray only from its own (container-aligned) edge outward via
			    the bleed strip below, rather than the 70/30 split being computed against
			    the full viewport like the white/gray boundary used to be. */}
			<div className={`${fullBleed} bg-white`}>
				<div className="container mx-auto">
				<div className="flex flex-col lg:flex-row">
				<div className="lg:w-[65%]">
					{/* All three steps render in sequence (Casper-style) — only the active
					    step's form is expanded; completed steps collapse to a clickable
					    numbered header, upcoming ones stay dimmed and inert. Centered within
					    the white panel rather than pinned to either edge. */}
					<div className="max-w-2xl mx-auto px-4 py-8">
						<Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
							<ChevronDown size={14} className="rotate-90 rtl:-rotate-90" />
							{t.continueShopping}
						</Link>

						<StepSection num={1} label={t.customerInformation} active={step === 1} completed={completed.includes(1)} onNavigate={() => goTo(1)}>
							<CustomerStep
								initialValues={initialState.orderCustomer}
								onComplete={(s) => {
									setCustomerName({ firstName: s.firstName, lastName: s.lastName, email: s.email, isGuest: s.isGuest });
									complete(1);
								}}
							/>
						</StepSection>

						<StepSection num={2} label={t.shipping} active={step === 2} completed={completed.includes(2)} onNavigate={() => goTo(2)}>
							<ShippingStep
								currency={order.currencyCode}
								initialValues={shippingAddressDraft}
								initialMethodId={shippingMethodDraft}
								initialMode={initialState.shippingModeDraft}
								customerName={customerName}
								onDraftChange={setShippingAddressDraft}
								onMethodChange={setShippingMethodDraft}
								onComplete={(_summary, _method, totals) => {
									setOrder((prev) => ({ ...prev, ...totals }));
									complete(2);
								}}
							/>
						</StepSection>

						<StepSection num={3} label={t.payment} active={step === 3} completed={completed.includes(3)} onNavigate={() => goTo(3)}>
							<PaymentStep
								isActive={step === 3}
								total={order.totalWithTax}
								currency={order.currencyCode}
								orderCode={order.code}
								onComplete={(orderCode) => {
									complete(3);
									setCartCount(0);
									navigate(localizePath(`/order-confirmation?code=${orderCode}`, locale));
								}}
							/>
						</StepSection>
					</div>
				</div>

				{/* Order Summary — stays on top on mobile, collapsed to just the total by default */}
				<div className="order-first lg:order-last lg:w-[35%] bg-gray-50 relative">
					{/* Extends the gray background from this column's own (container-aligned)
					    outer edge out to the true viewport edge — mirrors automatically since
					    "end" means right in LTR and left in RTL. */}
					<div className="hidden lg:block absolute inset-y-0 start-full w-[50vw] bg-gray-50" />
					<div className="px-4 py-8 lg:sticky lg:top-6">
						<OrderSummaryPanel order={order} vendureBase={vendureBase} onOrderUpdate={(updates) => setOrder((prev) => ({ ...prev, ...updates }))} />
					</div>
				</div>
				</div>
				</div>
			</div>
			</div>
		</CheckoutLayout>
	);
}