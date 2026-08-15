import { useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import type { MegaMenuData } from "~/graphql/megamenu";
import { getLocaleFromPathname, localizePath, type Locale } from "~/lib/i18n";

// Static SEO content block, shown below the footer sitewide — mirrors the pattern used
// by health/wellness marketplaces (a keyword-rich brand description + internal links).
// TODO: placeholder copy — refine/expand once certifications are finalized.
//
// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.

const TOP_CATEGORIES: Record<Locale, string[]> = {
	en: ["Whey Protein Qatar", "Protein Powder Qatar", "Creatine Qatar", "Sports Supplements Qatar", "Health Supplements Qatar", "Vitamins Qatar", "Omega-3 Capsules", "Collagen Supplement", "Multivitamins", "Protein Bars", "Healthy Snacks", "Plant Protein", "BCAA", "Pre-Workout", "Mass Gainer", "Weight Loss Supplements", "Biotin Supplements", "Fish Oil", "Electrolytes", "Wellness Products"],
	ar: ["بروتين واي في قطر", "بودرة بروتين في قطر", "كرياتين في قطر", "مكملات رياضية في قطر", "مكملات صحية في قطر", "فيتامينات في قطر", "كبسولات أوميغا 3", "مكمل الكولاجين", "فيتامينات متعددة", "ألواح البروتين", "وجبات خفيفة صحية", "بروتين نباتي", "بي سي إيه إيه (BCAA)", "مكملات ما قبل التمرين", "مكمل زيادة الوزن", "مكملات إنقاص الوزن", "مكملات البيوتين", "زيت السمك", "إلكتروليتات", "منتجات العافية"],
};

// English category terms drive the mega-menu slug lookup below (see findCollectionSlug) —
// kept alongside the Arabic display list so the matching logic doesn't need to guess
// whether the backend's Arabic collection names line up with our own Arabic phrasing.
const TOP_CATEGORIES_MATCH_TERMS = TOP_CATEGORIES.en;

const COPY = {
	en: {
		about: "About NutriBox",
		popularSearches: "Popular Searches",
		topBrands: "Top Brands on NutriBox",
	},
	ar: {
		about: "حول NutriBox",
		popularSearches: "عمليات البحث الشائعة",
		topBrands: "أفضل العلامات التجارية على NutriBox",
	},
} as const;

// Static — matches real "brand" facet values/codes on the backend (verified against
// the live shop API), curated down to well-known sports-nutrition/supplement brands.
// Brand names are proper nouns and stay unlocalized in both languages.
const TOP_BRANDS = [
	{ name: "Optimum Nutrition", code: "optimum-nutrition" },
	{ name: "MuscleTech", code: "muscletech" },
	{ name: "Dymatize", code: "dymatize" },
	{ name: "BSN", code: "bsn" },
	{ name: "Cellucor", code: "cellucor" },
	{ name: "MusclePharm", code: "musclepharm" },
	{ name: "GAT Sport", code: "gat-sport" },
	{ name: "Ghost", code: "ghost" },
	{ name: "Redcon1", code: "redcon1" },
	{ name: "ProSupps", code: "prosupps" },
	{ name: "Kaged", code: "kaged" },
	{ name: "RYSE", code: "ryse" },
	{ name: "Isopure", code: "isopure" },
	{ name: "Xtend", code: "xtend" },
	{ name: "Universal Nutrition", code: "universal-nutrition" },
	{ name: "Quest Nutrition", code: "quest-nutrition" },
	{ name: "Garden of Life", code: "garden-of-life" },
	{ name: "NOW Foods", code: "now-foods" },
	{ name: "GNC", code: "gnc" },
	{ name: "Myprotein", code: "myprotein" },
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
}

export default function SeoFooterContent({ megaMenu }: SeoFooterContentProps) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const collectionEntries = flattenMegaMenu(megaMenu);
	const categories = TOP_CATEGORIES[locale];

	return (
		<div className="bg-white border-t border-stone-200">
			<div className="container mx-auto px-4 py-10 max-w-5xl">
				<h2 className="font-heading2 text-lg md:text-xl font-extrabold text-gray-900 mb-4 uppercase tracking-tight">{t.about}</h2>

				<div className="space-y-4 text-sm text-gray-500 leading-relaxed">
					{locale === "ar" ? (
						<>
							<p>نوتري بوكس هي الوجهة الإلكترونية الموثوقة في قطر للتغذية الرياضية الأصلية، والمكملات الصحية، والفيتامينات، والأطعمة الصحية، ومنتجات العافية، وإكسسوارات اللياقة البدنية. نقدم منتجات مميزة من أشهر العلامات التجارية العالمية مع تسوق إلكتروني آمن، وأسعار تنافسية، وتوصيل سريع في جميع أنحاء قطر.</p>
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
							<p>NutriBox is Qatar's trusted online destination for authentic sports nutrition, health supplements, vitamins, healthy foods, wellness products, and fitness accessories. We offer premium products from leading international brands with secure online shopping, competitive prices, and fast delivery across Qatar.</p>
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

				<div className="mt-10">
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">{t.popularSearches}</h3>
					<p className="text-sm leading-relaxed">
						{categories.map((cat, i) => {
							const collectionUrl = findCollectionUrl(TOP_CATEGORIES_MATCH_TERMS[i], collectionEntries);
							const href = collectionUrl ?? localizePath(`/search?q=${encodeURIComponent(cat)}`, locale);
							return (
								<span key={cat}>
									<Link to={href} className="text-primary hover:underline">
										{cat}
									</Link>
									{i < categories.length - 1 && <span className="text-gray-300 mx-2">|</span>}
								</span>
							);
						})}
					</p>
				</div>

				<div className="mt-8">
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">{t.topBrands}</h3>
					<p className="text-sm leading-relaxed">
						{TOP_BRANDS.map((brand, i) => (
							<span key={brand.code}>
								<Link to={`/brands/${brand.code}`} className="text-primary hover:underline">
									{brand.name}
								</Link>
								{i < TOP_BRANDS.length - 1 && <span className="text-gray-300 mx-2">|</span>}
							</span>
						))}
					</p>
				</div>

				<div className="mt-10 pt-6 border-t border-stone-100 text-sm text-gray-500 leading-relaxed">
					{locale === "ar" ? (
						<>
							<p>
								نحن نعلم أن الراحة لا تقل أهمية عن الجودة. يقدم نوتري بوكس توصيلًا سريعًا في جميع أنحاء قطر — مع خيارات توصيل سريع تصل إلى ساعتين، وتوصيل مجاني للطلبات فوق 99 ريال قطري. يتم توفير كل منتج في{" "}
								<Link to="/collections" className="text-primary font-medium hover:underline">
									متجرنا الإلكتروني
								</Link>{" "}
								من خلال قنوات موثوقة، حتى تتمكن من التسوق بثقة.
							</p>
							<p className="mt-3">
								جديد على نوتري بوكس؟{" "}
								<Link to="/about" className="text-primary font-medium hover:underline">
									تعرّف أكثر على من نحن
								</Link>{" "}
								أو انتقل مباشرة إلى{" "}
								<Link to="/collections" className="text-primary font-medium hover:underline">
									متجرنا
								</Link>{" "}
								لاستكشاف الأكثر مبيعًا، والوصولات الجديدة، والباقات الحصرية.
							</p>
						</>
					) : (
						<>
							<p>
								We know that convenience matters as much as quality. NutriBox offers fast delivery across Qatar — with express options in as little as two hours, and free delivery on orders over QAR 99. Every product on our{" "}
								<Link to="/collections" className="text-primary font-medium hover:underline">
									online store
								</Link>{" "}
								is sourced through verified channels, so you can shop with confidence.
							</p>
							<p className="mt-3">
								New to NutriBox?{" "}
								<Link to="/about" className="text-primary font-medium hover:underline">
									Learn more about who we are
								</Link>{" "}
								or head straight to our{" "}
								<Link to="/collections" className="text-primary font-medium hover:underline">
									shop
								</Link>{" "}
								to explore best-sellers, new arrivals, and exclusive bundles.
							</p>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
