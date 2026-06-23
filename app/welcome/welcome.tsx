import HomeCarousel from "~/components/HomeCarousel";
import HomeBanner from "~/components/HomeBanner";
import HomeFeaturedCollections from "~/components/HomeFeaturedCollections";
import HomeTopSelling from "~/components/HomeTopSelling";
import HomeTrendingBanners from "~/components/HomeTrendingBanners";
import type { SearchProductItem } from "~/graphql/product";
import type { BannerItem } from "~/graphql/banner";
import type { HomeCollectionItem } from "~/graphql/collection";
import { ChevronRight } from "lucide-react";

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
			{/* Hero: 70% carousel + 30% side banners */}
			<div className="container mx-auto px-4 mt-2 md:mt-4">
				<div className="flex flex-col md:flex-row items-stretch">
					{/* Carousel — 70% */}
					<div className="w-full md:w-[70%] flex-shrink-0">
						<HomeCarousel items={slides.length > 0 ? slides : undefined} vendureBase={vendureBase} />
					</div>

					{/* Side banners — 30% */}
					<div className="hidden md:flex md:w-[30%] flex-col self-stretch gap-2 pl-2">
						{/* NutriQuick delivery banner */}
						<div className="flex-1 rounded-xl overflow-hidden bg-gradient-to-r from-violet-100 via-purple-50 to-amber-100 flex items-center px-4 gap-3 min-h-0 cursor-pointer group">
							<div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
								<img src="/images/clock-3d.png" alt="Fast Delivery" className="w-full h-full object-contain" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-1 mb-0.5">
									<span className="text-cart font-extrabold text-xl tracking-widest italic">NutriQuick</span>
								</div>
								<p className="text-gray-600 text-xs leading-tight italic">Fast Delivery from</p>
								<p className="text-primary font-extrabold text-sm leading-tight italic">2 Hours to Next Day!!</p>
							</div>
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center group-hover:bg-primary/80 transition-colors">
								<ChevronRight size={16} className="text-white" />
							</div>
						</div>

						{/* Personalized stack banner */}
						<div className="flex-1 rounded-xl overflow-hidden bg-gradient-to-r from-pink-100 to-cyan-100 flex items-center px-4 gap-3 min-h-0 cursor-pointer group">
							<div className="flex-shrink-0 w-14 flex items-center justify-center">
								<img src="/images/stack.png" alt="Personalized Stack" className="w-full h-full object-contain" />
							</div>
							<div className="flex-1 min-w-0 flex items-center">
								<div>
									<p className="text-primary font-extrabold text-base leading-snug">Build your own personalized stack now!</p>
								</div>
							</div>
							<div className="flex-shrink-0 flex items-center">
								<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center group-hover:bg-primary/80 transition-colors">
									<ChevronRight size={16} className="text-white" />
								</div>
							</div>
						</div>
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
