import Link from "~/components/LocaleLink";
import { Clock } from "lucide-react";
import VendureImage from "./VendureImage";
import type { BlogPostListItem } from "~/graphql/blog";
import type { Locale } from "~/lib/i18n";

const COPY = {
	en: { minRead: (n: number) => `${n} min read` },
	ar: { minRead: (n: number) => `قراءة ${n} دقائق` },
} as const;

function formatDate(iso: string | null, locale: Locale): string {
	if (!iso) return "";
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-QA", { month: "short", day: "numeric", year: "numeric" });
}

// Shown in place of a featured image for posts that don't have one yet — a
// tinted panel keyed off the category slug so the grid still reads as
// organized rather than a wall of identical grey boxes.
const CATEGORY_TINTS: Record<string, string> = {
	"nutrition-science": "from-primary/25 to-primary/5",
	training: "from-amber-500/25 to-amber-500/5",
	recipes: "from-lime-600/20 to-lime-600/5",
	"product-guides": "from-slate-500/20 to-slate-500/5",
};

function PlaceholderMedia({ categorySlug }: { categorySlug?: string }) {
	const tint = (categorySlug && CATEGORY_TINTS[categorySlug]) || "from-primary/20 to-primary/5";
	return (
		<div className={`w-full h-full bg-gradient-to-br ${tint} flex items-center justify-center`}>
			<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-primary/40">
				<path d="M4 5h16M4 12h10M4 19h16" strokeLinecap="round" />
			</svg>
		</div>
	);
}

interface BlogPostCardProps {
	post: BlogPostListItem;
	vendureBase: string;
	locale: Locale;
	eager?: boolean;
}

export default function BlogPostCard({ post, vendureBase, locale, eager = false }: BlogPostCardProps) {
	const t = COPY[locale];
	return (
		<Link to={`/blog/${post.slug}`} className="group flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
			<div className="relative aspect-[16/10]">
				{post.category && (
					<span className="absolute top-3 start-3 z-10 bg-primary text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
						{post.category.name}
					</span>
				)}
				{post.assetPreview ? (
					<VendureImage src={post.assetPreview} vendureBase={vendureBase} alt={post.title} width={400} height={250} eager={eager} imgClassName="group-hover:scale-105 transition-transform duration-300" />
				) : (
					<PlaceholderMedia categorySlug={post.category?.slug} />
				)}
			</div>
			<div className="flex flex-col gap-2 p-4 flex-1">
				<h3 className="font-heading font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
				<p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{post.excerpt}</p>
				<div className="mt-auto pt-2 flex items-center gap-2 text-xs text-gray-400">
					{post.authorName && (
						<>
							<span className="text-gray-600 font-medium truncate max-w-[140px]">{post.authorName}</span>
							<span className="w-0.5 h-0.5 rounded-full bg-current flex-shrink-0" />
						</>
					)}
					<span className="inline-flex items-center gap-1 flex-shrink-0">
						<Clock size={12} />
						{t.minRead(post.readingTimeMinutes)}
					</span>
					<span className="w-0.5 h-0.5 rounded-full bg-current flex-shrink-0" />
					<span className="flex-shrink-0">{formatDate(post.publishedAt, locale)}</span>
				</div>
			</div>
		</Link>
	);
}
