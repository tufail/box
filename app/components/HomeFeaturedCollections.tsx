import { Link } from "react-router";

interface FeaturedItem {
  label: string;
  href: string;
}

export default function HomeFeaturedCollections({ items }: { items: FeaturedItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="py-6 container mx-auto px-4">
      <h2 className="text-center text-lg font-semibold mb-4">Shop by Category</h2>
      <div className="flex flex-wrap justify-center items-center gap-6">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="border border-gray-200 w-[100px] h-[100px] rounded-full overflow-hidden shadow-sm group-hover:shadow-md transition-shadow duration-300 bg-gray-100 flex items-center justify-center text-gray-500 text-2xl font-bold">
              {item.label[0]}
            </div>
            <span className="text-xs text-center text-gray-700 group-hover:text-primary transition-colors max-w-[100px] truncate">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
