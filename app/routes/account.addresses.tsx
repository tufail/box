import { useState, useEffect } from "react";
import { redirect, useFetcher, useLocation } from "react-router";
import type { Route } from "./+types/account.addresses";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData, type CustomerAddress } from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { municipalityForZone, areaLabelForZone, qatarAreasSorted } from "~/constants/qatar-areas";
import AreaSelect, { type AreaOption } from "~/components/AreaSelect";
import { GET_QATAR_SHIPPING_AREAS_QUERY, type QatarShippingAreasData } from "~/graphql/qatarShippingAreas";
import { MapPin, Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { isValidQatarPhone } from "~/lib/validation";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const locale = getLocaleFromPathname(new URL(request.url).pathname);
	let customer: CustomerProfileData["activeCustomer"];
	try {
		const { data } = await graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request });
		if (!data.activeCustomer) return redirect(localizePath("/", locale));
		customer = data.activeCustomer;
	} catch {
		return redirect(localizePath("/", locale));
	}

	// Kept separate from the customer fetch above -- this one failing (e.g. the live
	// query not deployed yet) shouldn't take down the whole address book, just fall
	// back to the bundled static list (with no backend id) for zone-number purposes.
	const areasResult = await graphqlRequest<QatarShippingAreasData>(env, GET_QATAR_SHIPPING_AREAS_QUERY, undefined, { request, cf: { cacheTtl: 3600, cacheEverything: true } }).catch(() => null);
	const qatarAreas: AreaOption[] = areasResult ? areasResult.data.qatarShippingAreas : qatarAreasSorted.map((a) => ({ ...a, id: "" }));

	return { customer, qatarAreas };
}

export function meta() {
	return [{ title: "My Addresses - NutriBox" }, { name: "robots", content: "noindex" }];
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		editAddress: "Edit Address",
		addNewAddress: "Add New Address",
		cancel: "Cancel",
		firstName: "First Name",
		lastName: "Last Name",
		addressLabel: "Address (villa, flat, building & block, etc.)",
		street: "Street",
		zone: "Area",
		selectZone: "Select your area...",
		phoneNumber: "Phone Number",
		saving: "Saving…",
		saveAddress: "Save Address",
		firstNameRequired: "First name is required.",
		lastNameRequired: "Last name is required.",
		addressRequired: "Address is required.",
		selectZoneError: "Please select your area.",
		phoneRequired: "Phone number is required.",
		invalidPhone: "Enter a valid Qatar phone number.",
		default: "Default Shipping",
		defaultBilling: "Default Billing",
		setAsDefaultShipping: "Set as default shipping address",
		setAsDefaultBilling: "Set as default billing address",
		edit: "Edit",
		settingDefault: "Setting…",
		setAsDefault: "Set as default",
		deleteQuestion: "Delete?",
		deleting: "Deleting…",
		yes: "Yes",
		no: "No",
		delete: "Delete",
		savedAddresses: "Saved Addresses",
		manageAddressesNote: "Manage the addresses used for delivery at checkout.",
		noAddressesYet: "You don't have any saved addresses yet.",
	},
	ar: {
		editAddress: "تعديل العنوان",
		addNewAddress: "إضافة عنوان جديد",
		cancel: "إلغاء",
		firstName: "الاسم الأول",
		lastName: "اسم العائلة",
		addressLabel: "العنوان (فيلا، شقة، مبنى وبلوك، إلخ.)",
		street: "الشارع",
		zone: "المنطقة",
		selectZone: "اختر منطقتك...",
		phoneNumber: "رقم الهاتف",
		saving: "جارٍ الحفظ…",
		saveAddress: "حفظ العنوان",
		firstNameRequired: "الاسم الأول مطلوب.",
		lastNameRequired: "اسم العائلة مطلوب.",
		addressRequired: "العنوان مطلوب.",
		selectZoneError: "يرجى اختيار منطقتك.",
		phoneRequired: "رقم الهاتف مطلوب.",
		invalidPhone: "أدخل رقم هاتف قطري صالح.",
		default: "شحن افتراضي",
		defaultBilling: "فوترة افتراضية",
		setAsDefaultShipping: "تعيين كعنوان شحن افتراضي",
		setAsDefaultBilling: "تعيين كعنوان فوترة افتراضي",
		edit: "تعديل",
		settingDefault: "جارٍ التعيين…",
		setAsDefault: "تعيين كافتراضي",
		deleteQuestion: "حذف؟",
		deleting: "جارٍ الحذف…",
		yes: "نعم",
		no: "لا",
		delete: "حذف",
		savedAddresses: "العناوين المحفوظة",
		manageAddressesNote: "إدارة العناوين المستخدمة للتوصيل عند الدفع.",
		noAddressesYet: "ليس لديك أي عناوين محفوظة بعد.",
	},
} as const;

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors";
const errCls = "w-full px-3 py-2.5 border border-red-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-colors";
const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

interface AddressFormValues {
	id?: string;
	firstName: string;
	lastName: string;
	streetLine1: string;
	streetLine2: string;
	city: string;
	postalCode: string;
	phoneNumber: string;
	qatarAreaId?: string;
	defaultShippingAddress?: boolean;
	defaultBillingAddress?: boolean;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
	const [firstName, ...rest] = fullName.trim().split(" ");
	return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

// ── Address form (create + edit) ────────────────────────────────────────────

function AddressForm({ areas, initial, isFirstAddress, onSaved, onCancel }: { areas: AreaOption[]; initial?: AddressFormValues; isFirstAddress?: boolean; onSaved: (address: CustomerAddress) => void; onCancel: () => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
	// The specific area's backend row id -- pricing is looked up by this on the backend,
	// alongside postalCode (zone number) which keeps flowing exactly as before.
	const [areaId, setAreaId] = useState(initial?.qatarAreaId ?? "");
	const fetcher = useFetcher<{ error?: string; address?: CustomerAddress }>();
	const loading = fetcher.state !== "idle";

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.error) {
			setError(fetcher.data.error);
			return;
		}
		if (fetcher.data.address) onSaved(fetcher.data.address);
	}, [fetcher.data, fetcher.state]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const first = (fd.get("firstName") as string).trim();
		const last = (fd.get("lastName") as string).trim();
		const streetLine1 = (fd.get("streetLine1") as string).trim();
		const streetLine2 = (fd.get("streetLine2") as string).trim();
		const postalCode = fd.get("postalCode") as string;
		const phoneNumber = (fd.get("phoneNumber") as string).trim();
		// No separate municipality field anymore -- derived from whichever zone was picked.
		const city = postalCode ? municipalityForZone(Number(postalCode), locale) : "";

		const errors: Record<string, string> = {};
		if (!first) errors.firstName = t.firstNameRequired;
		if (!last) errors.lastName = t.lastNameRequired;
		if (!streetLine1) errors.streetLine1 = t.addressRequired;
		if (!postalCode) errors.postalCode = t.selectZoneError;
		if (!phoneNumber) errors.phoneNumber = t.phoneRequired;
		else if (!isValidQatarPhone(phoneNumber)) errors.phoneNumber = t.invalidPhone;
		setFieldErrors(errors);
		if (Object.keys(errors).length > 0) return;

		const defaultShippingAddress = fd.get("defaultShippingAddress") === "on";
		const defaultBillingAddress = fd.get("defaultBillingAddress") === "on";

		const body: Record<string, string> = {
			_intent: initial?.id ? "updateAddress" : "createAddress",
			fullName: `${first} ${last}`.trim(),
			streetLine1,
			city,
			province: "Doha",
			defaultShippingAddress: String(defaultShippingAddress),
			defaultBillingAddress: String(defaultBillingAddress),
		};
		if (initial?.id) body.id = initial.id;
		if (streetLine2) body.streetLine2 = streetLine2;
		if (postalCode) body.postalCode = postalCode;
		if (areaId) body.qatarAreaId = areaId;
		if (phoneNumber) body.phoneNumber = phoneNumber;
		setError(null);
		fetcher.submit(body, { method: "post", encType: "application/json", action: "/api/account" });
	}

	return (
		<form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5" noValidate>
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-900">{initial?.id ? t.editAddress : t.addNewAddress}</h2>
				<button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t.cancel}>
					<X size={18} />
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
				<div>
					<label htmlFor="address-firstName" className={labelCls}>
						{t.firstName} <span className="text-red-500">*</span>
					</label>
					<input id="address-firstName" name="firstName" required autoComplete="given-name" defaultValue={initial?.firstName} className={fieldErrors.firstName ? errCls : inputCls} />
					{fieldErrors.firstName && <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>}
				</div>
				<div>
					<label htmlFor="address-lastName" className={labelCls}>
						{t.lastName} <span className="text-red-500">*</span>
					</label>
					<input id="address-lastName" name="lastName" required autoComplete="family-name" defaultValue={initial?.lastName} className={fieldErrors.lastName ? errCls : inputCls} />
					{fieldErrors.lastName && <p className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</p>}
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="address-streetLine1" className={labelCls}>
						{t.addressLabel} <span className="text-red-500">*</span>
					</label>
					<input id="address-streetLine1" name="streetLine1" required autoComplete="address-line1" defaultValue={initial?.streetLine1} className={fieldErrors.streetLine1 ? errCls : inputCls} />
					{fieldErrors.streetLine1 && <p className="text-xs text-red-600 mt-1">{fieldErrors.streetLine1}</p>}
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="address-streetLine2" className={labelCls}>{t.street}</label>
					<input id="address-streetLine2" name="streetLine2" autoComplete="address-line2" defaultValue={initial?.streetLine2} className={inputCls} />
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="address-postalCode" className={labelCls}>
						{t.zone} <span className="text-red-500">*</span>
					</label>
					<AreaSelect
						id="address-postalCode"
						name="postalCode"
						areas={areas}
						locale={locale}
						placeholder={t.selectZone}
						required
						value={postalCode}
						initialAreaId={initial?.qatarAreaId}
						onChange={(zoneNumber, _areaName, pickedAreaId) => {
							setPostalCode(zoneNumber);
							setAreaId(pickedAreaId);
							setFieldErrors((prev) => (prev.postalCode ? { ...prev, postalCode: "" } : prev));
						}}
						inputClassName={fieldErrors.postalCode ? errCls : inputCls}
					/>
					{fieldErrors.postalCode && <p className="text-xs text-red-600 mt-1">{fieldErrors.postalCode}</p>}
				</div>
				<div className="sm:col-span-2">
					<label htmlFor="address-phoneNumber" className={labelCls}>
						{t.phoneNumber} <span className="text-red-500">*</span>
					</label>
					<input id="address-phoneNumber" name="phoneNumber" type="tel" required autoComplete="tel" defaultValue={initial?.phoneNumber} placeholder="+974 xxxx xxxx" className={fieldErrors.phoneNumber ? errCls : inputCls} />
					{fieldErrors.phoneNumber && <p className="text-xs text-red-600 mt-1">{fieldErrors.phoneNumber}</p>}
				</div>

				<div className="sm:col-span-2 flex flex-col gap-2.5 pt-1">
					<label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
						<input type="checkbox" name="defaultShippingAddress" defaultChecked={initial?.defaultShippingAddress ?? isFirstAddress ?? false} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
						{t.setAsDefaultShipping}
					</label>
					<label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
						<input type="checkbox" name="defaultBillingAddress" defaultChecked={initial?.defaultBillingAddress ?? isFirstAddress ?? false} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
						{t.setAsDefaultBilling}
					</label>
				</div>
			</div>

			{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

			<div className="flex items-center gap-3">
				<button type="submit" disabled={loading} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
					{loading ? t.saving : t.saveAddress}
				</button>
				<button type="button" onClick={onCancel} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
					{t.cancel}
				</button>
			</div>
		</form>
	);
}

// ── Address card (display + delete + set default) ──────────────────────────

function AddressCard({ address, onDeleted, onUpdated, onEdit }: { address: CustomerAddress; onDeleted: (id: string) => void; onUpdated: (address: CustomerAddress) => void; onEdit: () => void }) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const deleteFetcher = useFetcher<{ success?: boolean; id?: string; error?: string }>();
	const defaultFetcher = useFetcher<{ address?: CustomerAddress; error?: string }>();
	const deleting = deleteFetcher.state !== "idle";
	const settingDefault = defaultFetcher.state !== "idle";

	useEffect(() => {
		if (deleteFetcher.state !== "idle" || !deleteFetcher.data) return;
		if (deleteFetcher.data.success && deleteFetcher.data.id) onDeleted(deleteFetcher.data.id);
	}, [deleteFetcher.data, deleteFetcher.state]);

	useEffect(() => {
		if (defaultFetcher.state !== "idle" || !defaultFetcher.data) return;
		if (defaultFetcher.data.address) onUpdated(defaultFetcher.data.address);
	}, [defaultFetcher.data, defaultFetcher.state]);

	function handleDelete() {
		deleteFetcher.submit({ _intent: "deleteAddress", id: address.id }, { method: "post", encType: "application/json", action: "/api/account" });
	}

	function handleSetDefault() {
		defaultFetcher.submit({ _intent: "updateAddress", id: address.id, defaultShippingAddress: "true" }, { method: "post", encType: "application/json", action: "/api/account" });
	}

	return (
		<div className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between gap-4">
			<div className="flex items-start gap-3 min-w-0">
				<div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
					<MapPin size={16} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<p className="font-semibold text-gray-900">{address.fullName}</p>
						{address.defaultShippingAddress && <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{t.default}</span>}
						{address.defaultBillingAddress && <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{t.defaultBilling}</span>}
					</div>
					<p className="text-sm text-gray-500 mt-1">
						{address.streetLine1}
						{address.streetLine2 ? `, ${address.streetLine2}` : ""}, {address.city}, {areaLabelForZone(Number(address.postalCode), locale)}
					</p>
					{address.phoneNumber && <p className="text-sm text-gray-400 mt-0.5">{address.phoneNumber}</p>}
					<div className="flex items-center gap-4 mt-3">
						<button type="button" onClick={onEdit} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors">
							<Pencil size={13} /> {t.edit}
						</button>
						{!address.defaultShippingAddress && (
							<button type="button" onClick={handleSetDefault} disabled={settingDefault} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors disabled:opacity-50">
								<Star size={13} /> {settingDefault ? t.settingDefault : t.setAsDefault}
							</button>
						)}
						{confirmingDelete ? (
							<span className="flex items-center gap-2 text-xs">
								<span className="text-gray-500">{t.deleteQuestion}</span>
								<button type="button" onClick={handleDelete} disabled={deleting} className="font-medium text-red-600 hover:underline disabled:opacity-50">
									{deleting ? t.deleting : t.yes}
								</button>
								<button type="button" onClick={() => setConfirmingDelete(false)} className="font-medium text-gray-500 hover:underline">
									{t.no}
								</button>
							</span>
						) : (
							<button type="button" onClick={() => setConfirmingDelete(true)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors">
								<Trash2 size={13} /> {t.delete}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AddressesPage({ loaderData }: Route.ComponentProps) {
	const { customer, qatarAreas } = loaderData;
	const t = COPY[getLocaleFromPathname(useLocation().pathname)];
	const [addresses, setAddresses] = useState<CustomerAddress[]>(customer.addresses);
	const [formState, setFormState] = useState<"none" | "create" | CustomerAddress>("none");

	// Vendure only allows one default-shipping and one default-billing address at a
	// time -- the server already enforces that when creating/updating an address, but
	// this list is held in local state, so any other address that used to carry a
	// default flag needs to be cleared here too or two "Default" badges could show at
	// once until the next full page load.
	function clearOtherDefaults(prev: CustomerAddress[], saved: CustomerAddress): CustomerAddress[] {
		return prev.map((a) => {
			if (a.id === saved.id) return saved;
			return {
				...a,
				defaultShippingAddress: saved.defaultShippingAddress ? false : a.defaultShippingAddress,
				defaultBillingAddress: saved.defaultBillingAddress ? false : a.defaultBillingAddress,
			};
		});
	}

	function handleSaved(address: CustomerAddress) {
		setAddresses((prev) => {
			const exists = prev.some((a) => a.id === address.id);
			return exists ? clearOtherDefaults(prev, address) : clearOtherDefaults([...prev, address], address);
		});
		setFormState("none");
	}

	function handleDeleted(id: string) {
		setAddresses((prev) => prev.filter((a) => a.id !== id));
	}

	function handleUpdated(address: CustomerAddress) {
		setAddresses((prev) => clearOtherDefaults(prev, address));
	}

	return (
		<AccountLayout customer={customer}>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold text-gray-900">{t.savedAddresses}</h1>
						<p className="text-sm text-gray-500 mt-0.5">{t.manageAddressesNote}</p>
					</div>
					{formState === "none" && (
						<button type="button" onClick={() => setFormState("create")} className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
							<Plus size={15} /> {t.addNewAddress}
						</button>
					)}
				</div>

				{formState !== "none" && (
					<AddressForm
						areas={qatarAreas}
						isFirstAddress={addresses.length === 0}
						initial={
							formState === "create"
								? undefined
								: {
										id: formState.id,
										...splitFullName(formState.fullName),
										streetLine1: formState.streetLine1,
										streetLine2: formState.streetLine2 ?? "",
										city: formState.city,
										postalCode: formState.postalCode,
										phoneNumber: formState.phoneNumber ?? "",
										qatarAreaId: formState.customFields?.qatarAreaId != null ? String(formState.customFields.qatarAreaId) : undefined,
										defaultShippingAddress: formState.defaultShippingAddress,
										defaultBillingAddress: formState.defaultBillingAddress,
									}
						}
						onSaved={handleSaved}
						onCancel={() => setFormState("none")}
					/>
				)}

				{addresses.length === 0 && formState === "none" && (
					<div className="bg-white rounded-2xl shadow-sm p-10 text-center">
						<MapPin size={28} className="mx-auto text-gray-300 mb-3" />
						<p className="text-gray-500 text-sm">{t.noAddressesYet}</p>
					</div>
				)}

				{addresses.length > 0 && (
					<div className="space-y-4">
						{addresses.map((a) => (
							<AddressCard key={a.id} address={a} onDeleted={handleDeleted} onUpdated={handleUpdated} onEdit={() => setFormState(a)} />
						))}
					</div>
				)}
			</div>
		</AccountLayout>
	);
}
