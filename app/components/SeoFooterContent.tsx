import { Link } from "react-router";

// Static SEO content block, shown below the footer sitewide — mirrors the pattern used
// by health/wellness marketplaces (a keyword-rich brand description + internal links).
// TODO: placeholder copy — refine/expand once real collection slugs, brand pages and
// certifications are finalized. Category links point to /search?q=... rather than a
// collection slug since not every category below has a confirmed matching collection yet;
// swap to /c/:slug links once those exist. "Top Brands" is intentionally left as
// bracketed placeholders — do not fill in real brand names without confirming NutriBox
// actually stocks them.

const CATEGORIES = [
	{
		name: "Health Foods & Beverages",
		description: "Healthy snacks, protein drinks, health teas, and everyday wellness foods to support a balanced diet.",
	},
	{
		name: "Sports Nutrition",
		description: "Whey protein, mass gainers, BCAA, creatine, pre & post-workout supplements, and protein bars to fuel your training.",
	},
	{
		name: "Vitamins & Supplements",
		description: "Multivitamins, omega-3s, immunity boosters, and daily essentials to support your overall health.",
	},
	{
		name: "Hair, Skin & Nails",
		description: "Beauty supplements including biotin, collagen, and vitamin E to support healthy hair, skin, and nails from within.",
	},
	{
		name: "Personal Care & Beauty",
		description: "Skincare and personal care essentials chosen for quality ingredients and everyday use.",
	},
	{
		name: "Weight Management",
		description: "Weight loss and healthy weight-maintenance supplements, including detox and meal-replacement options.",
	},
	{
		name: "Women's Health",
		description: "Supplements formulated to support women's health needs at every stage.",
	},
	{
		name: "Men's Health",
		description: "Targeted supplements to support men's fitness, energy, and everyday health goals.",
	},
];

const TOP_CATEGORIES = ["Whey Protein", "Multivitamins", "Mass Gainer", "Omega 3 Capsules", "Collagen Supplement", "Pre-Workout Supplements", "Plant-Based Protein", "Biotin Supplements", "BCAA and Creatine", "Weight Loss Supplements", "Protein Bars", "Skincare"];

const PLACEHOLDER_BRAND_COUNT = 12;

export default function SeoFooterContent() {
	return (
		<div className="bg-white border-t border-stone-200">
			<div className="container mx-auto px-4 py-10 max-w-5xl">
				<h2 className="font-heading text-lg md:text-xl font-extrabold text-gray-900 mb-4 uppercase tracking-tight">Health and Wellness Made Easy at NutriBox</h2>

				<div className="space-y-4 text-sm text-gray-500 leading-relaxed">
					<p>
						Looking for a reliable online store for your health and beauty needs? Look no further. NutriBox offers a wide variety of products across several categories to cater to all your wellness goals — from sports nutrition to everyday beauty essentials. Check out our list below to find out more about what we offer:
					</p>
				</div>

				<ol className="mt-6 space-y-4 text-sm text-gray-500 leading-relaxed list-none">
					{CATEGORIES.map((cat, i) => (
						<li key={cat.name}>
							<span className="font-bold text-gray-900">
								{i + 1}. {cat.name}
							</span>{" "}
							— {cat.description}
						</li>
					))}
				</ol>

				<div className="mt-10">
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Top Categories on NutriBox</h3>
					<p className="text-sm leading-relaxed">
						{TOP_CATEGORIES.map((cat, i) => (
							<span key={cat}>
								<Link to={`/search?q=${encodeURIComponent(cat)}`} className="text-primary hover:underline">
									{cat}
								</Link>
								{i < TOP_CATEGORIES.length - 1 && <span className="text-gray-300 mx-2">|</span>}
							</span>
						))}
					</p>
				</div>

				<div className="mt-8">
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Top Brands on NutriBox</h3>
					<p className="text-sm leading-relaxed text-gray-400 italic">
						{Array.from({ length: PLACEHOLDER_BRAND_COUNT }).map((_, i) => (
							<span key={i}>
								[Brand Name]
								{i < PLACEHOLDER_BRAND_COUNT - 1 && <span className="mx-2">|</span>}
							</span>
						))}
					</p>
					<p className="text-xs text-gray-400 mt-1">— placeholder until real brand partners are confirmed —</p>
				</div>

				<div className="mt-10 pt-6 border-t border-stone-100 text-sm text-gray-500 leading-relaxed">
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
				</div>
			</div>
		</div>
	);
}
