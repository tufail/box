import HomeCarousel from "~/components/HomeCarousel";
import HomeBanner from "~/components/HomeBanner";
import HomeFeaturedCollections from "~/components/HomeFeaturedCollections";
import HomeTopSelling from "~/components/HomeTopSelling";
import HomeTrendingBanners from "~/components/HomeTrendingBanners";
import HomeShopByConcern from "~/components/HomeShopByConcern";
import type { SearchProductItem } from "~/graphql/product";
import type { BannerItem } from "~/graphql/banner";
import type { HomeCollectionItem } from "~/graphql/collection";
import { ChevronRight } from "lucide-react";
import { useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import { getLocaleFromPathname, type Locale } from "~/lib/i18n";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const WELCOME_COPY = {
	en: {
		personalizedStackAlt: "Personalized Stack",
		buildYourStack: "Build your own personalized stack now!",
		fastDeliveryAlt: "Fast Delivery",
		fastDeliveryFrom: "Fast Delivery from",
		twoHoursToSameDay: "2 Hours to Same Day!!",
		newArrivals: "New Arrivals",
	},
	ar: {
		personalizedStackAlt: "باقة مخصصة",
		buildYourStack: "أنشئ باقتك المخصصة الآن!",
		fastDeliveryAlt: "توصيل سريع",
		fastDeliveryFrom: "توصيل سريع خلال",
		twoHoursToSameDay: "من ساعتين إلى نفس اليوم!!",
		newArrivals: "وصل حديثًا",
	},
} as const;

function StackBanner({ locale }: { locale: Locale }) {
	const t = WELCOME_COPY[locale];
	return (
		<Link to="/collections" aria-label={locale === "ar" ? "استكشف المنتجات والمجموعات" : "Explore products and collections"} className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-r from-pink-100 to-cyan-100 flex items-center px-4 gap-3 min-h-0 cursor-pointer group shadow-md shadow-black/10">
			<div className="flex-shrink-0 w-14 flex items-center justify-center">
				<img src="/images/stack.png" alt={t.personalizedStackAlt} className="w-full h-full object-contain animate-float" />
			</div>
			<div className="flex-1 min-w-0 flex items-center">
				<p className="text-primary font-extrabold text-base leading-snug">{t.buildYourStack}</p>
			</div>
			<div className="flex-shrink-0 flex items-center">
				<div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 shadow-md flex items-center justify-center group-hover:brightness-110 transition-all relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
					<ChevronRight size={16} className="text-white relative z-10 drop-shadow rtl:rotate-180" />
				</div>
			</div>
		</Link>
	);
}

interface WelcomeProps {
	products: SearchProductItem[];
	newProducts: SearchProductItem[];
	vendureBase: string;
	carouselItems: BannerItem[];
	topLevelCollections: HomeCollectionItem[];
	subCollections: HomeCollectionItem[];
}

export function Welcome({ products, newProducts, vendureBase, carouselItems, topLevelCollections, subCollections }: WelcomeProps) {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = WELCOME_COPY[locale];
	const slides = carouselItems.map((item) => ({
		id: item.id,
		image: item.assetPreview,
		mobileImage: item.mobileAssetPreview,
		label: item.title,
		description: item.description,
		href: item.url || undefined,
		hideTitle: item.hideTitle,
		titlePosition: item.titlePosition,
	}));

	return (
		<div>
			{/* Hero: carousel + side banners */}
			<div className="container mx-auto px-4 mt-2 md:mt-4">
				<div className="flex flex-col lg:flex-row items-stretch">
					{/* Carousel — full width on mobile/tablet, 70% on desktop */}
					<div className="w-full lg:w-[70%] flex-shrink-0">
						<HomeCarousel items={slides.length > 0 ? slides : undefined} vendureBase={vendureBase} />
					</div>

					{/* Side banners — row below on tablet, column beside on desktop */}
					<div className="hidden md:flex flex-row lg:flex-col lg:w-[30%] w-full gap-4 mt-2 lg:mt-0 lg:ps-6 self-stretch">
						{/* NutriQuick delivery banner */}
						<Link to="/collections" aria-label={locale === "ar" ? "استكشف المنتجات السريعة والتوصيل" : "Explore fast delivery products"} className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-r from-violet-100 via-purple-100 to-amber-100 flex items-center px-4 gap-3 min-h-0 cursor-pointer group shadow-md shadow-black/10">
							<div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
								<img src="/images/clock-3d.png" alt={t.fastDeliveryAlt} className="w-full h-full object-contain animate-vibrate" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-1 mb-0.5">
									<span className="font-heading text-cart font-black text-xl tracking-widest italic">NutriQuick</span>
								</div>
								<p className="text-gray-600 text-xs leading-tight italic">{t.fastDeliveryFrom}</p>
								<p className="text-primary font-extrabold text-sm leading-tight italic">{t.twoHoursToSameDay}</p>
							</div>
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 shadow-md flex items-center justify-center group-hover:brightness-110 transition-all relative overflow-hidden">
								<div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
								<ChevronRight size={16} className="text-white relative z-10 drop-shadow rtl:rotate-180" />
							</div>
						</Link>

						{/* Personalized stack banner */}
						<StackBanner locale={locale} />
					</div>
				</div>
			</div>
			<HomeFeaturedCollections topLevelCollections={topLevelCollections} subCollections={subCollections} vendureBase={vendureBase} />
			<HomeTopSelling products={products} vendureBase={vendureBase} viewAllHref="/collections" />
			<HomeShopByConcern vendureBase={vendureBase} />
			<HomeTrendingBanners vendureBase={vendureBase} />
			<HomeBanner slug="latest-items-banner" />
			<HomeTopSelling products={newProducts} vendureBase={vendureBase} title={t.newArrivals} viewAllHref="/collections?sort=default" />
		</div>
	);
}
