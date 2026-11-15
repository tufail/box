import { useRef, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { MapPinPicker, MAPS_KEY, type PickedLocation } from "~/components/MapPinPicker";
import { matchAreas } from "~/lib/locateArea";
import type { AreaOption } from "~/components/AreaSelect";

// The address-line-1 field shared by the checkout (classic + one-step) and the account
// address form. When the map is available the field is read-only: clicking it (or
// Enter/Space) opens the map picker, and the picked place's address fills it. The pin
// drives distance-based delivery pricing; the area dropdown is auto-selected from the pin
// when Google's place names match one of our delivery areas.

export type MapPin = { latitude: number; longitude: number };

/** True when the map can actually be shown; the pin is only required in that case. */
export const MAP_PIN_ENABLED = !!MAPS_KEY;

const COPY = {
	en: {
		pick: "Tap to pin your location on the map",
		pinned: "Location pinned",
		required: "Please pin your delivery location on the map.",
	},
	ar: {
		pick: "اضغط لتحديد موقعك على الخريطة",
		pinned: "تم تحديد الموقع",
		required: "يرجى تحديد موقع التوصيل على الخريطة.",
	},
};

/**
 * Best delivery area for a picked location: a place-name match inside the geocoded zone
 * first, then any place-name match, then nothing (the customer keeps/picks the area).
 */
export function areaForLocation(areas: AreaOption[], loc: PickedLocation): AreaOption | null {
	const inZone = loc.zoneNumber != null ? areas.filter((a) => a.zoneNumber === loc.zoneNumber) : [];
	if (inZone.length === 1) return inZone[0];
	if (inZone.length > 1) {
		const m = matchAreas(loc.areaHints, inZone).matches;
		if (m.length) return m[0];
	}
	const m = matchAreas(loc.areaHints, areas).matches;
	return m[0] ?? null;
}

export default function MapPinField({
	locale,
	pin,
	error,
	onPicked,
	label,
	id,
	name = "streetLine1",
	defaultValue,
	placeholder,
	labelClassName = "block text-sm font-medium text-gray-700 mb-1",
	inputClassName,
	errorInputClassName,
	fieldError,
	className = "sm:col-span-2",
}: {
	locale: "en" | "ar";
	pin: MapPin | null;
	/** Show the "pin required" message (set by the caller on a failed submit) */
	error?: boolean;
	onPicked: (loc: PickedLocation) => void;
	label: string;
	id: string;
	name?: string;
	defaultValue?: string;
	/** Placeholder used only when the map is unavailable and the field is typed in */
	placeholder?: string;
	labelClassName?: string;
	inputClassName: string;
	/** Input classes used instead of inputClassName while an error is shown */
	errorInputClassName: string;
	/** Validation message for the address text itself (account form) */
	fieldError?: string;
	className?: string;
}) {
	const t = COPY[locale];
	const [open, setOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const showPinError = MAP_PIN_ENABLED && error && !pin;

	return (
		<div className={className}>
			<label htmlFor={id} className={labelClassName}>
				{label}
				<span className="text-red-500 ms-1">*</span>
			</label>
			<div className="relative flex items-center">
				<MapPin size={16} className={`absolute start-4 pointer-events-none ${showPinError ? "text-red-500" : "text-gray-400"}`} />
				<input
					ref={inputRef}
					id={id}
					name={name}
					required
					autoComplete={MAP_PIN_ENABLED ? "off" : "address-line1"}
					defaultValue={defaultValue}
					readOnly={MAP_PIN_ENABLED}
					placeholder={MAP_PIN_ENABLED ? t.pick : placeholder}
					aria-haspopup={MAP_PIN_ENABLED ? "dialog" : undefined}
					onClick={MAP_PIN_ENABLED ? () => setOpen(true) : undefined}
					onKeyDown={
						MAP_PIN_ENABLED
							? (e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setOpen(true);
									}
								}
							: undefined
					}
					className={`${showPinError || fieldError ? errorInputClassName : inputClassName} ps-9 ${MAP_PIN_ENABLED ? "cursor-pointer pe-9" : ""}`}
				/>
				{MAP_PIN_ENABLED && pin && <CheckCircle2 size={16} aria-label={t.pinned} className="absolute end-4 text-primary pointer-events-none" />}
			</div>
			{fieldError && !showPinError ? (
				<p className="text-xs text-red-600 mt-1">{fieldError}</p>
			) : showPinError ? (
				<p className="text-xs text-red-600 mt-1">{t.required}</p>
			) : null}
			{open && (
				<MapPinPicker
					locale={locale}
					initial={pin}
					initialAddress={inputRef.current?.value || undefined}
					onClose={() => setOpen(false)}
					onConfirm={(loc) => {
						setOpen(false);
						// Written straight to the (uncontrolled) input before notifying the caller,
						// so callers that read the form's DOM values in onPicked see the new address.
						if (inputRef.current && loc.address) inputRef.current.value = loc.address;
						onPicked(loc);
					}}
				/>
			)}
		</div>
	);
}
