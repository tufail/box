import type { Locale } from "~/lib/i18n";

// Short intro shown under a collection's H1, and the fallback for its meta
// description. Picks the best text available, so every collection -- including
// ones added later with no SEO fields filled in -- gets a sentence that says
// what it sells, where, from which brands, and why to buy here:
//   1. the admin's hand-written meta description (cleaned for on-page display)
//   2. the first real paragraph of the collection's description
//   3. a sentence generated from live data: name + top brands by product count
// Short results get the trust/delivery line appended, so every intro sells.

const META_MAX = 160; // Google truncates snippets around here.
const SHORT_INTRO = 110;

interface IntroInput {
	name: string;
	metaDescription?: string | null;
	descriptionHtml?: string | null;
	/** Brand names, most products first. */
	brands: string[];
	locale: Locale;
}

function decodeEntities(s: string): string {
	return s
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)));
}

// Snippet-style marketing ("✓ Secure Shopping ✓ Best Price", "Shop Now!") reads
// fine in a search result but odd as page copy under a heading -- strip it.
export function cleanBlurb(text: string): string {
	// "…at NutriBox Qatar. …delivery across Qatar" says Qatar twice; when it
	// appears again anyway, the brand name alone is enough.
	const deduped = (text.match(/qatar/gi) ?? []).length > 1 ? text.replace(/NutriBox Qatar/g, "NutriBox") : text;
	return deduped
		.replace(/[✓✔☑]\s*[^✓✔☑.!]*[.!]?/g, " ")
		.replace(/\bShop now!?/gi, " ")
		.replace(/\s+([.,!])/g, "$1")
		.replace(/\s{2,}/g, " ")
		.trim()
		.replace(/[,;:\-–]+$/, "")
		.replace(/([^.!?])$/, "$1.");
}

// First <p> of the rich-text description with enough substance to be an intro
// (headings and one-word paragraphs are skipped).
function firstParagraph(html: string | null | undefined): string | null {
	if (!html) return null;
	for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
		const text = decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
		if (text.length >= 60) return text;
	}
	return null;
}

function joinBrands(brands: string[], locale: Locale): string {
	if (brands.length <= 1) return brands[0] ?? "";
	const last = brands[brands.length - 1];
	// Arabic "and" (و) attaches to an Arabic word but reads oddly glued to a Latin brand name.
	const and = /^[A-Za-z0-9]/.test(last) ? "و " : "و";
	return locale === "ar" ? `${brands.slice(0, -1).join("، ")} ${and}${last}` : `${brands.slice(0, -1).join(", ")} & ${last}`;
}

// Appended to short hand-written intros.
const TRUST = {
	en: "100% authentic products from verified distributors, priced in QAR.",
	ar: "جميع المنتجات أصلية من موزعين معتمدين وبالأسعار بالريال القطري.",
};
// Authenticity + delivery, the two things a Qatar shopper checks before buying
// supplements online. "Qatar" should appear ONCE per intro, so each promise
// has a variant without it for text that already says Qatar.
const PROMISE = {
	withQatar: {
		en: "100% original products from verified distributors, with express delivery in Doha and across Qatar.",
		ar: "منتجات أصلية 100% من موزعين معتمدين، مع توصيل سريع في الدوحة وجميع أنحاء قطر.",
	},
	noQatar: {
		en: "100% original products from verified distributors, with express delivery across Doha.",
		ar: "منتجات أصلية 100% من موزعين معتمدين، مع توصيل سريع في الدوحة.",
	},
};
const PROMISE_SHORT = {
	withQatar: { en: "100% original, with express delivery across Qatar.", ar: "منتجات أصلية مع توصيل سريع في جميع أنحاء قطر." },
	noQatar: { en: "100% original, with express delivery in Doha.", ar: "منتجات أصلية مع توصيل سريع في الدوحة." },
};

const saysQatar = (text: string) => /qatar|قطر/i.test(text);
const promise = (base: string, locale: Locale) => PROMISE[saysQatar(base) ? "noQatar" : "withQatar"][locale];
const promiseShort = (base: string, locale: Locale) => PROMISE_SHORT[saysQatar(base) ? "noQatar" : "withQatar"][locale];

// "Shop our <name> range" reads naturally for any collection name, including
// ones that aren't product nouns ("Energy", "Strength", "Accessories"). No
// "Qatar" here -- the promise sentence after it carries the one mention.
function generatedLead(name: string, brands: string[], locale: Locale): string {
	const from = brands.length ? joinBrands(brands, locale) : "";
	return locale === "ar" ? `تسوّق تشكيلة ${name}${from ? ` من ${from}` : ""}.` : `Shop our ${name} range${from ? ` from ${from}` : ""}.`;
}

// Cut at a sentence end within max; failing that, at a word, with an ellipsis.
function fit(text: string, max: number): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
	if (sentenceEnd >= 60) return cut.slice(0, sentenceEnd + 1);
	return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\-–]+$/, "")}…`;
}

export function collectionIntro({ name, metaDescription, descriptionHtml, brands, locale }: IntroInput): { intro: string; meta: string } {
	const top = brands.slice(0, 3);
	const custom = metaDescription?.trim() || null;
	const written = custom ?? firstParagraph(descriptionHtml);

	let intro: string;
	let cleaned: string | null = null;
	if (written) {
		cleaned = cleanBlurb(written);
		// Short text gets the selling line: the delivery promise if it doesn't
		// already mention delivery (also adds the Doha/Qatar local signal),
		// otherwise just the authenticity line.
		const mentionsDelivery = /deliver|توصيل/i.test(cleaned);
		intro = cleaned.length < SHORT_INTRO + 20 ? `${cleaned} ${mentionsDelivery ? TRUST[locale] : promise(cleaned, locale)}` : cleaned;
	} else {
		const lead = generatedLead(name, top, locale);
		intro = `${lead} ${promise(lead, locale)}`;
	}

	// The admin's own meta description is used as written; otherwise the best
	// candidate that fits Google's snippet length (fewer brands / shorter promise
	// before giving up on the promise entirely).
	let meta: string;
	if (custom) meta = custom;
	else if (cleaned) {
		const candidates = [intro, `${cleaned} ${promiseShort(cleaned, locale)}`];
		meta = candidates.find((c) => c.length <= META_MAX) ?? fit(cleaned, META_MAX);
	} else {
		const withShort = (lead: string) => `${lead} ${promiseShort(lead, locale)}`;
		const noBrands = generatedLead(name, [], locale);
		const candidates = [
			intro,
			withShort(generatedLead(name, top, locale)),
			withShort(generatedLead(name, top.slice(0, 2), locale)),
			`${noBrands} ${promise(noBrands, locale)}`,
			withShort(noBrands),
		];
		meta = candidates.find((c) => c.length <= META_MAX) ?? fit(candidates[candidates.length - 1], META_MAX);
	}
	return { intro, meta };
}
