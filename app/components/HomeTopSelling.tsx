import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SearchProductItem } from "~/graphql/product";
import ProductCard from "./ProductCard";

interface Props {
  products: SearchProductItem[];
  vendureBase: string;
  title?: string;
}

export default function HomeTopSelling({ products, vendureBase, title = "Top Selling Products" }: Props) {
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
      <div className="mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      <div className="relative">
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Previous products"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded bg-gray-900 text-white shadow-md flex items-center justify-center hover:bg-gray-700 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -mx-2">
            {products.map((product, index) => (
              <div key={product.productId} className="flex-none w-1/2 md:w-1/4 px-2">
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
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded bg-gray-900 text-white shadow-md flex items-center justify-center hover:bg-gray-700 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
