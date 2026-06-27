import type { Route } from "./+types/api.product-reviews";
import { graphqlRequest } from "workers/graphqlClient";
import { PRODUCT_REVIEWS_QUERY, type ProductReviewsData, type ReviewSortOrder } from "~/graphql/product";

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const slug = url.searchParams.get("slug") ?? "";
	const sort = (url.searchParams.get("sort") ?? "MOST_RELEVANT") as ReviewSortOrder;
	const take = Math.min(Number(url.searchParams.get("take") ?? "5"), 20);

	if (!slug) return Response.json({ reviews: [], totalItems: 0 });

	const env = context.cloudflare.env;
	try {
		const { data } = await graphqlRequest<ProductReviewsData>(
			env, PRODUCT_REVIEWS_QUERY,
			{ slug, sort, take, skip: 0 },
			{ request },
		);
		return Response.json({
			reviews: data.productReviewsBySlug?.items ?? [],
			totalItems: data.productReviewsBySlug?.totalItems ?? 0,
		});
	} catch {
		return Response.json({ reviews: [], totalItems: 0 });
	}
}
