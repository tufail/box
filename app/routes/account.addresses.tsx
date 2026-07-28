import { useState, useEffect } from "react";
import { redirect, useFetcher } from "react-router";
import type { Route } from "./+types/account.addresses";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CUSTOMER_PROFILE_QUERY, type CustomerProfileData, type CustomerAddress } from "~/graphql/account";
import AccountLayout from "~/layouts/AccountLayout";
import { qatarZones } from "~/constants/qatar";
import { MapPin, Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { isValidQatarPhone } from "~/lib/validation";

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	try {
		const { data } = await graphqlRequest<CustomerProfileData>(env, GET_CUSTOMER_PROFILE_QUERY, undefined, { request });
		if (!data.activeCustomer) return redirect("/");
		return { customer: data.activeCustomer };
	} catch {
		return redirect("/");
	}
}

export function meta() {
	return [{ title: "My Addresses — NutriBox" }, { name: "robots", content: "noindex" }];
}

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
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
	const [firstName, ...rest] = fullName.trim().split(" ");
	return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

// ── Address form (create + edit) ────────────────────────────────────────────

function AddressForm({ initial, onSaved, onCancel }: { initial?: AddressFormValues; onSaved: (address: CustomerAddress) => void; onCancel: () => void }) {
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [zoneList, setZoneList] = useState<number[]>(() => {
		const zone = initial ? qatarZones.find((z) => z.municipality === initial.city) : undefined;
		return zone ? zone.zoneCodes : [];
	});
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

	function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const zone = qatarZones.find((z) => z.municipality === e.target.value);
		setZoneList(zone ? zone.zoneCodes : []);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const first = (fd.get("firstName") as string).trim();
		const last = (fd.get("lastName") as string).trim();
		const streetLine1 = (fd.get("streetLine1") as string).trim();
		const city = fd.get("city") as string;
		const streetLine2 = (fd.get("streetLine2") as string).trim();
		const postalCode = fd.get("postalCode") as string;
		const phoneNumber = (fd.get("phoneNumber") as string).trim();

		const errors: Record<string, string> = {};
		if (!first) errors.firstName = "First name is required.";
		if (!last) errors.lastName = "Last name is required.";
		if (!streetLine1) errors.streetLine1 = "Address is required.";
		if (!city) errors.city = "Please select a municipality.";
		if (!postalCode) errors.postalCode = "Please select a zone.";
		if (!phoneNumber) errors.phoneNumber = "Phone number is required.";
		else if (!isValidQatarPhone(phoneNumber)) errors.phoneNumber = "Enter a valid Qatar phone number.";
		setFieldErrors(errors);
		if (Object.keys(errors).length > 0) return;

		const body: Record<string, string> = {
			_intent: initial?.id ? "updateAddress" : "createAddress",
			fullName: `${first} ${last}`.trim(),
			streetLine1,
			city,
			province: "Doha",
		};
		if (initial?.id) body.id = initial.id;
		if (streetLine2) body.streetLine2 = streetLine2;
		if (postalCode) body.postalCode = postalCode;
		if (phoneNumber) body.phoneNumber = phoneNumber;
		setError(null);
		fetcher.submit(body, { method: "post", encType: "application/json", action: "/api/account" });
	}

	return (
		<form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5" noValidate>
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-900">{initial?.id ? "Edit Address" : "Add New Address"}</h2>
				<button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Cancel">
					<X size={18} />
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
				<div>
					<label className={labelCls}>
						First Name <span className="text-red-500">*</span>
					</label>
					<input name="firstName" required defaultValue={initial?.firstName} className={fieldErrors.firstName ? errCls : inputCls} />
					{fieldErrors.firstName && <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>}
				</div>
				<div>
					<label className={labelCls}>
						Last Name <span className="text-red-500">*</span>
					</label>
					<input name="lastName" required defaultValue={initial?.lastName} className={fieldErrors.lastName ? errCls : inputCls} />
					{fieldErrors.lastName && <p className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</p>}
				</div>
				<div className="sm:col-span-2">
					<label className={labelCls}>
						Address (villa, flat, building & block, etc.) <span className="text-red-500">*</span>
					</label>
					<input name="streetLine1" required defaultValue={initial?.streetLine1} className={fieldErrors.streetLine1 ? errCls : inputCls} />
					{fieldErrors.streetLine1 && <p className="text-xs text-red-600 mt-1">{fieldErrors.streetLine1}</p>}
				</div>
				<div className="sm:col-span-2">
					<label className={labelCls}>Street</label>
					<input name="streetLine2" defaultValue={initial?.streetLine2} className={inputCls} />
				</div>
				<div>
					<label className={labelCls}>
						Municipality <span className="text-red-500">*</span>
					</label>
					<select name="city" required defaultValue={initial?.city ?? ""} onChange={handleCityChange} className={fieldErrors.city ? errCls : inputCls}>
						<option value="" disabled>
							Select Municipality...
						</option>
						{qatarZones.map((z, i) => (
							<option key={i} value={z.municipality}>
								{z.municipality}
							</option>
						))}
					</select>
					{fieldErrors.city && <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>}
				</div>
				<div>
					<label className={labelCls}>
						Zone <span className="text-red-500">*</span>
					</label>
					<select name="postalCode" required defaultValue={initial?.postalCode ?? ""} className={fieldErrors.postalCode ? errCls : inputCls}>
						<option value="" disabled>
							Select Zone...
						</option>
						{zoneList.map((zone, i) => (
							<option key={i} value={`${zone}`}>
								Zone {zone}
							</option>
						))}
					</select>
					{fieldErrors.postalCode && <p className="text-xs text-red-600 mt-1">{fieldErrors.postalCode}</p>}
				</div>
				<div className="sm:col-span-2">
					<label className={labelCls}>
						Phone Number <span className="text-red-500">*</span>
					</label>
					<input name="phoneNumber" type="tel" required defaultValue={initial?.phoneNumber} placeholder="+974 xxxx xxxx" className={fieldErrors.phoneNumber ? errCls : inputCls} />
					{fieldErrors.phoneNumber && <p className="text-xs text-red-600 mt-1">{fieldErrors.phoneNumber}</p>}
				</div>
			</div>

			{error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

			<div className="flex items-center gap-3">
				<button type="submit" disabled={loading} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
					{loading ? "Saving…" : "Save Address"}
				</button>
				<button type="button" onClick={onCancel} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
					Cancel
				</button>
			</div>
		</form>
	);
}

// ── Address card (display + delete + set default) ──────────────────────────

function AddressCard({ address, onDeleted, onUpdated, onEdit }: { address: CustomerAddress; onDeleted: (id: string) => void; onUpdated: (address: CustomerAddress) => void; onEdit: () => void }) {
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
						{address.defaultShippingAddress && <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Default</span>}
					</div>
					<p className="text-sm text-gray-500 mt-1">
						{address.streetLine1}
						{address.streetLine2 ? `, ${address.streetLine2}` : ""}, {address.city}, Zone {address.postalCode}
					</p>
					{address.phoneNumber && <p className="text-sm text-gray-400 mt-0.5">{address.phoneNumber}</p>}
					<div className="flex items-center gap-4 mt-3">
						<button type="button" onClick={onEdit} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors">
							<Pencil size={13} /> Edit
						</button>
						{!address.defaultShippingAddress && (
							<button type="button" onClick={handleSetDefault} disabled={settingDefault} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-emerald-700 transition-colors disabled:opacity-50">
								<Star size={13} /> {settingDefault ? "Setting…" : "Set as default"}
							</button>
						)}
						{confirmingDelete ? (
							<span className="flex items-center gap-2 text-xs">
								<span className="text-gray-500">Delete?</span>
								<button type="button" onClick={handleDelete} disabled={deleting} className="font-medium text-red-600 hover:underline disabled:opacity-50">
									{deleting ? "Deleting…" : "Yes"}
								</button>
								<button type="button" onClick={() => setConfirmingDelete(false)} className="font-medium text-gray-500 hover:underline">
									No
								</button>
							</span>
						) : (
							<button type="button" onClick={() => setConfirmingDelete(true)} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors">
								<Trash2 size={13} /> Delete
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
	const { customer } = loaderData;
	const [addresses, setAddresses] = useState<CustomerAddress[]>(customer.addresses);
	const [formState, setFormState] = useState<"none" | "create" | CustomerAddress>("none");

	function handleSaved(address: CustomerAddress) {
		setAddresses((prev) => {
			const exists = prev.some((a) => a.id === address.id);
			return exists ? prev.map((a) => (a.id === address.id ? address : a)) : [...prev, address];
		});
		setFormState("none");
	}

	function handleDeleted(id: string) {
		setAddresses((prev) => prev.filter((a) => a.id !== id));
	}

	function handleUpdated(address: CustomerAddress) {
		setAddresses((prev) => prev.map((a) => (a.id === address.id ? address : { ...a, defaultShippingAddress: false })));
	}

	return (
		<AccountLayout customer={customer}>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-lg font-semibold text-gray-900">Saved Addresses</h1>
						<p className="text-sm text-gray-500 mt-0.5">Manage the addresses used for delivery at checkout.</p>
					</div>
					{formState === "none" && (
						<button type="button" onClick={() => setFormState("create")} className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
							<Plus size={15} /> Add New Address
						</button>
					)}
				</div>

				{formState !== "none" && (
					<AddressForm
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
									}
						}
						onSaved={handleSaved}
						onCancel={() => setFormState("none")}
					/>
				)}

				{addresses.length === 0 && formState === "none" && (
					<div className="bg-white rounded-2xl shadow-sm p-10 text-center">
						<MapPin size={28} className="mx-auto text-gray-300 mb-3" />
						<p className="text-gray-500 text-sm">You don't have any saved addresses yet.</p>
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
