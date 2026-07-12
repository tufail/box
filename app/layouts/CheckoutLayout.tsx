import { Link, useRouteLoaderData } from "react-router";
import { Lock } from "lucide-react";
import Footer from "~/components/Footer";
import type { PageSection } from "~/graphql/pages";

export default function CheckoutLayout({ children }: { children?: React.ReactNode }) {
	const rootData = useRouteLoaderData("root") as { pageSections: PageSection[] } | undefined;

	return (
		<div className="min-h-screen flex flex-col bg-gray-50">
			<header className="bg-white border-b border-gray-200">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<Link to="/" className="font-bold text-xl">
						<img src="/images/logo.png" alt="NutriBox Logo" width={772} height={223} className="h-6 md:h-10 w-auto inline-block" />
					</Link>
					<div className="flex items-center gap-2 text-sm text-gray-500">
						<Lock size={14} />
						<span>Secure Checkout</span>
					</div>
				</div>
			</header>

			<main className="flex-1 container mx-auto px-4 py-8">{children}</main>

			<Footer pageSections={rootData?.pageSections ?? []} />
		</div>
	);
}
