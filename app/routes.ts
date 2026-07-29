import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Content/SEO-facing routes get an Arabic mirror under /ar/* (English keeps its
// existing unprefixed URLs — see app/lib/i18n.ts for the URL scheme rationale).
// Same file backs both registrations; the loader/component tells them apart from
// the request URL itself (getLocaleFromPathname), so nothing else needs to change
// per-route to support both locales.
//
// checkout/account/auth pages are mirrored too (customers expect the whole
// purchase flow, not just browsing, in their chosen language). checkout/callback
// is deliberately NOT mirrored — it's a payment-gateway webhook target (Sadad
// redirects/POSTs there directly), not a page a user navigates to, and it has no
// locale info to act on.
const CONTENT_ROUTES: [path: string, file: string][] = [
	["about", "routes/about.tsx"],
	["search", "routes/search.tsx"],
	["collections", "routes/collections.tsx"],
	["c/*", "routes/c.$.tsx"],
	["brands", "routes/brands.tsx"],
	["brands/:slug", "routes/brands.$slug.tsx"],
	["products/:slug", "routes/products.$slug.tsx"],
	["products/:slug/reviews", "routes/products.$slug.reviews.tsx"],
	["wishlist", "routes/wishlist.tsx"],
	["pages/:slug", "routes/pages.$slug.tsx"],
	["checkout", "routes/checkout.tsx"],
	["checkout/success", "routes/checkout.success.tsx"],
	["checkout/failed", "routes/checkout.failed.tsx"],
	["order-confirmation", "routes/order-confirmation.tsx"],
	["login", "routes/login.tsx"],
	["register", "routes/register.tsx"],
	["forgot-password", "routes/forgot-password.tsx"],
	["reset-password", "routes/reset-password.tsx"],
	["verify-email", "routes/verify-email.tsx"],
	["account", "routes/account.profile.tsx"],
	["account/addresses", "routes/account.addresses.tsx"],
	["account/orders", "routes/account.orders.tsx"],
	["account/orders/:id", "routes/account.orders.$id.tsx"],
	["account/social", "routes/account.social.tsx"],
	["account/reset-password", "routes/account.reset-password.tsx"],
	["account/wallet", "routes/account.wallet.tsx"],
	["account/wellness", "routes/account.wellness.tsx"],
];

export default [
	index("routes/home.tsx"),
	route("ar", "routes/home.tsx", { id: "routes/home.ar" }),
	route("sitemap.xml", "routes/sitemap.xml.ts"),
	route("robots.txt", "routes/robots.txt.ts"),
	route("llms.txt", "routes/llms.txt.ts"),
	...CONTENT_ROUTES.flatMap(([path, file]) => [route(path, file), route(`ar/${path}`, file, { id: `${file}.ar` })]),
	route("checkout/callback", "routes/checkout.callback.tsx"),
	route("api/loyalty", "routes/api.loyalty.ts"),
	route("api/search", "routes/api.search.ts"),
	route("api/cart", "routes/api.cart.ts"),
	route("api/bundle", "routes/api.bundle.ts"),
	route("api/wellness", "routes/api.wellness.ts"),
	route("api/checkout", "routes/api.checkout.ts"),
	route("api/auth", "routes/api.auth.ts"),
	route("api/account", "routes/api.account.ts"),
	route("api/reviews", "routes/api.reviews.ts"),
	route("api/review-images", "routes/api.review-images.ts"),
	route("review-images/upload", "routes/review-images.upload.ts"),
	route("api/product-reviews", "routes/api.product-reviews.ts"),
	route("api/variant-rankings", "routes/api.variant-rankings.ts"),
	route("api/concern-products", "routes/api.concern-products.ts"),
] satisfies RouteConfig;
