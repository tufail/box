// The brands featured on the homepage (the "Top Brands" carousel and the footer brand links),
// hand-picked and hard-coded in display order -- deliberately not loaded from the database.
// Brand names are proper nouns and stay unlocalized in both languages. `code` is the brand facet
// value code, i.e. the /brands/<code> page and the /images/brands/<code>.jpg logo. A brand with a
// `banner` shows that full-card image in the carousel instead of its logo; `bannerAlt` is that image's descriptive alt text (SEO).
export const FEATURED_BRANDS: readonly { name: string; code: string; banner?: string; bannerAlt?: string }[] = [
	{ name: "Optimum Nutrition", code: "optimum-nutrition", banner: "/images/brands/optimum-nutrition-banner.jpg", bannerAlt: "Optimum Nutrition Gold Standard 100% Whey and Clear Protein powders - buy at NutriBox Qatar" },
	{ name: "Applied Nutrition", code: "applied-nutrition", banner: "/images/brands/applied-nutrition-banner.jpg", bannerAlt: "Applied Nutrition Diet Protein and Critical Whey protein powders - buy at NutriBox Qatar" },
	{ name: "Dymatize", code: "dymatize", banner: "/images/brands/dymatize-banner.jpg", bannerAlt: "Dymatize ISO100 whey isolate, Mass Gainer, Elite 100% Whey and Creatine Monohydrate - buy at NutriBox Qatar" },
	{ name: "Rule 1", code: "rule-one-proteins", banner: "/images/brands/rule-one-proteins-banner.jpg", bannerAlt: "Rule 1 R1 Protein whey isolate powders in 1 lb, 2 lb and 5 lb sizes - buy at NutriBox Qatar" },
	{ name: "Ghost", code: "ghost", banner: "/images/brands/ghost-banner.jpg", bannerAlt: "Ghost Whey Protein and Ghost Greens superfood powder - buy at NutriBox Qatar" },
	{ name: "MuscleTech", code: "muscletech", banner: "/images/brands/muscletech-banner.jpg", bannerAlt: "MuscleTech Nitro-Tech whey protein, Platinum Glutamine and Test HD Elite - buy at NutriBox Qatar" },
	{ name: "EVLution Nutrition", code: "evlution-nutrition", banner: "/images/brands/evlution-nutrition-banner.jpg", bannerAlt: "EVLution Nutrition (EVL) Isolate Protein, Stacked Plant Protein, Omega-3 Fish Oil and ENGN Shred pre-workout - buy at NutriBox Qatar" },
	{ name: "Basix", code: "basix", banner: "/images/brands/basix-banner.jpg", bannerAlt: "Basix Total Gainer, Whey Protein and Complete BCAA supplements - buy at NutriBox Qatar" },
	{ name: "NOW Foods", code: "now-foods", banner: "/images/brands/now-foods-banner.jpg", bannerAlt: "NOW Foods vitamins and supplements: C-1000 Zinc Immune, Zinc Picolinate, Immune Renew and Vitamin D-3 - buy at NutriBox Qatar" },
];
