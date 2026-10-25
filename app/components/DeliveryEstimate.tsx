import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { LocateFixed, MapPin } from "lucide-react";
import AreaSelect, { type AreaOption } from "~/components/AreaSelect";
import { useCart } from "~/context/CartContext";
import { getLocaleFromPathname } from "~/lib/i18n";
import { formatPrice } from "~/lib/currency";
import type { LocateAreaResponse } from "~/routes/api.locate-area";

// Amazon-style delivery block for the product page's buy box: when it arrives, what it
// costs to the customer's area, and the resulting order total.
//
// Fee: the area's own price from the public Shop API (QatarShippingArea.price) -- the same
// number the checkout's area-based shipping calculator charges, so the estimate and the
// final checkout figure can't drift. Everything about an area (name, zone, fee) is read from
// that API on every visit; the browser only remembers WHICH area the customer picked (its
// id), never a price, so an admin price change shows up immediately. Order value: the cart's items total when the cart has
// anything in it, otherwise this product's price x the selected quantity.

// Same-day delivery cutoff, Doha time (Qatar is a fixed UTC+3, no DST) -- the same 9pm
// the checkout's own estimate uses (see estimatedDeliveryLabel in checkout.tsx).
const CUTOFF_HOUR = 21;
const DOHA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const STORAGE_KEY = "nutribox:delivery-area:v2";

interface DeliveryArea extends AreaOption {
	price: number; // fils
}

const COPY = {
	en: {
		deliveryToday: "Delivery Today",
		deliveryTodayTomorrow: "Delivery Today – Tomorrow",
		deliverySameDayGeneric: "Same-day delivery on orders placed before 9pm",
		deliveryStandard: "Delivery in 2–6 business days",
		orderWithin: (t: string) => `Order within ${t} to get it today`,
		deliverTo: "Deliver to",
		change: "Change",
		selectArea: "Select your delivery area",
		selectAreaHint: "to see the delivery fee",
		checkingArea: "Checking delivery to your area…",
		cancel: "Cancel",
		useMyLocation: "Use my current location",
		locating: "Finding your location…",
		locationPrivacy: "Only used to find your delivery area. It isn't stored.",
		orChooseArea: "or choose your area from the list",
		chooseZone: "We found your area. Which zone is yours?",
		zoneLabel: (n: number) => `Zone ${n}`,
		locDenied: "Location access was blocked. Allow it in your browser settings, or choose your area from the list.",
		locFailed: "We couldn't get your location. Please choose your area from the list.",
		locOutside: "Your device location appears to be outside Qatar. Please choose your area from the list.",
		locNoMatch: "We couldn't match your location to a delivery area. Please choose it from the list.",
		locUnavailable: "We couldn't detect your area right now. Please choose it from the list.",
		areaPlaceholder: "Search your area…",
		free: "FREE",
		estimatedTotal: "Estimated total",
		forThisItem: "this item",
		forCart: "your cart",
		plusDelivery: "+ delivery",
		confirmedAtCheckout: "Final delivery fee is confirmed at checkout.",
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
		change: "تغيير",
		selectArea: "اختر منطقة التوصيل",
		selectAreaHint: "لمعرفة رسوم التوصيل",
		checkingArea: "جارٍ التحقق من التوصيل إلى منطقتك...",
		cancel: "إلغاء",
		useMyLocation: "استخدم موقعي الحالي",
		locating: "جارٍ تحديد موقعك…",
		locationPrivacy: "يُستخدم فقط لتحديد منطقة التوصيل ولا يتم حفظه.",
		orChooseArea: "أو اختر منطقتك من القائمة",
		chooseZone: "وجدنا منطقتك. ما هو رقم منطقتك؟",
		zoneLabel: (n: number) => `المنطقة ${n}`,
		locDenied: "تم حظر الوصول إلى الموقع. اسمح به من إعدادات المتصفح أو اختر منطقتك من القائمة.",
		locFailed: "تعذر الحصول على موقعك. يرجى اختيار منطقتك من القائمة.",
		locOutside: "يبدو أن موقع جهازك خارج قطر. يرجى اختيار منطقتك من القائمة.",
		locNoMatch: "تعذر مطابقة موقعك مع منطقة توصيل. يرجى اختيارها من القائمة.",
		locUnavailable: "تعذر تحديد منطقتك حاليًا. يرجى اختيارها من القائمة.",
		areaPlaceholder: "ابحث عن منطقتك…",
		free: "مجاني",
		estimatedTotal: "الإجمالي التقديري",
		forThisItem: "هذا المنتج",
		forCart: "سلتك",
		plusDelivery: "+ التوصيل",
		confirmedAtCheckout: "يتم تأكيد رسوم التوصيل النهائية عند إتمام الطلب.",
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

// Only the picked area's id is remembered -- name, zone and fee are always re-read from the API.
function readSavedAreaId(): string | null {
	try {
		return window.localStorage.getItem(STORAGE_KEY) || null;
	} catch {
		return null;
	}
}

function saveAreaId(id: string) {
	try {
		window.localStorage.setItem(STORAGE_KEY, id);
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

	const [areaId, setAreaId] = useState<string | null>(null);
	const [areas, setAreas] = useState<DeliveryArea[] | null>(null);
	const [picking, setPicking] = useState(false);
	const [cartSubTotal, setCartSubTotal] = useState<number | null>(null);
	// null until mounted: the countdown depends on the clock, so it must not render on the
	// server (it would never match what the browser computes a moment later).
	const [now, setNow] = useState<number | null>(null);
	// "Use my current location" flow.
	const [locate, setLocate] = useState<{ phase: "idle" } | { phase: "locating" } | { phase: "error"; message: string } | { phase: "choose"; candidates: DeliveryArea[] }>({ phase: "idle" });

	// Restore which area the customer last chose (id only).
	useEffect(() => {
		setAreaId(readSavedAreaId());
	}, []);

	// The area list (with live fees): loaded as soon as there's a remembered area to price, or
	// when the picker is first opened.
	const needAreas = picking || areaId !== null;
	useEffect(() => {
		if (!needAreas || areas) return;
		let cancelled = false;
		fetch("/api/shipping-areas")
			.then((r): Promise<DeliveryArea[]> => (r.ok ? r.json() : Promise.resolve([])))
			.then((list) => {
				if (!cancelled && list.length > 0) setAreas(list);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [needAreas, areas]);


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

	const areaOptions = useMemo<AreaOption[]>(() => areas ?? [], [areas]);
	// Always the live record from the API (null while it loads, or if the remembered id no longer exists).
	const area = useMemo(() => (areaId && areas ? (areas.find((a) => a.id === areaId) ?? null) : null), [areaId, areas]);
	const areaLoading = areaId !== null && areas === null;

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

	// Order value the estimate is based on: the cart's items total when there is a cart,
	// otherwise this product's price for the selected quantity.
	const usingCart = cartCount > 0 && cartSubTotal !== null;
	const orderValue = usingCart ? cartSubTotal : priceCents !== null ? priceCents * qty : null;
	const fee = area ? area.price : null;
	const total = orderValue !== null && fee !== null ? orderValue + fee : null;
	const money = (cents: number) => formatPrice(cents, currencyCode, locale);
	// Shown in front of the headline once an area is known: "FREE delivery Today" / "QAR 29 delivery Today".
	const feeLabel = area && fee !== null ? (fee === 0 ? t.free : money(fee)) : null;

	function choose(picked: DeliveryArea) {
		setAreaId(picked.id);
		saveAreaId(picked.id);
		setPicking(false);
		setLocate({ phase: "idle" });
	}

	function onPick(_zone: string, _name: string, areaId: string) {
		const picked = areas?.find((a) => a.id === areaId);
		if (picked) choose(picked);
	}

	async function loadAreas(): Promise<DeliveryArea[]> {
		if (areas) return areas;
		try {
			const r = await fetch("/api/shipping-areas");
			const list = r.ok ? ((await r.json()) as DeliveryArea[]) : [];
			if (list.length > 0) setAreas(list);
			return list;
		} catch {
			return [];
		}
	}

	// Asks the browser for the device's position (the browser shows its own permission
	// prompt -- only ever triggered by this click, never on page load), has the server turn
	// it into delivery area(s), then selects it. When several areas share the matched name
	// (e.g. Al Sadd exists in zones 38 and 39) the customer confirms which zone is theirs.
	function onUseLocation() {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setLocate({ phase: "error", message: t.locFailed });
			return;
		}
		setLocate({ phase: "locating" });
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const res = await fetch("/api/locate-area", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
					});
					const data = (await res.json()) as LocateAreaResponse;
					if (data.status === "outside-qatar") return setLocate({ phase: "error", message: t.locOutside });
					if (data.status === "no-match") return setLocate({ phase: "error", message: t.locNoMatch });
					if (data.status !== "ok") return setLocate({ phase: "error", message: t.locUnavailable });
					const list = await loadAreas();
					const found = data.areaIds.map((id) => list.find((a) => a.id === id)).filter((a): a is DeliveryArea => !!a);
					if (found.length === 0) return setLocate({ phase: "error", message: t.locNoMatch });
					if (found.length === 1) return choose(found[0]);
					setLocate({ phase: "choose", candidates: found });
				} catch {
					setLocate({ phase: "error", message: t.locUnavailable });
				}
			},
			(err) => setLocate({ phase: "error", message: err.code === err.PERMISSION_DENIED ? t.locDenied : t.locFailed }),
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
		);
	}

	// Amazon-style: plain text lines, no box; every action is a blue link that goes orange on hover.
	const LINK = "text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer";

	const locateLink = (
		<button type="button" onClick={onUseLocation} disabled={locate.phase === "locating"} className={`inline-flex items-center gap-1 ${LINK} disabled:opacity-60 disabled:no-underline`}>
			<LocateFixed size={13} aria-hidden="true" />
			{locate.phase === "locating" ? t.locating : t.useMyLocation}
		</button>
	);
	const locateNotes = (
		<>
			{locate.phase === "error" && <p className="text-xs text-red-600">{locate.message}</p>}
			{locate.phase === "choose" && (
				<p className="text-xs text-gray-700">
					{t.chooseZone}{" "}
					{locate.candidates.map((c, i) => (
						<span key={c.id}>
							{i > 0 && <span className="text-gray-400"> | </span>}
							<button type="button" onClick={() => choose(c)} className={`font-semibold ${LINK}`}>
								{locale === "ar" ? c.nameAr : c.nameEn} · {t.zoneLabel(c.zoneNumber)}
							</button>
						</span>
					))}
				</p>
			)}
		</>
	);

	// "Order within <2 hrs 54 mins> to get it today" with just the time in green.
	const [orderBefore, orderAfter] = t.orderWithin("\u0001").split("\u0001");

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

			{picking ? (
				<div className="flex flex-col gap-1.5 mt-0.5">
					<AreaSelect
						id="pdp-delivery-area"
						name="pdpDeliveryArea"
						value={area ? String(area.zoneNumber) : ""}
						initialAreaId={area?.id}
						areas={areaOptions}
						onChange={onPick}
						locale={locale}
						placeholder={t.areaPlaceholder}
						inputClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
					<p className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
						{locateLink}
						<button type="button" onClick={() => { setPicking(false); setLocate({ phase: "idle" }); }} className={LINK}>
							{t.cancel}
						</button>
					</p>
					<p className="text-[11px] text-gray-400">{t.locationPrivacy}</p>
					{locateNotes}
				</div>
			) : area ? (
				<p className="flex items-center gap-1.5">
					<MapPin size={15} className="text-gray-700 shrink-0" aria-hidden="true" />
					<button type="button" onClick={() => setPicking(true)} className={`text-start ${LINK}`}>
						{t.deliverTo} {locale === "ar" ? area.nameAr : area.nameEn}
					</button>
				</p>
			) : areaLoading ? (
				<p className="text-gray-500">{t.checkingArea}</p>
			) : (
				<div className="flex flex-col gap-0.5">
					<p className="flex items-center gap-1.5">
						<MapPin size={15} className="text-gray-700 shrink-0" aria-hidden="true" />
						<button type="button" onClick={() => setPicking(true)} className={`text-start text-xs ${LINK}`}>
							{t.selectArea}
						</button>
						<span className="text-gray-500 text-xs">{t.selectAreaHint}</span>
					</p>
					<p className="text-xs">{locateLink}</p>
					{locateNotes}
				</div>
			)}

			{area && !picking && (
				<div className="flex flex-col gap-0.5">
					{total !== null && orderValue !== null && (
						<p>
							<span className="text-gray-600">{t.estimatedTotal}: </span>
							<span className="font-semibold text-gray-900">{money(total)}</span> <span className="text-xs text-gray-400">({usingCart ? t.forCart : t.forThisItem})</span>
						</p>
					)}
					<p className="text-[11px] text-gray-400 leading-snug">{t.confirmedAtCheckout}</p>
				</div>
			)}
		</div>
	);
}