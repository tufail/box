import HomeCarousel from "~/components/HomeCarousel";
import HomeBanner from "~/components/HomeBanner";
import HomeFeaturedCollections from "~/components/HomeFeaturedCollections";
import HomeTopSelling from "~/components/HomeTopSelling";
import HomeTrendingBanners from "~/components/HomeTrendingBanners";
import type { SearchProductItem } from "~/graphql/product";
import type { BannerItem } from "~/graphql/banner";
import type { HomeCollectionItem } from "~/graphql/collection";
import { ChevronRight } from "lucide-react";

function StackBanner() {
	return (
		<div className="flex-1 rounded-xl overflow-hidden bg-gradient-to-r from-pink-100 to-cyan-100 flex items-center px-4 gap-3 min-h-0 cursor-pointer group">
			<div className="flex-shrink-0 w-14 flex items-center justify-center">
				<img
					src="/images/stack.png"
					alt="Personalized Stack"
					className="w-full h-full object-contain animate-float"
				/>
			</div>
			<div className="flex-1 min-w-0 flex items-center">
				<p className="text-primary font-extrabold text-base leading-snug">Build your own personalized stack now!</p>
			</div>
			<div className="flex-shrink-0 flex items-center">
				<div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 shadow-md flex items-center justify-center group-hover:brightness-110 transition-all relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
					<ChevronRight size={16} className="text-white relative z-10 drop-shadow" />
				</div>
			</div>
		</div>
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
	const slides = carouselItems.map((item) => ({
		id: item.id,
		image: item.assetPreview,
		mobileImage: item.mobileAssetPreview,
		label: item.title,
		href: item.url || undefined,
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
					<div className="hidden md:flex flex-row lg:flex-col lg:w-[30%] w-full gap-2 mt-2 lg:mt-0 lg:pl-2 self-stretch">
						{/* NutriQuick delivery banner */}
						<div className="flex-1 rounded-xl overflow-hidden bg-gradient-to-r from-violet-100 via-purple-50 to-amber-100 flex items-center px-4 gap-3 min-h-0 cursor-pointer group">
							<div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
								<img src="/images/clock-3d.png" alt="Fast Delivery" className="w-full h-full object-contain animate-vibrate" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-1 mb-0.5">
									<span className="text-cart font-extrabold text-xl tracking-widest italic">NutriQuick</span>
								</div>
								<p className="text-gray-600 text-xs leading-tight italic">Fast Delivery from</p>
								<p className="text-primary font-extrabold text-sm leading-tight italic">2 Hours to Next Day!!</p>
							</div>
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 shadow-md flex items-center justify-center group-hover:brightness-110 transition-all relative overflow-hidden">
								<div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
								<ChevronRight size={16} className="text-white relative z-10 drop-shadow" />
							</div>
						</div>

						{/* Personalized stack banner */}
						<StackBanner />
					</div>
				</div>
			</div>
			<HomeFeaturedCollections topLevelCollections={topLevelCollections} subCollections={subCollections} vendureBase={vendureBase} />
			<HomeTopSelling products={products} vendureBase={vendureBase} viewAllHref="/collections" />
			<HomeBanner slug="top-selling-banner" />
			<HomeTrendingBanners vendureBase={vendureBase} />
			<HomeBanner slug="latest-items-banner" />
			<HomeTopSelling products={newProducts} vendureBase={vendureBase} title="New Arrivals" viewAllHref="/collections?sort=default" />
		</div>
	);
}
