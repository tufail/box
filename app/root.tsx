import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import MainLayout from "./layouts/MainLayout";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_MEGA_MENU, type MegaMenuData } from "./graphql/megamenu";

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
	try {
		const result = await graphqlRequest<MegaMenuData>(env, GET_MEGA_MENU, { slug: "main-nav" }, { request, cf: { cacheTtl: 300, cacheEverything: true } });
		console.log("Mega Menu Data:", result.data);
		return { megaMenu: result.data.getMegaMenu };
	} catch (error) {
		console.error("Error fetching Mega Menu Data:", error);
		return { megaMenu: null };
	}
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
	const { megaMenu } = useLoaderData<typeof loader>();
	return (
		<MainLayout megaMenu={megaMenu}>
			<Outlet />
		</MainLayout>
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
