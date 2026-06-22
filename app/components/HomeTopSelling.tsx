import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, MoveRight } from "lucide-react";
import { Link } from "react-router";
import type { SearchProductItem } from "~/graphql/product";
import ProductCard from "./ProductCard";

interface Props {
  products: SearchProductItem[];
  vendureBase: string;
  title?: string;
  viewAllHref?: string;
}

export default function HomeTopSelling({ products, vendureBase, title = "Shop the Hype: Best-Sellers Edition", viewAllHref }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: "auto",
    containScroll: "trimSnaps",
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (products.length === 0) return null;

  return (
    <section className="py-8 container mx-auto px-4">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all duration-200 group"
          >
            View All
            <MoveRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Previous products"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -mx-2">
            {products.map((product, index) => (
              <div key={product.productId} className="flex-none w-1/2 md:w-1/5 px-2">
                <ProductCard
                  product={product}
                  vendureBase={vendureBase}
                  eager={index < 4}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canNext}
          aria-label="Next products"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
