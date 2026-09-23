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
// able to fetch these). Deliberately no Link/rel=canonical header pointing at
// the HTML page — Google explicitly warns against combining noindex with a
// cross-page canonical (contradictory signals: canonical says "equivalent,
// index that one instead", noindex says "never index this one"; per John
// Mueller, Google's algorithms may just pick the canonical and ignore the
// noindex). noindex alone is the clean, unambiguous signal for "never index
// this at all" — which is the actual goal here, not ranking consolidation.
// Existing purely so a second ranking-loss incident like the brand-content
// duplicate-H1 one can't happen via this feature.
export function markdownResponse(body: string): Response {
	return new Response(body, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"X-Robots-Tag": "noindex, follow",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
