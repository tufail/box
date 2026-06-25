import { useState, useEffect, useRef } from "react";
import { useLoaderData, useFetcher, useNavigate, redirect, Link } from "react-router";
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

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const [orderResult, customerResult] = await Promise.allSettled([graphqlRequest<ActiveOrderData>(env, ACTIVE_ORDER_QUERY, undefined, { request }), graphqlRequest<{ activeCustomer: ActiveCustomer | null }>(env, ACTIVE_CUSTOMER_QUERY, undefined, { request })]);

	const activeOrder = orderResult.status === "fulfilled" ? orderResult.value.data.activeOrder : null;
	const activeCustomer = customerResult.status === "fulfilled" ? customerResult.value.data.activeCustomer : null;
	const vendureBase = (env.VENDURE_SHOP_API ?? "http://localhost:3000/shop-api").replace("/shop-api", "");

	if (!activeOrder || activeOrder.totalQuantity === 0) {
		return redirect("/");
	}

	return { activeOrder, activeCustomer, vendureBase };
}

export function meta() {
	return [{ title: "Checkout — PHQ" }, { name: "robots", content: "noindex, nofollow" }];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number, currency = "USD") {
	return `${currency} ${(cents / 100).toFixed(2)}`;
}

function resolveImg(preview: string, base: string) {
	return preview.startsWith("http") ? preview : `${base}${preview}`;
}

// ── Step wrapper ──────────────────────────────────────────────────────────────

function StepPanel({ num, title, isActive, isCompleted, canOpen, onOpen, summary, children }: { num: number; title: string; isActive: boolean; isCompleted: boolean; canOpen: boolean; onOpen: () => void; summary?: string; children: React.ReactNode }) {
	return (
		<div className={`rounded border-2 bg-white overflow-hidden transition-all ${isActive ? "border-primary shadow-sm" : "border-gray-200"}`}>
			<button type="button" onClick={isCompleted && !isActive && canOpen ? onOpen : undefined} className={`w-full flex items-center gap-4 p-5 text-left ${isCompleted && !isActive ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}`}>
				<div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}>{isCompleted ? <Check size={14} /> : num}</div>
				<div className="flex-1 min-w-0">
					<p className={`font-semibold ${isActive || isCompleted ? "text-gray-900" : "text-gray-400"}`}>{title}</p>
					{isCompleted && !isActive && summary && <p className="text-sm text-gray-500 truncate mt-0.5">{summary}</p>}
				</div>
				{isCompleted && !isActive && <ChevronDown size={16} className="flex-shrink-0 text-gray-400" />}
			</button>
			{isActive && <div className="px-5 pb-6 border-t border-gray-100 pt-4">{children}</div>}
		</div>
	);
}

// ── Shared form primitives ────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, name, type = "text", required, placeholder, className = "sm:col-span-2" }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; className?: string }) {
	return (
		<div className={className}>
			<label className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</label>
			<input name={name} type={type} required={required} placeholder={placeholder} className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
		</div>
	);
}

function Select({ label, name, autoComplete, placeholder, required, className = "sm:col-span-2", onChange, children }: { label: string; name: string; autoComplete?: string; placeholder?: string; required?: boolean; className?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
	return (
		<div className={className}>
			<label className="block text-sm font-medium text-gray-700 mb-1">
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</label>
			<select name={name} autoComplete={autoComplete} required={required} defaultValue="" onChange={onChange} className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white">
				{placeholder && (
					<option value="" disabled>
						{placeholder}
					</option>
				)}
				{children}
			</select>
		</div>
	);
}

function TermsHint() {
	return (
		<p className="text-center text-xs text-gray-400 mt-3">
			By continuing, I agree to the{" "}
			<Link to="/terms" className="underline hover:text-gray-600 transition-colors">
				Terms & Conditions
			</Link>{" "}
			and{" "}
			<Link to="/privacy-policy" className="underline hover:text-gray-600 transition-colors">
				Privacy Policy
			</Link>
			.
		</p>
	);
}

function NewsletterConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<div className="mt-4">
			<label className="flex items-start gap-2.5 cursor-pointer select-none" onClick={() => onChange(!checked)}>
				<div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors bg-white ${checked ? "border-green-500" : "border-gray-300"}`}>{checked && <Check size={12} strokeWidth={3} className="text-green-500" />}</div>
				<input type="hidden" name="emailOffers" value={checked ? "true" : "false"} />
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
	);
}

function ErrorBox({ message }: { message: string }) {
	return <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm mt-4">{message}</div>;
}

function SubmitBtn({ label, loading }: { label: string; loading: boolean }) {
	return (
		<button type="submit" disabled={loading} className="mt-5 w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
			{loading ? "Processing…" : label}
		</button>
	);
}

// ── Step 1: Customer ──────────────────────────────────────────────────────────

interface CustomerSummary {
	name: string;
	email: string;
}

function CustomerStep({ onComplete }: { onComplete: (s: CustomerSummary) => void }) {
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
				setError((r.message as string) || "Login failed. Check your credentials.");
			}
		}

		if (d.setCustomerForOrder) {
			const r = d.setCustomerForOrder;
			if (r.__typename === "Order") {
				onComplete(submittedRef.current!);
			} else {
				setError((r.message as string) || "Could not proceed as guest.");
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
		{ id: "guest" as const, label: "Guest" },
		{ id: "login" as const, label: "Login" },
		{ id: "register" as const, label: "Register" },
	];

	return (
		<div className="pt-2">
			{/* Tab bar */}
			<div className="flex gap-1 mb-6 bg-gray-100 rounded p-1">
				{tabs.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => {
							setTab(t.id);
							setError(null);
						}}
						className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{tab === "guest" && (
				<form onSubmit={handleGuest}>
					<FieldGroup>
						<Field label="First Name" name="firstName" required className="sm:col-span-1" />
						<Field label="Last Name" name="lastName" required className="sm:col-span-1" />
						<Field label="Email Address" name="emailAddress" type="email" required />
					</FieldGroup>
					<NewsletterConsent checked={newsletterChecked} onChange={setNewsletterChecked} />
					{error && <ErrorBox message={error} />}
					<SubmitBtn label="Continue as Guest" loading={loading} />
					<TermsHint />
				</form>
			)}

			{tab === "login" && (
				<>
					<SocialAuthButtons dividerLabel="Or sign in with email" />
					<form onSubmit={handleLogin}>
						<FieldGroup>
							<Field label="Email Address" name="email" type="email" required />
							<Field label="Password" name="password" type="password" required />
						</FieldGroup>
						{error && <ErrorBox message={error} />}
						<SubmitBtn label="Login & Continue" loading={loading} />
					</form>
				</>
			)}

			{tab === "register" && (
				<>
					<SocialAuthButtons dividerLabel="Or sign up with email" emailOffers={newsletterChecked} />
					<form onSubmit={handleRegister}>
						<FieldGroup>
							<Field label="First Name" name="firstName" required className="sm:col-span-1" />
							<Field label="Last Name" name="lastName" required className="sm:col-span-1" />
							<Field label="Email Address" name="emailAddress" type="email" required />
							<Field label="Password" name="password" type="password" required placeholder="Minimum 8 characters" />
							<Field label="Phone Number" name="phoneNumber" type="tel" placeholder="+974 xxxx xxxx" />
						</FieldGroup>
						<NewsletterConsent checked={newsletterChecked} onChange={setNewsletterChecked} />
						{error && <ErrorBox message={error} />}
						<SubmitBtn label="Create Account & Continue" loading={loading} />
						<TermsHint />
					</form>
				</>
			)}
		</div>
	);
}

// ── Step 2: Shipping Address ──────────────────────────────────────────────────

function ShippingAddressStep({ onComplete }: { onComplete: (summary: string) => void }) {
	const [error, setError] = useState<string | null>(null);
	const [zoneList, setZoneList] = useState<number[]>([]);
	const fetcher = useFetcher<{
		error?: string;
		setOrderShippingAddress?: Record<string, unknown>;
	}>();
	const summaryRef = useRef<string | null>(null);
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		const d = fetcher.data;
		if (d.error) {
			setError(d.error);
			return;
		}
		if (d.setOrderShippingAddress) {
			const r = d.setOrderShippingAddress;
			if (r.__typename === "Order") {
				onComplete(summaryRef.current!);
			} else {
				setError((r.message as string) || "Could not save shipping address.");
			}
		}
	}, [fetcher.data, fetcher.state]);

	function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const zone = qatarZones.find((z) => z.municipality === e.target.value);
		setZoneList(zone ? zone.zoneCodes : []);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const first = fd.get("firstName") as string;
		const last = fd.get("lastName") as string;
		const street = fd.get("streetLine1") as string;
		const city = fd.get("city") as string;
		const postalCode = fd.get("postalCode") as string;
		summaryRef.current = `${first} ${last} · ${street}, ${city}, Zone ${postalCode}`;
		const body: Record<string, string> = {
			_intent: "setShippingAddress",
			firstName: first,
			lastName: last,
			streetLine1: street,
			city,
			countryCode: "QA",
			province: "Doha",
		};
		const streetLine2 = fd.get("streetLine2") as string;
		const phoneNumber = fd.get("phoneNumber") as string;
		if (streetLine2) body.streetLine2 = streetLine2;
		if (postalCode) body.postalCode = postalCode;
		if (phoneNumber) body.phoneNumber = phoneNumber;
		setError(null);
		fetcher.submit(body, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	return (
		<form onSubmit={handleSubmit} className="pt-2">
			{/* Hidden fields */}
			<input type="hidden" name="countryCode" value="QA" />
			<input type="hidden" name="province" value="Doha" />

			<FieldGroup>
				<Field label="First Name" name="firstName" required className="sm:col-span-1" />
				<Field label="Last Name" name="lastName" required className="sm:col-span-1" />
				<Field label="Address (villa, flat, building & block, etc.)" name="streetLine1" required />
				<Field label="Street" name="streetLine2" className="sm:col-span-2" />
				<Select name="city" autoComplete="locality" placeholder="Select Municipality..." required label="Municipality" className="sm:col-span-1" onChange={handleCityChange}>
					{qatarZones.map((z, index) => (
						<option key={index} value={z.municipality}>
							{z.municipality}
						</option>
					))}
				</Select>
				<Select name="postalCode" autoComplete="postal-code" placeholder="Select Zone..." required label="Zone" className="sm:col-span-1">
					{zoneList.map((zone, index) => (
						<option key={index} value={`${zone}`}>
							Zone {zone}
						</option>
					))}
				</Select>
				<Field label="Phone Number" name="phoneNumber" type="tel" placeholder="+974 xxxx xxxx" className="sm:col-span-2" />
			</FieldGroup>
			{error && <ErrorBox message={error} />}
			<SubmitBtn label="Continue to Shipping" loading={loading} />
		</form>
	);
}

// ── Step 3: Shipping Method ───────────────────────────────────────────────────

interface UpdatedOrderTotals {
	shippingWithTax: number;
	totalWithTax: number;
	subTotalWithTax: number;
}

function ShippingMethodStep({ isActive, currency, onComplete }: { isActive: boolean; currency: string; onComplete: (method: ShippingMethod, totals: UpdatedOrderTotals) => void }) {
	const [methods, setMethods] = useState<ShippingMethod[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const loadFetcher = useFetcher<{ shippingMethods?: ShippingMethod[]; error?: string }>();
	const saveFetcher = useFetcher<{
		setOrderShippingMethod?: Record<string, unknown>;
		error?: string;
	}>();
	const loading = saveFetcher.state !== "idle";
	const loadingMethods = loadFetcher.state !== "idle";

	useEffect(() => {
		if (isActive && methods.length === 0 && loadFetcher.state === "idle") {
			loadFetcher.load("/api/checkout?intent=shippingMethods");
		}
	}, [isActive]);

	useEffect(() => {
		if (!loadFetcher.data) return;
		if (loadFetcher.data.shippingMethods) {
			setMethods(loadFetcher.data.shippingMethods);
			if (loadFetcher.data.shippingMethods.length > 0) {
				setSelected(loadFetcher.data.shippingMethods[0].id);
			}
		}
		if (loadFetcher.data.error) setError(loadFetcher.data.error);
	}, [loadFetcher.data]);

	useEffect(() => {
		if (saveFetcher.state !== "idle" || !saveFetcher.data) return;
		const d = saveFetcher.data;
		if (d.error) {
			setError(d.error);
			return;
		}
		if (d.setOrderShippingMethod) {
			const r = d.setOrderShippingMethod;
			if (r.__typename === "Order") {
				const method = methods.find((m) => m.id === selected)!;
				onComplete(method, {
					shippingWithTax: r.shippingWithTax as number,
					totalWithTax: r.totalWithTax as number,
					subTotalWithTax: r.subTotalWithTax as number,
				});
			} else {
				setError((r.message as string) || "Could not set shipping method.");
			}
		}
	}, [saveFetcher.data, saveFetcher.state]);

	function handleContinue() {
		if (!selected) return;
		setError(null);
		saveFetcher.submit({ _intent: "setShippingMethod", shippingMethodId: selected }, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	return (
		<div className="pt-2">
			{loadingMethods && (
				<div className="flex items-center gap-3 py-6 text-gray-500 text-sm">
					<div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
					Loading shipping options…
				</div>
			)}

			{!loadingMethods && methods.length === 0 && !error && <p className="text-gray-500 text-sm py-4">No shipping methods available.</p>}

			{methods.length > 0 && (
				<div className="space-y-3">
					{methods.map((m) => (
						<label key={m.id} className={`flex items-center gap-4 p-4 rounded border-2 cursor-pointer transition-colors ${selected === m.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
							<input type="radio" name="shippingMethod" value={m.id} checked={selected === m.id} onChange={() => setSelected(m.id)} className="accent-primary flex-shrink-0" />
							<Truck size={20} className="text-gray-400 flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="font-medium text-gray-900">{m.name}</p>
								{m.description && <p className="text-sm text-gray-500 mt-0.5">{m.description}</p>}
							</div>
							<p className="font-semibold text-gray-900 flex-shrink-0">{m.priceWithTax === 0 ? <span className="text-green-600">Free</span> : fmt(m.priceWithTax, currency)}</p>
						</label>
					))}
				</div>
			)}

			{error && <ErrorBox message={error} />}

			<button type="button" onClick={handleContinue} disabled={!selected || loading} className="mt-5 w-full bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3 rounded-full disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
				{loading ? "Processing…" : "Continue to Payment"}
			</button>
		</div>
	);
}

// ── Step 4: Payment ───────────────────────────────────────────────────────────

function PaymentStep({ isActive, total, currency, onComplete }: { isActive: boolean; total: number; currency: string; onComplete: (orderCode: string) => void }) {
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
				const msg = (r.paymentErrorMessage as string) || (r.eligibilityCheckerMessage as string) || (r.message as string) || "Payment failed. Please try again.";
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
					Loading payment options…
				</div>
			)}

			{!loadingMethods && methods.length === 0 && !error && <p className="text-gray-500 text-sm py-4">No payment methods available. Make sure a shipping method has been selected.</p>}

			{methods.length > 0 && (
				<div className="space-y-3 mb-2">
					{methods.map((m) => (
						<label key={m.code} className={`flex items-center gap-4 p-4 rounded border-2 cursor-pointer transition-colors ${selected === m.code ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
							<input type="radio" name="paymentMethod" value={m.code} checked={selected === m.code} onChange={() => setSelected(m.code)} className="accent-primary flex-shrink-0" />
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
				{loading ? "Processing Payment…" : `Place Order · ${fmt(total, currency)}`}
			</button>

			<p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
				<ShieldCheck size={12} />
				Your payment information is secure and encrypted
			</p>
		</div>
	);
}

// ── Coupon Form ───────────────────────────────────────────────────────────────

type CouponUpdate = Pick<ActiveOrder, "totalWithTax" | "subTotalWithTax" | "discounts" | "couponCodes">;

function CouponForm({ orderState, onApplied }: { orderState: string; onApplied: (updates: CouponUpdate) => void }) {
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
			setToast({ type: "success", message: "Coupon applied successfully!" });
			onApplied({
				totalWithTax: r.totalWithTax as number,
				subTotalWithTax: r.subTotalWithTax as number,
				discounts: r.discounts as OrderDiscount[],
				couponCodes: r.couponCodes as string[],
			});
		} else {
			setToast({ type: "error", message: (r.message as string) || "Invalid coupon code." });
		}
	}, [fetcher.data, fetcher.state]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 4500);
		return () => clearTimeout(t);
	}, [toast]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!code.trim() || isLocked || isBusy) return;
		fetcher.submit({ _intent: "applyCoupon", couponCode: code.trim() }, { method: "post", encType: "application/json", action: "/api/checkout" });
	}

	if (isLocked) {
		return (
			<div className="px-5 py-3 border-t border-gray-100">
				<p className="text-xs text-gray-400 text-center italic">Coupon codes cannot be changed while payment is in progress.</p>
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
					<Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
					<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="w-full border border-gray-300 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase placeholder:normal-case" />
				</div>
				<button type="submit" disabled={!code.trim() || isBusy} className="bg-primary text-white text-sm font-medium px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
					{isBusy ? "…" : "Apply"}
				</button>
			</form>
		</div>
	);
}

// ── Order Summary Panel ───────────────────────────────────────────────────────

function OrderSummaryPanel({ order, vendureBase, onOrderUpdate }: { order: ActiveOrder; vendureBase: string; onOrderUpdate: (updates: CouponUpdate) => void }) {
	const discounts = order.discounts?.filter((d) => d.amountWithTax < 0) ?? [];

	return (
		<div className="bg-white rounded border border-gray-200 overflow-hidden lg:sticky lg:top-6">
			<div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center gap-2">
				<Package size={18} className="text-gray-500" />
				<h2 className="font-semibold text-gray-900">Order Summary</h2>
				<span className="ml-auto text-sm text-gray-500">
					{order.totalQuantity} item{order.totalQuantity !== 1 ? "s" : ""}
				</span>
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
								<p className="text-xs text-gray-400 mt-0.5">Qty: {line.quantity}</p>
							</div>
							<div className="flex flex-col items-end flex-shrink-0">
								{line.discountedLinePriceWithTax < line.linePriceWithTax ? (
									<>
										<span className="text-xs text-gray-400 line-through">{fmt(line.linePriceWithTax, order.currencyCode)}</span>
										<span className="text-sm font-semibold text-green-600">{fmt(line.discountedLinePriceWithTax, order.currencyCode)}</span>
									</>
								) : (
									<span className="text-sm font-semibold text-gray-900">{fmt(line.linePriceWithTax, order.currencyCode)}</span>
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
							{d.description?.replace(/__bundle_discount_auto__/i, "Combo/Bundle Discount") ?? d.description ?? "Discount"}
							{console.log(d)}
						</span>
						<span className="flex-shrink-0 ml-2">−{fmt(Math.abs(d.amountWithTax), order.currencyCode)}</span>
					</div>
				))}

				<div className="flex justify-between text-sm text-gray-600">
					<span>Subtotal</span>
					<span>{fmt(order.subTotalWithTax, order.currencyCode)}</span>
				</div>

				<div className="flex justify-between text-sm text-gray-600">
					<span>Shipping</span>
					<span>{order.shippingWithTax > 0 ? fmt(order.shippingWithTax, order.currencyCode) : "—"}</span>
				</div>
				<div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
					<span>Total</span>
					<span>{fmt(order.totalWithTax, order.currencyCode)}</span>
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

	const [step, setStep] = useState(activeCustomer ? 2 : 1);
	const [completed, setCompleted] = useState<number[]>(activeCustomer ? [1] : []);
	const [order, setOrder] = useState(initialOrder!);
	const [customerSummary, setCustomerSummary] = useState<string | null>(activeCustomer ? `${activeCustomer.firstName} ${activeCustomer.lastName} — ${activeCustomer.emailAddress}` : null);
	const [addressSummary, setAddressSummary] = useState<string | null>(null);
	const [shippingSummary, setShippingSummary] = useState<string | null>(null);

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
						<ChevronDown size={14} className="rotate-90" />
						Continue Shopping
					</Link>
					<StepPanel num={1} title="Customer Information" isActive={step === 1} isCompleted={completed.includes(1)} canOpen onOpen={() => goTo(1)} summary={customerSummary ?? undefined}>
						<CustomerStep
							onComplete={(s) => {
								setCustomerSummary(s.name ? `${s.name} — ${s.email}` : s.email);
								complete(1);
							}}
						/>
					</StepPanel>

					<StepPanel num={2} title="Shipping Address" isActive={step === 2} isCompleted={completed.includes(2)} canOpen={completed.includes(1)} onOpen={() => goTo(2)} summary={addressSummary ?? undefined}>
						<ShippingAddressStep
							onComplete={(summary) => {
								setAddressSummary(summary);
								complete(2);
							}}
						/>
					</StepPanel>

					<StepPanel num={3} title="Shipping Method" isActive={step === 3} isCompleted={completed.includes(3)} canOpen={completed.includes(2)} onOpen={() => goTo(3)} summary={shippingSummary ?? undefined}>
						<ShippingMethodStep
							isActive={step === 3}
							currency={order.currencyCode}
							onComplete={(method, totals) => {
								setShippingSummary(`${method.name} — ${method.priceWithTax === 0 ? "Free" : fmt(method.priceWithTax, order.currencyCode)}`);
								setOrder((prev) => ({ ...prev, ...totals }));
								complete(3);
							}}
						/>
					</StepPanel>

					<StepPanel num={4} title="Payment" isActive={step === 4} isCompleted={completed.includes(4)} canOpen={completed.includes(3)} onOpen={() => goTo(4)}>
						<PaymentStep
							isActive={step === 4}
							total={order.totalWithTax}
							currency={order.currencyCode}
							onComplete={(orderCode) => {
								complete(4);
								setCartCount(0);
								navigate(`/order-confirmation?code=${orderCode}`);
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
