import type { Route } from "./+types/api.product-comparison";
import { graphqlRequest } from "workers/graphqlClient";
import {
	PRODUCTS_BY_COMPARISON_GROUP_QUERY,
	COMPARE_VARIANT_HIGHLIGHTS_QUERY,
	pickMatchingVariant,
	type ProductsByComparisonGroupData,
	type ComparisonTableData,
	type ComparisonProductEntry,
} from "~/graphql/product";

// Client-fetched (not part of the PDP's own SSR loader) — this is a small
// curated comparison group, not something every visitor needs immediately,
// so it shouldn't hold up the page's initial render. Two sequential calls
// (need the group's products before their variant IDs are known), same as
// the fetch this replaced.
export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const url = new URL(request.url);
	const groupId = url.searchParams.get("groupId") ?? "";
	const flavorOption = url.searchParams.get("flavorOption");

	const empty = { products: [] as ComparisonProductEntry[], highlightTypes: [], rows: [] };
	if (!groupId) return Response.json(empty);

	try {
		const { data: groupData } = await graphqlRequest<ProductsByComparisonGroupData>(env, PRODUCTS_BY_COMPARISON_GROUP_QUERY, { groupId, take: 20 }, { request });
		const groupProducts = groupData.productsByComparisonGroup;
		if (groupProducts.length < 2) return Response.json(empty);

		const entries: ComparisonProductEntry[] = [];
		const variantInputs: { variantId: string; productId: string }[] = [];
		for (const p of groupProducts) {
			const variant = pickMatchingVariant(p, flavorOption);
			if (!variant) continue;
			entries.push({
				id: p.id,
				name: p.name,
				slug: p.slug,
				featuredAsset: p.featuredAsset,
				variantId: variant.id,
				variantName: variant.name,
				variantSlug: variant.customFields?.slug ?? null,
				variantFeaturedAsset: variant.featuredAsset,
			});
			variantInputs.push({ variantId: variant.id, productId: p.id });
		}
		if (entries.length < 2) return Response.json(empty);

		const { data: tableData } = await graphqlRequest<ComparisonTableData>(env, COMPARE_VARIANT_HIGHLIGHTS_QUERY, { variants: variantInputs }, { request });
		if (tableData.compareVariantHighlights.highlightTypes.length === 0) return Response.json(empty);

		return Response.json({ products: entries, highlightTypes: tableData.compareVariantHighlights.highlightTypes, rows: tableData.compareVariantHighlights.rows });
	} catch {
		return Response.json(empty);
	}
}
