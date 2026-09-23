// Shared by every plain-text/markdown resource route (llms-full.txt, and the
// per-page .md endpoints) — one place for the HTML->text conversion and for
// the response headers that keep these out of Google's regular search index.

export function htmlToText(html: string): string {
	return html
		.replace(/<h[1-6][^>]*>/gi, "\n\n### ")
		.replace(/<\/h[1-6]>/gi, "\n")
		.replace(/<li[^>]*>/gi, "\n- ")
		.replace(/<\/li>/gi, "")
		.replace(/<\/(td|th)>/gi, " | ")
		.replace(/<\/tr>/gi, "\n")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(p|div)>/gi, "\n\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&#0?39;/gi, "'")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

// Per-page .md endpoints are a duplicate — in content, not in intent — of an
// already-indexed HTML page. X-Robots-Tag: noindex keeps Google from ever
// listing them as separate search results (robots.txt also blocks regular
// search engines from crawling *.md at all; AI crawlers are deliberately left
// able to fetch these), and the Link/rel=canonical header points at the real
// HTML page so there's no ambiguity for any crawler that does see both.
// Existing purely so a second ranking-loss incident like the brand-content
// duplicate-H1 one can't happen via this feature.
export function markdownResponse(body: string, canonicalUrl: string): Response {
	return new Response(body, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"X-Robots-Tag": "noindex",
			Link: `<${canonicalUrl}>; rel="canonical"`,
			"Cache-Control": "public, max-age=3600",
		},
	});
}
