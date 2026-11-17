import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crosshair, Loader2, MapPin, X } from "lucide-react";

// Ported from proteinhouse (phq-frontend/app/components/MapPinPicker.tsx): full-screen
// "Select your delivery location" popup with a fixed pin over a draggable Google map and a
// Qatar-restricted place search. The pin is what distance-based delivery is priced from.

export interface PickedLocation {
	latitude: number;
	longitude: number;
	/** Readable address built from Google's reverse geocode (may be empty if geocoding fails) */
	address: string;
	/** Qatar zone number parsed from the geocoded address ("Zone 55"), if any */
	zoneNumber: number | null;
	/** Neighbourhood / area names Google returned, used to match a delivery area */
	areaHints: string[];
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

const DOHA = { lat: 25.2854, lng: 51.531 };
const QATAR_BOUNDS = { north: 26.3, south: 24.3, east: 51.8, west: 50.6 };
// Mirrors the backend bounding box so the pin can't be confirmed outside the country
const inQatar = (lat: number, lng: number) => lat >= 24.4 && lat <= 26.25 && lng >= 50.7 && lng <= 51.7;

export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const COPY = {
	en: {
		title: "Select your delivery location",
		search: "Search area, street or building in Qatar",
		confirm: "Confirm location",
		confirming: "Confirming…",
		locate: "Locate me",
		close: "Close",
		hint: "Search for your area or drag the map so the pin is on your delivery location.",
		outside: "This location is outside Qatar. Move the pin to your delivery address.",
		tooFar: (max: number | null) => `Sorry, we don't deliver this far${max ? ` (max ${max} km)` : ""}.`,
		noKey: "The map is not available right now.",
		loadFail: "Could not load the map.",
	},
	ar: {
		title: "حدد موقع التوصيل",
		search: "ابحث عن المنطقة أو الشارع أو المبنى في قطر",
		confirm: "تأكيد الموقع",
		confirming: "جارٍ التأكيد…",
		locate: "موقعي الحالي",
		close: "إغلاق",
		hint: "ابحث عن منطقتك أو حرّك الخريطة حتى يكون الدبوس على موقع التوصيل.",
		outside: "هذا الموقع خارج قطر. حرّك الدبوس إلى عنوان التوصيل.",
		tooFar: (max: number | null) => `عذراً، لا نوصل إلى هذه المسافة${max ? ` (الحد الأقصى ${max} كم)` : ""}.`,
		noKey: "الخريطة غير متاحة حالياً.",
		loadFail: "تعذر تحميل الخريطة.",
	},
};

// Google's top result for an exact point in Qatar is often a Plus Code or an unrelated
// point of interest, so build the text from address_components instead, which stay
// consistent for the same point across every result ("Al Muntaza, Zone 24, Doha, Qatar").
function buildReadableAddress(results: any[]): string {
	const componentName = (type: string): string | undefined => {
		for (const r of results) {
			const c = r.address_components?.find((c: any) => c.types?.includes(type));
			if (c) return c.long_name;
		}
		return undefined;
	};
	const area = componentName("neighborhood") ?? componentName("sublocality_level_1") ?? componentName("sublocality");
	const locality = componentName("locality");
	const zone = componentName("administrative_area_level_2");
	const municipality = componentName("administrative_area_level_1");
	const parts = area && area !== locality ? [area, zone, locality] : [locality, zone, municipality];
	const joined = parts.filter(Boolean).join(", ");
	return joined ? `${joined}, Qatar` : (results[0]?.formatted_address ?? "").replace(/,?\s*Qatar$/i, "");
}

let googleLoader: Promise<any> | null = null;
function loadGoogleMaps(language: string): Promise<any> {
	const w = window as any;
	if (typeof w.google?.maps?.importLibrary === "function") return Promise.resolve(w.google);
	if (!googleLoader) {
		googleLoader = new Promise((resolve, reject) => {
			// Google calls this once the API (including importLibrary) is fully ready;
			// the script's own onload can fire earlier.
			w.__nbMapsReady = () => resolve(w.google);
			const s = document.createElement("script");
			s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&v=weekly&loading=async&region=QA&language=${language}&callback=__nbMapsReady`;
			s.async = true;
			s.onerror = () => {
				googleLoader = null;
				reject(new Error("Could not load Google Maps"));
			};
			document.head.appendChild(s);
		});
	}
	return googleLoader;
}

export function MapPinPicker({
	locale,
	initial,
	initialAddress,
	onConfirm,
	onClose,
}: {
	locale: "en" | "ar";
	initial?: { latitude: number; longitude: number } | null;
	/** Current address text, pre-filled in the search box when re-opening the picker */
	initialAddress?: string;
	onConfirm: (location: PickedLocation) => void;
	onClose: () => void;
}) {
	const t = COPY[locale];
	const mapEl = useRef<HTMLDivElement>(null);
	const searchEl = useRef<HTMLDivElement>(null);
	const mapRef = useRef<any>(null);
	const acRef = useRef<any>(null);
	const [center, setCenter] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.latitude, lng: initial.longitude } : null);
	const [loadError, setLoadError] = useState<string | null>(MAPS_KEY ? null : t.noKey);
	const [ready, setReady] = useState(false);
	// The map opens on Doha, so a pin only counts once the customer has actually
	// moved/searched/located -- never the default position.
	const [touched, setTouched] = useState(!!initial);
	const [locating, setLocating] = useState(false);
	const [quote, setQuote] = useState<ShippingQuote | null>(null);
	const [confirming, setConfirming] = useState(false);

	useEffect(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onKey);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Map + place search
	useEffect(() => {
		if (!MAPS_KEY) return;
		let cancelled = false;
		(async () => {
			try {
				const google = await loadGoogleMaps(locale);
				const { Map } = await google.maps.importLibrary("maps");
				const places = await google.maps.importLibrary("places");
				if (cancelled || !mapEl.current) return;

				const start = initial ? { lat: initial.latitude, lng: initial.longitude } : DOHA;
				const map = new Map(mapEl.current, {
					center: start,
					zoom: initial ? 17 : 13,
					disableDefaultUI: true,
					gestureHandling: "greedy",
					clickableIcons: false,
					restriction: { latLngBounds: QATAR_BOUNDS, strictBounds: false },
				});
				mapRef.current = map;
				map.addListener("dragstart", () => setTouched(true));
				map.addListener("zoom_changed", () => setTouched(true));
				map.addListener("idle", () => {
					const c = map.getCenter();
					if (c) setCenter({ lat: c.lat(), lng: c.lng() });
				});

				if (searchEl.current && places.PlaceAutocompleteElement) {
					const ac = new places.PlaceAutocompleteElement({ includedRegionCodes: ["qa"] });
					ac.setAttribute("placeholder", t.search);
					ac.style.width = "100%";
					ac.style.border = "1px solid #d1d5db";
					ac.style.borderRadius = "9999px";
					if (initialAddress) ac.value = initialAddress;
					acRef.current = ac;
					const onSelect = async (ev: any) => {
						const place = ev.placePrediction ? ev.placePrediction.toPlace() : ev.place;
						if (!place) return;
						setTouched(true);
						await place.fetchFields({ fields: ["location", "viewport"] });
						if (place.viewport) map.fitBounds(place.viewport);
						else if (place.location) {
							map.setCenter(place.location);
							map.setZoom(17);
						}
					};
					ac.addEventListener("gmp-select", onSelect);
					ac.addEventListener("gmp-placeselect", onSelect);
					searchEl.current.replaceChildren(ac);
				}
				setReady(true);
			} catch (e) {
				if (!cancelled) setLoadError(t.loadFail);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Deliverability check for the pin (the fee itself shows in the checkout shipping options)
	useEffect(() => {
		if (!center) return;
		if (!inQatar(center.lat, center.lng)) {
			setQuote({ deliverable: false, reason: "OUTSIDE_QATAR", distanceKm: null, price: null, isFree: false, freeReason: null, maximumDistanceKm: null });
			return;
		}
		const ctrl = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/shipping-quote?lat=${center.lat}&lng=${center.lng}`, { signal: ctrl.signal });
				const data = (await res.json()) as { quote: ShippingQuote | null };
				setQuote(data.quote);
			} catch {
				/* aborted or offline -- keep the previous quote */
			}
		}, 300);
		return () => {
			clearTimeout(timer);
			ctrl.abort();
		};
	}, [center]);

	// Keep the search box showing the pin's resolved address as the map is dragged
	useEffect(() => {
		if (!center || !ready) return;
		let cancelled = false;
		const timer = setTimeout(async () => {
			try {
				const google = (window as any).google;
				const { Geocoder } = await google.maps.importLibrary("geocoding");
				const res = await new Geocoder().geocode({ location: center });
				if (cancelled || !acRef.current) return;
				const address = buildReadableAddress(res.results ?? []);
				if (address) acRef.current.value = address;
			} catch {
				/* geocoding unavailable -- leave whatever the search box shows */
			}
		}, 400);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [center, ready]);

	const locateMe = useCallback(() => {
		if (!navigator.geolocation || !mapRef.current) return;
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				mapRef.current.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				mapRef.current.setZoom(17);
				setTouched(true);
				setLocating(false);
			},
			() => setLocating(false),
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}, []);

	async function confirm() {
		if (!center) return;
		setConfirming(true);
		let address = "";
		let zoneNumber: number | null = null;
		const areaHints: string[] = [];
		try {
			const google = (window as any).google;
			const { Geocoder } = await google.maps.importLibrary("geocoding");
			// English names regardless of UI language: they're matched against area nameEn
			const res = await new Geocoder().geocode({ location: center, language: "en" });
			const results: any[] = res.results ?? [];
			address = buildReadableAddress(results);
			// Qatar's zone usually comes back as its own address component ("Zone 55", type
			// administrative_area_level_2) and only sometimes inside formatted_address, so check
			// the components first, then fall back to the formatted text.
			const zoneRe = /zone\s*0*(\d+)/i;
			outer: for (const r of results) {
				for (const c of r.address_components ?? []) {
					const m = zoneRe.exec(c.long_name ?? "") ?? zoneRe.exec(c.short_name ?? "");
					if (m) {
						zoneNumber = parseInt(m[1], 10);
						break outer;
					}
				}
			}
			if (zoneNumber == null) {
				for (const r of results) {
					const m = zoneRe.exec(r.formatted_address ?? "");
					if (m) {
						zoneNumber = parseInt(m[1], 10);
						break;
					}
				}
			}
			for (const type of ["neighborhood", "sublocality_level_2", "sublocality_level_1", "sublocality", "locality"]) {
				for (const r of results.slice(0, 4)) {
					for (const c of r.address_components ?? []) {
						if (c.types.includes(type) && !areaHints.includes(c.long_name)) areaHints.push(c.long_name);
					}
				}
			}
		} catch {
			/* geocoded details are optional */
		}
		onConfirm({ latitude: center.lat, longitude: center.lng, address, zoneNumber, areaHints });
	}

	const blocked = quote ? !quote.deliverable : false;
	const canConfirm = !!center && ready && touched && !blocked && !confirming;

	return createPortal(
		<div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={t.title} dir={locale === "ar" ? "rtl" : "ltr"}>
			<div className="bg-white w-full h-full sm:h-[88vh] sm:max-w-3xl sm:rounded-2xl flex flex-col p-4 sm:p-5 gap-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-lg sm:text-xl font-bold text-gray-900">{t.title}</h2>
					<button type="button" onClick={onClose} aria-label={t.close} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
						<X size={18} />
					</button>
				</div>

				<div className="flex flex-col sm:flex-row gap-2">
					<div ref={searchEl} className="flex-1 min-w-0" />
					<button
						type="button"
						onClick={confirm}
						disabled={!canConfirm}
						className="bg-primary text-white font-semibold px-6 py-3 rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
					>
						{confirming ? t.confirming : t.confirm}
					</button>
				</div>

				<div className="relative flex-1 min-h-[260px] rounded-2xl overflow-hidden bg-gray-100">
					<div ref={mapEl} className="absolute inset-0" />
					{!loadError && !ready && (
						<div className="absolute inset-0 flex items-center justify-center text-gray-500">
							<Loader2 className="animate-spin" size={28} />
						</div>
					)}
					{loadError && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600">{loadError}</div>}
					{ready && (
						<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
							<MapPin size={44} className="text-primary fill-primary/20 drop-shadow" strokeWidth={2.2} />
						</div>
					)}
					<button
						type="button"
						onClick={locateMe}
						disabled={!ready || locating}
						className="absolute start-3 bottom-3 bg-white shadow-md rounded-full px-4 py-2.5 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 disabled:opacity-60"
					>
						{locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />} {t.locate}
					</button>
				</div>

				{ready && !touched && <div className="text-sm rounded-lg px-4 py-2.5 bg-gray-50 text-gray-600">{t.hint}</div>}
				{quote && blocked && (
					<div className="text-sm rounded-lg px-4 py-2.5 bg-red-50 text-red-700">
						{quote.reason === "OUTSIDE_QATAR" && t.outside}
						{quote.reason === "TOO_FAR" && t.tooFar(quote.maximumDistanceKm)}
					</div>
				)}
			</div>
		</div>,
		document.body
	);
}
