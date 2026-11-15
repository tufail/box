import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { LocateFixed, MapPin } from "lucide-react";
import { useCart } from "~/context/CartContext";
import { getLocaleFromPathname } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";
import { MapPinPicker, MAPS_KEY, type PickedLocation } from "~/components/MapPinPicker";

// Amazon-style delivery block for the product page's buy box: when it arrives, what it costs
// to the customer's location, and the resulting order total.
//
// Fee: the live distance quote (/api/shipping-quote -> qatarShippingQuote), i.e. the same
// distance-based shipping method the checkout charges, so the estimate and the checkout figure
// can't drift. The order value is sent along so free-delivery rules ("99 QAR+ within 25 km")
// apply exactly as they will at checkout. The browser only remembers WHERE the customer is
// (the pin), never a price, so an admin pricing change shows up immediately.
// Order value: the cart's items total when the cart has anything in it, otherwise this
// product's price x the selected quantity.

// Same-day delivery cutoff, Doha time (Qatar is a fixed UTC+3, no DST) -- the same 9pm
// the checkout's own estimate uses (see estimatedDeliveryLabel in checkout.tsx).
const CUTOFF_HOUR = 21;
const DOHA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const STORAGE_KEY = "nutribox:delivery-location:v1";

interface SavedLocation {
	latitude: number;
	longitude: number;
	/** Readable address from the map picker; empty for "use my current location". */
	label: string;
}

interface ShippingQuote {
	deliverable: boolean;
	reason: string | null;
	distanceKm: number | null;
	price: number | null;
	isFree: boolean;
	freeReason: string | null;
	maximumDistanceKm: number | null;
}

const COPY = {
	en: {
		deliveryToday: "Delivery Today",
		deliveryTodayTomorrow: "Delivery Today – Tomorrow",
		deliverySameDayGeneric: "Same-day delivery on orders placed before 9pm",
		deliveryStandard: "Delivery in 2–6 business days",
		orderWithin: (t: string) => `Order within ${t} to get it today`,
		deliverTo: "Deliver to",
		yourLocation: "your current location",
		zone: (n: number) => `Zone ${n}`,
		selectLocation: "Select your delivery location",
		selectLocationHint: "to see the delivery fee",
		checking: "Checking delivery to your location…",
		useMyLocation: "Use my current location",
		locating: "Finding your location…",
		locationPrivacy: "Only used to work out the delivery fee.",
		locDenied: "Location access was blocked. Allow it in your browser settings, or pick your location on the map.",
		locFailed: "We couldn't get your location. Please pick it on the map.",
		outside: "This location is outside Qatar.",
		tooFar: (max: number | null) => `Sorry, we don't deliver this far${max ? ` (max ${max} km)` : ""}.`,
		free: "FREE",
		km: (n: number) => `${n} km`,
		hr: (n: number) => `${n} hr${n === 1 ? "" : "s"}`,
		min: (n: number) => `${n} min${n === 1 ? "" : "s"}`,
	},
	ar: {
		deliveryToday: "التوصيل اليوم",
		deliveryTodayTomorrow: "التوصيل اليوم – غدًا",
		deliverySameDayGeneric: "توصيل في نفس اليوم للطلبات قبل الساعة 9 مساءً",
		deliveryStandard: "التوصيل خلال 2–6 أيام عمل",
		orderWithin: (t: string) => `اطلب خلال ${t} لتصلك اليوم`,
		deliverTo: "التوصيل إلى",
		yourLocation: "موقعك الحالي",
		zone: (n: number) => `المنطقة ${n}`,
		selectLocation: "حدد موقع التوصيل",
		selectLocationHint: "لمعرفة رسوم التوصيل",
		checking: "جارٍ التحقق من التوصيل إلى موقعك...",
		useMyLocation: "استخدم موقعي الحالي",
		locating: "جارٍ تحديد موقعك…",
		locationPrivacy: "يُستخدم فقط لحساب رسوم التوصيل.",
		locDenied: "تم حظر الوصول إلى الموقع. اسمح به من إعدادات المتصفح أو حدد موقعك على الخريطة.",
		locFailed: "تعذر الحصول على موقعك. يرجى تحديده على الخريطة.",
		outside: "هذا الموقع خارج قطر.",
		tooFar: (max: number | null) => `عذراً، لا نوصل إلى هذه المسافة${max ? ` (الحد الأقصى ${max} كم)` : ""}.`,
		free: "مجاني",
		km: (n: number) => `${n} كم`,
		hr: (n: number) => `${n} ساعة`,
		min: (n: number) => `${n} دقيقة`,
	},
} as const;

// Time left until today's cutoff in Doha, or null when it has already passed.
function msUntilCutoff(nowMs: number): number | null {
	const doha = new Date(nowMs + DOHA_UTC_OFFSET_MS);
	const sinceMidnight = ((doha.getUTCHours() * 60 + doha.getUTCMinutes()) * 60 + doha.getUTCSeconds()) * 1000;
	const left = CUTOFF_HOUR * 60 * 60 * 1000 - sinceMidnight;
	return left > 0 ? left : null;
}

// Only the pin (and its readable label) is remembered -- the fee is always re-quoted.
function readSavedLocation(): SavedLocation | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const v = JSON.parse(raw) as SavedLocation;
		return Number.isFinite(v?.latitude) && Number.isFinite(v?.longitude) ? { latitude: v.latitude, longitude: v.longitude, label: v.label ?? "" } : null;
	} catch {
		return null;
	}
}

function saveLocation(loc: SavedLocation) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
	} catch {
		// private mode / blocked storage -- the choice just won't persist across visits
	}
}

interface Props {
	/** This product's unit price in minor units (cents/fils). */
	priceCents: number | null;
	qty: number;
	currencyCode: string;
	/** Same-day (stock on hand) vs standard 2-6 business day delivery. */
	isExpress: boolean;
	inStock: boolean;
}

export default function DeliveryEstimate({ priceCents, qty, currencyCode, isExpress, inStock }: Props) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const { cartCount, cartRefreshKey } = useCart();

	const [loc, setLoc] = useState<SavedLocation | null>(null);
	const [quote, setQuote] = useState<ShippingQuote | null>(null);
	const [quoting, setQuoting] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [cartSubTotal, setCartSubTotal] = useState<number | null>(null);
	// null until mounted: the countdown depends on the clock, so it must not render on the
	// server (it would never match what the browser computes a moment later).
	const [now, setNow] = useState<number | null>(null);
	const [locate, setLocate] = useState<{ phase: "idle" } | { phase: "locating" } | { phase: "error"; message: string }>({ phase: "idle" });

	// Restore the customer's last location (pin only).
	useEffect(() => {
		setLoc(readSavedLocation());
	}, []);

	// Cart total, when there is a cart. Re-read whenever the cart changes (add to cart bumps
	// both cartCount and cartRefreshKey).
	useEffect(() => {
		if (cartCount <= 0) {
			setCartSubTotal(null);
			return;
		}
		let cancelled = false;
		fetch("/api/cart")
			.then((r): Promise<{ activeOrder: { subTotalWithTax: number } | null } | null> => (r.ok ? r.json() : Promise.resolve(null)))
			.then((d) => {
				if (!cancelled) setCartSubTotal(d?.activeOrder?.subTotalWithTax ?? null);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [cartCount, cartRefreshKey]);

	// Countdown tick (minute precision is all the text shows).
	useEffect(() => {
		setNow(Date.now());
		const id = window.setInterval(() => setNow(Date.now()), 30_000);
		return () => window.clearInterval(id);
	}, []);

	// Order value the estimate is based on: the cart's items total when there is a cart,
	// otherwise this product's price for the selected quantity.
	const usingCart = cartCount > 0 && cartSubTotal !== null;
	const orderValue = usingCart ? cartSubTotal : priceCents !== null ? priceCents * qty : null;

	// Live distance quote for the pin + order value (debounced: qty can change quickly).
	useEffect(() => {
		if (!loc) {
			setQuote(null);
			return;
		}
		const ctrl = new AbortController();
		setQuoting(true);
		const timer = window.setTimeout(async () => {
			try {
				const total = orderValue !== null ? `&total=${Math.max(0, Math.round(orderValue))}` : "";
				const res = await fetch(`/api/shipping-quote?lat=${loc.latitude}&lng=${loc.longitude}${total}`, { signal: ctrl.signal });
				const data = (await res.json()) as { quote: ShippingQuote | null };
				setQuote(data.quote);
			} catch {
				/* aborted or offline -- keep the previous quote */
			} finally {
				if (!ctrl.signal.aborted) setQuoting(false);
			}
		}, 250);
		return () => {
			window.clearTimeout(timer);
			ctrl.abort();
		};
	}, [loc, orderValue]);

	if (!inStock) return null;

	const msLeft = now === null ? null : msUntilCutoff(now);
	let leftLabel = "";
	if (msLeft !== null) {
		const totalMins = Math.max(1, Math.floor(msLeft / 60_000));
		const h = Math.floor(totalMins / 60);
		const m = totalMins % 60;
		leftLabel = h > 0 ? `${t.hr(h)} ${t.min(m)}` : t.min(m);
	}

	// Headline promise.
	let promise: string;
	if (!isExpress) promise = t.deliveryStandard;
	else if (now === null) promise = t.deliverySameDayGeneric;
	else promise = msLeft !== null ? t.deliveryToday : t.deliveryTodayTomorrow;

	const deliverable = !!quote && quote.deliverable && quote.price !== null;
	const fee = deliverable ? quote!.price! : null;
	const money = (cents: number) => formatPrice(cents, currencyCode, locale);
	// Shown in front of the headline once a fee is known: "FREE delivery Today" / "QAR 15 delivery Today".
	const feeLabel = fee !== null ? (fee === 0 ? t.free : money(fee)) : null;

	function choose(next: SavedLocation) {
		setLoc(next);
		saveLocation(next);
		setLocate({ phase: "idle" });
	}

	function onPicked(p: PickedLocation) {
		setPickerOpen(false);
		choose({ latitude: p.latitude, longitude: p.longitude, label: p.address });
	}

	// Asks the browser for the device's position (the browser shows its own permission prompt --
	// only ever triggered by this click, never on page load) and quotes delivery to it.
	function onUseLocation() {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setLocate({ phase: "error", message: t.locFailed });
			return;
		}
		setLocate({ phase: "locating" });
		navigator.geolocation.getCurrentPosition(
			(pos) => choose({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label: "" }),
			(err) => setLocate({ phase: "error", message: err.code === err.PERMISSION_DENIED ? t.locDenied : t.locFailed }),
			{ enableHighAccuracy: true, timeout: 10_000, maximumAge: 5 * 60_000 },
		);
	}

	// Amazon-style: plain text lines, no box; every action is a blue link that goes orange on hover.
	const LINK = "text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer";
	const canMap = !!MAPS_KEY;

	const locateLink = (
		<button type="button" onClick={onUseLocation} disabled={locate.phase === "locating"} className={`inline-flex items-center gap-1 ${LINK} disabled:opacity-60 disabled:no-underline`}>
			<LocateFixed size={13} aria-hidden="true" />
			{locate.phase === "locating" ? t.locating : t.useMyLocation}
		</button>
	);
	const locateError = locate.phase === "error" ? <p className="text-xs text-red-600">{locate.message}</p> : null;

	// "Order within <2 hrs 54 mins> to get it today" with just the time in green.
	const [orderBefore, orderAfter] = t.orderWithin("\u0001").split("\u0001");
	// Only the zone ("Zone 95") -- a full Google address is too long for the buy box. Falls back
	// to the first part of the address when Google gave no zone, then to "your current location".
	const zoneMatch = loc ? /zone\s*0*(\d+)/i.exec(loc.label) : null;
	const placeName = !loc ? "" : zoneMatch ? t.zone(Number(zoneMatch[1])) : loc.label.split(",")[0]?.trim() || t.yourLocation;

	return (
		<div className="flex flex-col gap-1 text-sm text-gray-800" aria-live="polite">
			<p className="leading-snug">
				{feeLabel && <span className={`font-bold ${fee === 0 ? "text-green-700" : "text-gray-900"}`}>{feeLabel} </span>}
				<span className="font-bold text-gray-900">{feeLabel ? promise.charAt(0).toLowerCase() + promise.slice(1) : promise}</span>
				{isExpress && msLeft !== null && (
					<span className="block text-xs text-gray-600">
						{orderBefore}
						<span className="font-semibold text-green-700">{leftLabel}</span>
						{orderAfter}
					</span>
				)}
			</p>

			{loc ? (
				<div className="flex flex-col gap-0.5">
					<p className="flex items-center gap-1.5 min-w-0">
						<MapPin size={15} className="text-gray-700 shrink-0" aria-hidden="true" />
						<button
							type="button"
							onClick={() => (canMap ? setPickerOpen(true) : onUseLocation())}
							className={`text-start truncate min-w-0 ${LINK}`}
							title={loc.label || placeName}
						>
							{t.deliverTo} {placeName}
						</button>
						{deliverable && quote!.distanceKm !== null && <span className="text-xs text-gray-500 shrink-0">· {t.km(quote!.distanceKm!)}</span>}
					</p>
					{quoting && !quote && <p className="text-gray-500 text-xs">{t.checking}</p>}
					{quote && !quote.deliverable && (
						<p className="text-xs text-red-600">{quote.reason === "TOO_FAR" ? t.tooFar(quote.maximumDistanceKm) : t.outside}</p>
					)}
					{locateError}
				</div>
			) : (
				<div className="flex flex-col gap-0.5">
					{canMap && (
						<p className="flex items-center gap-1.5">
							<MapPin size={15} className="text-gray-700 shrink-0" aria-hidden="true" />
							<button type="button" onClick={() => setPickerOpen(true)} className={`text-start text-xs ${LINK}`}>
								{t.selectLocation}
							</button>
							<span className="text-gray-500 text-xs">{t.selectLocationHint}</span>
						</p>
					)}
					{/* Device location is only a fallback for when the Google map picker isn't available */}
					{!canMap && (
						<>
							<p className="text-xs">{locateLink}</p>
							<p className="text-[11px] text-gray-400">{t.locationPrivacy}</p>
						</>
					)}
					{locateError}
				</div>
			)}

			{pickerOpen && (
				<MapPinPicker
					locale={locale}
					initial={loc}
					initialAddress={loc?.label || undefined}
					onClose={() => setPickerOpen(false)}
					onConfirm={onPicked}
				/>
			)}
		</div>
	);
}
