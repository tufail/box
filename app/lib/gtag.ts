declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

const ADS_PURCHASE_SEND_TO = "AW-1018264058/-ozSCPDUlLYdEPrzxeUD";

/**
 * Fires the Google Ads purchase conversion for a confirmed order.
 * `totalWithTax` is in minor units (cents), as Vendure returns it. Google Ads
 * converts the QAR value into the account's own currency automatically.
 * Guarded per order code so reloads / loader revalidations don't double-count;
 * `transaction_id` also lets Google Ads dedupe on its side.
 */
export function trackPurchaseConversion(orderCode: string, totalWithTax: number, currencyCode: string) {
	if (typeof window === "undefined" || !window.gtag || !orderCode) return;
	const key = `adsConversion:${orderCode}`;
	try {
		if (localStorage.getItem(key)) return;
		localStorage.setItem(key, "1");
	} catch {
		// Storage unavailable — still send; transaction_id dedupes in Google Ads.
	}
	window.gtag("event", "conversion", {
		send_to: ADS_PURCHASE_SEND_TO,
		value: totalWithTax / 100,
		currency: currencyCode || "QAR",
		transaction_id: orderCode,
	});
}
