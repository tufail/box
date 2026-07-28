// Qatar mobile numbers: 8 digits starting with 3, 5, 6, or 7, with an
// optional +974/974 country-code prefix. Spaces/dashes are allowed as typed
// (e.g. "+974 3312 3456") and stripped before matching.
export function isValidQatarPhone(value: string): boolean {
	const digits = value.replace(/[\s-]/g, "");
	return /^(\+974|974)?[3567]\d{7}$/.test(digits);
}
