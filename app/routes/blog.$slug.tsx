import { useEffect } from "react";
import { data } from "react-router";
import type { Route } from "./+types/blog.$slug";
import Link from "~/components/LocaleLink";
import Breadcrumb from "~/components/Breadcrumb";
import BlogPostCard from "~/components/BlogPostCard";
import ProductCard from "~/components/ProductCard";
import VendureImage from "~/components/VendureImage";
import { Clock, Eye } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import {
	GET_BLOG_POST_BY_SLUG, GET_RELATED_BLOG_POSTS, GET_BLOG_RELATED_PRODUCTS,
	type BlogPostBySlugData, type RelatedBlogPostsData, type BlogRelatedProductsData,
} from "~/graphql/blog";
import { relatedProductToSearchItem, type SearchProductItem } from "~/graphql/product";
import { SITE_URL, SITE_NAME } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, stripLocalePrefix, hreflangTags, type Locale } from "~/lib/i18n";

const COPY = {
	en: {
		breadcrumbHome: "Home",
		breadcrumbBlog: "Blog",
		minRead: (n: number) => `${n} min read`,
		views: (n: number) => `${n.toLocaleString()} views`,
		shopTitle: "Shop the products in this article",
		shopSubtitle: "Mentioned above — linked straight from the post.",
		relatedTitle: "Related articles",
	},
	ar: {
		breadcrumbHome: "الرئيسية",
		breadcrumbBlog: "المدونة",
		minRead: (n: number) => `قراءة ${n} دقائق`,
		views: (n: number) => `${n.toLocaleString()} مشاهدة`,
		shopTitle: "تسوّق المنتجات المذكورة في هذا المقال",
		shopSubtitle: "مذكورة أعلاه — رابط مباشر من المقال.",
		relatedTitle: "مقالات ذات صلة",
	},
} as const;

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug as string;
	const locale = getLocaleFromPathname(new URL(request.url).pathname);

	const result = await graphqlRequest<BlogPostBySlugData>(env, GET_BLOG_POST_BY_SLUG, { slug, languageCode: locale }, { request });
	const post = result.data.blogPostBySlug;
	if (!post) throw data(null, { status: 404 });

	const [relatedPostsResult, relatedProductsResult] = await Promise.allSettled([
		graphqlRequest<RelatedBlogPostsData>(env, GET_RELATED_BLOG_POSTS, { id: post.id, limit: 3, languageCode: locale }, { request }),
		post.relatedProductIds.length > 0
			? graphqlRequest<BlogRelatedProductsData>(env, GET_BLOG_RELATED_PRODUCTS, { ids: post.relatedProductIds }, { request })
			: Promise.resolve(null),
	]);

	const vendureBase = (env.VENDURE_SHOP_API ?? "").replace(/\/shop-api\/?$/, "");

	const relatedProducts: SearchProductItem[] =
		relatedProductsResult.status === "fulfilled" && relatedProductsResult.value
			? relatedProductsResult.value.data.products.items
					.map(relatedProductToSearchItem)
					.filter((p): p is SearchProductItem => p !== null)
			: [];

	return {
		post,
		relatedPosts: relatedPostsResult.status === "fulfilled" ? relatedPostsResult.value.data.relatedBlogPosts : [],
		relatedProducts,
		vendureBase,
		locale,
		slug,
	};
}

export function meta({ loaderData, location }: Route.MetaArgs) {
	if (!loaderData) return [{ title: "Article Not Found" }];
	const { post, locale, slug } = loaderData;
	const title = post.metaTitle || `${post.title} - ${SITE_NAME}`;
	const description = post.metaDescription || post.excerpt;
	const canonicalUrl = `${SITE_URL}${localizePath(`/blog/${slug}`, locale as Locale)}`;
	const canonicalPath = stripLocalePrefix(new URL(canonicalUrl).pathname);
	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
		...hreflangTags(SITE_URL, canonicalPath),
		{ property: "og:type", content: "article" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: canonicalUrl },
		{ property: "og:site_name", content: SITE_NAME },
		...(post.assetPreview ? [{ property: "og:image", content: post.assetPreview }] : []),
		...(post.publishedAt ? [{ property: "article:published_time", content: post.publishedAt }] : []),
		{ name: "robots", content: "index, follow" },
	];
}

function formatDate(iso: string | null, locale: Locale): string {
	if (!iso) return "";
	return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-QA", { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogPostDetail({ loaderData }: Route.ComponentProps) {
	const { post, relatedPosts, relatedProducts, vendureBase, locale, slug } = loaderData;
	const t = COPY[locale as Locale];

	// Fire-and-forget, client-side only (deliberately not in the loader) — a
	// server-side loader call would also fire on prefetch/bots. Same pattern as
	// products.$slug.tsx's /api/track-view.
	useEffect(() => {
		fetch("/api/track-blog-view", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ slug }),
		}).catch(() => {/* non-critical */});
	}, [slug]);

	const canonicalUrl = `${SITE_URL}${localizePath(`/blog/${slug}`, locale as Locale)}`;
	const siteOrigin = SITE_URL;

	const jsonLd = [
		{
			"@context": "https://schema.org",
			"@type": "Article",
			headline: post.title,
			description: post.excerpt,
			url: canonicalUrl,
			...(post.assetPreview && { image: post.assetPreview }),
			...(post.publishedAt && { datePublished: post.publishedAt }),
			author: { "@type": "Person", name: post.authorName || "NutriBox Team" },
			publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo.png` } },
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeHomeUrl(siteOrigin, locale as Locale) },
				{ "@type": "ListItem", position: 2, name: t.breadcrumbBlog, item: `${siteOrigin}${localizePath("/blog", locale as Locale)}` },
				{ "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
			],
		},
	];

	return (
		<div className="bg-white">
			{jsonLd.map((schema, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}

			<div className="container mx-auto px-4 pt-6">
				<Breadcrumb items={[{ label: t.breadcrumbHome, href: "/" }, { label: t.breadcrumbBlog, href: "/blog" }, { label: post.title }]} />
			</div>

			{/* Article header */}
			<div className="container mx-auto px-4 pt-6 max-w-3xl">
				{post.category && (
					<Link to={`/blog?category=${post.category.slug}`} className="inline-block bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-4 hover:bg-primary/15 transition-colors">
						{post.category.name}
					</Link>
				)}
				<h1 className="font-heading2 text-3xl md:text-[2.5rem] leading-tight font-bold text-gray-900 text-balance">{post.title}</h1>

				<div className="flex items-center gap-3 mt-6">
					<div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 font-heading font-bold text-sm overflow-hidden">
						{post.authorAvatarPreview ? (
							<VendureImage src={post.authorAvatarPreview} vendureBase={vendureBase} alt={post.authorName ?? ""} width={44} height={44} />
						) : (
							(post.authorName ?? "NB").split(" ").map((w) => w[0]).slice(0, 2).join("")
						)}
					</div>
					<div className="min-w-0">
						<div className="font-heading font-bold text-sm text-gray-900 truncate">{post.authorName ?? "NutriBox Team"}</div>
						<div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
							<span>{formatDate(post.publishedAt, locale as Locale)}</span>
							<span className="w-0.5 h-0.5 rounded-full bg-current" />
							<span className="inline-flex items-center gap-1"><Clock size={12} />{t.minRead(post.readingTimeMinutes)}</span>
							<span className="w-0.5 h-0.5 rounded-full bg-current" />
							<span className="inline-flex items-center gap-1"><Eye size={12} />{t.views(post.viewCount)}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Hero image */}
			<div className="container mx-auto px-4 mt-6 max-w-4xl">
				<div className="relative rounded-2xl overflow-hidden h-64 md:h-96">
					{post.assetPreview ? (
						<VendureImage src={post.assetPreview} vendureBase={vendureBase} alt={post.title} width={900} height={400} eager objectFit="contain" />
					) : (
						<div className="w-full h-full bg-gradient-to-br from-primary/25 to-primary/5" />
					)}
				</div>
			</div>

			{/* Article body */}
			<div className="container mx-auto px-4 py-10 max-w-3xl">
				<div
					className="prose prose-gray prose-headings:font-heading prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-strong:text-gray-900 prose-h2:text-xl md:prose-h2:text-2xl max-w-none"
					dangerouslySetInnerHTML={{ __html: post.content }}
				/>

				{post.tags.length > 0 && (
					<div className="flex items-center gap-2 flex-wrap mt-10 pt-8 border-t border-gray-100">
						{post.tags.map((tag) => (
							<Link key={tag.id} to={`/blog?tag=${tag.slug}`} className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-full transition-colors">
								#{tag.name}
							</Link>
						))}
					</div>
				)}
			</div>

			{/* Shop this article */}
			{relatedProducts.length > 0 && (
				// bg-secondary is a hand-authored @apply class (app.css), not a --color-*
				// theme token, so Tailwind's opacity modifier (bg-secondary/40) can't
				// attach to it — the same hex written as an arbitrary value can.
				<div className="bg-[#DCDFD5]/40 dark:bg-gray-900/60">
					<div className="container mx-auto px-4 py-12">
						<h2 className="font-heading text-xl font-extrabold text-gray-900">{t.shopTitle}</h2>
						<p className="text-sm text-gray-500 mt-1 mb-6">{t.shopSubtitle}</p>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							{relatedProducts.map((product) => (
								<ProductCard key={product.productVariantId} product={product} vendureBase={vendureBase} />
							))}
						</div>
					</div>
				</div>
			)}

			{/* Related articles */}
			{relatedPosts.length > 0 && (
				<div className="container mx-auto px-4 py-12">
					<h2 className="font-heading text-xl font-extrabold text-gray-900 mb-6">{t.relatedTitle}</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{relatedPosts.map((p) => (
							<BlogPostCard key={p.id} post={p} vendureBase={vendureBase} locale={locale as Locale} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}
