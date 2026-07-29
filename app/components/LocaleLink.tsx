import { forwardRef } from "react";
import { Link, useLocation, type LinkProps } from "react-router";
import { getLocaleFromPathname, localizePath } from "~/lib/i18n";

// Drop-in replacement for react-router's Link — for any internal path ("to"
// starting with "/"), automatically prefixes it with /ar when the CURRENT page
// is on the Arabic site, so in-page navigation never drops the visitor back into
// English. External URLs, hashes, and object `to` values pass through unchanged.
// Content-facing components should import this instead of react-router's Link;
// account/checkout/auth pages intentionally keep plain Link (out of the current
// /ar/* scope — see app/lib/i18n.ts).
const LocaleLink = forwardRef<HTMLAnchorElement, LinkProps>(function LocaleLink({ to, ...props }, ref) {
	const location = useLocation();
	const locale = getLocaleFromPathname(location.pathname);
	const localizedTo = typeof to === "string" && to.startsWith("/") ? localizePath(to, locale) : to;

	return <Link ref={ref} to={localizedTo} {...props} />;
});

export default LocaleLink;
