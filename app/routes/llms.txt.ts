import { SITE_NAME, SITE_URL } from "~/lib/seo";

// llms.txt — an emerging (not yet a formal web standard) convention some sites
// publish as a concise, LLM-readable summary of what the site is and where its
// key sections live, similar in spirit to robots.txt/sitemap.xml but aimed at
// AI assistants synthesizing answers rather than search-engine crawlers.
export async function loader() {
	const body = `# ${SITE_NAME}

> Qatar's online store for authentic sports nutrition, health supplements, vitamins, healthy foods, and wellness products, with fast delivery across Qatar.

## Key sections

- [All collections](${SITE_URL}/collections): Full product catalogue
- [Shop by brand](${SITE_URL}/brands): All brands carried by ${SITE_NAME}
- [About](${SITE_URL}/about): Who ${SITE_NAME} is
- [Sitemap](${SITE_URL}/sitemap.xml): Full list of collection, product, and brand pages

## Notes

- Product pages include price, currency, stock availability, and brand as structured data (schema.org Product).
- All products are sourced through verified channels; ${SITE_NAME} guarantees authenticity.
`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
