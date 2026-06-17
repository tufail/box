import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation } from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import MainLayout from "./layouts/MainLayout";
import { CartProvider } from "./context/CartContext";
import { NotificationProvider } from "./context/NotificationContext";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_MEGA_MENU, type MegaMenuData } from "./graphql/megamenu";
import { CART_COUNT_QUERY } from "./graphql/order";
import { ACTIVE_CUSTOMER_QUERY, type ActiveCustomer } from "./graphql/checkout";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
	},
];

export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const [megaMenuResult, cartCountResult, customerResult] = await Promise.allSettled([
		graphqlRequest<MegaMenuData>(env, GET_MEGA_MENU, { slug: "main-nav" }, { request, cf: { cacheTtl: 300, cacheEverything: true } }),
		graphqlRequest<{ activeOrder: { totalQuantity: number } | null }>(env, CART_COUNT_QUERY, undefined, { request }),
		graphqlRequest<{ activeCustomer: ActiveCustomer | null }>(env, ACTIVE_CUSTOMER_QUERY, undefined, { request }),
	]);

	return {
		megaMenu: megaMenuResult.status === "fulfilled" ? megaMenuResult.value.data.getMegaMenu : null,
		cartCount: cartCountResult.status === "fulfilled" ? (cartCountResult.value.data.activeOrder?.totalQuantity ?? 0) : 0,
		activeCustomer: customerResult.status === "fulfilled" ? (customerResult.value.data.activeCustomer ?? null) : null,
	};
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	const { megaMenu, cartCount, activeCustomer } = useLoaderData<typeof loader>();
	const location = useLocation();
	const isCheckoutRoute =
		location.pathname.startsWith("/checkout") ||
		location.pathname.startsWith("/order-confirmation");

	return (
		<NotificationProvider>
			<CartProvider initialCount={cartCount}>
				{isCheckoutRoute ? (
					<Outlet />
				) : (
					<MainLayout megaMenu={megaMenu} activeCustomer={activeCustomer}>
						<Outlet />
					</MainLayout>
				)}
			</CartProvider>
		</NotificationProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
