import type { Route } from "./+types/api.review-images";

function getAuthTokenFromCookie(request: Request): string | null {
	const cookie = request.headers.get("cookie") ?? "";
	return cookie.match(/vendure-auth-token=([^;]+)/)?.[1] ?? null;
}

export async function action({ request, context }: Route.ActionArgs) {
	const authToken = getAuthTokenFromCookie(request);
	if (!authToken) {
		return Response.json({ error: "Please log in to upload images." }, { status: 401 });
	}

	const env = context.cloudflare.env;
	// Keep /shop-api in the base — plugin is mounted under that namespace
	const shopApiBase = (env.VENDURE_SHOP_API ?? "").replace(/\/?$/, "");
	const uploadUrl = `${shopApiBase}/review-images/upload`;

	try {
		const formData = await request.formData();
		const response = await fetch(uploadUrl, {
			method: "POST",
			headers: { Authorization: `Bearer ${authToken}` },
			body: formData,
		});
		const data = await response.json();
		return Response.json(data, { status: response.status });
	} catch {
		return Response.json({ error: "Image upload failed. Please try again." }, { status: 500 });
	}
}
