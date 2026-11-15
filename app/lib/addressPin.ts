// Address customFields sent to Vendure: the picked QatarShippingArea row plus the map pin
// (latitude/longitude) that distance-based delivery is priced from. Ported from proteinhouse.
// Values arrive from JSON/form bodies as strings or numbers; anything missing, unparseable or
// outside Qatar is dropped rather than sent (the backend validator rejects out-of-Qatar pins).

export const inQatar = (lat: number, lng: number) =>
	Number.isFinite(lat) && Number.isFinite(lng) && lat >= 24.4 && lat <= 26.25 && lng >= 50.7 && lng <= 51.7;

export function addressCustomFields(input: {
	qatarAreaId?: unknown;
	latitude?: unknown;
	longitude?: unknown;
}): { customFields: Record<string, number> } | Record<string, never> {
	const cf: Record<string, number> = {};
	const areaId = Number(input.qatarAreaId);
	if (input.qatarAreaId != null && input.qatarAreaId !== "" && Number.isFinite(areaId)) cf.qatarAreaId = areaId;
	const lat = Number(input.latitude);
	const lng = Number(input.longitude);
	if (input.latitude != null && input.latitude !== "" && input.longitude != null && input.longitude !== "" && inQatar(lat, lng)) {
		cf.latitude = lat;
		cf.longitude = lng;
	}
	return Object.keys(cf).length ? { customFields: cf } : {};
}
