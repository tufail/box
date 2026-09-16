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
	"Claude-User",
	"Claude-SearchBot",
	"anthropic-ai",
	"Google-Extended",
	"GoogleOther",
	"PerplexityBot",
	"Perplexity-User",
	"Meta-ExternalAgent",
	"Meta-ExternalFetcher",
	"Amazonbot",
	"DuckAssistBot",
	"CCBot",
	"Applebot-Extended",
	"cohere-ai",
	"Bytespider",
];

// /search is intentionally NOT disallowed here — it's kept crawlable so a
// `noindex` meta tag (set on that route) is what keeps it out of search
// indexes, rather than blocking the crawl outright (a robots.txt Disallow
// would prevent crawlers from ever seeing that meta tag).
// /api/ isn't disallowed — several endpoints are fetched client-side (GET, no auth)
// to render real page content (HomeBanner's top-bar/promo banners, trending
// sections), and blocking the whole prefix stopped Googlebot's renderer from
// fetching them while executing the page's JS. Search Console flagged this exact
// pattern ("blocked by robots.txt") on /api/banner/top-bar-items, which Google
// explicitly recommends against for resources that affect how a page renders. The
// remaining /api/* endpoints (cart, checkout, account, auth) are mutation-only —
// nothing for a crawler to fetch or index there regardless.
const DISALLOWED_PATHS = ["/account", "/checkout", "/order-confirmation", "/review-images/upload"];

function block(agent: string): string[] {
	return [`User-agent: ${agent}`, ...DISALLOWED_PATHS.map((p) => `Disallow: ${p}`), ""];
}

export async function loader({ request }: { request: Request }) {
	// Preview/staging deploys (*.workers.dev, before a real custom domain is wired
	// up) — keep every crawler out entirely, rather than the normal selective rules.
	if (new URL(request.url).hostname.endsWith(".workers.dev")) {
		return new Response("User-agent: *\nDisallow: /\n", {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			},
		});
	}

	const lines = [...block("*"), ...AI_CRAWLER_AGENTS.flatMap(block), `Sitemap: ${SITE_URL}/sitemap.xml`, ""];

	return new Response(lines.join("\n"), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
