import { Link } from "react-router";
import type { MegaMenuData } from "~/graphql/megamenu";

// Static SEO content block, shown below the footer sitewide — mirrors the pattern used
// by health/wellness marketplaces (a keyword-rich brand description + internal links).
// TODO: placeholder copy — refine/expand once certifications are finalized.

const TOP_CATEGORIES = ["Whey Protein Qatar", "Protein Powder Qatar", "Creatine Qatar", "Sports Supplements Qatar", "Health Supplements Qatar", "Vitamins Qatar", "Omega-3 Capsules", "Collagen Supplement", "Multivitamins", "Protein Bars", "Healthy Snacks", "Plant Protein", "BCAA", "Pre-Workout", "Mass Gainer", "Weight Loss Supplements", "Biotin Supplements", "Fish Oil", "Electrolytes", "Wellness Products"];

// Static — matches real "brand" facet values/codes on the backend (verified against
// the live shop API), curated down to well-known sports-nutrition/supplement brands.
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

// Pulls every {label, collectionSlug} pair out of the mega menu — the only place
// we already have real collection slugs sitewide without an extra query. Items only
// carry a plain `url` (no collectionSlug), so this only ever surfaces link-level entries.
function flattenMegaMenu(menu: MegaMenuData["getMegaMenu"]): { label: string; slug: string }[] {
	if (!menu) return [];
	const entries: { label: string; slug: string }[] = [];
	for (const item of menu.items) {
		for (const col of item.columns) {
			for (const section of col.sections) {
				for (const link of section.links) {
					if (link.collectionSlug) entries.push({ label: link.label, slug: link.collectionSlug });
				}
			}
		}
	}
	return entries;
}

// Best-effort match of a search term (e.g. "Whey Protein Qatar") against a mega-menu
// label (e.g. "Whey Protein") via substring containment either direction, preferring
// the longest/most specific label match.
function findCollectionSlug(term: string, entries: { label: string; slug: string }[]): string | null {
	const normTerm = normalize(term);
	const exact = entries.find((e) => normalize(e.label) === normTerm);
	if (exact) return exact.slug;

	const candidates = entries
		.filter((e) => {
			const normLabel = normalize(e.label);
			return normLabel.length > 2 && (normTerm.includes(normLabel) || normLabel.includes(normTerm));
		})
		.sort((a, b) => normalize(b.label).length - normalize(a.label).length);

	return candidates[0]?.slug ?? null;
}

interface SeoFooterContentProps {
	megaMenu: MegaMenuData["getMegaMenu"];
}

export default function SeoFooterContent({ megaMenu }: SeoFooterContentProps) {
	const collectionEntries = flattenMegaMenu(megaMenu);

	return (
		<div className="bg-white border-t border-stone-200">
			<div className="container mx-auto px-4 py-10 max-w-5xl">
				<h2 className="font-heading text-lg md:text-xl font-extrabold text-gray-900 mb-4 uppercase tracking-tight">About NutriBox</h2>

				<div className="space-y-4 text-sm text-gray-500 leading-relaxed">
					<p>NutriBox is Qatar's trusted online destination for authentic sports nutrition, health supplements, vitamins, healthy foods, wellness products, and fitness accessories. We offer premium products from leading international brands with secure online shopping, competitive prices, and fast delivery across Qatar.</p>
					<p>
						Whether you're looking for whey protein, creatine, mass gainers, pre-workout supplements, multivitamins, omega-3, collagen, protein bars, healthy snacks, or weight management supplements, NutriBox brings everything you need to support your fitness, health, and wellness goals in one place. Browse our{" "}
						<Link to="/collections" className="text-primary font-medium hover:underline">
							full range of collections
						</Link>
						.
					</p>
				</div>

				<div className="mt-10">
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Popular Searches</h3>
					<p className="text-sm leading-relaxed">
						{TOP_CATEGORIES.map((cat, i) => {
							const slug = findCollectionSlug(cat, collectionEntries);
							const href = slug ? `/c/${slug}` : `/search?q=${encodeURIComponent(cat)}`;
							return (
								<span key={cat}>
									<Link to={href} className="text-primary hover:underline">
										{cat}
									</Link>
									{i < TOP_CATEGORIES.length - 1 && <span className="text-gray-300 mx-2">|</span>}
								</span>
							);
						})}
					</p>
				</div>

				<div className="mt-8">
					<h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Top Brands on NutriBox</h3>
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
