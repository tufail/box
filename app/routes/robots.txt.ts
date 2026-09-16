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
const DISALLOWED_PATHS = ["/account", "/checkout", "/api/", "/order-confirmation", "/review-images/upload"];

// Carve-outs from the blanket /api/ disallow above, for endpoints components fetch
// client-side (GET, no auth) to render content that's actually part of the page —
// e.g. HomeBanner's top-bar/promo banners. Blocking these doesn't hide anything from
// search (they're not pages), but it does stop Googlebot's renderer from fetching
// them while executing the page's JS, which Search Console flags as "blocked by
// robots.txt" and Google explicitly recommends against for render-affecting
// resources. The most specific matching rule wins, so this overrides /api/ for just
// these prefixes while everything else under /api/ (cart, checkout, account, auth —
// mutation endpoints with nothing for a crawler to render) stays blocked.
const ALLOWED_API_PATHS = ["/api/banner/"];

function block(agent: string): string[] {
	return [`User-agent: ${agent}`, ...DISALLOWED_PATHS.map((p) => `Disallow: ${p}`), ...ALLOWED_API_PATHS.map((p) => `Allow: ${p}`), ""];
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
