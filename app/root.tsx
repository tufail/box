import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation } from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import MainLayout from "./layouts/MainLayout";
import { CartProvider } from "./context/CartContext";
import { NotificationProvider } from "./context/NotificationContext";
import { WishlistProvider } from "./context/WishlistContext";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_MEGA_MENU, type MegaMenuData } from "./graphql/megamenu";
import { CART_COUNT_QUERY } from "./graphql/order";
import { ACTIVE_CUSTOMER_QUERY, type ActiveCustomer } from "./graphql/checkout";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500&display=swap",
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
				<div id="google_translate_element" />
				<script dangerouslySetInnerHTML={{ __html: `function googleTranslateElementInit(){new google.translate.TranslateElement({pageLanguage:'en',includedLanguages:'ar,en',autoDisplay:true},'google_translate_element');}` }} />
				<script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async={true} />
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
			<WishlistProvider>
				<CartProvider initialCount={cartCount}>
					{isCheckoutRoute ? (
						<Outlet />
					) : (
						<MainLayout megaMenu={megaMenu} activeCustomer={activeCustomer}>
							<Outlet />
						</MainLayout>
					)}
				</CartProvider>
			</WishlistProvider>
		</NotificationProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const is404 = isRouteErrorResponse(error) && error.status === 404;

	if (is404) {
		return (
			<main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
				{/* Ambient blobs */}
				<div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#458500]/6 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
				<div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#f38a00]/6 blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

				{/* Watermark 404 */}
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
					<span className="text-[22vw] font-black text-[#458500]/5 leading-none tracking-tighter">404</span>
				</div>

				<div className="relative z-10 flex flex-col items-center text-center max-w-lg">
					{/* Illustration */}
					<div className="mb-8">
						<svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
							{/* Bag body */}
							<rect x="28" y="58" width="104" height="82" rx="14" fill="#458500" fillOpacity="0.08" />
							<rect x="34" y="64" width="92" height="70" rx="11" stroke="#458500" strokeWidth="3.5" fill="white" />
							{/* Handle */}
							<path d="M58 64 C58 40 102 40 102 64" stroke="#458500" strokeWidth="3.5" fill="none" strokeLinecap="round" />
							{/* Question mark */}
							<text x="80" y="112" textAnchor="middle" fontSize="38" fontWeight="900" fill="#458500" fillOpacity="0.55">?</text>
							{/* Sparkles */}
							<circle cx="138" cy="44" r="5" fill="#f38a00" fillOpacity="0.75" />
							<circle cx="22" cy="74" r="3.5" fill="#f38a00" fillOpacity="0.55" />
							<circle cx="148" cy="98" r="3" fill="#458500" fillOpacity="0.45" />
							<circle cx="16" cy="118" r="2.5" fill="#458500" fillOpacity="0.35" />
							<circle cx="143" cy="62" r="2" fill="#f38a00" fillOpacity="0.5" />
							<circle cx="152" cy="78" r="1.5" fill="#f38a00" fillOpacity="0.4" />
						</svg>
					</div>

					{/* Badge */}
					<span className="inline-flex items-center gap-1.5 bg-[#f38a00]/10 text-[#f38a00] text-xs font-bold px-3.5 py-1.5 rounded-full mb-5 tracking-wide uppercase">
						404 — Page Not Found
					</span>

					<h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 leading-tight">
						This page went<br className="hidden sm:block" /> on a detour.
					</h1>

					<p className="text-gray-500 text-base md:text-lg leading-relaxed mb-10">
						It may have been moved, renamed, or it never existed. Let's get you back on track.
					</p>

					<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
						<a
							href="/"
							className="px-8 py-3.5 bg-[#458500] text-white rounded-full font-bold text-sm hover:bg-[#3a7000] transition-all duration-200 shadow-lg shadow-[#458500]/20 hover:shadow-xl hover:shadow-[#458500]/30 hover:-translate-y-0.5 text-center"
						>
							Back to Home
						</a>
						<a
							href="/collections"
							className="px-8 py-3.5 border-2 border-gray-200 text-gray-700 rounded-full font-bold text-sm hover:border-[#458500] hover:text-[#458500] transition-all duration-200 hover:-translate-y-0.5 text-center"
						>
							Browse Products
						</a>
					</div>

					<p className="mt-8 text-sm text-gray-400">
						Looking for something specific?{" "}
						<a href="/search" className="text-[#458500] font-semibold hover:underline">
							Try searching
						</a>
					</p>
				</div>
			</main>
		);
	}

	let details = "An unexpected error occurred.";
	let stack: string | undefined;
	if (isRouteErrorResponse(error)) {
		details = error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="min-h-screen flex items-center justify-center p-4">
			<div className="text-center max-w-xl">
				<span className="inline-block bg-red-50 text-red-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide mb-6">
					Something went wrong
				</span>
				<h1 className="text-5xl font-black text-gray-900 mb-4">Oops!</h1>
				<p className="text-gray-500 mb-6">{details}</p>
				{stack && (
					<pre className="w-full p-4 overflow-x-auto bg-gray-50 rounded-xl text-left text-xs text-gray-500 mb-6">
						<code>{stack}</code>
					</pre>
				)}
				<a
					href="/"
					className="inline-block px-8 py-3.5 bg-[#458500] text-white rounded-full font-bold text-sm hover:bg-[#3a7000] transition-colors shadow-lg shadow-[#458500]/20"
				>
					Back to Home
				</a>
			</div>
		</main>
	);
}
