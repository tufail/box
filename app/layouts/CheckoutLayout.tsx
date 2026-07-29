import { useLocation, useNavigate, useRouteLoaderData } from "react-router";
import Link from "~/components/LocaleLink";
import { Lock, Languages } from "lucide-react";
import Footer from "~/components/Footer";
import type { PageSection } from "~/graphql/pages";
import { getLocaleFromPathname, toggleLocalePath } from "~/lib/i18n";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: { secureCheckout: "Secure Checkout" },
	ar: { secureCheckout: "الدفع الآمن" },
} as const;

export default function CheckoutLayout({ children }: { children?: React.ReactNode }) {
	const rootData = useRouteLoaderData("root") as { pageSections: PageSection[] } | undefined;
	const routerLocation = useLocation();
	const navigate = useNavigate();
	const locale = getLocaleFromPathname(routerLocation.pathname);
	const t = COPY[locale];

	function toggleLanguage() {
		const nextLang = locale === "en" ? "ar" : "en";
		navigate(toggleLocalePath(routerLocation.pathname, routerLocation.search, nextLang));
	}

	return (
		<div className="min-h-screen flex flex-col bg-gray-50">
			<header className="bg-white border-b border-gray-200">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<Link to="/" className="font-bold text-xl">
						<img src="/images/logo.png" alt="NutriBox Logo" width={772} height={223} className="h-6 md:h-10 w-auto inline-block" />
					</Link>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<Lock size={14} />
							<span>{t.secureCheckout}</span>
						</div>
						<button
							onClick={toggleLanguage}
							translate="no"
							className="border rounded-xl px-2 py-1 flex items-center gap-1.5 text-gray-500 hover:text-black hover:bg-gray-50 cursor-pointer transition-colors text-sm"
						>
							<Languages size={16} strokeWidth={1.5} />
							{locale === "en" ? (
								<span lang="ar" className="font-arabic">
									العربية
								</span>
							) : (
								<span>English</span>
							)}
						</button>
					</div>
				</div>
			</header>

			<main className="flex-1 container mx-auto px-4 py-8">{children}</main>

			<Footer pageSections={rootData?.pageSections ?? []} />
		</div>
	);
}
