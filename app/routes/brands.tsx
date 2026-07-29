import type { Route } from "./+types/brands";
import Link from "~/components/LocaleLink";
import { Tag } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import Breadcrumb from "~/components/Breadcrumb";
import { GET_BRAND_FACET_QUERY, type BrandFacetData, type BrandValue } from "~/graphql/brand";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, hreflangTags } from "~/lib/i18n";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: `Shop by Brand — ${SITE_NAME}`,
		description: `Browse all brands available at ${SITE_NAME} — authentic health and sports nutrition products with fast delivery in Qatar.`,
		breadcrumbHome: "Home",
		breadcrumbBrands: "Brands",
		h1: "Shop by Brand",
		subtitle: "Authentic products from brands you trust",
		noneFound: "No brands found",
	},
	ar: {
		title: `تسوق حسب الماركة — ${SITE_NAME}`,
		description: `تصفح جميع الماركات المتوفرة في ${SITE_NAME} — منتجات صحية ورياضية أصلية مع توصيل سريع في قطر.`,
		breadcrumbHome: "الرئيسية",
		breadcrumbBrands: "الماركات",
		h1: "تسوق حسب الماركة",
		subtitle: "منتجات أصلية من ماركات تثق بها",
		noneFound: "لم يتم العثور على ماركات",
	},
} as const;

export function meta({ loaderData }: Route.MetaArgs) {
	const locale = loaderData?.locale ?? "en";
	const { title, description } = COPY[locale];
	const canonicalUrl = loaderData?.canonicalUrl ?? `${SITE_URL}/brands`;
	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...hreflangTags(SITE_URL, "/brands"),
		{ property: "og:type", content: "website" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:site_name", content: SITE_NAME },
		{ name: "twitter:card", content: "summary" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const url = new URL(request.url);
	const locale = getLocaleFromPathname(url.pathname);
	const canonicalUrl = `${url.origin}${localizePath("/brands", locale)}`;
	try {
		const { data } = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, {
			request,
			cf: { cacheTtl: 300, cacheEverything: true },
		});
		const brands: BrandValue[] = [...(data.facets.items[0]?.values ?? [])].sort((a, b) => a.name.localeCompare(b.name));
		return { brands, canonicalUrl, locale };
	} catch {
		return { brands: [], canonicalUrl, locale };
	}
}

export default function BrandsPage({ loaderData }: Route.ComponentProps) {
	const { brands, canonicalUrl, locale } = loaderData;
	const { breadcrumbHome, breadcrumbBrands, h1, subtitle, noneFound } = COPY[locale];

	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: breadcrumbHome, item: localeHomeUrl(SITE_URL, locale) },
			{ "@type": "ListItem", position: 2, name: breadcrumbBrands, item: canonicalUrl },
		],
	};

	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name: breadcrumbBrands,
		numberOfItems: brands.length,
		itemListElement: brands.map((brand, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: brand.name,
			url: `${SITE_URL}${localizePath(`/brands/${brand.code}`, locale)}`,
		})),
	};

	return (
		<div className="container mx-auto px-4 py-6">
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
			{brands.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />}
			<div className="mb-4">
				<Breadcrumb items={[{ label: breadcrumbHome, href: "/" }, { label: breadcrumbBrands }]} />
			</div>

			<div className="text-center mb-8">
				<h1 className="font-heading text-2xl md:text-3xl font-extrabold text-black">{h1}</h1>
				<p className="text-gray-500 text-sm mt-2">{subtitle}</p>
			</div>

			{brands.length === 0 ? (
				<div className="text-center py-24 text-gray-400">
					<p className="text-lg font-semibold text-gray-600 mb-1">{noneFound}</p>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
					{brands.map((brand) => (
						<Link
							key={brand.id}
							to={`/brands/${brand.code}`}
							className="group flex flex-col items-center justify-center gap-2.5 text-center bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black transition-all px-4 py-6"
						>
							<span className="w-11 h-11 rounded-full bg-lime-300 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
								<Tag size={18} className="text-black" strokeWidth={1.5} />
							</span>
							<span className="text-sm font-semibold text-gray-800 group-hover:text-black">{brand.name}</span>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
