import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("about", "routes/about.tsx"),
    route("api/search", "routes/api.search.ts"),
    route("search", "routes/search.tsx"),
    route("collections/:slug", "routes/collections.$slug.tsx"),
    route("products/:slug", "routes/products.$slug.tsx"),
] satisfies RouteConfig; 