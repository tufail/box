import { useLocation, useMatches } from "react-router";
import Link from "~/components/LocaleLink";
import { ArrowUpRight } from "lucide-react";
import type { MegaMenuData } from "~/graphql/megamenu";
import type { PopularSearchTerm } from "~/graphql/search";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";
import { FAQS } from "~/lib/faqData";
import GoogleReviewsWidget from "~/components/GoogleReviewsWidget";

// Static SEO content block, shown below the footer sitewide — mirrors the pattern used
// by health/wellness marketplaces (a keyword-rich brand description + internal links).
// TODO: placeholder copy — refine/expand once certifications are finalized.
//
// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.

const COPY = {
	en: {
		about: "About NutriBox",
		popularSearches: "Popular Searches",
		topBrands: "Top Brands on NutriBox",
		faqs: "Frequently Asked Questions",
	},
	ar: {
		about: "حول NutriBox",
		popularSearches: "عمليات البحث الشائعة",
		topBrands: "أفضل العلامات التجارية على NutriBox",
		faqs: "الأسئلة الشائعة",
	},
} as const;

// Fallback only, used if the live brand counts can't be loaded. The real list comes from the
// home route's loader (topBrands, see lib/topBrands.ts): brands ranked by how many items their
// /brands/<code> page lists, so every link lands on a page with products on it. This fallback is
// that ranking as of late Oct 2026 (items on page in brackets); brands whose products have no
// variants yet (The Flavor Gang, AB, Pride Foods, TPS) are deliberately absent -- their pages are empty.
// Brand names are proper nouns and stay unlocalized in both languages.
const FALLBACK_TOP_BRANDS = [
	{ name: "Applied Nutrition", code: "applied-nutrition" }, // 66
	{ name: "Optimum Nutrition", code: "optimum-nutrition" }, // 21
	{ name: "Ghost", code: "ghost" }, // 16
	{ name: "Dymatize", code: "dymatize" }, // 16
	{ name: "ABE", code: "abe" }, // 14
	{ name: "NOW Foods", code: "now-foods" }, // 13
	{ name: "Rule One Proteins", code: "rule-one-proteins" }, // 11
	{ name: "EVLution Nutrition", code: "evlution-nutrition" }, // 10
	{ name: "Transparent Labs", code: "transparent-labs" }, // 8
	{ name: "MuscleTech", code: "muscletech" }, // 7
	{ name: "Alfa Vitamins", code: "alfa-vitamins" }, // 6
	{ name: "Basix", code: "basix" }, // 6
	{ name: "ALLMAX", code: "allmax" }, // 5
	{ name: "Amerix", code: "amerix" }, // 5
	{ name: "Bloom Nutrition", code: "bloom" }, // 4
];
function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Pulls every {label, url} pair out of the mega menu — the only place we already
// have real collection URLs sitewide without an extra query.
function flattenMegaMenu(menu: MegaMenuData["getMegaMenu"]): { label: string; url: string }[] {
	if (!menu) return [];
	const entries: { label: string; url: string }[] = [];
	for (const item of menu.items) {
		for (const col of item.columns) {
			for (const section of col.sections) {
				for (const link of section.links) {
					if (link.url) entries.push({ label: link.label, url: link.url });
				}
			}
		}
	}
	return entries;
}

// Best-effort match of a search term (e.g. "Whey Protein Qatar") against a mega-menu
// label (e.g. "Whey Protein") via substring containment either direction, preferring
// the longest/most specific label match.
function findCollectionUrl(term: string, entries: { label: string; url: string }[]): string | null {
	const normTerm = normalize(term);
	const exact = entries.find((e) => normalize(e.label) === normTerm);
	if (exact) return exact.url;

	const candidates = entries
		.filter((e) => {
			const normLabel = normalize(e.label);
			return normLabel.length > 2 && (normTerm.includes(normLabel) || normLabel.includes(normTerm));
		})
		.sort((a, b) => normalize(b.label).length - normalize(a.label).length);

	return candidates[0]?.url ?? null;
}

interface SeoFooterContentProps {
	megaMenu: MegaMenuData["getMegaMenu"];
	popularSearchTerms: PopularSearchTerm[];
}

export default function SeoFooterContent({ megaMenu, popularSearchTerms }: SeoFooterContentProps) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const collectionEntries = flattenMegaMenu(megaMenu);

	// Brands ranked by real product count, supplied by the home route's loader (this block only
	// renders on the homepage, English and Arabic).
	const homeMatch = useMatches().find((m) => m.id === "routes/home" || m.id === "routes/home.ar");
	const liveBrands = (homeMatch?.data as { topBrands?: { name: string; code: string }[] } | undefined)?.topBrands;
	const topBrands = liveBrands && liveBrands.length > 0 ? liveBrands : FALLBACK_TOP_BRANDS;

	const faqs = FAQS[locale];

	const faqJsonLd = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((item) => ({
			"@type": "Question",
			name: item.q,
			acceptedAnswer: { "@type": "Answer", text: item.a },
		})),
	};

	return (
		<div className="bg-white border-t border-stone-200">
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
			<GoogleReviewsWidget />
			<div className="container mx-auto px-4 py-10">
				{/* fr units, not percentages — percentage columns plus `gap` push the total
			    past 100% of the container, overflowing the right column off-screen. */}
			<div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10">
				{/* Left ~60% — About NutriBox (unchanged content) */}
				<div>
				<h2 className="font-heading2 text-lg md:text-xl font-extrabold text-gray-900 mb-4 uppercase tracking-tight">{t.about}</h2>

				<div className="space-y-4 text-sm text-gray-500 leading-relaxed">
					{locale === "ar" ? (
						<>
							<p>نوتري بوكس هي الوجهة الإلكترونية الموثوقة في قطر للتغذية الرياضية الأصلية، والمكملات الصحية، والفيتامينات، والأطعمة الصحية، ومنتجات التجميل، ومنتجات العافية، وإكسسوارات اللياقة البدنية. نقدم منتجات مميزة من أشهر العلامات التجارية العالمية مع تسوق إلكتروني آمن، وأسعار تنافسية، وتوصيل سريع في جميع أنحاء قطر.</p>
							<p>
								سواء كنت تبحث عن بروتين واي، أو الكرياتين، أو مكملات زيادة الوزن، أو مكملات ما قبل التمرين، أو الفيتامينات المتعددة، أو أوميغا 3، أو الكولاجين، أو ألواح البروتين، أو الوجبات الخفيفة الصحية، أو مكملات إدارة الوزن، فإن نوتري بوكس يوفر كل ما تحتاجه لدعم أهدافك في اللياقة والصحة والعافية في مكان واحد. تصفح{" "}
								<Link to="/collections" className="text-primary font-medium hover:underline">
									مجموعتنا الكاملة من الفئات
								</Link>
								.
							</p>
						</>
					) : (
						<>
							<p>NutriBox is Qatar's trusted online destination for authentic sports nutrition, health supplements, vitamins, healthy foods, beauty products, wellness products, and fitness accessories. We offer premium products from leading international brands with secure online shopping, competitive prices, and fast delivery across Qatar.</p>
							<p>
								Whether you're looking for whey protein, creatine, mass gainers, pre-workout supplements, multivitamins, omega-3, collagen, protein bars, healthy snacks, or weight management supplements, NutriBox brings everything you need to support your fitness, health, and wellness goals in one place. Browse our{" "}
								<Link to="/collections" className="text-primary font-medium hover:underline">
									full range of collections
								</Link>
								.
							</p>
						</>
					)}
				</div>

				{popularSearchTerms.length > 0 && (
					<div className="mt-10">
						<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">{t.popularSearches}</h3>
						<p className="text-sm leading-relaxed">
							{popularSearchTerms.map((entry, i) => {
								const collectionUrl = findCollectionUrl(entry.term, collectionEntries);
								const href = collectionUrl ?? localizePath(`/search?q=${encodeURIComponent(entry.term)}`, locale);
								return (
									<span key={entry.term}>
										<Link to={href} className="text-primary hover:underline">
											{entry.term}
										</Link>
										{i < popularSearchTerms.length - 1 && <span className="text-gray-300 mx-2">|</span>}
									</span>
								);
							})}
						</p>
					</div>
				)}

				<div className="mt-8">
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">{t.topBrands}</h3>
					<p className="text-sm leading-relaxed">
						{topBrands.map((brand, i) => (
							<span key={brand.code}>
								<Link to={`/brands/${brand.code}`} className="text-primary hover:underline">
									{brand.name}
								</Link>
								{i < topBrands.length - 1 && <span className="text-gray-300 mx-2">|</span>}
							</span>
						))}
					</p>
				</div>

				</div>

				{/* Right ~40% — FAQs */}
				<div id="faq">
					<h2 className="font-heading2 text-lg md:text-xl font-extrabold text-gray-900 mb-4 uppercase tracking-tight">{t.faqs}</h2>
					<div className="space-y-3">
						{faqs.map((item, i) => (
							<details key={i} className="group bg-white open:bg-gray-50 rounded-2xl shadow-md open:shadow-lg px-4 py-4 transition-all">
								<summary className="flex items-center justify-between gap-4 cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
									<span className="text-sm md:text-base font-semibold text-gray-900">{item.q}</span>
									<span className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center transition-colors group-open:bg-gray-900 group-open:border-gray-900">
										<ArrowUpRight size={16} strokeWidth={2} className="text-gray-500 rotate-180 rtl:scale-x-[-1] transition-transform duration-200 group-open:rotate-0 group-open:text-white" />
									</span>
								</summary>
								<p className="text-sm text-gray-500 leading-relaxed mt-3 pe-12">{item.a}</p>
							</details>
						))}
					</div>
				</div>
				</div>
			</div>
		</div>
	);
}
