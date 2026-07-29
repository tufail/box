import { useState, useEffect, useRef } from "react";
import { useLoaderData, useFetcher, useNavigate, useLocation, redirect } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/checkout";
import { graphqlRequest } from "workers/graphqlClient";
import { ACTIVE_ORDER_QUERY, type ActiveOrder, type ActiveOrderData, type OrderDiscount } from "~/graphql/order";
import { ACTIVE_CUSTOMER_QUERY, type ActiveCustomer, type ShippingMethod, type PaymentMethod } from "~/graphql/checkout";
import { Check, ChevronDown, Truck, CreditCard, ShieldCheck, Package, Tag, X } from "lucide-react";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import SocialAuthButtons from "~/components/SocialAuthButtons";
import { useCart } from "~/context/CartContext";
import { qatarZones } from "~/constants/qatar";
import { SadadCheckoutForm } from "~/components/SadadCheckoutForm";
import type { SadadPaymentMetadata } from "~/types/sadad";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";

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
		emailMeOffers: "Email me with news and offers",
		subscribeAgreement: "By subscribing you agree to our",
		unsubscribeNote: ". You can unsubscribe at any time.",
		guest: "Guest",
		login: "Login",
		register: "Register",
		firstName: "First Name",
		lastName: "Last Name",
		emailAddress: "Email Address",
		password: "Password",
		phoneNumber: "Phone Number",
		minPasswordChars: "Minimum 8 characters",
		orSignInWithEmail: "Or sign in with email",
		orSignUpWithEmail: "Or sign up with email",
		loginFailed: "Login failed. Check your credentials.",
		couldNotProceedAsGuest: "Could not proceed as guest.",
		continueAsGuest: "Continue as Guest",
		loginAndContinue: "Login & Continue",
		createAccountAndContinue: "Create Account & Continue",
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
		emailMeOffers: "أرسلوا لي الأخبار والعروض عبر البريد الإلكتروني",
		subscribeAgreement: "بالاشتراك، فإنك توافق على",
		unsubscribeNote: ". يمكنك إلغاء الاشتراك في أي وقت.",
		guest: "زائر",
		login: "تسجيل الدخول",
		register: "إنشاء حساب",
		firstName: "الاسم الأول",
		lastName: "اسم العائلة",
		emailAddress: "البريد الإلكتروني",
		password: "كلمة المرور",
		phoneNumber: "رقم الهاتف",
		minPasswordChars: "8 أحرف على الأقل",
		orSignInWithEmail: "أو سجّل الدخول عبر البريد الإلكتروني",
		orSignUpWithEmail: "أو أنشئ حسابًا عبر البريد الإلكتروني",
		loginFailed: "فشل تسجيل الدخول. تحقق من بيانات الاعتماد الخاصة بك.",
		couldNotProceedAsGuest: "تعذّرت المتابعة كزائر.",
		continueAsGuest: "المتابعة كزائر",
		loginAndContinue: "تسجيل الدخول والمتابعة",
		createAccountAndContinue: "إنشاء حساب والمتابعة",
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
	const t = CHECKOUT_COPY[locale];
	const orderCustomer = activeCustomer ?? (order.customer ? { firstName: order.customer.firstName, lastName: order.customer.lastName, emailAddress: order.customer.emailAddress } : null);
	const customerSummary = orderCustomer ? `${orderCustomer.firstName} ${orderCustomer.lastName} — ${orderCustomer.emailAddress}` : null;

	const addressDraft = deriveShippingDraft(order);
	const shippingLine = order.shippingLines[0] ?? null;
	const shippingConfirmed = order.state === "ArrangingPayment";

	const completed: number[] = [];
	if (orderCustomer) completed.push(1);
	if (shippingConfirmed) completed.push(2);

	const shippingSummary =
		shippingConfirmed && addressDraft && shippingLine
			? `${addressDraft.firstName} ${addressDraft.lastName} · ${addressDraft.streetLine1}, ${addressDraft.city}, ${t.zoneOption(Number(addressDraft.postalCode))} · ${shippingLine.shippingMethod.name} — ${shippingLine.priceWithTax === 0 ? t.free : fmt(shippingLine.priceWithTax, order.currencyCode, locale)}`
			: null;

	const step = shippingConfirmed ? 3 : orderCustomer ? 2 : 1;

	return {
		step,
		completed,
		orderCustomer,
		customerSummary,
		shippingSummary,
		shippingAddressDraft: addressDraft,
		shippingMethodDraft: shippingLine?.shippingMethod.id ?? null,
	};
}

// ── Step wrapper ──────────────────────────────────────────────────────────────

function StepPanel({ num, title, isActive, isCompleted, canOpen, onOpen, summary, children }: { num: number; title: string; isActive: boolean; isCompleted: boolean; canOpen: boolean; onOpen: () => void; summary?: string; children: React.ReactNode }) {
	return (
		<div className={`rounded-2xl border-2 bg-white overflow-hidden transition-all ${isActive ? "border-primary shadow-sm" : "border-gray-200"}`}>
			<button type="button" onClick={isCompleted && !isActive && canOpen ? onOpen : undefined} className={`w-full flex items-center gap-4 p-5 text-left ${isCompleted && !isActive ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}>
				<div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCompleted ? "bg-lime-300 text-black" : isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}>{isCompleted ? <Check size={14} /> : num}</div>
				<div className="flex-1 min-w-0">
					<p className={`font-semibold ${isActive || isCompleted ? "text-gray-900" : "text-gray-400"}`}>{title}</p>
					{isCompleted && !isActive && summary && <p className="text-sm text-gray-500 truncate mt-0.5">{summary}</p>}
				</div>
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
					<ChevronDown size={16} className={`text-gray-400 transition-transform ${isActive ? "rotate-180" : ""}`} />
				</div>
			</button>
			{isActive && <div className="px-5 pb-6 border-t border-gray-100 pt-4">{children}</div>}
		</div>
	);
}

// ── Shared form primitives ────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, name, type = "text", required, placeholder, className = "sm:col-span-2", defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; className?: string; defaultValue?: string }) {
	return (
		<div className={className}>
			<label className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ms-1">*</span>}
			</label>
			<input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} className="w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
		</div>
	);
}

function Select({ label, name, autoComplete, placeholder, required, className = "sm:col-span-2", defaultValue = "", onChange, children }: { label: string; name: string; autoComplete?: string; placeholder?: string; required?: boolean; className?: string; defaultValue?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
	return (
		<div className={className}>
			<label className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ms-1">*</span>}
			</label>
			<div className="relative">
				<select
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
			<label className="flex items-start gap-2.5 cursor-pointer select-none" onClick={() => onChange(!checked)}>
				<div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors bg-white ${checked ? "border-green-500" : "border-gray-300"}`}>{checked && <Check size={12} strokeWidth={3} className="text-green-500" />}</div>
				<input type="hidden" name="emailOffers" value={checked ? "true" : "false"} />
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
	name: string;
	email: string;
}

function CustomerStep({ initialValues, onComplete }: { initialValues?: { firstName: string; lastName: string; emailAddress: string } | null; onComplete: (s: CustomerSummary) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const [tab, setTab] = useState<"guest" | "login" | "register">("guest");
	const [error, setError] = useState<string | null>(null);
	const [newsletterChecked, setNewsletterChecked] = useState(true);
	const fetcher = useFetcher<{
		error?: string;
		login?: Record<string, unknown>;
		setCustomerForOrder?: Record<string, unknown>;
		registered?: boolean;
	}>();
	const submittedRef = useRef<CustomerSummary | null>(null);
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		const d = fetcher.data;

		if (d.error) {
			setError(d.error);
			return;
		}

		if (d.login) {
			const r = d.login;
			if (r.__typename === "CurrentUser") {
				const email = r.identifier as string;
				onComplete(submittedRef.current ?? { name: "", email });
			} else {
				setError((r.message as string) || t.loginFailed);
			}
		}

		if (d.setCustomerForOrder) {
			const r = d.setCustomerForOrder;
			if (r.__typename === "Order") {
				onComplete(submittedRef.current!);
			} else {
				setError((r.message as string) || t.couldNotProceedAsGuest);
			}
		}
	}, [fetcher.data, fetcher.state]);

	function submit(body: Record<string, string>) {
		setError(null);
		fetcher.submit(body, {
			method: "post",
			encType: "application/json",
			action: "/api/checkout",
		});
	}

	function handleGuest(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const first = fd.get("firstName") as string;
		const last = fd.get("lastName") as string;
		const email = fd.get("emailAddress") as string;
		submittedRef.current = { name: `${first} ${last}`.trim(), email };
		submit({ _intent: "guest", firstName: first, lastName: last, emailAddress: email });
	}

	function handleLogin(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const username = fd.get("email") as string;
		const password = fd.get("password") as string;
		submittedRef.current = { name: "", email: username };
		submit({ _intent: "login", username, password });
	}

	function handleRegister(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const first = fd.get("firstName") as string;
		const last = fd.get("lastName") as string;
		const email = fd.get("emailAddress") as string;
		const password = fd.get("password") as string;
		const phoneNumber = fd.get("phoneNumber") as string;
		submittedRef.current = { name: `${first} ${last}`.trim(), email };
		const emailOffers = fd.get("emailOffers") as string;
		const body: Record<string, string> = { _intent: "register", firstName: first, lastName: last, emailAddress: email, password, emailOffers };
		if (phoneNumber) body.phoneNumber = phoneNumber;
		submit(body);
	}

	const tabs = [
		{ id: "guest" as const, label: t.guest },
		{ id: "login" as const, label: t.login },
		{ id: "register" as const, label: t.register },
	];
	const activeTabIndex = tabs.findIndex((tb) => tb.id === tab);

	return (
		<div className="pt-2">
			{/* Tab bar — sliding pill */}
			<div className="relative flex bg-gray-100 rounded-full p-1 mb-6">
				<div
					className="absolute top-1 bottom-1 start-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out"
					style={{ transform: `translateX(${(locale === "ar" ? -1 : 1) * activeTabIndex * 100}%)` }}
				/>
				{tabs.map((tb) => (
					<button
						key={tb.id}
						type="button"
						onClick={() => {
							setTab(tb.id);
							setError(null);
						}}
						className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-full transition-colors ${tab === tb.id ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
					>
						{tb.label}
					</button>
				))}
			</div>

			{tab === "guest" && (
				<form onSubmit={handleGuest}>
					<FieldGroup>
						<Field label={t.firstName} name="firstName" required className="sm:col-span-1" defaultValue={initialValues?.firstName} />
						<Field label={t.lastName} name="lastName" required className="sm:col-span-1" defaultValue={initialValues?.lastName} />
						<Field label={t.emailAddress} name="emailAddress" type="email" required defaultValue={initialValues?.emailAddress} />
					</FieldGroup>
					<NewsletterConsent checked={newsletterChecked} onChange={setNewsletterChecked} t={t} />
					{error && <ErrorBox message={error} />}
					<SubmitBtn label={t.continueAsGuest} loading={loading} t={t} />
					<TermsHint t={t} />
				</form>
			)}

			{tab === "login" && (
				<>
					<SocialAuthButtons dividerLabel={t.orSignInWithEmail} />
					<form onSubmit={handleLogin}>
						<FieldGroup>
							<Field label={t.emailAddress} name="email" type="email" required />
							<Field label={t.password} name="password" type="password" required />
						</FieldGroup>
						{error && <ErrorBox message={error} />}
						<SubmitBtn label={t.loginAndContinue} loading={loading} t={t} />
					</form>
				</>
			)}

			{tab === "register" && (
				<>
					<SocialAuthButtons dividerLabel={t.orSignUpWithEmail} emailOffers={newsletterChecked} />
					<form onSubmit={handleRegister}>
						<FieldGroup>
							<Field label={t.firstName} name="firstName" required className="sm:col-span-1" />
							<Field label={t.lastName} name="lastName" required className="sm:col-span-1" />
							<Field label={t.emailAddress} name="emailAddress" type="email" required />
							<Field label={t.password} name="password" type="password" required placeholder={t.minPasswordChars} />
							<Field label={t.phoneNumber} name="phoneNumber" type="tel" placeholder="+974 xxxx xxxx" />
						</FieldGroup>
						<NewsletterConsent checked={newsletterChecked} onChange={setNewsletterChecked} t={t} />
						{error && <ErrorBox message={error} />}
						<SubmitBtn label={t.createAccountAndContinue} loading={loading} t={t} />
						<TermsHint t={t} />
					</form>
				</>
			)}
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
	onDraftChange,
	onMethodChange,
	onComplete,
}: {
	currency: string;
	initialValues?: ShippingAddressValues | null;
	initialMethodId?: string | null;
	onDraftChange?: (values: ShippingAddressValues) => void;
	onMethodChange?: (methodId: string) => void;
	onComplete: (summary: string, method: ShippingMethod, totals: UpdatedOrderTotals) => void;
}) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
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
		if (!formRef.current || savingAddress) return;
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
	useEffect(() => {
		if (initialValues?.postalCode) {
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
				methodsFetcher.load("/api/checkout?intent=shippingMethods");
			} else {
				setError((r.message as string) || t.couldNotSaveAddress);
			}
		}
	}, [addressFetcher.data, addressFetcher.state]);

	useEffect(() => {
		if (!methodsFetcher.data) return;
		if (methodsFetcher.data.shippingMethods) {
			const list = methodsFetcher.data.shippingMethods;
			setMethods(list);
			if (list.length > 0) {
				setSelectedMethod((prev) => {
					const next = prev && list.some((m) => m.id === prev) ? prev : list[0].id;
					onMethodChange?.(next);
					return next;
				});
			}
		}
		if (methodsFetcher.data.error) setError(methodsFetcher.data.error);
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
		saveMethodFetcher.submit({ _intent: "setShippingMethod", shippingMethodId: selectedMethod }, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	// Safety net: if the zone was picked before the other required fields were filled in
	// (so the auto-save on zone change had nothing to submit), retry once those fields are
	// blurred — keeps rate-fetching fully automatic without a manual "Get Rates" step.
	function handleFieldBlur(e: React.FocusEvent<HTMLFormElement>) {
		const name = (e.target as unknown as { name?: string }).name;
		if (!name) return;
		if (!["firstName", "lastName", "streetLine1", "city"].includes(name)) return;
		if (addressSaved || savingAddress) return;
		if (!(formRef.current?.elements.namedItem("postalCode") as HTMLSelectElement | null)?.value) return;
		saveAddress();
	}

	const noMethodsAvailable = addressSaved && !loadingMethods && methods.length === 0;

	return (
		<form ref={formRef} onSubmit={handleSubmit} onBlur={handleFieldBlur} className="pt-2">
			<input type="hidden" name="countryCode" value="QA" />
			<input type="hidden" name="province" value="Doha" />

			<FieldGroup>
				<Field label={t.firstName} name="firstName" required className="sm:col-span-1" defaultValue={initialValues?.firstName} />
				<Field label={t.lastName} name="lastName" required className="sm:col-span-1" defaultValue={initialValues?.lastName} />
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
				<Field label={t.phoneNumber} name="phoneNumber" type="tel" placeholder="+974 xxxx xxxx" className="sm:col-span-2" defaultValue={initialValues?.phoneNumber} />
			</FieldGroup>

			{/* Shipping rates — appear inline as soon as the zone is picked, no extra step needed */}
			{(loadingMethods || methods.length > 0 || noMethodsAvailable) && (
				<div className="mt-5 pt-5 border-t border-gray-100">
					<p className="text-sm font-semibold text-gray-700 mb-3">{t.shippingMethod}</p>

					{loadingMethods && (
						<div className="flex items-center gap-3 py-4 text-gray-500 text-sm">
							<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
							{t.calculatingRates}
						</div>
					)}

					{noMethodsAvailable && !error && <p className="text-gray-500 text-sm py-2">{t.noShippingMethods}</p>}

					{!loadingMethods && methods.length > 0 && (
						<div className="space-y-3">
							{methods.map((m) => (
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
										{m.description && <p className="text-sm text-gray-500 mt-0.5">{m.description}</p>}
									</div>
									<p className="font-semibold text-gray-900 flex-shrink-0">{m.priceWithTax === 0 ? <span className="text-green-600">{t.free}</span> : fmt(m.priceWithTax, currency, locale)}</p>
								</label>
							))}
						</div>
					)}
				</div>
			)}

			{error && <ErrorBox message={error} />}

			{!addressSaved && !savingAddress && <p className="text-center text-xs text-gray-400 mt-4">{t.selectZonePrompt}</p>}

			<SubmitBtn label={t.continueToPayment} loading={busy} disabled={!selectedMethod || noMethodsAvailable} t={t} />
		</form>
	);
}

// ── Step 4: Payment ───────────────────────────────────────────────────────────

function PaymentStep({ isActive, total, currency, onComplete }: { isActive: boolean; total: number; currency: string; onComplete: (orderCode: string) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const [methods, setMethods] = useState<PaymentMethod[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [sadadMetadata, setSadadMetadata] = useState<SadadPaymentMetadata | null>(null);
	const loadFetcher = useFetcher<{ paymentMethods?: PaymentMethod[]; error?: string }>();
	const payFetcher = useFetcher<{
		addPaymentToOrder?: Record<string, unknown>;
		sadadMetadata?: SadadPaymentMetadata;
		error?: string;
	}>();
	const loading = payFetcher.state !== "idle";
	const loadingMethods = loadFetcher.state !== "idle";

	useEffect(() => {
		if (isActive && methods.length === 0 && loadFetcher.state === "idle") {
			loadFetcher.load("/api/checkout?intent=paymentMethods");
		}
	}, [isActive]);

	useEffect(() => {
		if (!loadFetcher.data) return;
		if (loadFetcher.data.paymentMethods) {
			const eligible = loadFetcher.data.paymentMethods.filter((m) => m.isEligible);
			setMethods(eligible);
			if (eligible.length > 0) setSelected(eligible[0].code);
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
		default: <CreditCard size={20} className="text-gray-400 flex-shrink-0" />,
	};

	if (sadadMetadata) {
		return <SadadCheckoutForm metadata={sadadMetadata} />;
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
				<div className="space-y-3 mb-2">
					{methods.map((m) => (
						<label key={m.code} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selected === m.code ? "border-lime-400 bg-lime-50" : "border-gray-200 hover:border-gray-300"}`}>
							<input type="radio" name="paymentMethod" value={m.code} checked={selected === m.code} onChange={() => setSelected(m.code)} className="accent-lime-400 flex-shrink-0" />
							{paymentIcons[m.code] ?? paymentIcons.default}
							<div className="flex-1">
								<p className="font-medium text-gray-900">{m.name}</p>
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

	return (
		<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden lg:sticky lg:top-6">
			<div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center gap-2">
				<Package size={18} className="text-gray-500" />
				<h2 className="font-semibold text-gray-900">{t.orderSummary}</h2>
				<span className="ms-auto text-sm text-gray-500">{itemsCountLabel(order.totalQuantity, locale)}</span>
			</div>

			<div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
				{order.lines.map((line) => {
					const img = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview;
					return (
						<div key={line.id} className="flex gap-3 p-4">
							{img ? <img src={resolveImg(img, vendureBase)} alt={line.productVariant.product.name} className="w-14 h-14 object-cover rounded border border-gray-200 flex-shrink-0" /> : <div className="w-14 h-14 bg-gray-100 rounded flex-shrink-0" />}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">{line.productVariant.product.name}</p>
								<p className="text-xs text-gray-500 mt-0.5 truncate">{line.productVariant.name}</p>
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

			{/* Coupon form — between items list and totals */}
			<CouponForm orderState={order.state} onApplied={onOrderUpdate} />

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
	const [customerSummary, setCustomerSummary] = useState<string | null>(initialState.customerSummary);
	const [shippingSummary, setShippingSummary] = useState<string | null>(initialState.shippingSummary);
	const [shippingAddressDraft, setShippingAddressDraft] = useState<ShippingAddressValues | null>(initialState.shippingAddressDraft);
	const [shippingMethodDraft, setShippingMethodDraft] = useState<string | null>(initialState.shippingMethodDraft);

	function complete(n: number) {
		setCompleted((prev) => [...new Set([...prev, n])]);
		setStep(n + 1);
	}

	function goTo(n: number) {
		if (completed.includes(n - 1) || n === 1) setStep(n);
	}

	return (
		<CheckoutLayout>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
				{/* Left — Steps */}
				<div className="lg:col-span-2 space-y-4">
					<Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
						<ChevronDown size={14} className="rotate-90 rtl:-rotate-90" />
						{t.continueShopping}
					</Link>
					<StepPanel num={1} title={t.customerInformation} isActive={step === 1} isCompleted={completed.includes(1)} canOpen onOpen={() => goTo(1)} summary={customerSummary ?? undefined}>
						<CustomerStep
							initialValues={initialState.orderCustomer}
							onComplete={(s) => {
								setCustomerSummary(s.name ? `${s.name} — ${s.email}` : s.email);
								complete(1);
							}}
						/>
					</StepPanel>

					<StepPanel num={2} title={t.shipping} isActive={step === 2} isCompleted={completed.includes(2)} canOpen={completed.includes(1)} onOpen={() => goTo(2)} summary={shippingSummary ?? undefined}>
						<ShippingStep
							currency={order.currencyCode}
							initialValues={shippingAddressDraft}
							initialMethodId={shippingMethodDraft}
							onDraftChange={setShippingAddressDraft}
							onMethodChange={setShippingMethodDraft}
							onComplete={(summary, _method, totals) => {
								setShippingSummary(summary);
								setOrder((prev) => ({ ...prev, ...totals }));
								complete(2);
							}}
						/>
					</StepPanel>

					<StepPanel num={3} title={t.payment} isActive={step === 3} isCompleted={completed.includes(3)} canOpen={completed.includes(2)} onOpen={() => goTo(3)}>
						<PaymentStep
							isActive={step === 3}
							total={order.totalWithTax}
							currency={order.currencyCode}
							onComplete={(orderCode) => {
								complete(3);
								setCartCount(0);
								navigate(localizePath(`/order-confirmation?code=${orderCode}`, locale));
							}}
						/>
					</StepPanel>
				</div>

				{/* Right — Summary (appears first on mobile) */}
				<div className="lg:col-span-1 order-first lg:order-last">
					<OrderSummaryPanel order={order} vendureBase={vendureBase} onOrderUpdate={(updates) => setOrder((prev) => ({ ...prev, ...updates }))} />
				</div>
			</div>
		</CheckoutLayout>
	);
}
