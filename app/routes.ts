import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("about", "routes/about.tsx"),
    route("search", "routes/search.tsx"),
    route("collections", "routes/collections.tsx"),
    route("collections/:slug", "routes/collections.$slug.tsx"),
    route("products/:slug", "routes/products.$slug.tsx"),
    route("checkout", "routes/checkout.tsx"),
    route("order-confirmation", "routes/order-confirmation.tsx"),
    route("api/search", "routes/api.search.ts"),
    route("api/cart", "routes/api.cart.ts"),
    route("api/checkout", "routes/api.checkout.ts"),
    route("api/auth", "routes/api.auth.ts"),
] satisfies RouteConfig; 