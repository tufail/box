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
	return text
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
// Second sentence of a generated intro: authenticity + delivery, the two
// things a Qatar shopper checks before buying supplements online.
const PROMISE = {
	en: "100% original products from verified distributors, with express delivery in Doha and across Qatar.",
	ar: "منتجات أصلية 100% من موزعين معتمدين، مع توصيل سريع في الدوحة وجميع أنحاء قطر.",
};
const PROMISE_SHORT = {
	en: "100% original, with express delivery in Doha.",
	ar: "منتجات أصلية مع توصيل سريع في الدوحة.",
};

// "Shop our <name> range" reads naturally for any collection name, including
// ones that aren't product nouns ("Energy", "Strength", "Accessories").
function generatedLead(name: string, brands: string[], locale: Locale): string {
	const from = brands.length ? joinBrands(brands, locale) : "";
	return locale === "ar"
		? `تسوّق تشكيلة ${name} في قطر${from ? ` من ${from}` : ""}.`
		: `Shop our ${name} range in Qatar${from ? ` from ${from}` : ""}.`;
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
		intro = cleaned.length < SHORT_INTRO + 20 ? `${cleaned} ${mentionsDelivery ? TRUST[locale] : PROMISE[locale]}` : cleaned;
	} else {
		intro = `${generatedLead(name, top, locale)} ${PROMISE[locale]}`;
	}

	// The admin's own meta description is used as written; otherwise the best
	// candidate that fits Google's snippet length (fewer brands / shorter promise
	// before giving up on the promise entirely).
	let meta: string;
	if (custom) meta = custom;
	else if (cleaned) {
		const candidates = [intro, `${cleaned} ${PROMISE_SHORT[locale]}`];
		meta = candidates.find((c) => c.length <= META_MAX) ?? fit(cleaned, META_MAX);
	} else {
		const candidates = [
			intro,
			`${generatedLead(name, top, locale)} ${PROMISE_SHORT[locale]}`,
			`${generatedLead(name, top.slice(0, 2), locale)} ${PROMISE_SHORT[locale]}`,
			`${generatedLead(name, [], locale)} ${PROMISE[locale]}`,
			generatedLead(name, top.slice(0, 2), locale),
		];
		meta = candidates.find((c) => c.length <= META_MAX) ?? fit(candidates[candidates.length - 1], META_MAX);
	}
	return { intro, meta };
}
