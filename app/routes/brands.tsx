import type { Route } from "./+types/brands";
import { Link } from "react-router";
import { Tag } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import Breadcrumb from "~/components/Breadcrumb";
import { GET_BRAND_FACET_QUERY, type BrandFacetData, type BrandValue } from "~/graphql/brand";
import { SITE_NAME, SITE_URL } from "~/lib/seo";

export function meta() {
	const title = `Shop by Brand — ${SITE_NAME}`;
	const description = `Browse all brands available at ${SITE_NAME} — authentic health and sports nutrition products with fast delivery in Qatar.`;
	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: `${SITE_URL}/brands` },
		{ property: "og:type", content: "website" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: `${SITE_URL}/brands` },
		{ property: "og:site_name", content: SITE_NAME },
		{ name: "twitter:card", content: "summary" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	try {
		const { data } = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, {
			request,
			cf: { cacheTtl: 300, cacheEverything: true },
		});
		const brands: BrandValue[] = [...(data.facets.items[0]?.values ?? [])].sort((a, b) => a.name.localeCompare(b.name));
		return { brands };
	} catch {
		return { brands: [] };
	}
}

export default function BrandsPage({ loaderData }: Route.ComponentProps) {
	const { brands } = loaderData;

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name: "Brands",
		numberOfItems: brands.length,
		itemListElement: brands.map((brand, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: brand.name,
			url: `${SITE_URL}/brands/${brand.code}`,
		})),
	};

	return (
		<div className="container mx-auto px-4 py-6">
			{brands.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
			<div className="mb-4">
				<Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
			</div>

			<div className="text-center mb-8">
				<h1 className="font-heading text-2xl md:text-3xl font-extrabold text-black">Shop by Brand</h1>
				<p className="text-gray-500 text-sm mt-2">Authentic products from brands you trust</p>
			</div>

			{brands.length === 0 ? (
				<div className="text-center py-24 text-gray-400">
					<p className="text-lg font-semibold text-gray-600 mb-1">No brands found</p>
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
