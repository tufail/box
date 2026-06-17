import { Link } from "react-router";
import type { HomeCollectionItem } from "~/graphql/collection";

interface Props {
	topLevelCollections: HomeCollectionItem[];
	subCollections: HomeCollectionItem[];
	vendureBase: string;
}

function resolveImageUrl(preview: string, vendureBase: string): string {
	return preview.startsWith("http") ? preview : `${vendureBase}${preview}`;
}

export default function HomeFeaturedCollections({ topLevelCollections, subCollections, vendureBase }: Props) {
	if (topLevelCollections.length === 0) return null;

	return (
		<section className="py-8 container mx-auto px-4">
			<h2 className="text-xl font-bold mb-6">Shop By Category</h2>

			<div className="flex flex-wrap justify-center gap-4 mb-6">
				{topLevelCollections.map((col) => {
					const imgUrl = col.featuredAsset
						? resolveImageUrl(col.featuredAsset.preview, vendureBase)
						: null;
					return (
						<Link
							key={col.id}
							to={`/collections/${col.slug}`}
							className="group block w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)] border border-gray-200 overflow-hidden bg-white"
						>
							{imgUrl ? (
								<img
									src={imgUrl}
									alt={col.name}
									className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
								/>
							) : (
								<div className="h-32 flex items-center justify-center">
									<span className="text-4xl font-bold text-gray-300">{col.name[0]}</span>
								</div>
							)}
							<div className="py-3 flex justify-center px-3">
								<span className="w-full text-center text-base font-bold text-primary border-2 border-primary rounded-full py-1.5 px-4 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
									{col.name}
								</span>
							</div>
						</Link>
					);
				})}
			</div>

			{subCollections.length > 0 && (
				<div className="flex justify-center flex-wrap gap-3 pb-2">
					{subCollections.map((col) => (
						<Link
							key={col.id}
							to={`/collections/${col.slug}`}
							className="text-base font-bold text-primary border-2 border-primary rounded-full py-1.5 px-5 whitespace-nowrap hover:bg-primary hover:text-white transition-colors duration-200"
						>
							{col.name}
						</Link>
					))}
				</div>
			)}
		</section>
	);
}