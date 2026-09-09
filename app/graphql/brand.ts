// "Brand" is a Vendure Facet (code "brand"); each brand is a FacetValue on it.
// There's no dedicated brand entity/query in the shop API, so brand pages are
// built on the existing facet + search infrastructure: GET_BRAND_FACET_QUERY
// lists every value for a slug -> id/name lookup (used by both /brands and
// /brands/:slug), and BRAND_PRODUCTS_QUERY filters the product search by that
// value's id. The facet-aggregation query for the sidebar is shared with
// collection pages (COLLECTION_FACETS_QUERY in collection.ts) rather than
// duplicated, since it's generic (SearchInput in, facetValues out).

export interface BrandValue {
	id: string;
	code: string;
	name: string;
}

export interface BrandFacetData {
	facets: {
		items: {
			id: string;
			code: string;
			name: string;
			values: BrandValue[];
		}[];
	};
}

export const GET_BRAND_FACET_QUERY = `
	query GetBrandFacet {
		facets(options: { filter: { code: { eq: "brands" } } }) {
			items {
				id
				code
				name
				values {
					id
					code
					name
				}
			}
		}
	}
`;

export interface BrandPageVariables {
	input: {
		facetValueIds: string[];
		facetValueOperator?: "AND" | "OR";
		groupByProduct: boolean;
		take: number;
		skip: number;
		sort?: { salesCount?: "ASC" | "DESC"; name?: "ASC" | "DESC"; price?: "ASC" | "DESC"; avgRating?: "ASC" | "DESC" };
	};
}

export interface BrandPageFacetValue {
	count: number;
	facetValue: { id: string; name: string; facet: { id: string; name: string } };
}

export interface BrandPageData {
	search: {
		totalItems: number;
		items: import("./product").SearchProductItem[];
		facetValues: BrandPageFacetValue[];
	};
}

export const BRAND_PRODUCTS_QUERY = `
	query BrandProducts($input: SearchInput!) {
		search(input: $input) {
			totalItems
			items {
				productId
				productVariantId
				productName
				productVariantName
				slug
				description
				inStock
				productAsset { id preview }
				productVariantAsset { id preview }
				price {
					__typename
					... on PriceRange { min max }
					... on SinglePrice { value }
				}
				customProductVariantMappings { isOnSale stockQty discount rrp slug }
				customProductMappings { variantCount salesCount avgRating reviewCount isBundle soldCount30d bestSellerRank bestSellerCollection bestSellerCollectionSlug }
			}
			facetValues {
				count
				facetValue { id name facet { id name } }
			}
		}
	}
`;

// Editorial content (SEO copy, banner, FAQ) an admin can attach per brand —
// not every brand has this filled in yet, so callers must treat a null
// response (or empty metaTitle/metaDescription) as "nothing set" and fall
// back to the generic brand-page copy, not as an error.
export interface BrandPageContentFaq {
	question: string;
	answer: string;
}

export interface BrandPageContent {
	id: string;
	title: string;
	description: string;
	assetPreview: string | null;
	metaTitle: string;
	metaDescription: string;
	faq: BrandPageContentFaq[];
}

export interface BrandPageContentData {
	brandPageContent: BrandPageContent | null;
}

export const GET_BRAND_PAGE_CONTENT_QUERY = `
	query GetBrandPageContent($facetValueCode: String!, $languageCode: LanguageCode) {
		brandPageContent(facetValueCode: $facetValueCode, languageCode: $languageCode) {
			id
			title
			description
			assetPreview
			metaTitle
			metaDescription
			faq { question answer }
		}
	}
`;
