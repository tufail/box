import HomeCarousel from "~/components/HomeCarousel";
import HomeBanner from "~/components/HomeBanner";
import HomeFeaturedCollections from "~/components/HomeFeaturedCollections";
import HomeTopSelling from "~/components/HomeTopSelling";
import HomeTrendingBanners from "~/components/HomeTrendingBanners";
import HomeShopByConcern from "~/components/HomeShopByConcern";
import HomeTrending from "~/components/HomeTrending";
import RecentlyViewed from "~/components/RecentlyViewed";
import HomeTopBrands from "~/components/HomeTopBrands";
import HomeWellnessBanner from "~/components/HomeWellnessBanner";
import HomePayLaterBanner from "~/components/HomePayLaterBanner";
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
		h1: "NutriBox Qatar: Sports Nutrition, Supplements, Beauty & Vitamins Store",
		fastDeliveryAlt: "Fast Delivery",
		quickDeliveryAcrossQatar: "Quick Delivery Across Qatar",
		fastDeliveryFrom: "Fast Delivery from",
		twoHoursToSameDay: "2 Hours to Same Day!!",
		newArrivals: "New Arrivals",
	},
	ar: {
		h1: "نوتري بوكس قطر: متجر التغذية الرياضية والمكملات ومستحضرات التجميل والفيتامينات",
		fastDeliveryAlt: "توصيل سريع",
		quickDeliveryAcrossQatar: "توصيل سريع في جميع أنحاء قطر",
		fastDeliveryFrom: "توصيل سريع خلال",
		twoHoursToSameDay: "من ساعتين إلى نفس اليوم!!",
		newArrivals: "وصل حديثًا",
	},
} as const;

interface WelcomeProps {
	products: SearchProductItem[];
	newProducts: SearchProductItem[];
	vendureBase: string;
	carouselItems: BannerItem[];
	collections: HomeCollectionItem[];
}

export function Welcome({ products, newProducts, vendureBase, carouselItems, collections }: WelcomeProps) {
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
			{/* The homepage had no H1 anywhere on it — every other page (products,
			    collections, brands, about) has one, this was just an oversight here.
			    sr-only rather than visible: the hero is a marketing carousel, not a
			    place for a literal heading, and the logo already carries the brand
			    name visually. Screen readers and search engines still get a real,
			    correctly-placed H1 identifying the page. */}
			<h1 className="sr-only">{t.h1}</h1>

			{/* Hero: carousel + side banners */}
			<div className="container mx-auto px-4 mt-2 md:mt-4">
				<div className="flex flex-col lg:flex-row items-stretch">
					{/* Carousel — full width on mobile/tablet, 70% on desktop */}
					<div className="w-full lg:w-[70%] flex-shrink-0">
						<HomeCarousel items={slides.length > 0 ? slides : undefined} vendureBase={vendureBase} />
					</div>

					{/* PayLater banner on mobile — the side-banner column below is hidden there */}
					<div className="flex md:hidden mt-3">
						<HomePayLaterBanner locale={locale} />
					</div>

					{/* Side banners — row below on tablet, column beside on desktop */}
					<div className="hidden md:flex flex-row lg:flex-col lg:w-[30%] w-full gap-4 mt-2 lg:mt-0 lg:ps-6 self-stretch">
						{/* NutriQuick delivery banner */}
						<Link to="/collections" aria-label={locale === "ar" ? "استكشف المنتجات السريعة والتوصيل" : "Explore fast delivery products"} className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-r from-[#8A1538]/10 via-[#8A1538]/5 to-white flex items-center px-4 gap-3 min-h-0 cursor-pointer group shadow-md shadow-black/10">
							<div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
								<img src="/images/clock-3d.webp" alt={t.fastDeliveryAlt} width={224} height={224} className="w-full h-full object-contain animate-vibrate" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-1 mb-0.5">
									<span className="font-heading text-[#8A1538] font-black text-2xl leading-tight italic">{t.quickDeliveryAcrossQatar}</span>
								</div>
								<p className="text-black text-xs leading-tight italic">{t.fastDeliveryFrom}</p>
								<p className="text-primary font-extrabold text-sm leading-tight italic">{t.twoHoursToSameDay}</p>
							</div>
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#8A1538] to-[#4a0b1d] shadow-md flex items-center justify-center group-hover:brightness-110 transition-all relative overflow-hidden">
								<div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
								<ChevronRight size={16} className="text-white relative z-10 drop-shadow rtl:rotate-180" />
							</div>
						</Link>

						{/* PayLater (buy now, pay later) banner */}
						<HomePayLaterBanner locale={locale} />
					</div>
				</div>
			</div>
			<HomeFeaturedCollections collections={collections} vendureBase={vendureBase} />
			<HomeTopSelling products={products} vendureBase={vendureBase} viewAllHref="/collections" />
			<HomeTrending vendureBase={vendureBase} />
			<HomeShopByConcern vendureBase={vendureBase} />
			<HomeTrendingBanners vendureBase={vendureBase} />
			<HomeBanner slug="latest-items-banner" />
			<HomeTopSelling products={newProducts} vendureBase={vendureBase} title={t.newArrivals} viewAllHref="/collections?sort=default" layout="grid" />
			<HomeWellnessBanner />
			<HomeTopBrands />
			<RecentlyViewed vendureBase={vendureBase} />
		</div>
	);
}
