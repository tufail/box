import type { Route } from "./+types/review-images.upload";

export async function action({ request, context }: Route.ActionArgs) {
	const env = context.cloudflare.env;
	const shopApiUrl = env.VENDURE_SHOP_API ?? "";

	// Read auth token from the HttpOnly cookie
	const cookie = request.headers.get("cookie") ?? "";
	const authToken = cookie.match(/vendure-auth-token=([^;]+)/)?.[1] ?? "";

	const incomingForm = await request.formData();
	const files = incomingForm.getAll("files") as File[];

	if (files.length === 0) {
		return Response.json({ error: "No files provided." }, { status: 400 });
	}
	if (files.length > 5) {
		return Response.json({ error: "Maximum 5 images allowed." }, { status: 400 });
	}

	// Build GraphQL multipart request spec
	// https://github.com/jaydenseric/graphql-multipart-request-spec
	const operations = JSON.stringify({
		query: `mutation UploadReviewImages($files: [Upload!]!) {
      uploadReviewImages(files: $files) { urls warnings }
    }`,
		variables: { files: files.map(() => null) },
	});

	const map: Record<string, string[]> = {};
	files.forEach((_, i) => { map[String(i)] = [`variables.files.${i}`]; });

	const form = new FormData();
	form.append("operations", operations);
	form.append("map", JSON.stringify(map));
	files.forEach((file, i) => form.append(String(i), file));

	const headers: Record<string, string> = {
		"vendure-token": "__default_channel__",
	};
	if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

	try {
		const response = await fetch(shopApiUrl, {
			method: "POST",
			headers,
			body: form,
		});

		const result = await response.json() as {
			data?: { uploadReviewImages?: { urls: string[]; warnings: string[] } };
			errors?: { message: string }[];
		};

		if (result.errors?.length) {
			const msg = result.errors[0]?.message ?? "Upload failed";
			const status = msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("auth") ? 401 : 400;
			return Response.json({ error: msg }, { status });
		}

		const upload = result.data?.uploadReviewImages;
		if (!upload) {
			return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
		}

		return Response.json({ urls: upload.urls, warnings: upload.warnings });
	} catch {
		return Response.json({ error: "Image upload failed. Please try again." }, { status: 500 });
	}
}
