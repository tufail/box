import type { Route } from "./+types/blog";
import { useSearchParams } from "react-router";
import Link from "~/components/LocaleLink";
import Breadcrumb from "~/components/Breadcrumb";
import BlogPostCard from "~/components/BlogPostCard";
import VendureImage from "~/components/VendureImage";
import { Clock, LayoutGrid, ArrowRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import {
	GET_BLOG_POSTS, GET_SHOP_BLOG_CATEGORIES,
	type BlogPostsData, type ShopBlogCategoriesData, type BlogPostListItem,
} from "~/graphql/blog";
import { SITE_URL, SITE_NAME } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, stripLocalePrefix, hreflangTags, type Locale } from "~/lib/i18n";

const PAGE_SIZE = 9;

function CategoryIcon({ name, size = 20 }: { name: string | null; size?: number }) {
	if (!name) return null;
	const Cmp = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
	if (!Cmp) return null;
	return <Cmp size={size} strokeWidth={1.8} />;
}

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "Nutrition & Training Blog - NutriBox Qatar",
		description: "Evidence-based nutrition science, training guides, and recipes for Qatar's climate and calendar — written by NutriBox's sports nutritionists.",
		breadcrumbHome: "Home",
		breadcrumbBlog: "Blog",
		h1: "The NutriBox Blog",
		subtitle: "Nutrition science and training guides, not supplement hype.",
		allCategories: "All",
		featuredLabel: "Featured Article",
		readArticle: "Read Article",
		minRead: (n: number) => `${n} min read`,
		prev: "Previous",
		next: "Next",
		pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
		empty: "No articles in this category yet.",
	},
	ar: {
		title: "مدونة التغذية والتمرين - NutriBox قطر",
		description: "علم تغذية قائم على الأدلة، وأدلة تدريب، ووصفات تناسب مناخ قطر وتقويمها — بقلم أخصائيي التغذية الرياضية في NutriBox.",
		breadcrumbHome: "الرئيسية",
		breadcrumbBlog: "المدونة",
		h1: "مدونة NutriBox",
		subtitle: "علم تغذية وتمرين قائم على الأدلة، لا ضجيج مكملات.",
		allCategories: "الكل",
		featuredLabel: "مقال مميز",
		readArticle: "قراءة المقال",
		minRead: (n: number) => `قراءة ${n} دقائق`,
		prev: "السابق",
		next: "التالي",
		pageOf: (page: number, total: number) => `صفحة ${page} من ${total}`,
		empty: "لا توجد مقالات في هذا التصنيف بعد.",
	},
} as const;

export function meta({ loaderData }: Route.MetaArgs) {
	const locale = loaderData?.locale ?? "en";
	const { title, description } = COPY[locale];
	const canonicalUrl = loaderData?.canonicalUrl ?? `${SITE_URL}/blog`;
	const canonicalPath = stripLocalePrefix(new URL(canonicalUrl).pathname);
	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...hreflangTags(SITE_URL, canonicalPath),
		{ property: "og:type", content: "website" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:site_name", content: SITE_NAME },
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const locale = getLocaleFromPathname(url.pathname);
	const category = url.searchParams.get("category") ?? "";
	const tag = url.searchParams.get("tag") ?? "";
	const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
	const canonicalUrl = `${url.origin}${localizePath("/blog", locale)}`;

	const env = context.cloudflare.env;
	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	const [postsResult, featuredResult, categoriesResult] = await Promise.allSettled([
		graphqlRequest<BlogPostsData>(
			env,
			GET_BLOG_POSTS,
			{ options: { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, categorySlug: category || undefined, tagSlug: tag || undefined }, languageCode: locale },
			{ request },
		),
		// Only fetched on the unfiltered, first page — the hero doesn't make sense
		// once a reader has picked a category/tag or paged deeper into the list.
		page === 1 && !category && !tag
			? graphqlRequest<BlogPostsData>(env, GET_BLOG_POSTS, { options: { limit: 1, featured: true }, languageCode: locale }, { request })
			: Promise.resolve(null),
		graphqlRequest<ShopBlogCategoriesData>(env, GET_SHOP_BLOG_CATEGORIES, undefined, { request, cf: { cacheTtl: 300, cacheEverything: true } }),
	]);

	const allItems = postsResult.status === "fulfilled" ? postsResult.value.data.blogPosts.items : [];
	const totalItems = postsResult.status === "fulfilled" ? postsResult.value.data.blogPosts.totalItems : 0;
	const featured: BlogPostListItem | null =
		featuredResult.status === "fulfilled" && featuredResult.value ? (featuredResult.value.data.blogPosts.items[0] ?? null) : null;

	return {
		items: featured ? allItems.filter((p) => p.id !== featured.id) : allItems,
		totalItems,
		featured,
		categories: categoriesResult.status === "fulfilled" ? categoriesResult.value.data.shopBlogCategories : [],
		category,
		tag,
		page,
		vendureBase,
		canonicalUrl,
		locale,
	};
}

export default function BlogIndex({ loaderData }: Route.ComponentProps) {
	const { items, totalItems, featured, categories, category, page, vendureBase, canonicalUrl, locale } = loaderData;
	const [searchParams, setSearchParams] = useSearchParams();
	const t = COPY[locale as Locale];
	const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

	function updateParam(key: string, value: string | null) {
		const next = new URLSearchParams(searchParams);
		if (!value) next.delete(key); else next.set(key, value);
		if (key !== "page") next.delete("page");
		setSearchParams(next, { preventScrollReset: false });
	}

	function selectCategory(slug: string | null) {
		const next = new URLSearchParams(searchParams);
		if (!slug) next.delete("category"); else next.set("category", slug);
		// A category chip replaces any tag filter reached via a post's tag link —
		// the two are alternate ways into the list, not combined AND filters.
		next.delete("tag");
		next.delete("page");
		setSearchParams(next, { preventScrollReset: false });
	}

	const siteOrigin = canonicalUrl ? new URL(canonicalUrl).origin : SITE_URL;
	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeHomeUrl(siteOrigin, locale as Locale) },
			{ "@type": "ListItem", position: 2, name: t.breadcrumbBlog, item: canonicalUrl },
		],
	};

	return (
		<div className="container mx-auto px-4 py-6">
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

			<div className="mb-4">
				<Breadcrumb items={[{ label: t.breadcrumbHome, href: "/" }, { label: t.breadcrumbBlog }]} />
			</div>

			<div className="mb-8">
				<h1 className="font-heading text-2xl md:text-3xl font-extrabold text-gray-900">{t.h1}</h1>
				<p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
			</div>

			{featured && (
				<Link
					to={`/blog/${featured.slug}`}
					className="group grid md:grid-cols-2 items-stretch mb-10 rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
				>
					{/* Content — left on desktop, below the image on mobile */}
					<div className="order-2 md:order-1 flex flex-col justify-center p-6 sm:p-8 md:p-12">
						<span className="text-primary text-xs font-bold uppercase tracking-wider mb-3">{t.featuredLabel}</span>
						{featured.category && (
							<span className="self-start inline-block bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-4">
								{featured.category.name}
							</span>
						)}
						<h2 className="font-heading2 text-gray-900 text-2xl md:text-3xl lg:text-4xl leading-tight font-bold text-balance">{featured.title}</h2>
						<p className="text-gray-500 text-sm md:text-base mt-4 line-clamp-3">{featured.excerpt}</p>
						<div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm mt-5">
							{featured.authorName && <span className="font-medium text-gray-700">{featured.authorName}</span>}
							<span className="w-1 h-1 rounded-full bg-current" />
							<span className="inline-flex items-center gap-1">
								<Clock size={13} />
								{t.minRead(featured.readingTimeMinutes)}
							</span>
						</div>
						<span className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm mt-6 group-hover:gap-2.5 transition-all">
							{t.readArticle}
							<ArrowRight size={16} className="rtl:rotate-180" />
						</span>
					</div>

					{/* Image — right on desktop, on top on mobile */}
					<div className="order-1 md:order-2 relative h-56 sm:h-72 md:h-auto overflow-hidden">
						{featured.assetPreview ? (
							<VendureImage src={featured.assetPreview} vendureBase={vendureBase} alt={featured.title} width={800} height={600} eager objectFit="cover" imgClassName="group-hover:scale-105 transition-transform duration-500" />
						) : (
							<div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[#16332f]" />
						)}
					</div>
				</Link>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
				<aside>
					<nav aria-label={t.allCategories} className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
						<button
							onClick={() => selectCategory(null)}
							className={`flex flex-none lg:flex-1 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-left transition-colors ${!category ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"}`}
						>
							<LayoutGrid size={20} strokeWidth={1.8} />
							{t.allCategories}
						</button>
						{categories.map((c) => (
							<button
								key={c.id}
								onClick={() => selectCategory(c.slug)}
								className={`flex flex-none lg:flex-1 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-left transition-colors ${category === c.slug ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"}`}
							>
								<CategoryIcon name={c.icon} />
								{c.name}
							</button>
						))}
					</nav>
				</aside>

				<div>
					{items.length === 0 ? (
						<div className="text-center py-24 text-gray-400">
							<p className="text-base">{t.empty}</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
							{items.map((post, i) => (
								<BlogPostCard key={post.id} post={post} vendureBase={vendureBase} locale={locale as Locale} eager={i < 3} />
							))}
						</div>
					)}

					{totalPages > 1 && (
						<div className="flex justify-center items-center gap-3 mt-10">
							<button
								disabled={page === 1}
								onClick={() => updateParam("page", String(page - 1))}
								className="px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{t.prev}
							</button>
							<span className="text-sm text-gray-600">{t.pageOf(page, totalPages)}</span>
							<button
								disabled={page === totalPages}
								onClick={() => updateParam("page", String(page + 1))}
								className="px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							>
								{t.next}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
