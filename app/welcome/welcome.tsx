import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/root";
import HomeCarousel from "~/components/HomeCarousel";
import HomeFeaturedCollections from "~/components/HomeFeaturedCollections";
import HomeTopSelling from "~/components/HomeTopSelling";
import type { SearchProductItem } from "~/graphql/product";

interface WelcomeProps {
  products: SearchProductItem[];
  vendureBase: string;
}

export function Welcome({ products, vendureBase }: WelcomeProps) {
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const featuredItems = (rootData?.megaMenu?.items ?? []).map((item) => ({
    label: item.label,
    href: item.collectionSlug ? `/collections/${item.collectionSlug}` : (item.url ?? "#"),
  }));

  return (
    <div>
      <HomeCarousel />
      <HomeFeaturedCollections items={featuredItems} />
      <HomeTopSelling products={products} vendureBase={vendureBase} />
    </div>
  );
}
