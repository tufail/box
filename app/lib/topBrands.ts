import { graphqlRequest, type VendureEnv } from "workers/graphqlClient";
import { GET_BRAND_FACET_QUERY, type BrandFacetData } from "~/graphql/brand";

export interface TopBrand {
	name: string;
	code: string;
	/** Items listed on the brand's own page (/brands/<code>) -- variants, exactly as that page counts them. */
	count: number;
}

// Brands ranked by how many items their /brands/<code> page really lists, most first. Done as one
// aliased GraphQL request (one search per brand, each filtered by that brand exactly like the brand
// page does) -- NOT via the search response's facetValues aggregate, which turned out to drop most
// brands. Brands with nothing on their page are left out, so every link built from this lands on a
// page with products. Callers cache the result (edge cache), so this runs rarely.
export async function loadTopBrands(env: VendureEnv, options: Parameters<typeof graphqlRequest>[3], limit = 16): Promise<TopBrand[]> {
	const facets = await graphqlRequest<BrandFacetData>(env, GET_BRAND_FACET_QUERY, undefined, options);
	const values = facets.data.facets.items[0]?.values ?? [];
	if (values.length === 0) return [];

	const fields = values.map((v, i) => `b${i}: search(input: { facetValueIds: [${JSON.stringify(v.id)}], groupByProduct: false, take: 0 }) { totalItems }`).join("\n");
	const counts = await graphqlRequest<Record<string, { totalItems: number }>>(env, `query BrandItemCounts {\n${fields}\n}`, undefined, options);

	return values
		.map((v, i) => ({ name: v.name, code: v.code, count: counts.data[`b${i}`]?.totalItems ?? 0 }))
		.filter((b) => b.count > 0)
		.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
		.slice(0, limit);
}