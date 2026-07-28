import { SITE_URL } from "~/lib/seo";

// robots.txt user-agent blocks are independent — a crawler only obeys the rules
// in its own matching block, not "*" — so every explicitly-listed AI/answer-engine
// crawler repeats the same disallow rules as "*" rather than getting a bare
// "Allow: /" (which would otherwise inadvertently open up /account, /checkout etc.
// to just that bot). Listing them by name (instead of relying on "*" alone) is
// otherwise redundant per spec, but makes NutriBox's openness to being read by
// ChatGPT/Google AI Overviews/Claude/Perplexity explicit rather than incidental.
const AI_CRAWLER_AGENTS = [
	"GPTBot",
	"ChatGPT-User",
	"OAI-SearchBot",
	"ClaudeBot",
	"Claude-Web",
	"anthropic-ai",
	"Google-Extended",
	"PerplexityBot",
	"CCBot",
	"Applebot-Extended",
	"cohere-ai",
	"Bytespider",
];

// /search is intentionally NOT disallowed here — it's kept crawlable so a
// `noindex` meta tag (set on that route) is what keeps it out of search
// indexes, rather than blocking the crawl outright (a robots.txt Disallow
// would prevent crawlers from ever seeing that meta tag).
const DISALLOWED_PATHS = ["/account", "/checkout", "/api/", "/order-confirmation", "/review-images/upload"];

function block(agent: string): string[] {
	return [`User-agent: ${agent}`, ...DISALLOWED_PATHS.map((p) => `Disallow: ${p}`), ""];
}

export async function loader() {
	const lines = [...block("*"), ...AI_CRAWLER_AGENTS.flatMap(block), `Sitemap: ${SITE_URL}/sitemap.xml`, ""];

	return new Response(lines.join("\n"), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
