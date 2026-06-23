import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeCollectionItem } from "~/graphql/collection";
import VendureImage from "./VendureImage";

interface Props {
	topLevelCollections: HomeCollectionItem[];
	subCollections: HomeCollectionItem[];
	vendureBase: string;
}

export default function HomeFeaturedCollections({ topLevelCollections, subCollections, vendureBase }: Props) {
	const allCollections = [...topLevelCollections, ...subCollections];
	if (allCollections.length === 0) return null;

	return <CollectionScroll collections={allCollections} vendureBase={vendureBase} />;
}

function CollectionScroll({ collections, vendureBase }: { collections: HomeCollectionItem[]; vendureBase: string }) {
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
		<section className="pt-8 pb-5 container mx-auto px-4">
			<div className="relative">
				<button
					onClick={() => emblaApi?.scrollPrev()}
					disabled={!canPrev}
					aria-label="Previous collections"
					className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none"
				>
					<ChevronLeft size={14} />
				</button>

				<div className="overflow-hidden" ref={emblaRef}>
					<div className="flex -mx-2">
						{collections.map((col) => (
							<div key={col.id} className="flex-none w-[120px] md:w-[140px] px-2">
								<Link
									to={`/collections/${col.slug}`}
									className="group block overflow-hidden rounded-xl bg-white"
								>
									<div className="aspect-square overflow-hidden bg-gradient-to-b from-amber-100 to-white">
										{col.featuredAsset ? (
											<VendureImage
												src={col.featuredAsset.preview}
												vendureBase={vendureBase}
												alt={col.name}
												width={400}
												height={400}
												objectFit="contain"
												imgClassName="mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
												<span className="text-4xl font-bold text-amber-200">{col.name[0]}</span>
											</div>
										)}
									</div>
									<div className="py-1 text-center px-1 bg-white -mt-5 relative z-10">
										<span className="text-xs font-semibold text-gray-900 group-hover:text-primary transition-colors duration-200 leading-tight">
											{col.name}
										</span>
									</div>
								</Link>
							</div>
						))}
					</div>
				</div>

				<button
					onClick={() => emblaApi?.scrollNext()}
					disabled={!canNext}
					aria-label="Next collections"
					className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-7 h-7 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none"
				>
					<ChevronRight size={14} />
				</button>
			</div>
		</section>
	);
}
