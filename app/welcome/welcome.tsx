import HomeCarousel from "~/components/HomeCarousel";
import HomeBanner from "~/components/HomeBanner";
import HomeFeaturedCollections from "~/components/HomeFeaturedCollections";
import HomeTopSelling from "~/components/HomeTopSelling";
import HomeTrendingBanners from "~/components/HomeTrendingBanners";
import type { SearchProductItem } from "~/graphql/product";
import type { BannerItem } from "~/graphql/banner";
import type { HomeCollectionItem } from "~/graphql/collection";

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
			<HomeCarousel items={slides.length > 0 ? slides : undefined} vendureBase={vendureBase} />
			<HomeTopSelling products={products} vendureBase={vendureBase} />
			<HomeBanner slug="top-selling-banner" />
			<HomeTrendingBanners vendureBase={vendureBase} />
			<HomeFeaturedCollections topLevelCollections={topLevelCollections} subCollections={subCollections} vendureBase={vendureBase} />
			<HomeBanner slug="latest-items-banner" />
			<HomeTopSelling products={newProducts} vendureBase={vendureBase} title="New Arrivals" />
		</div>
	);
}
