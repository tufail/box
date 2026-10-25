import { useState, useEffect, useRef } from "react";
import { useLoaderData, useFetcher, useNavigate, useLocation, redirect } from "react-router";
import Link from "~/components/LocaleLink";
import type { Route } from "./+types/checkout";
import { graphqlRequest } from "workers/graphqlClient";
import { ACTIVE_ORDER_QUERY, type ActiveOrder, type ActiveOrderData, type OrderDiscount } from "~/graphql/order";
import { ACTIVE_CUSTOMER_QUERY, type ActiveCustomer, type ShippingMethod, type PaymentMethod } from "~/graphql/checkout";
import type { CustomerAddress } from "~/graphql/account";
import { Check, ChevronDown, ChevronRight, Truck, CreditCard, ShieldCheck, Package, Tag, X, Repeat, Store, MapPin, Banknote, UserRound, Minus, Plus, Leaf, HelpCircle, Lock, Mail, Eye, EyeOff, PartyPopper, Home, Phone, ShoppingBag, BadgeCheck, type LucideIcon } from "lucide-react";
import CheckoutLayout from "~/layouts/CheckoutLayout";
import SocialAuthButtons from "~/components/SocialAuthButtons";
import { useCart } from "~/context/CartContext";
import { useNotification } from "~/context/NotificationContext";
import { municipalityForZone, areaLabelForZone, qatarAreasSorted } from "~/constants/qatar-areas";
import AreaSelect, { type AreaOption } from "~/components/AreaSelect";
import { GET_QATAR_SHIPPING_AREAS_QUERY, type QatarShippingAreasData } from "~/graphql/qatarShippingAreas";
import { SadadCheckoutForm } from "~/components/SadadCheckoutForm";
import type { SadadPaymentMetadata } from "~/types/sadad";
import type { SkipCashCheckoutResult } from "~/graphql/checkout";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";

// Which checkout customers get by default: true = the one-page checkout, false = the original
// multi-step flow (kept intact in this file; reachable at /checkout?classic=1 either way).
const DEFAULT_ONE_STEP = true;

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
	streetLine1: "AK Group Building Office no 2, 1st Floor Building No. 41, 343 Al Sadd St",
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
		customerInformationSubtitle: "Sign in or enter your email to continue",
		shipping: "Shipping",
		payment: "Payment",
		paymentSubtitle: "Choose your payment method",
		secureAndTrustedCheckout: "Secure & Trusted Checkout",
		free: "Free",
		processing: "Processing…",
		byContinuing: "By continuing, I agree to the",
		termsAndConditions: "Terms & Conditions",
		and: "and",
		privacyPolicy: "Privacy Policy",
		emailMeOffers: "Stay up to date with exclusive offers and news. Unsubscribe anytime.",
		forgotPassword: "Forgot password?",
		or: "OR",
		continueLabel: "Continue to Shipping",
		emailAlreadyRegisteredNote: "This email already has an account. Enter your password to continue.",
		welcomeBackTitle: "Welcome back! We found your account.",
		welcomeBackSubtitle: "Please enter your password to continue.",
		changeEmail: "Change",
		passwordPlaceholder: "Enter your password",
		showPassword: "Show password",
		hidePassword: "Hide password",
		useDifferentEmail: "Use a different email",
		shipToAddress: "Ship to Address",
		shipToAddressSubtitle: "Deliver to your location",
		storePickup: "Store Pickup",
		storePickupSubtitle: "Pick up from our store",
		pickupFromStoreNote: "You'll collect your order from our store:",
		pickupUnavailable: "Store pickup is currently unavailable for this order. Please choose Ship to Address.",
		firstName: "First Name",
		lastName: "Last Name",
		emailAddress: "Email Address",
		password: "Password",
		phoneNumber: "Phone Number",
		loginFailed: "Login failed. Check your credentials.",
		couldNotProceedAsGuest: "Could not proceed as guest.",
		couldNotReopenOrder: "Could not reopen your order for editing. Please try again.",
		loginAndContinue: "Continue Securely",
		shippingStepLabel: "Delivery Address",
		shippingStepSubtitle: "Where should we deliver your order?",
		firstNamePlaceholder: "Enter your first name",
		lastNamePlaceholder: "Enter your last name",
		addressPlaceholder: "E.g. Villa 12, Building 5, Block 3",
		streetPlaceholder: "Street name (optional)",
		saveAddressForFutureOrders: "Save this address for future orders",
		backToCustomerInformation: "← Back to Customer Information",
		addressLabel: "Address (Villa, Flat, Building & Block, etc.)",
		street: "Street",
		zone: "Area / Zone",
		selectZone: "Select your area...",
		savedAddresses: "Choose a delivery address",
		addNewAddress: "+ Add a new address",
		useSavedAddress: "← Choose a saved address",
		defaultBadge: "Default",
		couldNotSaveToAccount: "Address saved for this order, but could not be added to your account.",
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
		calculatedAtNextStep: "Calculated at next step",
		estimatedDelivery: "Estimated Delivery",
		estimatedDeliveryToday: "Today",
		estimatedDeliveryRange: "Today – Tomorrow in Doha",
		trustAuthentic: "100% Authentic",
		trustAuthenticSubtitle: "Genuine products only",
		trustSecure: "Secure Payment",
		trustSecureSubtitle: "Your data is protected",
		trustFastDelivery: "Fast Delivery",
		trustFastDeliverySubtitle: "Across Doha & Qatar",
		orderSummaryTagline: "Premium Sports Nutrition, Vitamins, Supplements & beauty products in Qatar.",
	},
	ar: {
		continueShopping: "متابعة التسوق",
		customerInformation: "معلومات العميل",
		customerInformationSubtitle: "سجّل الدخول أو أدخل بريدك الإلكتروني للمتابعة",
		shipping: "الشحن",
		payment: "الدفع",
		paymentSubtitle: "اختر طريقة الدفع",
		secureAndTrustedCheckout: "دفع آمن وموثوق",
		free: "مجاني",
		processing: "جارٍ المعالجة…",
		byContinuing: "بالمتابعة، أوافق على",
		termsAndConditions: "الشروط والأحكام",
		and: "و",
		privacyPolicy: "سياسة الخصوصية",
		emailMeOffers: "ابق على اطلاع بأحدث العروض الحصرية والأخبار. يمكنك إلغاء الاشتراك في أي وقت.",
		forgotPassword: "نسيت كلمة المرور؟",
		or: "أو",
		continueLabel: "المتابعة إلى الشحن",
		emailAlreadyRegisteredNote: "هذا البريد الإلكتروني مسجّل بحساب بالفعل. أدخل كلمة المرور للمتابعة.",
		welcomeBackTitle: "أهلاً بعودتك! وجدنا حسابك.",
		welcomeBackSubtitle: "يرجى إدخال كلمة المرور للمتابعة.",
		changeEmail: "تغيير",
		passwordPlaceholder: "أدخل كلمة المرور",
		showPassword: "إظهار كلمة المرور",
		hidePassword: "إخفاء كلمة المرور",
		useDifferentEmail: "استخدام بريد إلكتروني مختلف",
		shipToAddress: "التوصيل إلى عنوان",
		shipToAddressSubtitle: "التوصيل إلى موقعك",
		storePickup: "الاستلام من المتجر",
		storePickupSubtitle: "استلم طلبك من متجرنا",
		pickupFromStoreNote: "ستستلم طلبك من متجرنا:",
		pickupUnavailable: "خدمة الاستلام من المتجر غير متاحة حاليًا لهذا الطلب. يرجى اختيار التوصيل إلى عنوان.",
		firstName: "الاسم الأول",
		lastName: "اسم العائلة",
		emailAddress: "البريد الإلكتروني",
		password: "كلمة المرور",
		phoneNumber: "رقم الهاتف",
		loginFailed: "فشل تسجيل الدخول. تحقق من بيانات الاعتماد الخاصة بك.",
		couldNotProceedAsGuest: "تعذّرت المتابعة كزائر.",
		couldNotReopenOrder: "تعذّر إعادة فتح طلبك للتعديل. يرجى المحاولة مرة أخرى.",
		loginAndContinue: "المتابعة بأمان",
		shippingStepLabel: "عنوان التوصيل",
		shippingStepSubtitle: "أين يجب أن نوصل طلبك؟",
		firstNamePlaceholder: "أدخل اسمك الأول",
		lastNamePlaceholder: "أدخل اسم عائلتك",
		addressPlaceholder: "مثال: فيلا 12، مبنى 5، بلوك 3",
		streetPlaceholder: "اسم الشارع (اختياري)",
		saveAddressForFutureOrders: "حفظ هذا العنوان للطلبات المستقبلية",
		backToCustomerInformation: "← الرجوع إلى معلومات العميل",
		addressLabel: "العنوان (فيلا، شقة، مبنى وبلوك، إلخ.)",
		street: "الشارع",
		zone: "المنطقة / النطاق",
		selectZone: "اختر منطقتك...",
		savedAddresses: "اختر عنوان التوصيل",
		addNewAddress: "+ إضافة عنوان جديد",
		useSavedAddress: "← اختر عنوانًا محفوظًا",
		defaultBadge: "افتراضي",
		couldNotSaveToAccount: "تم حفظ العنوان لهذا الطلب، ولكن تعذّرت إضافته إلى حسابك.",
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
		calculatedAtNextStep: "يُحتسب في الخطوة التالية",
		estimatedDelivery: "التوصيل المتوقع",
		estimatedDeliveryToday: "اليوم",
		estimatedDeliveryRange: "اليوم – غدًا في الدوحة",
		trustAuthentic: "أصلي 100%",
		trustAuthenticSubtitle: "منتجات أصلية فقط",
		trustSecure: "دفع آمن",
		trustSecureSubtitle: "بياناتك محمية",
		trustFastDelivery: "توصيل سريع",
		trustFastDeliverySubtitle: "في الدوحة وجميع أنحاء قطر",
		orderSummaryTagline: "تغذية رياضية وفيتامينات ومكملات غذائية ومنتجات تجميل مميزة في قطر.",
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
	const [orderResult, customerResult, areasResult] = await Promise.allSettled([
		graphqlRequest<ActiveOrderData>(env, ACTIVE_ORDER_QUERY, undefined, { request }),
		graphqlRequest<{ activeCustomer: ActiveCustomer | null }>(env, ACTIVE_CUSTOMER_QUERY, undefined, { request }),
		graphqlRequest<QatarShippingAreasData>(env, GET_QATAR_SHIPPING_AREAS_QUERY, undefined, { request, cf: { cacheTtl: 3600, cacheEverything: true } }),
	]);

	const activeOrder = orderResult.status === "fulfilled" ? orderResult.value.data.activeOrder : null;
	const activeCustomer = customerResult.status === "fulfilled" ? customerResult.value.data.activeCustomer : null;
	const vendureBase = (env.VENDURE_SHOP_API ?? "http://localhost:3000/shop-api").replace("/shop-api", "");
	// Falls back to the bundled static list (with no backend id) if the live query fails --
	// the area picker still works for zone-number purposes, it just can't carry a
	// qatarAreaId in that degraded case.
	const qatarAreas: AreaOption[] = areasResult.status === "fulfilled" ? areasResult.value.data.qatarShippingAreas : qatarAreasSorted.map((a) => ({ ...a, id: "" }));

	if (!activeOrder || activeOrder.totalQuantity === 0) {
		return redirect(localizePath("/", locale));
	}

	return { activeOrder, activeCustomer, vendureBase, qatarAreas };
}

export function meta() {
	return [{ title: "Checkout - NutriBox" }, { name: "robots", content: "noindex, nofollow" }];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number, currency: string, locale: Locale) {
	return formatPrice(cents, currency, locale);
}

function resolveImg(preview: string, base: string) {
	return preview.startsWith("http") ? preview : `${base}${preview}`;
}

// Same-day delivery cuts off at 9pm Doha time (Qatar is a fixed UTC+3, no DST) — placing
// the order before that still lands today; any later and it's no longer guaranteed, so the
// wider Today–Tomorrow range is shown instead.
function estimatedDeliveryLabel(t: (typeof CHECKOUT_COPY)[keyof typeof CHECKOUT_COPY]): string {
	const dohaHour = new Date(Date.now() + 3 * 60 * 60 * 1000).getUTCHours();
	return dohaHour < 21 ? t.estimatedDeliveryToday : t.estimatedDeliveryRange;
}

// Maps an order shipping address or a customer address-book entry to the Shipping step's
// form shape — both share the same field names, just from different API sources.
function addressToShippingValues(addr: { fullName?: string | null; streetLine1: string | null; streetLine2?: string | null; city?: string | null; postalCode?: string | null; phoneNumber?: string | null; customFields?: { qatarAreaId: number | null } | null } | null | undefined): ShippingAddressValues | null {
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
		qatarAreaId: addr.customFields?.qatarAreaId != null ? String(addr.customFields.qatarAreaId) : undefined,
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
		// null = not logged in; an array (possibly empty) = a real customer's address book.
		// Deliberately activeCustomer.addresses, not derived from orderCustomer -- a guest
		// order still has its own order.customer record, which must NOT be mistaken for a
		// real logged-in account with an address book.
		initialAddresses: activeCustomer?.addresses ?? null,
	};
}

// ── Step section (numbered header + collapsible content, one per step) ────────

function StepSection({
	num,
	label,
	subtitle,
	icon: Icon,
	active,
	completed,
	onNavigate,
	children,
}: {
	num: number;
	label: string;
	subtitle: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	active: boolean;
	completed: boolean;
	onNavigate: () => void;
	children: React.ReactNode;
}) {
	const clickable = completed && !active;
	const dim = !active && !completed;
	return (
		<div className={`bg-white rounded-2xl border shadow-sm p-5 sm:p-6 transition-colors ${active ? "border-primary/40" : "border-gray-100"}`}>
			<button type="button" onClick={clickable ? onNavigate : undefined} className={`flex items-center gap-3.5 w-full text-start ${clickable ? "cursor-pointer" : "cursor-default"}`}>
				<div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${dim ? "bg-gray-100" : "bg-primary/10"}`}>
					<Icon size={18} className={dim ? "text-gray-400" : "text-primary"} />
				</div>
				<div className="flex-1 min-w-0">
					<span className={`block text-lg font-bold ${dim ? "text-gray-400" : "text-gray-900"}`}>{label}</span>
					<span className={`block text-sm ${dim ? "text-gray-300" : "text-gray-500"}`}>{subtitle}</span>
				</div>
				{!active && <ChevronRight size={18} className={`flex-shrink-0 rtl:rotate-180 ${dim ? "text-gray-300" : "text-gray-400"}`} />}
			</button>
			{active && <div className="mt-5 ps-0 sm:ps-[52px]">{children}</div>}
		</div>
	);
}

// ── Shared form primitives ────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, name, type = "text", required, placeholder, className = "sm:col-span-2", defaultValue, readOnly, icon: Icon }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; className?: string; defaultValue?: string; readOnly?: boolean; icon?: LucideIcon }) {
	return (
		<div className={className}>
			<label htmlFor={`checkout-${name}`} className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ms-1">*</span>}
			</label>
			<div className={Icon ? "relative flex items-center" : undefined}>
				{Icon && <Icon size={16} className="absolute start-4 text-gray-400 pointer-events-none flex-shrink-0" />}
				<input
					id={`checkout-${name}`}
					name={name}
					type={type}
					required={required}
					placeholder={placeholder}
					defaultValue={defaultValue}
					readOnly={readOnly}
					className={`w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${Icon ? "ps-9" : ""} ${readOnly ? "bg-gray-50 text-gray-500" : ""}`}
				/>
			</div>
		</div>
	);
}

// Qatar is the only market this checkout ships to (countryCode is hardcoded "QA"
// throughout) -- the flag+code prefix is a fixed display, not a real country picker.
const QATAR_COUNTRY_CODE = "+974";

function PhoneField({ label, required, defaultValue, className = "sm:col-span-1", onFieldBlur }: { label: string; required?: boolean; defaultValue?: string; className?: string; onFieldBlur?: () => void }) {
	const [local, setLocal] = useState(() => (defaultValue ? defaultValue.replace(QATAR_COUNTRY_CODE, "").trim() : ""));
	const combined = local.trim() ? `${QATAR_COUNTRY_CODE} ${local.trim()}` : "";
	return (
		<div className={className}>
			<label htmlFor="checkout-phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ms-1">*</span>}
			</label>
			<div className="flex items-center border border-gray-300 rounded-full focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
				<Phone size={16} className="ms-4 text-gray-400 flex-shrink-0 pointer-events-none" />
				<div className="flex items-center gap-1.5 ps-2 pe-2 border-e border-gray-200 flex-shrink-0">
					<span className="w-3.5 h-2.5 rounded-[2px] bg-[#8a1538] flex-shrink-0" aria-hidden="true" />
					<span className="text-sm text-gray-700">{QATAR_COUNTRY_CODE}</span>
					<ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
				</div>
				<input
					id="checkout-phoneNumber"
					type="tel"
					required={required}
					placeholder="XXXX XXXX"
					value={local}
					onChange={(e) => setLocal(e.target.value)}
					onBlur={onFieldBlur}
					className="flex-1 min-w-0 ps-2 pe-4 py-2.5 text-sm focus:outline-none rounded-e-full"
				/>
			</div>
			<input type="hidden" name="phoneNumber" value={combined} />
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
			<label className="flex items-center gap-3 cursor-pointer select-none">
				<button
					type="button"
					role="switch"
					aria-checked={checked}
					onClick={() => onChange(!checked)}
					className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${checked ? "bg-primary" : "bg-gray-300"}`}
				>
					<span className={`absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4 rtl:-translate-x-4" : "translate-x-0"}`} />
				</button>
				<input type="hidden" name="emailOffers" value={checked ? "true" : "false"} />
				<span className="text-sm text-gray-700">{t.emailMeOffers}</span>
			</label>
		</div>
	);
}

function ErrorBox({ message }: { message: string }) {
	return <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm mt-4">{message}</div>;
}

function SubmitBtn({
	label,
	loading,
	disabled,
	t,
	icon: Icon,
}: {
	label: string;
	loading: boolean;
	disabled?: boolean;
	t: (typeof CHECKOUT_COPY)[keyof typeof CHECKOUT_COPY];
	icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
	return (
		<button
			type="submit"
			disabled={loading || disabled}
			className="mt-5 w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
		>
			{loading ? (
				t.processing
			) : (
				<>
					{Icon && <Icon size={16} className="flex-shrink-0" />}
					{label}
					<ChevronRight size={18} className="rtl:rotate-180" />
				</>
			)}
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
	/** Only set for a real (non-guest) login — resolved via the activeCustomer fetch. */
	addresses?: CustomerAddress[];
}

function CustomerStep({ initialValues, onComplete }: { initialValues?: { firstName: string; lastName: string; emailAddress: string } | null; onComplete: (s: CustomerSummary) => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];

	// One email field handles all three paths. Submitting it always tries the guest path
	// first (setCustomerForOrder) — if that email already belongs to an account, Vendure
	// returns EmailAddressConflictError and a password field appears in place, no separate
	// "are you new or returning" choice required up front.
	const [needsPassword, setNeedsPassword] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [newsletterChecked, setNewsletterChecked] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const fetcher = useFetcher<{
		error?: string;
		setCustomerForOrder?: Record<string, unknown>;
		login?: Record<string, unknown>;
		activeCustomer?: { id: string; firstName: string; lastName: string; emailAddress: string; addresses?: CustomerAddress[] } | null;
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
			onComplete({ firstName: d.activeCustomer.firstName, lastName: d.activeCustomer.lastName, email: d.activeCustomer.emailAddress, addresses: d.activeCustomer.addresses ?? [] });
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
			} else if (r.__typename === "AlreadyLoggedInError") {
				// Reachable by navigating back to a completed Customer step and
				// re-submitting while already logged in (e.g. the order was already
				// attached to this session) -- there's nothing to fix here, they're
				// already the customer on this order, so just resolve their real
				// identity the same way a fresh login does and move on.
				fetcher.load(`/api/checkout?intent=activeCustomer&lang=${locale}`);
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

	function resetEmail() {
		setNeedsPassword(false);
		setShowPassword(false);
		setError(null);
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
			<SocialAuthButtons dividerLabel={t.or} onSuccess={handleSocialSuccess} emailOffers={newsletterChecked} mode="signin" />
			<form onSubmit={handleSubmit}>
				<FieldGroup>
					<div className="sm:col-span-2">
						<label htmlFor="checkout-email" className="block text-sm font-medium text-gray-700 mb-1">
							{t.emailAddress}
							<span className="text-red-500 ms-1">*</span>
						</label>
						<div className={`relative flex items-center rounded-full border ${needsPassword ? "bg-gray-50 border-gray-200" : "border-gray-300"}`}>
							<Mail size={16} className="absolute start-4 text-gray-400 pointer-events-none flex-shrink-0" />
							<input
								id="checkout-email"
								name="email"
								type="email"
								required
								defaultValue={initialValues?.emailAddress}
								readOnly={needsPassword}
								className={`w-full bg-transparent rounded-full ps-10 py-2.5 text-sm ${needsPassword ? "pe-24" : "pe-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"}`}
							/>
							{needsPassword && (
								<div className="absolute end-3 flex items-center gap-2">
									<span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
										<Check size={12} className="text-white" />
									</span>
									<span className="w-px h-4 bg-gray-300" />
									<button type="button" onClick={resetEmail} className="text-sm font-medium text-primary hover:underline whitespace-nowrap">
										{t.changeEmail}
									</button>
								</div>
							)}
						</div>
					</div>

					{needsPassword && (
						<div className="sm:col-span-2 flex items-start gap-3 rounded-2xl bg-primary/5 p-4">
							<span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
								<PartyPopper size={18} className="text-primary" />
							</span>
							<div>
								<p className="text-sm font-bold text-gray-900">{t.welcomeBackTitle}</p>
								<p className="text-sm text-gray-500 mt-0.5">{t.welcomeBackSubtitle}</p>
							</div>
						</div>
					)}

					{needsPassword && (
						<div className="sm:col-span-2">
							<label htmlFor="checkout-password" className="block text-sm font-medium text-gray-700 mb-1">
								{t.password}
								<span className="text-red-500 ms-1">*</span>
							</label>
							<div className="relative flex items-center">
								<Lock size={16} className="absolute start-4 text-gray-400 pointer-events-none flex-shrink-0" />
								{/* eslint-disable-next-line jsx-a11y/no-autofocus */}
								<input
									id="checkout-password"
									name="password"
									type={showPassword ? "text" : "password"}
									required
									autoFocus
									placeholder={t.passwordPlaceholder}
									className="w-full border border-gray-300 rounded-full ps-10 pe-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									aria-label={showPassword ? t.hidePassword : t.showPassword}
									className="absolute end-4 text-gray-400 hover:text-gray-600 transition-colors"
								>
									{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							<div className="text-end mt-1.5">
								<Link to="/forgot-password?redirect=/checkout" className="text-xs text-primary hover:underline">
									{t.forgotPassword}
								</Link>
							</div>
						</div>
					)}
				</FieldGroup>

				{!needsPassword && <NewsletterConsent checked={newsletterChecked} onChange={setNewsletterChecked} t={t} />}

				{error && <ErrorBox message={error} />}
				<SubmitBtn label={needsPassword ? t.loginAndContinue : t.continueLabel} loading={busy} t={t} icon={needsPassword ? Lock : undefined} />
				<TermsHint t={t} />

				{needsPassword && (
					<>
						<hr className="border-gray-100 mt-4" />
						<button type="button" onClick={resetEmail} className="block mx-auto mt-3 text-xs text-gray-500 hover:text-gray-700 underline">
							{t.useDifferentEmail}
						</button>
					</>
				)}

				<div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
					<span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
						<ShieldCheck size={14} className="text-primary flex-shrink-0" />
						{t.secureAndTrustedCheckout}
					</span>
					<div className="flex items-center gap-1" aria-label={t.acceptedPaymentMethods}>
						{PAYMENT_ICON_IDS.map((id) => (
							<img key={id} src={`/images/payments/PAY-${id}.jpg`} alt="" className="border border-[#ccc] object-contain rounded-md" style={{ height: "22px", width: "34px" }} width={34} height={22} />
						))}
					</div>
				</div>
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
	qatarAreaId?: string;
}

function ShippingStep({
	currency,
	areas,
	initialValues,
	initialMethodId,
	initialMode,
	customerName,
	savedAddresses,
	onDraftChange,
	onMethodChange,
	onComplete,
	onAddressSavedToAccount,
	onBack,
}: {
	currency: string;
	areas: AreaOption[];
	initialValues?: ShippingAddressValues | null;
	initialMethodId?: string | null;
	initialMode?: "address" | "pickup";
	customerName?: { firstName: string; lastName: string; email?: string; isGuest?: boolean } | null;
	/** null = not logged in (guest); an array (possibly empty) = a real customer's address book. */
	savedAddresses: CustomerAddress[] | null;
	onDraftChange?: (values: ShippingAddressValues) => void;
	onMethodChange?: (methodId: string) => void;
	onComplete: (summary: string, method: ShippingMethod, totals: UpdatedOrderTotals) => void;
	onAddressSavedToAccount?: (address: CustomerAddress) => void;
	onBack?: () => void;
}) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const { notify } = useNotification();
	const [mode, setMode] = useState<"address" | "pickup">(initialMode ?? "address");
	const [error, setError] = useState<string | null>(null);
	// Display-only label for the currently selected area -- kept in sync with the
	// AreaSelect so the order summary shows the actual neighborhood name picked (a zone
	// number can map to several named areas, so it can't be re-derived from postalCode
	// alone). For a pre-filled address (resumed checkout, saved address book entry)
	// without AreaSelect's onChange ever firing, prefers the exact area via
	// initialValues.qatarAreaId, falling back to a best-effort zone-only guess if that
	// isn't known (e.g. an address saved before this field existed).
	const [selectedAreaName, setSelectedAreaName] = useState<string>(() => {
		const exact = initialValues?.qatarAreaId ? areas.find((a) => a.id === initialValues.qatarAreaId) : undefined;
		if (exact) return locale === "ar" ? exact.nameAr : exact.nameEn;
		return initialValues?.postalCode ? areaLabelForZone(Number(initialValues.postalCode), locale) : "";
	});
	// AreaSelect is a controlled combobox (its hidden input isn't a native <select> whose
	// value updates in the DOM ahead of React), so the currently-picked zone lives in state
	// rather than being read back out of the form on demand.
	const [zone, setZone] = useState<string>(initialValues?.postalCode ?? "");
	// The specific area's backend row id -- pricing is looked up by this on the backend,
	// alongside postalCode (zone number) which keeps flowing exactly as before.
	const [areaId, setAreaId] = useState<string>(initialValues?.qatarAreaId ?? "");
	const [addressSaved, setAddressSaved] = useState(false);
	const [saveAddressChecked, setSaveAddressChecked] = useState(true);
	// A saved-address picker only makes sense for a logged-in customer who actually has
	// addresses on file, and only when the order doesn't already have one confirmed
	// (initialValues truthy = resuming a checkout that already picked/saved an address --
	// keep showing the freeform form pre-filled with that, same as before this feature).
	const hasSavedAddresses = !!savedAddresses && savedAddresses.length > 0;
	const [addressMode, setAddressMode] = useState<"saved" | "new">(hasSavedAddresses && !initialValues ? "saved" : "new");
	const [selectedSavedId, setSelectedSavedId] = useState<string | null>(() => {
		if (!hasSavedAddresses) return null;
		const def = savedAddresses!.find((a) => a.defaultShippingAddress);
		return (def ?? savedAddresses![0]).id;
	});
	const [methods, setMethods] = useState<ShippingMethod[]>([]);
	const [selectedMethod, setSelectedMethod] = useState<string | null>(initialMethodId ?? null);
	const formRef = useRef<HTMLFormElement>(null);
	const addressSummaryRef = useRef<string>("");
	// Mirrors selectedMethod so the methods-loaded effect below can read the latest value
	// without adding it as a dependency (that would re-run the effect on every method pick,
	// not just when new rates arrive) -- and without reaching for the setSelectedMethod
	// updater-function trick, which caused a real bug: calling onMethodChange (the parent's
	// setState) from inside that updater triggers React's "Cannot update a component while
	// rendering a different component" warning, since updater functions can run during render.
	const selectedMethodRef = useRef(selectedMethod);
	useEffect(() => {
		selectedMethodRef.current = selectedMethod;
	}, [selectedMethod]);

	const addressFetcher = useFetcher<{ error?: string; setOrderShippingAddress?: Record<string, unknown> }>();
	const methodsFetcher = useFetcher<{ shippingMethods?: ShippingMethod[]; error?: string }>();

	// True only while handleSubmit's own self-contained save→fetch→confirm sequence is
	// running -- separate from the two fetchers above, which drive the *live* rate
	// preview as the customer picks a zone and are no longer trusted as a precondition
	// for submitting (see handleSubmit).
	const [submitting, setSubmitting] = useState(false);
	const savingAddress = addressFetcher.state !== "idle";
	const loadingMethods = methodsFetcher.state !== "idle";
	const busy = savingAddress || loadingMethods || submitting;

	// Reads the form's current values and saves the shipping address — used both by the
	// explicit submit button and automatically the moment an area is picked, so shipping
	// rates can appear without an extra step/click. `overrides`, when passed from
	// handleZoneChange, carries the zone/label just picked directly — the hidden input's
	// DOM value lags a render behind the `zone` state right after setZone(), so reading
	// FormData in that same tick would still see the previous value.
	function saveAddress(overrides?: { postalCode?: string; areaLabel?: string; areaId?: string }) {
		// Guards on the full `busy` flag (not just savingAddress) so this live-preview
		// auto-save can't fire concurrently with handleSubmit's own authoritative
		// save->fetch->confirm sequence and race it -- e.g. blurring the phone field
		// (which happens as part of clicking Continue) used to kick off a second,
		// overlapping setOrderShippingAddress call right as submission started.
		if (!formRef.current || busy) return false;
		const fd = new FormData(formRef.current);
		const postalCode = overrides?.postalCode ?? zone;
		const pickedAreaId = overrides?.areaId ?? areaId;
		const values: ShippingAddressValues = {
			firstName: (fd.get("firstName") as string) ?? "",
			lastName: (fd.get("lastName") as string) ?? "",
			streetLine1: (fd.get("streetLine1") as string) ?? "",
			streetLine2: (fd.get("streetLine2") as string) || undefined,
			// No separate municipality field anymore -- the area list already covers every
			// zone, so the municipality is derived from whichever zone the customer picked.
			city: postalCode ? municipalityForZone(Number(postalCode), locale) : "",
			postalCode,
			phoneNumber: (fd.get("phoneNumber") as string) || undefined,
		};
		onDraftChange?.(values);
		// Only the zone is required to kick off a live rate quote — name/street can still be
		// blank at this point and get filled in (and re-saved) before the final submit.
		if (!values.postalCode.trim()) return false;

		const area = overrides?.areaLabel ?? selectedAreaName ?? areaLabelForZone(Number(values.postalCode), locale);
		addressSummaryRef.current = `${values.firstName} ${values.lastName} · ${values.streetLine1}, ${values.city}, ${area}`;
		const body: Record<string, string> = { _intent: "setShippingAddress", firstName: values.firstName, lastName: values.lastName, streetLine1: values.streetLine1, city: values.city, countryCode: "QA", province: "Doha", postalCode: values.postalCode };
		if (values.streetLine2) body.streetLine2 = values.streetLine2;
		if (values.phoneNumber) body.phoneNumber = values.phoneNumber;
		if (pickedAreaId) body.qatarAreaId = pickedAreaId;
		setError(null);
		addressFetcher.submit(body, { method: "post", encType: "application/json", action: "/api/checkout" });
		return true;
	}

	// Confirms a customer's saved address-book entry against THIS order -- mirrors
	// saveAddress()'s tail (same mutation, same state updates) but sources its values
	// from the picked CustomerAddress instead of reading the freeform form fields,
	// since in "saved" mode that form isn't rendered at all.
	function selectSavedAddress(addr: CustomerAddress) {
		// See saveAddress()'s busy guard -- same reasoning.
		if (busy) return;
		const values = addressToShippingValues(addr);
		if (!values) return;
		setSelectedSavedId(addr.id);
		setZone(values.postalCode);

		// A saved address's qatarAreaId can be missing (saved before this field existed)
		// or stale (its QatarShippingArea row was since deleted/renumbered) -- the backend's
		// eligibility checker requires it to resolve to a REAL, current area row with no
		// zone-only fallback of its own (qatar-area-eligibility-checker.ts just returns
		// false), so submitting it as-is would silently show zero shipping methods. Falls
		// back to a best-effort same-zone area, same idea AreaSelect already uses for a
		// postalCode-only value.
		const knownArea = values.qatarAreaId ? areas.find((a) => a.id === values.qatarAreaId) : undefined;
		const resolvedArea = knownArea ?? areas.find((a) => `${a.zoneNumber}` === values.postalCode);
		const resolvedAreaId = resolvedArea?.id ?? "";
		setAreaId(resolvedAreaId);

		const areaName = resolvedArea ? (locale === "ar" ? resolvedArea.nameAr : resolvedArea.nameEn) : areaLabelForZone(Number(values.postalCode), locale);
		setSelectedAreaName(areaName);
		setMethods([]);
		setSelectedMethod(null);
		onDraftChange?.(values);
		addressSummaryRef.current = `${values.firstName} ${values.lastName} · ${values.streetLine1}, ${values.city}, ${areaName}`;
		const body: Record<string, string> = { _intent: "setShippingAddress", firstName: values.firstName, lastName: values.lastName, streetLine1: values.streetLine1, city: values.city, countryCode: "QA", province: "Doha", postalCode: values.postalCode };
		if (values.streetLine2) body.streetLine2 = values.streetLine2;
		if (values.phoneNumber) body.phoneNumber = values.phoneNumber;
		if (resolvedAreaId) body.qatarAreaId = resolvedAreaId;
		setError(null);
		addressFetcher.submit(body, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	// Store Pickup: only firstName/lastName/phoneNumber come from the customer — the rest
	// of the address is the store's own fixed location, not a zone-driven form.
	function savePickupAddress() {
		// See saveAddress()'s busy guard -- same reasoning.
		if (!formRef.current || busy) return;
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
		// Switching back from pickup with a zone already known (picked before switching
		// away, or from a saved/resumed address) previously left rates stale until some
		// other trigger happened to fire -- refetch immediately, same as the pickup branch.
		else if (addressMode === "new" && zone) saveAddress();
		else if (addressMode === "saved" && selectedSavedId) {
			const addr = savedAddresses?.find((a) => a.id === selectedSavedId);
			if (addr) selectSavedAddress(addr);
		}
	}

	function handleZoneChange(zoneNumber: string, areaName: string, pickedAreaId: string) {
		setZone(zoneNumber);
		setAreaId(pickedAreaId);
		setSelectedAreaName(areaName);
		setMethods([]);
		setSelectedMethod(null);
		saveAddress({ postalCode: zoneNumber, areaLabel: areaName, areaId: pickedAreaId });
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
		} else if (addressMode === "saved" && selectedSavedId) {
			const addr = savedAddresses?.find((a) => a.id === selectedSavedId);
			if (addr) selectSavedAddress(addr);
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
					const prev = selectedMethodRef.current;
					const next = prev && deliveryOnly.some((m) => m.id === prev) ? prev : deliveryOnly[0].id;
					setSelectedMethod(next);
					onMethodChange?.(next);
				}
			}
		}
		if (methodsFetcher.data.error) setError(methodsFetcher.data.error);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [methodsFetcher.data]);

	// Deliberately self-contained: does its own save-address -> fetch-methods -> pick-one
	// -> confirm-method sequence with plain awaited fetches, instead of trusting that the
	// scattered live-preview side effects above (zone change, field blur, mode toggle,
	// saved-address pick) already ran. Those can all be skipped -- browser autofill firing
	// no blur event, an already-active address needing no interaction at all, switching
	// Ship-to-Address/Store-Pickup back and forth -- and a customer left staring at a
	// silently-disabled Continue button with no way to force it was the actual bug.
	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (busy) return;
		setError(null);

		let values: ShippingAddressValues;
		let addressBody: Record<string, string>;

		if (mode === "pickup") {
			if (!formRef.current) return;
			const fd = new FormData(formRef.current);
			const firstName = (fd.get("firstName") as string) ?? "";
			const lastName = (fd.get("lastName") as string) ?? "";
			const phoneNumber = (fd.get("phoneNumber") as string) || undefined;
			values = { firstName, lastName, phoneNumber, streetLine1: STORE_PICKUP_ADDRESS.streetLine1, city: STORE_PICKUP_ADDRESS.city, postalCode: STORE_PICKUP_ADDRESS.postalCode };
			addressBody = { _intent: "setShippingAddress", firstName, lastName, streetLine1: STORE_PICKUP_ADDRESS.streetLine1, city: STORE_PICKUP_ADDRESS.city, countryCode: STORE_PICKUP_ADDRESS.countryCode, province: STORE_PICKUP_ADDRESS.province, postalCode: STORE_PICKUP_ADDRESS.postalCode };
			if (phoneNumber) addressBody.phoneNumber = phoneNumber;
			addressSummaryRef.current = `${firstName} ${lastName} · ${t.storePickup}`;
		} else if (addressMode === "saved" && selectedSavedId && savedAddresses) {
			const addr = savedAddresses.find((a) => a.id === selectedSavedId);
			const addrValues = addr ? addressToShippingValues(addr) : null;
			if (!addr || !addrValues) {
				setError(t.couldNotSaveAddress);
				return;
			}
			const knownArea = addrValues.qatarAreaId ? areas.find((a) => a.id === addrValues.qatarAreaId) : undefined;
			const resolvedArea = knownArea ?? areas.find((a) => `${a.zoneNumber}` === addrValues.postalCode);
			const resolvedAreaId = resolvedArea?.id ?? "";
			const areaName = resolvedArea ? (locale === "ar" ? resolvedArea.nameAr : resolvedArea.nameEn) : areaLabelForZone(Number(addrValues.postalCode), locale);
			setAreaId(resolvedAreaId);
			setSelectedAreaName(areaName);
			values = addrValues;
			addressBody = { _intent: "setShippingAddress", firstName: addrValues.firstName, lastName: addrValues.lastName, streetLine1: addrValues.streetLine1, city: addrValues.city, countryCode: "QA", province: "Doha", postalCode: addrValues.postalCode };
			if (addrValues.streetLine2) addressBody.streetLine2 = addrValues.streetLine2;
			if (addrValues.phoneNumber) addressBody.phoneNumber = addrValues.phoneNumber;
			if (resolvedAreaId) addressBody.qatarAreaId = resolvedAreaId;
			addressSummaryRef.current = `${addrValues.firstName} ${addrValues.lastName} · ${addrValues.streetLine1}, ${addrValues.city}, ${areaName}`;
		} else {
			if (!formRef.current) return;
			if (!zone.trim()) {
				setError(t.selectZonePrompt);
				return;
			}
			const fd = new FormData(formRef.current);
			const postalCode = zone;
			values = {
				firstName: (fd.get("firstName") as string) ?? "",
				lastName: (fd.get("lastName") as string) ?? "",
				streetLine1: (fd.get("streetLine1") as string) ?? "",
				streetLine2: (fd.get("streetLine2") as string) || undefined,
				city: municipalityForZone(Number(postalCode), locale),
				postalCode,
				phoneNumber: (fd.get("phoneNumber") as string) || undefined,
			};
			const area = selectedAreaName || areaLabelForZone(Number(postalCode), locale);
			addressSummaryRef.current = `${values.firstName} ${values.lastName} · ${values.streetLine1}, ${values.city}, ${area}`;
			addressBody = { _intent: "setShippingAddress", firstName: values.firstName, lastName: values.lastName, streetLine1: values.streetLine1, city: values.city, countryCode: "QA", province: "Doha", postalCode: values.postalCode };
			if (values.streetLine2) addressBody.streetLine2 = values.streetLine2;
			if (values.phoneNumber) addressBody.phoneNumber = values.phoneNumber;
			if (areaId) addressBody.qatarAreaId = areaId;
		}

		onDraftChange?.(values);
		setSubmitting(true);
		try {
			const addrData = await fetch("/api/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(addressBody),
			}).then((r) => r.json() as Promise<{ setOrderShippingAddress?: Record<string, unknown>; error?: string }>);

			const orderResult = addrData.setOrderShippingAddress;
			if (!orderResult || orderResult.__typename !== "Order") {
				setError((orderResult?.message as string) || addrData.error || t.couldNotSaveAddress);
				return;
			}
			setAddressSaved(true);

			const methodsData = await fetch(`/api/checkout?intent=shippingMethods&lang=${locale}`).then(
				(r) => r.json() as Promise<{ shippingMethods?: ShippingMethod[]; error?: string }>
			);
			const allMethods = methodsData.shippingMethods ?? [];
			setMethods(allMethods);

			let methodToUse: ShippingMethod | undefined;
			if (mode === "pickup") {
				methodToUse = allMethods.find((m) => m.code === STORE_PICKUP_METHOD_CODE);
				if (!methodToUse) {
					setError(t.pickupUnavailable);
					return;
				}
			} else {
				const deliveryOnly = allMethods.filter((m) => m.code !== STORE_PICKUP_METHOD_CODE);
				methodToUse = deliveryOnly.find((m) => m.id === selectedMethod) ?? deliveryOnly[0];
				if (!methodToUse) {
					setError(t.noShippingMethods);
					return;
				}
			}
			setSelectedMethod(methodToUse.id);
			onMethodChange?.(methodToUse.id);

			// Guest checkout only collected an email — now that we have their real name for
			// the shipping address, re-submit it via the same "guest" intent so the customer
			// record (not just this order's address) ends up with a real name too.
			// Fire-and-forget: the email was already validated in step 1.
			if (customerName?.isGuest && customerName.email) {
				fetch("/api/checkout", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ _intent: "guest", firstName: values.firstName, lastName: values.lastName, emailAddress: customerName.email }),
				}).catch(() => {});
			}
			// A logged-in customer with no saved addresses yet is entering their first one
			// here -- save it to their account (as their new default) so it shows up as a
			// saved address next time. Only for a freeform "new" address a real account can
			// own -- not store pickup, and not once they already have addresses on file.
			// Gated on methodToUse.code (the value actually being submitted, just resolved
			// above) rather than the `mode` state alone -- a customer's account ended up with
			// the store's own pickup address as their saved default, which `mode === "address"`
			// should already have prevented; grounding this in the freshly-resolved shipping
			// method removes any possibility of that check running against stale UI state.
			// Also never for a guest -- they have no password to log back in with, so there's
			// no "next time" for a saved address to help with, and every confirmed leak so far
			// was a guest checkout.
			if (
				savedAddresses !== null &&
				savedAddresses.length === 0 &&
				mode === "address" &&
				addressMode === "new" &&
				methodToUse.code !== STORE_PICKUP_METHOD_CODE &&
				!customerName?.isGuest &&
				saveAddressChecked
			) {
				fetch("/api/checkout", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						_intent: "saveAddressToAccount",
						firstName: values.firstName,
						lastName: values.lastName,
						streetLine1: values.streetLine1,
						streetLine2: values.streetLine2,
						city: values.city,
						countryCode: "QA",
						province: "Doha",
						postalCode: values.postalCode,
						phoneNumber: values.phoneNumber,
						qatarAreaId: areaId || undefined,
					}),
				})
					.then((res) => res.json() as Promise<{ createCustomerAddress?: CustomerAddress; error?: string }>)
					.then((d) => {
						if (d.createCustomerAddress) onAddressSavedToAccount?.(d.createCustomerAddress);
						else if (d.error) notify(t.couldNotSaveToAccount, "error");
					})
					.catch(() => notify(t.couldNotSaveToAccount, "error"));
			}

			const methodData = await fetch("/api/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ _intent: "setShippingMethod", shippingMethodId: methodToUse.id }),
			}).then((r) => r.json() as Promise<{ setOrderShippingMethod?: Record<string, unknown>; error?: string }>);

			const methodResult = methodData.setOrderShippingMethod;
			if (!methodResult || methodResult.__typename !== "Order") {
				setError((methodResult?.message as string) || methodData.error || t.couldNotSetShippingMethod);
				return;
			}
			const totals: UpdatedOrderTotals = {
				shippingWithTax: methodResult.shippingWithTax as number,
				totalWithTax: methodResult.totalWithTax as number,
				subTotalWithTax: methodResult.subTotalWithTax as number,
			};
			const methodLabel = `${methodToUse.name} - ${methodToUse.priceWithTax === 0 ? t.free : fmt(methodToUse.priceWithTax, currency, locale)}`;
			onComplete(`${addressSummaryRef.current} · ${methodLabel}`, methodToUse, totals);
		} catch {
			setError(t.couldNotSaveAddress);
		} finally {
			setSubmitting(false);
		}
	}

	// Safety net: if the zone was picked before the other required fields were filled in
	// (so the auto-save on zone change had nothing to submit), retry once those fields are
	// blurred — keeps rate-fetching fully automatic without a manual "Get Rates" step.
	// Only relevant in address mode — pickup has no zone gate. phoneNumber isn't listed here —
	// its real input isn't the one carrying name="phoneNumber" (see PhoneField), so it can't
	// reach this delegated handler and instead calls saveAddress() via its own onFieldBlur.
	function handleFieldBlur(e: React.FocusEvent<HTMLFormElement>) {
		if (mode !== "address") return;
		const name = (e.target as unknown as { name?: string }).name;
		if (!name) return;
		if (!["firstName", "lastName", "streetLine1"].includes(name)) return;
		// No addressSaved guard: phoneNumber sits after the zone field in the form, so the
		// zone-change auto-save typically fires before phone is even filled in, and yet that
		// first save flips addressSaved permanently true — a guard here would mean nothing
		// ever re-saves the order's address afterward, silently dropping whatever the
		// customer types into phone (or edits in name/street) after picking their zone.
		// `busy` (not just savingAddress) also covers handleSubmit's own in-flight sequence --
		// this blur fires on every one of these fields as focus leaves them to click Continue,
		// and without this guard it raced handleSubmit's authoritative save with a redundant,
		// concurrent one hitting the same order.
		if (busy) return;
		if (!zone) return;
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
				<button type="button" onClick={() => handleModeChange("address")} className={`flex items-center gap-3 p-4 rounded-xl border-2 text-start transition-colors ${mode === "address" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
					<Truck size={22} className={`flex-shrink-0 ${mode === "address" ? "text-primary" : "text-gray-400"}`} />
					<div className="min-w-0">
						<span className={`block text-sm font-semibold ${mode === "address" ? "text-primary" : "text-gray-900"}`}>{t.shipToAddress}</span>
						<span className="block text-xs text-gray-500 mt-0.5">{t.shipToAddressSubtitle}</span>
					</div>
				</button>
				<button type="button" onClick={() => handleModeChange("pickup")} className={`flex items-center gap-3 p-4 rounded-xl border-2 text-start transition-colors ${mode === "pickup" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
					<Store size={22} className={`flex-shrink-0 ${mode === "pickup" ? "text-primary" : "text-gray-400"}`} />
					<div className="min-w-0">
						<span className={`block text-sm font-semibold ${mode === "pickup" ? "text-primary" : "text-gray-900"}`}>{t.storePickup}</span>
						<span className="block text-xs text-gray-500 mt-0.5">{t.storePickupSubtitle}</span>
					</div>
				</button>
			</div>

			{mode === "address" && addressMode === "saved" && savedAddresses ? (
				<div className="mb-2">
					<p className="text-sm font-semibold text-gray-700 mb-3">{t.savedAddresses}</p>
					<div className="space-y-3">
						{savedAddresses.map((addr) => (
							<label key={addr.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedSavedId === addr.id ? "border-lime-400 bg-lime-50" : "border-gray-200 hover:border-gray-300"}`}>
								<input
									type="radio"
									name="savedAddress"
									value={addr.id}
									checked={selectedSavedId === addr.id}
									onChange={() => selectSavedAddress(addr)}
									className="accent-lime-400 flex-shrink-0 mt-1"
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<p className="font-medium text-gray-900">{addr.fullName}</p>
										{addr.defaultShippingAddress && <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{t.defaultBadge}</span>}
									</div>
									<p className="text-sm text-gray-500 mt-0.5">
										{addr.streetLine1}
										{addr.streetLine2 ? `, ${addr.streetLine2}` : ""}, {addr.city}
									</p>
									{addr.phoneNumber && <p className="text-sm text-gray-400 mt-0.5">{addr.phoneNumber}</p>}
								</div>
							</label>
						))}
					</div>
					<button type="button" onClick={() => setAddressMode("new")} className="mt-3 text-sm font-medium text-primary hover:underline">
						{t.addNewAddress}
					</button>
				</div>
			) : (
				<FieldGroup>
					{hasSavedAddresses && mode === "address" && (
						<div className="sm:col-span-2 -mb-1">
							<button type="button" onClick={() => setAddressMode("saved")} className="text-sm font-medium text-primary hover:underline">
								{t.useSavedAddress}
							</button>
						</div>
					)}
					<Field label={t.firstName} name="firstName" required className="sm:col-span-1" defaultValue={initialValues?.firstName || customerName?.firstName} placeholder={t.firstNamePlaceholder} icon={UserRound} />
					<Field label={t.lastName} name="lastName" required className="sm:col-span-1" defaultValue={initialValues?.lastName || customerName?.lastName} placeholder={t.lastNamePlaceholder} icon={UserRound} />

					{mode === "address" ? (
						<>
							<Field label={t.addressLabel} name="streetLine1" required defaultValue={initialValues?.streetLine1} placeholder={t.addressPlaceholder} icon={Home} />
							<Field label={t.street} name="streetLine2" className="sm:col-span-2" defaultValue={initialValues?.streetLine2} placeholder={t.streetPlaceholder} icon={MapPin} />
							<div className="sm:col-span-1">
								<label htmlFor="checkout-postalCode" className="block text-sm font-medium text-gray-700 mb-1">
									{t.zone}
									<span className="text-red-500 ms-1">*</span>
								</label>
								<div className="relative">
									<MapPin size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
									<AreaSelect
										id="checkout-postalCode"
										name="postalCode"
										areas={areas}
										locale={locale}
										placeholder={t.selectZone}
										required
										value={zone}
										initialAreaId={initialValues?.qatarAreaId}
										onChange={handleZoneChange}
										inputClassName="w-full border border-gray-300 rounded-full ps-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
									/>
								</div>
							</div>
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

					<PhoneField label={t.phoneNumber} required defaultValue={initialValues?.phoneNumber} onFieldBlur={() => { if (mode === "address" && !busy && zone) saveAddress(); }} />
				</FieldGroup>
			)}

			{mode === "address" && !customerName?.isGuest && (
				<label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
					<input type="checkbox" checked={saveAddressChecked} onChange={(e) => setSaveAddressChecked(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
					<span className="text-sm text-gray-600">{t.saveAddressForFutureOrders}</span>
				</label>
			)}

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

			{/* Not gated on selectedMethod/addressSaved already being set -- handleSubmit does its
		    own save-address -> fetch-methods -> confirm sequence on click, so the customer
		    is never stuck on a disabled button just because a background auto-save (zone
		    change, autofill, mode toggle) didn't happen to run first. noMethodsAvailable is
		    real, already-known information (a prior attempt found zero methods for this
		    zone), so it's still worth blocking on. */}
		<SubmitBtn label={t.continueToPayment} loading={busy} disabled={noMethodsAvailable} t={t} />
		{onBack && (
			<button type="button" onClick={onBack} className="block mx-auto mt-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
				{t.backToCustomerInformation}
			</button>
		)}
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

// ── Line quantity stepper ─────────────────────────────────────────────────────

type OrderLine = ActiveOrder["lines"][number];

// Only the fields adjustOrderLine's response actually returns for a line --
// merged into the matching line in place (see mergeLineQuantityUpdate below)
// rather than replacing order.lines wholesale, since the mutation doesn't
// request bundle/subscription fields the rest of this panel also reads.
interface LineQuantityResponse {
	totalQuantity: number;
	subTotalWithTax: number;
	shippingWithTax: number;
	totalWithTax: number;
	lines: { id: string; quantity: number; unitPriceWithTax: number; linePriceWithTax: number; discountedLinePriceWithTax: number }[];
}

function LineQtyStepper({ line, onUpdated, locked }: { line: OrderLine; onUpdated: (response: LineQuantityResponse) => void; locked?: boolean }) {
	const { notify } = useNotification();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const fetcher = useFetcher<{ adjustOrderLine?: ({ __typename: "Order" } & LineQuantityResponse) | { __typename: string; message?: string }; error?: string }>();
	const busy = fetcher.state !== "idle" || locked;

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		const r = fetcher.data.adjustOrderLine;
		if (r && r.__typename === "Order") {
			onUpdated(r as LineQuantityResponse);
		} else if (r) {
			notify((r as { message?: string }).message ?? t.couldNotSetShippingMethod, "error");
		}
	}, [fetcher.state, fetcher.data]);

	function adjust(newQty: number) {
		if (newQty < 1 || busy) return;
		fetcher.submit({ _intent: "adjust", orderLineId: line.id, quantity: newQty }, { method: "POST", action: "/api/cart", encType: "application/json" });
	}

	return (
		<div className="inline-flex items-center border border-gray-300 rounded-full overflow-hidden">
			<button type="button" onClick={() => adjust(line.quantity - 1)} disabled={busy || line.quantity <= 1} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors">
				<Minus size={11} />
			</button>
			<span className="w-6 text-center text-xs font-semibold select-none">{line.quantity}</span>
			<button type="button" onClick={() => adjust(line.quantity + 1)} disabled={busy} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors">
				<Plus size={11} />
			</button>
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
				<button type="submit" disabled={!code.trim() || isBusy} className="bg-[#e08670] text-white text-sm font-medium px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity whitespace-nowrap">
					{isBusy ? "…" : t.apply}
				</button>
			</form>
		</div>
	);
}

// ── Order Summary Panel ───────────────────────────────────────────────────────

function OrderSummaryPanel({
	order,
	vendureBase,
	onOrderUpdate,
	onLineQuantityChange,
}: {
	order: ActiveOrder;
	vendureBase: string;
	onOrderUpdate: (updates: CouponUpdate) => void;
	onLineQuantityChange: (response: LineQuantityResponse) => void;
}) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const discounts = order.discounts?.filter((d) => d.amountWithTax < 0) ?? [];
	// A shipping method isn't chosen until step 2, so shippingWithTax is 0 both
	// before that (nothing to show yet) and after it (a genuinely free method) --
	// shippingLines.length is what actually distinguishes "not calculated yet"
	// from "calculated, and it's free".
	const shippingDisplay = order.shippingLines.length === 0 ? t.calculatedAtNextStep : order.shippingWithTax > 0 ? fmt(order.shippingWithTax, order.currencyCode, locale) : t.free;
	// Collapsed by default on mobile — only the header + shipping/total show until
	// tapped open. Always fully expanded on desktop regardless of this state.
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="lg:sticky lg:top-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
			<button type="button" onClick={() => setExpanded((e) => !e)} className="w-full text-start px-5 py-4 border-b border-gray-200 flex items-center gap-2">
				<ShoppingBag size={18} className="text-gray-500" />
				<h2 className="font-semibold text-gray-900">{t.orderSummary}</h2>
				<span className="ms-auto text-sm text-gray-500">{itemsCountLabel(order.totalQuantity, locale)}</span>
				<ChevronDown size={18} className={`text-gray-400 lg:hidden flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
			</button>

			{/* Coupon form stays out of the collapse — applying a code shouldn't require
			    expanding the full item list first. Rendered once here (not duplicated
			    inside the expanded section below) for both the collapsed and open states. */}
			<div className="lg:hidden py-3 border-b border-gray-200">
				<CouponForm orderState={order.state} onApplied={onOrderUpdate} />
			</div>

			{/* Condensed summary — mobile only, shown while collapsed. Thumbnails give a
			    quick "what's in my cart" glance without needing to expand for it. */}
			{!expanded && (
				<div className="lg:hidden px-5 py-3 border-b border-gray-200 space-y-3">
					{/* pt-2 -mt-2 gives the badges' negative top/end offset room to breathe inside
					    this box without shifting the row's position — overflow-x-auto forces
					    overflow-y to clip too (can't scroll one axis and stay visible on the
					    other), so without it the badges get sliced off flush with the row. */}
					<div className="flex items-center gap-2 overflow-x-auto pt-2 -mt-2 pe-2">
						{order.lines.map((line) => {
							const img = line.featuredAsset?.preview ?? line.productVariant.product.featuredAsset?.preview;
							return (
								<div key={line.id} className="relative flex-shrink-0">
									{img ? (
										<img src={resolveImg(img, vendureBase)} alt={line.productVariant.product.name} className="w-12 h-12 object-cover rounded border border-gray-200" />
									) : (
										<div className="w-12 h-12 bg-gray-100 rounded border border-gray-200" />
									)}
									<span className="absolute -top-1.5 -end-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
										{line.quantity}
									</span>
								</div>
							);
						})}
					</div>
					<div className="space-y-1.5">
						<div className="flex justify-between text-sm text-gray-600">
							<span>{t.shipping}</span>
							<span>{shippingDisplay}</span>
						</div>
						<div className="flex justify-between font-bold text-gray-900 text-base">
							<span>{t.total}</span>
							<span>{fmt(order.totalWithTax, order.currencyCode, locale)}</span>
						</div>
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
								<div className="mt-1.5">
									<LineQtyStepper line={line} onUpdated={onLineQuantityChange} locked={order.state === "ArrangingPayment"} />
								</div>
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
					<span className="flex items-center gap-1.5">
						{t.shipping}
						<span title={t.calculatedAtNextStep}>
							<HelpCircle size={13} className="text-gray-300" />
						</span>
					</span>
					<span>{shippingDisplay}</span>
				</div>
				<div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
					<span>{t.total}</span>
					<span className="text-primary">{fmt(order.totalWithTax, order.currencyCode, locale)}</span>
				</div>
			</div>

			{/* Estimated delivery */}
			<div className="mx-5 mb-5 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
				<Truck size={20} className="text-primary flex-shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold text-gray-900">{t.estimatedDelivery}</p>
					<p className="text-xs text-gray-500">{estimatedDeliveryLabel(t)}</p>
				</div>
				<ChevronRight size={16} className="text-gray-400 flex-shrink-0 rtl:rotate-180" />
			</div>

			{/* Trust icons */}
			<div className="mx-5 mb-5 grid grid-cols-3 gap-3 text-center">
				{[
					{ Icon: BadgeCheck, title: t.trustAuthentic, subtitle: t.trustAuthenticSubtitle },
					{ Icon: Lock, title: t.trustSecure, subtitle: t.trustSecureSubtitle },
					{ Icon: Truck, title: t.trustFastDelivery, subtitle: t.trustFastDeliverySubtitle },
				].map(({ Icon, title, subtitle }) => (
					<div key={title} className="flex flex-col items-center gap-1.5">
						<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
							<Icon size={16} className="text-white" />
						</div>
						<p className="text-xs font-semibold text-gray-900 leading-tight">{title}</p>
						<p className="text-[11px] text-gray-500 leading-tight">{subtitle}</p>
					</div>
				))}
			</div>

			{/* Decorative footer — same wave/leaf treatment as the reference, using the
			    brand's own coral accent (matches the Apply button above) rather than
			    introducing a third color. The parent panel's own rounded-2xl +
			    overflow-hidden clips this cleanly, no extra rounding needed here. */}
			<div className="relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-[#e08670]/25 to-[#e08670]/5" style={{ clipPath: "ellipse(75% 100% at 50% 100%)" }} />
				<div className="relative flex items-center gap-3 px-5 py-5">
					<Leaf size={20} className="text-primary flex-shrink-0" />
					<p className="text-xs text-gray-600 leading-snug">{t.orderSummaryTagline}</p>
				</div>
			</div>
			</div>
		</div>
	);
}

// ── Top step-progress bar ──────────────────────────────────────────────────────

function StepProgressBar({ step, completed, t }: { step: number; completed: number[]; t: (typeof CHECKOUT_COPY)[keyof typeof CHECKOUT_COPY] }) {
	const steps = [
		{ num: 1, label: t.customerInformation },
		{ num: 2, label: t.shipping },
		{ num: 3, label: t.payment },
	];
	return (
		<div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
			{steps.map((s, i) => {
				const isDone = completed.includes(s.num);
				const isActive = step === s.num;
				const lit = isDone || isActive;
				return (
					<div key={s.num} className="flex items-center gap-2 sm:gap-3">
						<div className="flex items-center gap-2">
							<div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${lit ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}>
								{isDone ? <Check size={16} /> : s.num}
							</div>
							<span className={`text-base font-semibold hidden sm:inline whitespace-nowrap ${lit ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
						</div>
						{i < steps.length - 1 && <div className="w-8 sm:w-16 h-px bg-gray-300 flex-shrink-0" />}
					</div>
				);
			})}
		</div>
	);
}

// ── One-step checkout (opt-in: /checkout?onestep=1) ───────────────────────────
//
// Everything on one page: contact, delivery address (with the area picker that drives the
// fee), delivery method, payment method, and a single "Place order" button. The old
// three-step flow above is untouched and stays the default until this has been tested.
//
// How it maps onto Vendure: the order stays editable (AddingItems) until payment is
// attempted -- the ArrangingPayment lock only happens inside the `addPayment` intent -- so
// every earlier mutation can run from one button, in order: customer -> shipping address ->
// shipping method -> payment. Delivery options and fees still appear live as soon as an
// area is picked (a preview run of the same address -> methods -> method calls), so the
// total in the summary is real before the customer ever presses the button.

const ONESTEP_COPY = {
	en: {
		title: "Complete your order",
		secure: "Secure checkout",
		contactDetails: "Contact details",
		emailPlaceholder: "Enter your email",
		alreadyHaveAccount: "Already have an account?",
		logIn: "Log in",
		createAccount: "Create an account",
		newCustomer: "New customer?",
		alreadyRegistered: "Already registered?",
		continueAsGuest: "Continue as guest",
		signedInAs: "Signed in as",
		emailHasAccount: "This email already has an account.",
		loginToUseDetails: "Log in to use your saved details.",
		createAccountButton: "Create account",
		loggingIn: "Logging in…",
		creatingAccount: "Creating account…",
		registerFailed: "Could not create your account. Please try again.",
		enterPasswordPrompt: "Please enter your email and password.",
		deliveryAddress: "Delivery address",
		shipSubtitle: "Delivered to your address",
		pickupSubtitle: "Collect from our Doha store",
		deliveryMethodTitle: "Delivery method",
		selectAreaForOptions: "Select your area to see delivery options and fees.",
		paymentMethodTitle: "Payment method",
		paymentAfterDelivery: "Payment options appear once your delivery details are set.",
		notListed: "My area isn't listed",
		selectZoneFallback: "Select your zone",
		zoneWord: "Zone",
		zoneOther: "Other area (no zone number)",
		fallbackAreaLabel: "Your area / neighbourhood name",
		fallbackAreaPlaceholder: "e.g. compound, tower or neighbourhood name",
		fallbackNote: "If you know your zone number, select it above for the exact delivery fee. Tell us your area name so the driver can find you.",
		backToSearch: "← Search the area list instead",
		areaPrefix: "Area",
		finalOrderTotal: "Final order total",
		plusDelivery: "+ delivery",
		placeOrder: "Place order",
		placeOrderHint: "Add your delivery address and choose a delivery method to place your order.",
		placingOrder: "Placing order…",
		finalTotalNote: "Final total and payment requirements are confirmed before submission.",
		enterEmail: "Please enter a valid email address.",
		selectPayment: "Please choose a payment method.",
		fillRequired: "Please complete the required fields.",
	},
	ar: {
		title: "أكمل طلبك",
		secure: "دفع آمن",
		contactDetails: "بيانات التواصل",
		emailPlaceholder: "أدخل بريدك الإلكتروني",
		alreadyHaveAccount: "لديك حساب بالفعل؟",
		logIn: "تسجيل الدخول",
		createAccount: "إنشاء حساب",
		newCustomer: "عميل جديد؟",
		alreadyRegistered: "مسجّل بالفعل؟",
		continueAsGuest: "المتابعة كزائر",
		signedInAs: "تم تسجيل الدخول باسم",
		emailHasAccount: "هذا البريد الإلكتروني مسجّل بحساب بالفعل.",
		loginToUseDetails: "سجّل الدخول لاستخدام بياناتك المحفوظة.",
		createAccountButton: "إنشاء الحساب",
		loggingIn: "جارٍ تسجيل الدخول…",
		creatingAccount: "جارٍ إنشاء الحساب…",
		registerFailed: "تعذّر إنشاء حسابك. يرجى المحاولة مرة أخرى.",
		enterPasswordPrompt: "يرجى إدخال بريدك الإلكتروني وكلمة المرور.",
		deliveryAddress: "عنوان التوصيل",
		shipSubtitle: "يصلك إلى عنوانك",
		pickupSubtitle: "استلمه من متجرنا في الدوحة",
		deliveryMethodTitle: "طريقة التوصيل",
		selectAreaForOptions: "اختر منطقتك لعرض خيارات التوصيل والرسوم.",
		paymentMethodTitle: "طريقة الدفع",
		paymentAfterDelivery: "تظهر خيارات الدفع بعد إدخال بيانات التوصيل.",
		notListed: "منطقتي غير موجودة في القائمة",
		selectZoneFallback: "اختر رقم منطقتك",
		zoneWord: "المنطقة",
		zoneOther: "منطقة أخرى (بدون رقم منطقة)",
		fallbackAreaLabel: "اسم منطقتك / حيّك",
		fallbackAreaPlaceholder: "مثال: اسم المجمع أو البرج أو الحي",
		fallbackNote: "إذا كنت تعرف رقم منطقتك فاخترها أعلاه لمعرفة رسوم التوصيل الدقيقة. أخبرنا باسم منطقتك ليتمكن السائق من الوصول إليك.",
		backToSearch: "← البحث في قائمة المناطق",
		areaPrefix: "المنطقة",
		finalOrderTotal: "إجمالي الطلب النهائي",
		plusDelivery: "+ التوصيل",
		placeOrder: "إتمام الطلب",
		placeOrderHint: "أضف عنوان التوصيل واختر طريقة التوصيل لإتمام طلبك.",
		placingOrder: "جارٍ إتمام الطلب…",
		finalTotalNote: "يتم تأكيد الإجمالي النهائي ومتطلبات الدفع قبل الإرسال.",
		enterEmail: "يرجى إدخال بريد إلكتروني صحيح.",
		selectPayment: "يرجى اختيار طريقة الدفع.",
		fillRequired: "يرجى إكمال الحقول المطلوبة.",
	},
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OneStepGraphResult = Record<string, unknown>;

function OneStepCheckout({
	order,
	areas,
	activeCustomer,
	initialDraft,
	initialMode,
	initialMethodId,
	setOrder,
	onDone,
}: {
	order: ActiveOrder;
	areas: AreaOption[];
	activeCustomer: ActiveCustomer | null;
	initialDraft: ShippingAddressValues | null;
	initialMode: "address" | "pickup";
	initialMethodId: string | null;
	setOrder: (updater: (prev: ActiveOrder) => ActiveOrder) => void;
	onDone: (orderCode: string) => void;
}) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	const o = ONESTEP_COPY[locale];
	const { notify } = useNotification();
	const formRef = useRef<HTMLFormElement>(null);

	// ── Contact / account ──
	// `customer` is a REAL logged-in account (a guest order's own customer record must not be
	// mistaken for one -- same distinction deriveCheckoutState makes).
	const [customer, setCustomer] = useState<ActiveCustomer | null>(activeCustomer);
	const [addresses, setAddresses] = useState<CustomerAddress[] | null>(activeCustomer?.addresses ?? null);
	const guestEmailRef = useRef<string>(order.customer?.emailAddress ?? "");
	const [emailHasAccount, setEmailHasAccount] = useState(false);
	const [newsletter, setNewsletter] = useState(true);
	const [authMode, setAuthMode] = useState<null | "login" | "register">(null);
	const [authError, setAuthError] = useState<string | null>(null);
	const [authBusy, setAuthBusy] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	// ── Delivery ──
	const [mode, setMode] = useState<"address" | "pickup">(initialMode);
	const hasSaved = !!addresses && addresses.length > 0;
	const [addressMode, setAddressMode] = useState<"saved" | "new">(hasSaved && !initialDraft ? "saved" : "new");
	const [selectedSavedId, setSelectedSavedId] = useState<string | null>(() => {
		if (!addresses || addresses.length === 0) return null;
		return (addresses.find((a) => a.defaultShippingAddress) ?? addresses[0]).id;
	});
	const [zone, setZone] = useState(initialDraft?.postalCode ?? "");
	const [areaId, setAreaId] = useState(initialDraft?.qatarAreaId ?? "");
	const [areaName, setAreaName] = useState<string>(() => {
		const exact = initialDraft?.qatarAreaId ? areas.find((a) => a.id === initialDraft.qatarAreaId) : undefined;
		if (exact) return locale === "ar" ? exact.nameAr : exact.nameEn;
		return initialDraft?.postalCode ? areaLabelForZone(Number(initialDraft.postalCode), locale) : "";
	});
	const [saveAddressChecked, setSaveAddressChecked] = useState(true);
	// "My area isn't listed": the customer picks a ZONE instead (every zone has a single delivery
	// price, so the fee stays exact) and names their area, which is added to the address for the driver.
	const [notListed, setNotListed] = useState(false);
	const [methods, setMethods] = useState<ShippingMethod[]>([]);
	const [selectedMethod, setSelectedMethod] = useState<string | null>(initialMethodId);
	const selectedMethodRef = useRef(selectedMethod);
	useEffect(() => {
		selectedMethodRef.current = selectedMethod;
	}, [selectedMethod]);
	const [loadingMethods, setLoadingMethods] = useState(false);

	// ── Payment ──
	const [payMethods, setPayMethods] = useState<PaymentMethod[]>([]);
	const [selectedPay, setSelectedPay] = useState<string | null>(null);
	const selectedPayRef = useRef(selectedPay);
	useEffect(() => {
		selectedPayRef.current = selectedPay;
	}, [selectedPay]);

	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [sadad, setSadad] = useState<SadadPaymentMetadata | null>(null);
	const [redirecting, setRedirecting] = useState(false);
	// Latest-wins guard for the live preview (rapid area changes must not let a slow, older
	// response overwrite a newer one), and a flag for "an addPayment attempt already locked
	// the order" so the next attempt reopens it first.
	const previewSeq = useRef(0);
	const needsReopenRef = useRef(order.state === "ArrangingPayment");

	async function postCheckout<T = OneStepGraphResult>(body: Record<string, unknown>): Promise<T> {
		const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
		return (await r.json()) as T;
	}

	// An earlier payment attempt (failed card, closed SkipCash tab, Back button) leaves the
	// order locked in ArrangingPayment, where every address/method mutation is rejected.
	async function reopenIfLocked() {
		if (!needsReopenRef.current) return;
		await postCheckout({ _intent: "reopenCart" });
		needsReopenRef.current = false;
		setOrder((prev) => ({ ...prev, state: "AddingItems" }));
	}

	// ── Address resolution (what will be sent as the order's shipping address) ──
	function readField(name: string): string {
		const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
		return (el?.value ?? "").trim();
	}

	function resolveAddress(overrides?: { zone?: string; areaId?: string; areaLabel?: string }): { values: ShippingAddressValues; areaLabel: string; qatarAreaId: string } | null {
		if (mode === "pickup") {
			return {
				values: { firstName: readField("firstName"), lastName: readField("lastName"), phoneNumber: readField("phoneNumber") || undefined, streetLine1: STORE_PICKUP_ADDRESS.streetLine1, city: STORE_PICKUP_ADDRESS.city, postalCode: STORE_PICKUP_ADDRESS.postalCode },
				areaLabel: t.storePickup,
				qatarAreaId: "",
			};
		}
		if (addressMode === "saved" && selectedSavedId && addresses) {
			const addr = addresses.find((a) => a.id === selectedSavedId);
			const v = addr ? addressToShippingValues(addr) : null;
			if (!v) return null;
			// A saved address's area id can be missing or stale (see ShippingStep.selectSavedAddress):
			// fall back to a same-zone area so the backend's area-based eligibility still resolves.
			const known = v.qatarAreaId ? areas.find((a) => a.id === v.qatarAreaId) : undefined;
			const resolved = known ?? areas.find((a) => `${a.zoneNumber}` === v.postalCode);
			return { values: v, areaLabel: resolved ? (locale === "ar" ? resolved.nameAr : resolved.nameEn) : areaLabelForZone(Number(v.postalCode), locale), qatarAreaId: resolved?.id ?? "" };
		}
		const postalCode = overrides?.zone ?? zone;
		if (!postalCode.trim()) return null;
		return {
			values: {
				firstName: readField("firstName"),
				lastName: readField("lastName"),
				streetLine1: readField("streetLine1"),
				streetLine2: [readField("streetLine2"), notListed && readField("fallbackArea") ? `${o.areaPrefix}: ${readField("fallbackArea")}` : ""].filter(Boolean).join(" · ") || undefined,
				city: municipalityForZone(Number(postalCode), locale),
				postalCode,
				phoneNumber: readField("phoneNumber") || undefined,
			},
			areaLabel: overrides?.areaLabel ?? (areaName || areaLabelForZone(Number(postalCode), locale)),
			qatarAreaId: overrides?.areaId ?? areaId,
		};
	}

	function addressBody(r: { values: ShippingAddressValues; qatarAreaId: string }): Record<string, unknown> {
		const v = r.values;
		const body: Record<string, unknown> = { _intent: "setShippingAddress", firstName: v.firstName, lastName: v.lastName, streetLine1: v.streetLine1, city: v.city, countryCode: "QA", province: "Doha", postalCode: v.postalCode };
		if (v.streetLine2) body.streetLine2 = v.streetLine2;
		if (v.phoneNumber) body.phoneNumber = v.phoneNumber;
		if (r.qatarAreaId) body.qatarAreaId = r.qatarAreaId;
		return body;
	}

	function pickMethod(all: ShippingMethod[]): ShippingMethod | undefined {
		if (mode === "pickup") return all.find((m) => m.code === STORE_PICKUP_METHOD_CODE);
		const deliveryOnly = all.filter((m) => m.code !== STORE_PICKUP_METHOD_CODE);
		return deliveryOnly.find((m) => m.id === selectedMethodRef.current) ?? deliveryOnly[0];
	}

	// Sets the chosen shipping method on the order and mirrors the new totals (and the
	// shipping line, which the summary uses to tell "not calculated yet" from "free") into state.
	async function applyMethod(method: ShippingMethod): Promise<boolean> {
		const res = await postCheckout<{ setOrderShippingMethod?: OneStepGraphResult; error?: string }>({ _intent: "setShippingMethod", shippingMethodId: method.id });
		const r = res.setOrderShippingMethod;
		if (!r || r.__typename !== "Order") {
			setError((r?.message as string) || res.error || t.couldNotSetShippingMethod);
			return false;
		}
		setOrder((prev) => ({
			...prev,
			shippingWithTax: r.shippingWithTax as number,
			totalWithTax: r.totalWithTax as number,
			subTotalWithTax: r.subTotalWithTax as number,
			shippingLines: [{ price: method.price, priceWithTax: method.priceWithTax, shippingMethod: { id: method.id, name: method.name, code: method.code, description: method.description } }],
		}));
		return true;
	}

	async function loadPaymentMethods(): Promise<PaymentMethod[]> {
		try {
			const d = await fetch(`/api/checkout?intent=paymentMethods&lang=${locale}`).then((r) => r.json() as Promise<{ paymentMethods?: PaymentMethod[] }>);
			// Online Payment (SkipCash) always sorts first, regardless of API order.
			const list = (d.paymentMethods ?? []).filter((m) => m.isEligible).sort((a, b) => Number(b.code === SKIPCASH_METHOD_CODE) - Number(a.code === SKIPCASH_METHOD_CODE));
			setPayMethods(list);
			const keep = list.find((m) => m.code === selectedPayRef.current);
			setSelectedPay(keep ? keep.code : (list[0]?.code ?? null));
			return list;
		} catch {
			return [];
		}
	}

	// Live preview: save whatever address is known so far (names/street may still be blank --
	// only the area is needed for a quote), list the eligible methods, select one, and set it
	// so the summary's shipping and total are real. The submit handler re-runs the same
	// sequence authoritatively; this exists only so the customer sees real numbers early.
	async function previewRates(overrides?: { zone?: string; areaId?: string; areaLabel?: string }) {
		const resolved = resolveAddress(overrides);
		if (!resolved) return;
		const seq = ++previewSeq.current;
		setLoadingMethods(true);
		setError(null);
		try {
			await reopenIfLocked();
			const a = await postCheckout<{ setOrderShippingAddress?: OneStepGraphResult; error?: string }>(addressBody(resolved));
			if (seq !== previewSeq.current) return;
			if (a.setOrderShippingAddress?.__typename !== "Order") {
				setError((a.setOrderShippingAddress?.message as string) || a.error || t.couldNotSaveAddress);
				return;
			}
			const m = await fetch(`/api/checkout?intent=shippingMethods&lang=${locale}`).then((r) => r.json() as Promise<{ shippingMethods?: ShippingMethod[] }>);
			if (seq !== previewSeq.current) return;
			const all = m.shippingMethods ?? [];
			setMethods(all);
			const method = pickMethod(all);
			if (!method) {
				setError(mode === "pickup" ? t.pickupUnavailable : t.noShippingMethods);
				return;
			}
			setSelectedMethod(method.id);
			if (!(await applyMethod(method)) || seq !== previewSeq.current) return;
			await loadPaymentMethods();
		} catch {
			if (seq === previewSeq.current) setError(t.couldNotSaveAddress);
		} finally {
			if (seq === previewSeq.current) setLoadingMethods(false);
		}
	}

	// Resume: a returning customer's saved/default address, an address already on the order,
	// or a pickup order get their rates up front, like the multi-step flow does.
	useEffect(() => {
		if (mode === "pickup" || initialDraft?.postalCode || (addressMode === "saved" && selectedSavedId)) void previewRates();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// One entry per delivery zone (representative area = the zone's first listed area, which carries
	// the zone's price), for the "area isn't listed" selector. Zone 0 = areas with no zone number.
	const zoneOptions = (() => {
		const byZone = new Map<number, AreaOption[]>();
		for (const a of areas) {
			if (!a.id) continue;
			const list = byZone.get(a.zoneNumber);
			if (list) list.push(a);
			else byZone.set(a.zoneNumber, [a]);
		}
		return [...byZone.entries()]
			.sort(([x], [y]) => (x === 0 ? 1 : y === 0 ? -1 : x - y))
			.map(([zoneNumber, list]) => ({
				zoneNumber,
				rep: list[0],
				label: zoneNumber === 0 ? o.zoneOther : `${zoneNumber} · ${municipalityForZone(zoneNumber, locale)} — ${list.slice(0, 3).map((a) => (locale === "ar" ? a.nameAr : a.nameEn)).join(", ")}`,
			}));
	})();

	function resetAreaChoice() {
		setZone("");
		setAreaId("");
		setAreaName("");
		setMethods([]);
		setSelectedMethod(null);
	}
	function openNotListed() {
		setNotListed(true);
		// Starts on "Other area (no zone number)" so the customer can carry on straight away;
		// picking their real zone from the selector swaps in that zone's own fee.
		resetAreaChoice();
		handleFallbackZone("0");
	}
	function closeNotListed() {
		setNotListed(false);
		resetAreaChoice();
	}
	function handleFallbackZone(value: string) {
		const opt = zoneOptions.find((z) => String(z.zoneNumber) === value);
		if (!opt) return resetAreaChoice();
		handleZoneChange(String(opt.zoneNumber), opt.zoneNumber === 0 ? o.zoneOther : `${o.zoneWord} ${opt.zoneNumber}`, opt.rep.id);
	}

	// "Is there a usable delivery address yet?" -- the form's fields are uncontrolled, so this is
	// recomputed from the DOM on every input event (and when the mode / saved choice / area changes).
	const [addressComplete, setAddressComplete] = useState(false);
	function syncAddressComplete() {
		const hasNames = !!readField("firstName") && !!readField("lastName") && !!readField("phoneNumber");
		if (mode === "pickup") setAddressComplete(hasNames);
		else if (addressMode === "saved") setAddressComplete(!!selectedSavedId);
		else setAddressComplete(hasNames && !!zone && !!readField("streetLine1") && (!notListed || !!readField("fallbackArea")));
	}
	useEffect(() => {
		syncAddressComplete();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, addressMode, selectedSavedId, zone, addresses, notListed]);

	function handleZoneChange(zoneNumber: string, name: string, pickedAreaId: string) {
		setZone(zoneNumber);
		setAreaId(pickedAreaId);
		setAreaName(name);
		setMethods([]);
		setSelectedMethod(null);
		if (zoneNumber) void previewRates({ zone: zoneNumber, areaId: pickedAreaId, areaLabel: name });
	}

	function handleModeChange(next: "address" | "pickup") {
		if (next === mode) return;
		setMode(next);
		setMethods([]);
		setSelectedMethod(null);
		setError(null);
		// mode isn't updated yet when previewRates runs synchronously below, so defer a tick.
		setTimeout(() => void previewRates(), 0);
	}

	function pickSavedAddress(id: string) {
		setSelectedSavedId(id);
		setMethods([]);
		setSelectedMethod(null);
		setTimeout(() => void previewRates(), 0);
	}

	// ── Guest email capture ──
	// Saved as soon as a valid email is entered (not only on submit), so a customer who
	// abandons the page still leaves a recoverable cart -- same as the multi-step flow's first
	// step did. An email that already belongs to an account surfaces a gentle login hint.
	async function saveGuestEmail(email: string, names?: { firstName: string; lastName: string }): Promise<"ok" | "has-account" | "error"> {
		const firstTime = guestEmailRef.current !== email;
		const res = await postCheckout<{ setCustomerForOrder?: OneStepGraphResult; error?: string }>({
			_intent: "guest",
			firstName: names?.firstName ?? "",
			lastName: names?.lastName ?? "",
			emailAddress: email,
			// Only on the first save for this email, so the newsletter isn't re-subscribed on every call.
			...(firstTime ? { emailOffers: newsletter ? "true" : "false" } : {}),
		});
		const r = res.setCustomerForOrder;
		if (r?.__typename === "Order") {
			guestEmailRef.current = email;
			setEmailHasAccount(false);
			return "ok";
		}
		if (r?.__typename === "EmailAddressConflictError") {
			setEmailHasAccount(true);
			return "has-account";
		}
		if (r?.__typename === "AlreadyLoggedInError") {
			await refreshAfterLogin();
			return "ok";
		}
		return "error";
	}

	function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
		const email = e.target.value.trim();
		if (customer || !EMAIL_PATTERN.test(email) || email === guestEmailRef.current) return;
		void saveGuestEmail(email);
	}

	// ── Login / register (inline) ──
	async function refreshAfterLogin() {
		try {
			const c = await fetch(`/api/checkout?intent=activeCustomer&lang=${locale}`).then((r) => r.json() as Promise<{ activeCustomer: ActiveCustomer | null }>);
			if (!c.activeCustomer) return;
			const list = c.activeCustomer.addresses ?? [];
			setCustomer(c.activeCustomer);
			setAddresses(list);
			setAuthMode(null);
			setAuthError(null);
			setEmailHasAccount(false);
			setSelectedSavedId(list.length > 0 ? (list.find((a) => a.defaultShippingAddress) ?? list[0]).id : null);
			setAddressMode(list.length > 0 ? "saved" : "new");
			// Logging in can attach/merge the customer's own cart onto this one -- re-read the
			// order so the summary and totals reflect what the account actually has.
			const cart = await fetch("/api/cart").then((r) => r.json() as Promise<{ activeOrder: ActiveOrder | null }>);
			if (cart.activeOrder) setOrder(() => cart.activeOrder!);
			if (list.length > 0) setTimeout(() => void previewRates(), 0);
		} catch {
			setAuthError(t.loginFailed);
		}
	}

	async function handleLogin() {
		const email = readField("email");
		const password = readField("authPassword");
		if (!email || !password) {
			setAuthError(o.enterPasswordPrompt);
			return;
		}
		setAuthBusy(true);
		setAuthError(null);
		try {
			const res = await postCheckout<{ login?: OneStepGraphResult; error?: string }>({ _intent: "login", username: email, password });
			if (res.login?.__typename === "CurrentUser") await refreshAfterLogin();
			else setAuthError((res.login?.message as string) || res.error || t.loginFailed);
		} catch {
			setAuthError(t.loginFailed);
		} finally {
			setAuthBusy(false);
		}
	}

	async function handleRegister() {
		const email = readField("email");
		const password = readField("authPassword");
		const firstName = readField("authFirstName");
		const lastName = readField("authLastName");
		if (!EMAIL_PATTERN.test(email) || !password || !firstName || !lastName) {
			setAuthError(o.fillRequired);
			return;
		}
		setAuthBusy(true);
		setAuthError(null);
		try {
			const res = await postCheckout<{ login?: OneStepGraphResult; error?: string }>({ _intent: "register", firstName, lastName, emailAddress: email, password });
			if (res.error) setAuthError(res.error);
			else if (res.login?.__typename === "CurrentUser") await refreshAfterLogin();
			else setAuthError((res.login?.message as string) || o.registerFailed);
		} catch {
			setAuthError(o.registerFailed);
		} finally {
			setAuthBusy(false);
		}
	}

	// ── Place order ──
	async function handlePlaceOrder() {
		if (submitting) return;
		setError(null);
		const form = formRef.current;
		if (!form) return;
		if (!form.reportValidity()) return;

		const resolved = resolveAddress();
		if (!resolved) {
			setError(mode === "address" ? t.selectZonePrompt : t.couldNotSaveAddress);
			return;
		}
		const email = readField("email");
		if (!customer && !EMAIL_PATTERN.test(email)) {
			setError(o.enterEmail);
			return;
		}

		setSubmitting(true);
		try {
			await reopenIfLocked();

			// 1. Customer -- a guest's email (+ real name now that the address form has one).
			if (!customer) {
				const outcome = await saveGuestEmail(email, { firstName: resolved.values.firstName, lastName: resolved.values.lastName });
				if (outcome === "has-account") {
					setAuthMode("login");
					setAuthError(null);
					setError(o.emailHasAccount + " " + o.loginToUseDetails);
					return;
				}
				if (outcome === "error") {
					setError(t.couldNotProceedAsGuest);
					return;
				}
			}

			// 2. Shipping address (authoritative -- the preview above may have been skipped, e.g. by autofill).
			const a = await postCheckout<{ setOrderShippingAddress?: OneStepGraphResult; error?: string }>(addressBody(resolved));
			if (a.setOrderShippingAddress?.__typename !== "Order") {
				setError((a.setOrderShippingAddress?.message as string) || a.error || t.couldNotSaveAddress);
				return;
			}

			// 3. Shipping method.
			const m = await fetch(`/api/checkout?intent=shippingMethods&lang=${locale}`).then((r) => r.json() as Promise<{ shippingMethods?: ShippingMethod[] }>);
			const all = m.shippingMethods ?? [];
			setMethods(all);
			const method = pickMethod(all);
			if (!method) {
				setError(mode === "pickup" ? t.pickupUnavailable : t.noShippingMethods);
				return;
			}
			setSelectedMethod(method.id);
			if (!(await applyMethod(method))) return;

			// A logged-in customer's first-ever address goes to their account (never a guest's,
			// never store pickup) -- same conditions as the multi-step flow.
			if (customer && addresses !== null && addresses.length === 0 && mode === "address" && addressMode === "new" && saveAddressChecked) {
				const v = resolved.values;
				postCheckout<{ createCustomerAddress?: CustomerAddress; error?: string }>({ _intent: "saveAddressToAccount", firstName: v.firstName, lastName: v.lastName, streetLine1: v.streetLine1, streetLine2: v.streetLine2, city: v.city, countryCode: "QA", province: "Doha", postalCode: v.postalCode, phoneNumber: v.phoneNumber, qatarAreaId: resolved.qatarAreaId || undefined })
					.then((d) => {
						if (d.createCustomerAddress) setAddresses((prev) => [...(prev ?? []), d.createCustomerAddress!]);
						else if (d.error) notify(t.couldNotSaveToAccount, "error");
					})
					.catch(() => notify(t.couldNotSaveToAccount, "error"));
			}

			// 4. Payment.
			let pay = selectedPayRef.current;
			if (!pay || payMethods.length === 0) {
				const list = await loadPaymentMethods();
				pay = list.find((x) => x.code === selectedPayRef.current)?.code ?? list[0]?.code ?? null;
			}
			if (!pay) {
				setError(o.selectPayment);
				return;
			}
			needsReopenRef.current = true; // addPayment locks the order (ArrangingPayment) from here on
			const p = await postCheckout<{ addPaymentToOrder?: OneStepGraphResult; sadadMetadata?: SadadPaymentMetadata; skipcashCheckout?: SkipCashCheckoutResult; error?: string }>({ _intent: "addPayment", method: pay, metadata: {} });
			if (p.error) {
				setError(p.error);
				return;
			}
			if (p.sadadMetadata) {
				setSadad(p.sadadMetadata);
				return;
			}
			if (p.skipcashCheckout) {
				// Hosted redirect: leaves the SPA entirely. SkipCash's return URL is a fixed portal
				// setting, so stash the order code for checkout.success.tsx to pick back up.
				sessionStorage.setItem("pendingOrderCode", order.code);
				setRedirecting(true);
				window.location.href = p.skipcashCheckout.payUrl;
				return;
			}
			const r = p.addPaymentToOrder;
			if (r?.__typename === "Order") {
				onDone(r.code as string);
				return;
			}
			setError((r?.paymentErrorMessage as string) || (r?.eligibilityCheckerMessage as string) || (r?.message as string) || t.paymentFailed);
		} catch {
			setError(t.paymentFailed);
		} finally {
			setSubmitting(false);
		}
	}

	const money = (cents: number) => fmt(cents, order.currencyCode, locale);
	const deliveryMethods = methods.filter((m) => m.code !== STORE_PICKUP_METHOD_CODE);
	// The button only enables once there's a usable address AND a delivery method has actually
	// been set on the order (a shipping line exists) -- not merely listed.
	const canPlaceOrder = addressComplete && selectedMethod !== null && order.shippingLines.length > 0;
	const areaKnown = mode === "pickup" || (addressMode === "saved" ? !!selectedSavedId : !!zone);
	const paymentIcons: Record<string, React.ReactNode> = {
		[SKIPCASH_METHOD_CODE]: <CreditCard size={18} className="text-gray-500 flex-shrink-0" />,
		default: <Banknote size={18} className="text-gray-500 flex-shrink-0" />,
	};

	if (sadad) return <SadadCheckoutForm metadata={sadad} />;
	if (redirecting) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
				<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
				<p className="text-gray-600">{t.redirectingToSkipCash}</p>
			</div>
		);
	}

	const sectionTitle = "text-sm font-bold text-gray-900 mb-2";
	const inputBase = "w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
	const linkBtn = "text-primary font-semibold hover:underline";

	return (
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
			<div className="flex items-center justify-between gap-3 mb-5">
				<h1 className="text-lg font-bold text-gray-900">{o.title}</h1>
				<span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
					<Lock size={13} className="text-primary" />
					{o.secure}
				</span>
			</div>

			{/* A <form> only to collect values and run native required-field checks -- placing the
			    order is the button below, not an Enter keypress or an accidental inner submit. */}
			<form ref={formRef} noValidate={false} onSubmit={(e) => e.preventDefault()} onInput={() => setTimeout(syncAddressComplete, 0)} className="flex flex-col gap-6">
				<input type="hidden" name="countryCode" value="QA" />

				{/* ── Contact ── */}
				<section>
					<h2 className={sectionTitle}>{o.contactDetails}</h2>
					{customer ? (
						<p className="flex items-center gap-2 text-sm text-gray-700">
							<BadgeCheck size={16} className="text-primary flex-shrink-0" />
							<span>
								{o.signedInAs} <span className="font-semibold text-gray-900">{customer.emailAddress}</span>
							</span>
						</p>
					) : (
						<>
							<div className="relative flex items-center">
								<Mail size={16} className="absolute start-4 text-gray-400 pointer-events-none flex-shrink-0" />
								<input id="checkout-email" name="email" type="email" required autoComplete="email" defaultValue={order.customer?.emailAddress ?? ""} placeholder={o.emailPlaceholder} onBlur={handleEmailBlur} className={`${inputBase} ps-10`} />
							</div>
							{emailHasAccount && authMode === null && (
								<p className="mt-2 text-xs text-gray-600">
									{o.emailHasAccount}{" "}
									<button type="button" onClick={() => setAuthMode("login")} className={linkBtn}>
										{o.loginToUseDetails}
									</button>
								</p>
							)}
							<p className="mt-2 text-sm text-gray-600">
								{o.alreadyHaveAccount}{" "}
								<button type="button" onClick={() => { setAuthError(null); setAuthMode(authMode ? null : "login"); }} className={linkBtn}>
									{o.logIn}
								</button>
							</p>

							{authMode && (
								<div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
									<SocialAuthButtons dividerLabel={t.or} onSuccess={refreshAfterLogin} emailOffers={newsletter} mode={authMode === "register" ? "signup" : "signin"} />
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{authMode === "register" && (
											<>
												<input name="authFirstName" type="text" autoComplete="given-name" placeholder={t.firstName} className={inputBase} />
												<input name="authLastName" type="text" autoComplete="family-name" placeholder={t.lastName} className={inputBase} />
											</>
										)}
										<div className="relative flex items-center sm:col-span-2">
											<Lock size={16} className="absolute start-4 text-gray-400 pointer-events-none flex-shrink-0" />
											<input
												name="authPassword"
												type={showPassword ? "text" : "password"}
												autoComplete={authMode === "register" ? "new-password" : "current-password"}
												placeholder={t.passwordPlaceholder}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														void (authMode === "register" ? handleRegister() : handleLogin());
													}
												}}
												className={`${inputBase} ps-10 pe-11`}
											/>
											<button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? t.hidePassword : t.showPassword} className="absolute end-4 text-gray-400 hover:text-gray-600 transition-colors">
												{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
											</button>
										</div>
									</div>
									{authMode === "login" && (
										<div className="text-end mt-1.5">
											<Link to="/forgot-password?redirect=/checkout" className="text-xs text-primary hover:underline">
												{t.forgotPassword}
											</Link>
										</div>
									)}
									{authError && <ErrorBox message={authError} />}
									<button type="button" disabled={authBusy} onClick={() => void (authMode === "register" ? handleRegister() : handleLogin())} className="mt-3 w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-2.5 rounded-full disabled:opacity-60 transition-colors">
										{authBusy ? (authMode === "register" ? o.creatingAccount : o.loggingIn) : authMode === "register" ? o.createAccountButton : o.logIn}
									</button>
									<p className="mt-3 text-center text-sm text-gray-600">
										{authMode === "register" ? o.alreadyRegistered : o.newCustomer}{" "}
										<button type="button" onClick={() => { setAuthError(null); setAuthMode(authMode === "register" ? "login" : "register"); }} className={linkBtn}>
											{authMode === "register" ? o.logIn : o.createAccount}
										</button>
										<span className="text-gray-300"> | </span>
										<button type="button" onClick={() => { setAuthError(null); setAuthMode(null); }} className="text-gray-500 hover:text-gray-700 underline">
											{o.continueAsGuest}
										</button>
									</p>
								</div>
							)}
							{!authMode && <NewsletterConsent checked={newsletter} onChange={setNewsletter} t={t} />}
						</>
					)}
				</section>

				{/* ── Delivery address ── */}
				<section>
					<h2 className={sectionTitle}>{o.deliveryAddress}</h2>
					{/* Segmented tabs: the chosen option is a solid dark block, the other is just text over a bottom border. */}
					<div className="grid grid-cols-2 mb-4" role="tablist" aria-label={o.deliveryAddress}>
						{(["address", "pickup"] as const).map((m) => {
							const active = mode === m;
							return (
								<button
									key={m}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => handleModeChange(m)}
									className={`flex items-center justify-center gap-3 px-3 py-3 text-start transition-colors ${active ? "bg-primary text-white rounded-t-xl border-b-2 border-primary" : "bg-transparent text-gray-500 border-b-2 border-gray-200 hover:text-gray-900 hover:border-gray-400"}`}
								>
									{m === "address" ? <Truck size={20} className="flex-shrink-0" /> : <Store size={20} className="flex-shrink-0" />}
									<span className="min-w-0">
										<span className="block text-sm font-semibold leading-tight">{m === "address" ? t.shipToAddress : t.storePickup}</span>
										<span className={`block text-[11px] font-normal leading-tight mt-0.5 ${active ? "text-white/70" : "text-gray-400"}`}>{m === "address" ? o.shipSubtitle : o.pickupSubtitle}</span>
									</span>								</button>
							);
						})}
					</div>

					{mode === "address" && addressMode === "saved" && addresses && addresses.length > 0 ? (
						<div>
							<p className="text-sm font-semibold text-gray-700 mb-2">{t.savedAddresses}</p>
							<div className="space-y-2.5">
								{addresses.map((addr) => (
									<label key={addr.id} className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${selectedSavedId === addr.id ? "border-lime-400 bg-lime-50" : "border-gray-200 hover:border-gray-300"}`}>
										<input type="radio" name="savedAddress" value={addr.id} checked={selectedSavedId === addr.id} onChange={() => pickSavedAddress(addr.id)} className="accent-lime-400 flex-shrink-0 mt-1" />
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<p className="font-medium text-gray-900 text-sm">{addr.fullName}</p>
												{addr.defaultShippingAddress && <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{t.defaultBadge}</span>}
											</div>
											<p className="text-sm text-gray-500 mt-0.5">
												{addr.streetLine1}
												{addr.streetLine2 ? `, ${addr.streetLine2}` : ""}, {addr.city}
											</p>
											{addr.phoneNumber && <p className="text-xs text-gray-400 mt-0.5">{addr.phoneNumber}</p>}
										</div>
									</label>
								))}
							</div>
							<button type="button" onClick={() => { setAddressMode("new"); setMethods([]); setSelectedMethod(null); }} className={`mt-2.5 text-sm ${linkBtn}`}>
								{t.addNewAddress}
							</button>
						</div>
					) : (
						<FieldGroup>
							{hasSaved && mode === "address" && (
								<div className="sm:col-span-2 -mb-1">
									<button type="button" onClick={() => { setAddressMode("saved"); setTimeout(() => void previewRates(), 0); }} className={`text-sm ${linkBtn}`}>
										{t.useSavedAddress}
									</button>
								</div>
							)}
							<Field label={t.firstName} name="firstName" required className="sm:col-span-1" defaultValue={initialDraft?.firstName || customer?.firstName || order.customer?.firstName} placeholder={t.firstNamePlaceholder} icon={UserRound} />
							<Field label={t.lastName} name="lastName" required className="sm:col-span-1" defaultValue={initialDraft?.lastName || customer?.lastName || order.customer?.lastName} placeholder={t.lastNamePlaceholder} icon={UserRound} />
							<PhoneField label={t.phoneNumber} required defaultValue={initialDraft?.phoneNumber} className="sm:col-span-2" />
							{mode === "address" ? (
								<>
									<div className="sm:col-span-2">
										<label htmlFor="checkout-postalCode" className="block text-sm font-medium text-gray-700 mb-1">
											{t.zone}
											<span className="text-red-500 ms-1">*</span>
										</label>
										{notListed ? (
											<div className="flex flex-col gap-3">
												<select
													id="checkout-postalCode"
													name="fallbackZone"
													required
													value={zone}
													onChange={(e) => handleFallbackZone(e.target.value)}
													className="w-full border border-gray-300 rounded-full px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
												>
													<option value="">{o.selectZoneFallback}</option>
													{zoneOptions.map((z) => (
														<option key={z.zoneNumber} value={String(z.zoneNumber)}>
															{z.label}
														</option>
													))}
												</select>
												<Field label={o.fallbackAreaLabel} name="fallbackArea" required className="" placeholder={o.fallbackAreaPlaceholder} icon={MapPin} />
												<p className="text-xs text-gray-500 -mt-1">{o.fallbackNote}</p>
												<button type="button" onClick={closeNotListed} className="self-start text-sm font-semibold text-[#007185] hover:text-[#C7511F] hover:underline">
													{o.backToSearch}
												</button>
											</div>
										) : (
											<div className="relative">
												<MapPin size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
												<AreaSelect
													id="checkout-postalCode"
													name="postalCode"
													areas={areas}
													locale={locale}
													placeholder={t.selectZone}
													required
													value={zone}
													initialAreaId={initialDraft?.qatarAreaId}
													onChange={handleZoneChange}
													notListed={{ label: o.notListed, onSelect: openNotListed }}
													inputClassName="w-full border border-gray-300 rounded-full ps-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
												/>
											</div>
										)}
									</div>
									<Field label={t.addressLabel} name="streetLine1" required defaultValue={initialDraft?.streetLine1} placeholder={t.addressPlaceholder} icon={Home} />
									<Field label={t.street} name="streetLine2" className="sm:col-span-2" defaultValue={initialDraft?.streetLine2} placeholder={t.streetPlaceholder} icon={MapPin} />
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
						</FieldGroup>
					)}

					{customer && mode === "address" && addressMode === "new" && (
						<label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
							<input type="checkbox" checked={saveAddressChecked} onChange={(e) => setSaveAddressChecked(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
							<span className="text-sm text-gray-600">{t.saveAddressForFutureOrders}</span>
						</label>
					)}
				</section>

				{/* ── Delivery method ── */}
				{mode === "address" && (
					<section>
						<h2 className={sectionTitle}>{o.deliveryMethodTitle}</h2>
						{loadingMethods && (
							<div className="flex items-center gap-3 py-3 text-gray-500 text-sm">
								<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
								{t.calculatingRates}
							</div>
						)}
						{!loadingMethods && !areaKnown && <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 px-4 py-3">{o.selectAreaForOptions}</p>}
						{!loadingMethods && areaKnown && deliveryMethods.length === 0 && !error && <p className="text-sm text-gray-500">{t.noShippingMethods}</p>}
						{!loadingMethods && deliveryMethods.length > 0 && (
							<div className="space-y-2.5">
								{deliveryMethods.map((m) => (
									<label key={m.id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${selectedMethod === m.id ? "border-lime-400 bg-lime-50" : "border-gray-200 hover:border-gray-300"}`}>
										<input
											type="radio"
											name="shippingMethod"
											value={m.id}
											checked={selectedMethod === m.id}
											onChange={() => {
												setSelectedMethod(m.id);
												void (async () => { if (await applyMethod(m)) await loadPaymentMethods(); })();
											}}
											className="accent-lime-400 flex-shrink-0"
										/>
										<Truck size={18} className="text-gray-400 flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="font-medium text-gray-900 text-sm">{m.name}</p>
											{m.description && <div className="text-xs text-gray-500 mt-0.5 [&_p]:m-0" dangerouslySetInnerHTML={{ __html: m.description }} />}
										</div>
										<p className="font-semibold text-gray-900 text-sm flex-shrink-0">{m.priceWithTax === 0 ? <span className="text-green-600">{t.free}</span> : money(m.priceWithTax)}</p>
									</label>
								))}
							</div>
						)}
					</section>
				)}

				{/* ── Payment ── */}
				<section>
					<h2 className={sectionTitle}>{o.paymentMethodTitle}</h2>
					{payMethods.length === 0 ? (
						<p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-200 px-4 py-3">{areaKnown ? t.loadingPaymentOptions : o.paymentAfterDelivery}</p>
					) : (
						<div className="space-y-2.5">
							{payMethods.map((m) => (
								<label key={m.code} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${selectedPay === m.code ? "border-lime-400 bg-lime-50" : "border-gray-200 hover:border-gray-300"}`}>
									<input type="radio" name="paymentMethod" value={m.code} checked={selectedPay === m.code} onChange={() => setSelectedPay(m.code)} className="accent-lime-400 flex-shrink-0" />
									{paymentIcons[m.code] ?? paymentIcons.default}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<p className="font-medium text-gray-900 text-sm">{m.name}</p>
											{m.code === SKIPCASH_METHOD_CODE && (
												<div className="flex items-center gap-1" aria-label={t.acceptedPaymentMethods}>
													{PAYMENT_ICON_IDS.map((id) => (
														<img key={id} src={`/images/payments/PAY-${id}.jpg`} alt="" className="border border-[#ccc] object-contain" style={{ height: "20px", width: "32px" }} width={32} height={20} />
													))}
												</div>
											)}
										</div>
										{m.eligibilityMessage && <p className="text-xs text-yellow-600 mt-0.5">{m.eligibilityMessage}</p>}
									</div>
								</label>
							))}
						</div>
					)}
				</section>

				{/* ── Total + place order ── */}
				<section className="border-t border-gray-100 pt-4">
					<div className="flex items-baseline justify-between gap-3">
						<span className="text-sm text-gray-600">{o.finalOrderTotal}</span>
						<span className="text-lg font-extrabold text-gray-900">
							{money(order.totalWithTax)}
							{order.shippingLines.length === 0 && <span className="text-xs font-medium text-gray-500"> {o.plusDelivery}</span>}
						</span>
					</div>
					{error && <ErrorBox message={error} />}
					<button type="button" onClick={() => void handlePlaceOrder()} disabled={submitting || loadingMethods || !canPlaceOrder} className="mt-4 w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3.5 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-base">
						<ShieldCheck size={18} />
						{submitting ? o.placingOrder : o.placeOrder}
					</button>
					{!canPlaceOrder && !submitting && <p className="text-center text-xs text-gray-500 mt-2.5">{o.placeOrderHint}</p>}
					<p className="text-center text-xs text-gray-400 mt-3">{o.finalTotalNote}</p>
					<TermsHint t={t} />
				</section>
			</form>
		</div>
	);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
	const { activeOrder: initialOrder, activeCustomer, vendureBase, qatarAreas } = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const { setCartCount } = useCart();
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = CHECKOUT_COPY[locale];
	// The one-page checkout is the default. The previous multi-step flow is still available at
	// /checkout?classic=1 (or ?onestep=0); to make it the default again, flip DEFAULT_ONE_STEP.
	const checkoutParams = new URLSearchParams(useLocation().search);
	const oneStep = checkoutParams.get("classic") === "1" || checkoutParams.get("onestep") === "0" ? false : checkoutParams.get("onestep") === "1" ? true : DEFAULT_ONE_STEP;

	const [initialState] = useState(() => deriveCheckoutState(initialOrder!, activeCustomer, locale));
	const [step, setStep] = useState(initialState.step);
	const [completed, setCompleted] = useState<number[]>(initialState.completed);
	const [order, setOrder] = useState(initialOrder!);
	const [customerName, setCustomerName] = useState<{ firstName: string; lastName: string; email?: string; isGuest?: boolean } | null>(initialState.orderCustomer ? { firstName: initialState.orderCustomer.firstName, lastName: initialState.orderCustomer.lastName } : null);
	const [shippingAddressDraft, setShippingAddressDraft] = useState<ShippingAddressValues | null>(initialState.shippingAddressDraft);
	const [shippingMethodDraft, setShippingMethodDraft] = useState<string | null>(initialState.shippingMethodDraft);
	// null = not logged in (guest); an array (possibly empty) = a real customer's address
	// book -- see ShippingStep's savedAddresses prop and deriveCheckoutState above.
	const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[] | null>(initialState.initialAddresses);
	const { notify } = useNotification();
	// Vendure locks the order (ArrangingPayment) once the customer reaches Payment --
	// none of the earlier steps' mutations (setOrderShippingAddress, etc.) work until
	// it's reopened. Navigating back to a completed step while locked reopens it first
	// (a standard Vendure transition, ArrangingPayment -> AddingItems) before switching.
	const [reopening, setReopening] = useState(false);
	const pendingStepRef = useRef<number | null>(null);
	const reopenFetcher = useFetcher<{ transitionOrderToState?: { state?: string }; error?: string }>();

	useEffect(() => {
		if (reopenFetcher.state !== "idle" || !reopenFetcher.data || pendingStepRef.current === null) return;
		const target = pendingStepRef.current;
		pendingStepRef.current = null;
		setReopening(false);
		if (reopenFetcher.data.transitionOrderToState) {
			setOrder((prev) => ({ ...prev, state: reopenFetcher.data!.transitionOrderToState!.state ?? "AddingItems" }));
			setStep(target);
		} else {
			notify(reopenFetcher.data.error ?? t.couldNotReopenOrder, "error");
		}
	}, [reopenFetcher.state, reopenFetcher.data]);

	// A physical browser Back press after redirecting to an external payment gateway
	// (SkipCash) can restore this exact page from the browser's bfcache instead of
	// re-running the loader -- showing whatever was on screen right before the
	// redirect, which may no longer match the order's real state server-side (it's
	// likely ArrangingPayment now). A full reload guarantees this page reflects
	// reality instead of silently trusting a frozen snapshot.
	useEffect(() => {
		const handlePageShow = (event: PageTransitionEvent) => {
			if (event.persisted) window.location.reload();
		};
		window.addEventListener("pageshow", handlePageShow);
		return () => window.removeEventListener("pageshow", handlePageShow);
	}, []);

	function complete(n: number) {
		setCompleted((prev) => [...new Set([...prev, n])]);
		setStep(n + 1);
	}

	function goTo(n: number) {
		if (reopening) return;
		if (!(completed.includes(n - 1) || n === 1)) return;
		if (order.state === "ArrangingPayment" && n < step) {
			pendingStepRef.current = n;
			setReopening(true);
			reopenFetcher.submit({ _intent: "reopenCart" }, { method: "post", encType: "application/json", action: "/api/checkout" });
			return;
		}
		setStep(n);
	}

	return (
		<CheckoutLayout>
			{/* Cancels <main>'s py-8 for this page only, so the cream background runs flush
			    against the header and into the trust-badges bar / footer below. */}
			<div className="-mt-8 -mb-8">
				<div>
				<div className="flex flex-col lg:flex-row gap-4 py-8">
				<div className="lg:w-[65%]">
					{/* All three steps render in sequence (Casper-style) — only the active
					    step's form is expanded; completed steps collapse to a clickable
					    card, upcoming ones stay dimmed and inert. Centered within the
					    column rather than pinned to either edge. */}
					<div className="max-w-2xl lg:max-w-none mx-auto lg:mx-0">
						<Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
							<ChevronDown size={14} className="rotate-90 rtl:-rotate-90" />
							{t.continueShopping}
						</Link>

						{oneStep ? (
							<OneStepCheckout
								order={order}
								areas={qatarAreas}
								activeCustomer={activeCustomer}
								initialDraft={shippingAddressDraft}
								initialMode={initialState.shippingModeDraft}
								initialMethodId={shippingMethodDraft}
								setOrder={setOrder}
								onDone={(orderCode) => {
									setCartCount(0);
									navigate(localizePath(`/order-confirmation?code=${orderCode}`, locale));
								}}
							/>
						) : (
							<>
						<StepProgressBar step={step} completed={completed} t={t} />

						<div className="flex flex-col gap-4">
						<StepSection num={1} label={t.customerInformation} subtitle={t.customerInformationSubtitle} icon={UserRound} active={step === 1} completed={completed.includes(1)} onNavigate={() => goTo(1)}>
							<CustomerStep
								initialValues={initialState.orderCustomer}
								onComplete={(s) => {
									setCustomerName({ firstName: s.firstName, lastName: s.lastName, email: s.email, isGuest: s.isGuest });
									if (s.addresses) setCustomerAddresses(s.addresses);
									complete(1);
								}}
							/>
						</StepSection>

						<StepSection num={2} label={t.shippingStepLabel} subtitle={t.shippingStepSubtitle} icon={Truck} active={step === 2} completed={completed.includes(2)} onNavigate={() => goTo(2)}>
							<ShippingStep
								currency={order.currencyCode}
								areas={qatarAreas}
								initialValues={shippingAddressDraft}
								initialMethodId={shippingMethodDraft}
								initialMode={initialState.shippingModeDraft}
								customerName={customerName}
								savedAddresses={customerAddresses}
								onDraftChange={setShippingAddressDraft}
								onMethodChange={setShippingMethodDraft}
								onAddressSavedToAccount={(addr) => setCustomerAddresses((prev) => [...(prev ?? []), addr])}
								onComplete={(_summary, _method, totals) => {
									setOrder((prev) => ({ ...prev, ...totals }));
									complete(2);
								}}
								onBack={() => goTo(1)}
							/>
						</StepSection>

						<StepSection num={3} label={t.payment} subtitle={t.paymentSubtitle} icon={CreditCard} active={step === 3} completed={completed.includes(3)} onNavigate={() => goTo(3)}>
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
						</>
					)}
					</div>
				</div>

				{/* Order Summary — stays on top on mobile, collapsed to just the total by default */}
				<div className="order-first lg:order-last lg:w-[35%]">
					<div className="lg:sticky lg:top-6">
						<OrderSummaryPanel
						order={order}
						vendureBase={vendureBase}
						onOrderUpdate={(updates) => setOrder((prev) => ({ ...prev, ...updates }))}
						onLineQuantityChange={(response) =>
							setOrder((prev) => {
								const updatedById = new Map(response.lines.map((l) => [l.id, l]));
								return {
									...prev,
									totalQuantity: response.totalQuantity,
									subTotalWithTax: response.subTotalWithTax,
									shippingWithTax: response.shippingWithTax,
									totalWithTax: response.totalWithTax,
									lines: prev.lines.map((line) => {
										const u = updatedById.get(line.id);
										return u ? { ...line, quantity: u.quantity, unitPriceWithTax: u.unitPriceWithTax, linePriceWithTax: u.linePriceWithTax, discountedLinePriceWithTax: u.discountedLinePriceWithTax } : line;
									}),
								};
							})
						}
					/>
					</div>
				</div>
				</div>
			</div>
			</div>
		</CheckoutLayout>
	);
}