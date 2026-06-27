import { data } from "react-router";
import type { Route } from "./+types/pages.$slug";
import { Link } from "react-router";
import { ChevronRight, Home } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CMS_PAGE_BY_SLUG, type CmsPageData } from "~/graphql/pages";

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ params, context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const slug = params.slug as string;

	const result = await graphqlRequest<CmsPageData>(
		env,
		GET_CMS_PAGE_BY_SLUG,
		{ slug },
		{ request, cf: { cacheTtl: 300, cacheEverything: true } },
	);

	const page = result.data.getCmsPageBySlug;

	if (!page) {
		throw data(null, { status: 404 });
	}

	const translation = page.translations[0] ?? { title: slug, description: null };

	return { page, translation, slug };
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs) {
	if (!data) return [{ title: "Page Not Found" }];
	const { translation, page } = data;
	const plainText = translation.description
		? translation.description.replace(/<[^>]+>/g, "").slice(0, 160).trim()
		: `${translation.title} — Protein House Qatar`;

	return [
		{ title: `${translation.title} — Protein House Qatar` },
		{ name: "description", content: plainText },
		{ property: "og:title", content: `${translation.title} — Protein House Qatar` },
		{ property: "og:description", content: plainText },
		...(page.assetPreview ? [{ property: "og:image", content: page.assetPreview }] : []),
		{ property: "og:type", content: "article" },
		{ name: "robots", content: "index, follow" },
	];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PageDetail({ loaderData }: Route.ComponentProps) {
	const { page, translation } = loaderData;

	return (
		<div className="min-h-screen bg-white">
			{/* Hero */}
			{page.assetPreview ? (
				<div className="relative h-36 md:h-48 lg:h-56 overflow-hidden">
					<img
						src={page.assetPreview}
						alt={translation.title}
						className="w-full h-full object-cover"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
					<div className="absolute inset-0 flex flex-col justify-end container mx-auto px-4 pb-8">
						<Breadcrumb title={translation.title} />
						<h1 className="text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm mt-3">
							{translation.title}
						</h1>
					</div>
				</div>
			) : (
				<div className="bg-gradient-to-br from-primary/10 via-stone-50 to-stone-100 border-b border-stone-200">
					<div className="container mx-auto px-4 py-7 md:py-10">
						<Breadcrumb title={translation.title} dark />
						<h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mt-4">
							{translation.title}
						</h1>
					</div>
				</div>
			)}

			{/* Content */}
			<div className="container mx-auto px-4 py-10 md:py-14">
				<div className="max-w-3xl mx-auto">
					{translation.description ? (
						<div
							className="prose prose-gray prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-strong:text-gray-900 prose-h2:text-2xl prose-h3:text-xl max-w-none"
							dangerouslySetInnerHTML={{ __html: translation.description }}
						/>
					) : (
						<p className="text-gray-500 italic">No content available for this page.</p>
					)}

					<div className="mt-12 pt-8 border-t border-gray-100">
						<Link
							to="/"
							className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
						>
							<ChevronRight size={14} className="rotate-180" aria-hidden="true" />
							Back to Home
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ title, dark }: { title: string; dark?: boolean }) {
	const base = dark ? "text-gray-500" : "text-white/70";
	const hover = dark ? "hover:text-primary" : "hover:text-white";
	const current = dark ? "text-gray-700 font-medium" : "text-white font-medium";

	return (
		<nav aria-label="Breadcrumb">
			<ol className={`flex items-center gap-1.5 text-xs ${base}`}>
				<li>
					<Link to="/" className={`${hover} transition-colors flex items-center gap-1`}>
						<Home size={12} aria-hidden="true" />
						Home
					</Link>
				</li>
				<li aria-hidden="true">
					<ChevronRight size={12} />
				</li>
				<li aria-current="page" className={`${current} truncate max-w-[240px]`}>
					{title}
				</li>
			</ol>
		</nav>
	);
}
