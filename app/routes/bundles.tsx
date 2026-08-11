import type { Route } from "./+types/bundles";
import Breadcrumb from "~/components/Breadcrumb";
import Link from "~/components/LocaleLink";
import { graphqlRequest } from "workers/graphqlClient";
import { ACTIVE_BUNDLE_OFFERS_QUERY, formatBundleDiscount, type ActiveBundleOfferListData, type ActiveBundleOfferListVariables, type ActiveBundleOffer } from "~/graphql/bundle";
import { SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, stripLocalePrefix, hreflangTags } from "~/lib/i18n";

const PAGE_SIZE = 24;

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "Bundle Deals — NutriBox Qatar",
		description: "Save more with curated product bundles and combo deals at NutriBox Qatar.",
		breadcrumbHome: "Home",
		breadcrumbBundles: "Bundle Deals",
		h1: "Bundle Deals",
		subtitle: "Save more when you buy these together",
		empty: "No active bundle deals right now — check back soon.",
		itemsIncluded: (n: number) => `${n} item${n !== 1 ? "s" : ""} included`,
		viewBundle: "View Bundle",
	},
	ar: {
		title: "عروض الباقات — NutriBox قطر",
		description: "وفّر أكثر مع باقات المنتجات المختارة وعروض الكومبو في NutriBox قطر.",
		breadcrumbHome: "الرئيسية",
		breadcrumbBundles: "عروض الباقات",
		h1: "عروض الباقات",
		subtitle: "وفّر أكثر عند شراء هذه المنتجات معًا",
		empty: "لا توجد عروض باقات نشطة حاليًا — تحقق مرة أخرى قريبًا.",
		itemsIncluded: (n: number) => `${n} عنصر مضمّن`,
		viewBundle: "عرض الباقة",
	},
} as const;

function resolveBundleImage(preview: string, vendureBase: string): string {
	if (!preview) return "";
	if (preview.startsWith("http")) return preview;
	const base = vendureBase.replace(/\/shop-api\/?$/, "").replace(/\/$/, "");
	const path = preview.startsWith("/assets/") ? preview : preview.startsWith("/") ? `/assets${preview}` : `/assets/${preview}`;
	return `${base}${path}`;
}

export function meta({ location }: Route.MetaArgs) {
	const locale = getLocaleFromPathname(location.pathname);
	const t = COPY[locale];
	const canonicalUrl = `${SITE_URL}${localizePath("/bundles", locale)}`;
	return [
		{ title: t.title },
		{ name: "description", content: t.description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...hreflangTags(SITE_URL, stripLocalePrefix(new URL(canonicalUrl).pathname)),
		{ property: "og:type", content: "website" },
		{ property: "og:title", content: t.title },
		{ property: "og:description", content: t.description },
		{ property: "og:url", content: canonicalUrl },
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const locale = getLocaleFromPathname(url.pathname);
	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	try {
		const { data } = await graphqlRequest<ActiveBundleOfferListData, ActiveBundleOfferListVariables>(
			env,
			ACTIVE_BUNDLE_OFFERS_QUERY,
			// Free-gift-with-purchase promos are contextual (shown on the relevant
			// product's own page), not a browsable "deal" in the sense this page means.
			{ options: { take: PAGE_SIZE, excludeDiscountTypes: ["FREE_PRODUCT"] } },
			{ request },
		);
		return { bundles: data.activeBundleOffers.items, totalItems: data.activeBundleOffers.totalItems, vendureBase, locale };
	} catch {
		return { bundles: [], totalItems: 0, vendureBase, locale };
	}
}

function BundleOfferCard({ bundle, vendureBase, locale }: { bundle: ActiveBundleOffer; vendureBase: string; locale: "en" | "ar" }) {
	const t = COPY[locale];
	const image = bundle.imageUrl || bundle.triggerProduct?.featuredAsset?.preview || "";
	const href = bundle.triggerProduct ? `/products/${bundle.triggerProduct.slug}` : "/bundles";
	const discountLabel = formatBundleDiscount(bundle.discountType, bundle.discountValue, locale);

	return (
		<Link to={href} className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
			<div className="relative aspect-square bg-gray-50">
				{image ? (
					<img src={resolveBundleImage(image, vendureBase)} alt={bundle.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
				) : (
					<div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl font-bold">{bundle.name[0]}</div>
				)}
				<span className="absolute top-2 start-2 bg-lime-300 text-black text-[11px] font-bold px-3 py-1 rounded-full">{discountLabel}</span>
			</div>
			<div className="flex flex-col flex-1 p-4">
				<h3 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2">{bundle.name}</h3>
				{bundle.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{bundle.description}</p>}
				<div className="mt-auto pt-3 flex items-center justify-between">
					<span className="text-xs text-gray-400">{t.itemsIncluded(bundle.items.length)}</span>
					<span className="text-xs font-semibold text-primary">{t.viewBundle} →</span>
				</div>
			</div>
		</Link>
	);
}

export default function BundlesPage({ loaderData }: Route.ComponentProps) {
	const { bundles, vendureBase, locale } = loaderData;
	const t = COPY[locale];

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-4">
				<Breadcrumb items={[{ label: t.breadcrumbHome, href: "/" }, { label: t.breadcrumbBundles }]} />
			</div>

			<div className="mb-6">
				<h1 className="text-lg font-bold text-gray-900">{t.h1}</h1>
				<p className="text-sm text-gray-500">{t.subtitle}</p>
			</div>

			{bundles.length === 0 ? (
				<div className="text-center py-24 text-gray-400">
					<p className="text-lg font-semibold text-gray-600">{t.empty}</p>
				</div>
			) : (
				<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
					{bundles.map((bundle) => (
						<BundleOfferCard key={bundle.id} bundle={bundle} vendureBase={vendureBase} locale={locale} />
					))}
				</div>
			)}
		</div>
	);
}
