import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerItem } from "~/graphql/banner";
import VendureImage from "./VendureImage";

type State = "loading" | BannerItem[];

export default function HomeTrendingBanners({ title = "Trending Products", vendureBase = "" }: { title?: string; vendureBase?: string }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/banner/trending-products")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items: BannerItem[] } | null) => {
        if (!cancelled) setState(data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setState([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <Shimmer />;
  if (state.length === 0) return null;

  return <BannerScroll items={state} title={title} vendureBase={vendureBase} />;
}

function Shimmer() {
  return (
    <section className="py-8 container mx-auto px-4">
      <div className="h-6 w-48 bg-gray-200 rounded mb-5 animate-pulse" />
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-none w-1/2 md:w-1/4">
            <div className="bg-gray-200 animate-pulse aspect-square w-full rounded" />
            <div className="h-4 bg-gray-200 animate-pulse mt-2 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}

function BannerScroll({ items, title, vendureBase }: { items: BannerItem[]; title: string; vendureBase: string }) {
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

  return (
    <section className="py-8 container mx-auto px-4">
      <div className="mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      <div className="relative">
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Previous items"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded bg-gray-900 text-white shadow-md flex items-center justify-center hover:bg-gray-700 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -mx-2">
            {items.map((item) => (
              <div key={item.id} className="flex-none w-1/2 md:w-1/4 px-2">
                <a href={item.url} className="border border-gray-200 bg-white overflow-hidden flex flex-col h-full group block">
                  <div className="aspect-square overflow-hidden bg-white">
                    <VendureImage
                      src={item.assetPreview}
                      vendureBase={vendureBase}
                      alt={item.title}
                      width={300}
                      height={300}
                      objectFit="contain"
                    />
                  </div>
                  <div className="px-3 pt-2 pb-4 text-center">
                    <span className="text-md font-bold text-gray-900 underline underline-offset-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canNext}
          aria-label="Next items"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded bg-gray-900 text-white shadow-md flex items-center justify-center hover:bg-gray-700 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
