import { useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import { ArrowUpRight } from "lucide-react";
import { getLocaleFromPathname } from "~/lib/i18n";
import { FAQS } from "~/lib/faqData";
import GoogleReviewsWidget from "~/components/GoogleReviewsWidget";
import BrandLogo from "~/components/BrandLogo";
import { FEATURED_BRANDS } from "~/lib/featuredBrands";

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
		topBrands: "Top Brands on NutriBox",
		faqs: "Frequently Asked Questions",
	},
	ar: {
		about: "حول NutriBox",
		topBrands: "أفضل العلامات التجارية على NutriBox",
		faqs: "الأسئلة الشائعة",
	},
} as const;


export default function SeoFooterContent() {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];


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

				<nav className="mt-10" aria-label={t.topBrands}>
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">{t.topBrands}</h3>
					<ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
						{FEATURED_BRANDS.map((brand) => (
							<li key={brand.code}>
								<Link to={`/brands/${brand.code}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
									<BrandLogo code={brand.code} name={brand.name} className="w-6 h-6 flex-shrink-0 border border-gray-200" rounded="rounded-md" padding="p-0.5" />
									<span>{brand.name}</span>
								</Link>
							</li>
						))}
					</ul>
				</nav>

				</div>

				{/* Right ~40% — FAQs */}
				<div id="faq">
					<h2 className="font-heading2 text-lg md:text-xl font-extrabold text-gray-900 mb-4 uppercase tracking-tight">{t.faqs}</h2>
					<div className="space-y-1">
						{faqs.map((item, i) => (
							<details key={i} className="group bg-white open:bg-gray-50 rounded-lg border border-gray-200 px-3 py-1.5 transition-colors">
								<summary className="flex items-center justify-between gap-4 cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
									<span className="text-sm font-semibold text-gray-900">{item.q}</span>
									<span className="flex-shrink-0 w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center transition-colors group-open:bg-gray-900 group-open:border-gray-900">
										<ArrowUpRight size={14} strokeWidth={2} className="text-gray-500 rotate-180 rtl:scale-x-[-1] transition-transform duration-200 group-open:rotate-0 group-open:text-white" />
									</span>
								</summary>
								<p className="text-sm text-gray-500 leading-relaxed mt-1.5 pe-8">{item.a}</p>
							</details>
						))}
					</div>
				</div>
				</div>
			</div>
		</div>
	);
}
