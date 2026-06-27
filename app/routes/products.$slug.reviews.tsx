import type { Route } from "./+types/products.$slug.reviews";
import { useState, useEffect } from "react";
import { Link, useFetcher, useRouteLoaderData } from "react-router";
import { data } from "react-router";
import type { ActiveCustomer } from "~/graphql/checkout";
import { ChevronLeft, Star, BadgeCheck, ThumbsUp, ThumbsDown, X, ImagePlus, ChevronRight } from "lucide-react";
import { graphqlRequest } from "workers/graphqlClient";
import {
	PRODUCT_DETAIL_QUERY, PRODUCT_RATING_SUMMARY_QUERY, PRODUCT_REVIEWS_QUERY,
	type ProductDetailData, type ProductRatingSummaryData, type ProductRatingSummary,
	type ProductReviewsData, type ReviewItem, type ReviewSortOrder,
} from "~/graphql/product";

const TAKE = 10;

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ params, request, context }: Route.LoaderArgs) {
	const slug = params.slug!;
	const url = new URL(request.url);
	const env = context.cloudflare.env;

	const sort = (url.searchParams.get("sort") ?? "MOST_RELEVANT") as ReviewSortOrder;
	const ratingFilter = url.searchParams.get("rating") ? Number(url.searchParams.get("rating")) : undefined;
	const languageCode = url.searchParams.get("lang") ?? undefined;
	const verifiedOnly = url.searchParams.get("verified") === "true" ? true : undefined;
	const withImagesOnly = url.searchParams.get("images") === "true" ? true : undefined;
	const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
	const skip = (page - 1) * TAKE;

	const [productResult, summaryResult, reviewsResult] = await Promise.allSettled([
		graphqlRequest<ProductDetailData>(env, PRODUCT_DETAIL_QUERY, { slug }, { request, cf: { cacheTtl: 300, cacheEverything: true } }),
		graphqlRequest<ProductRatingSummaryData>(env, PRODUCT_RATING_SUMMARY_QUERY, { slug }, { request }),
		graphqlRequest<ProductReviewsData>(env, PRODUCT_REVIEWS_QUERY, {
			slug, take: TAKE, skip, sort, ratingFilter, languageCode, verifiedOnly, withImagesOnly,
		}, { request }),
	]);

	const product = productResult.status === "fulfilled" ? productResult.value.data.product : null;
	if (!product) throw data(null, { status: 404 });

	const summary = summaryResult.status === "fulfilled" ? summaryResult.value.data.productRatingSummaryBySlug : null;
	const reviewsData = reviewsResult.status === "fulfilled" ? reviewsResult.value.data.productReviewsBySlug : null;

	return {
		slug,
		productId: product.id,
		productName: product.name,
		summary,
		reviews: reviewsData?.items ?? [],
		totalReviews: reviewsData?.totalItems ?? 0,
		page,
		sort,
		ratingFilter: ratingFilter ?? null,
		languageCode: languageCode ?? null,
		verifiedOnly: verifiedOnly ?? false,
		withImagesOnly: withImagesOnly ?? false,
	};
}

// ── Meta ──────────────────────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs) {
	const name = data?.productName ?? "Product";
	return [
		{ title: `Reviews — ${name} — Protein House Qatar` },
		{ name: "robots", content: "noindex, follow" },
	];
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ value, size = 14 }: { value: number; size?: number }) {
	return (
		<span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
			{[1, 2, 3, 4, 5].map((s) => {
				const fill = value >= s ? 1 : value >= s - 0.5 ? 0.5 : 0;
				return (
					<span key={s} className="relative inline-block" style={{ width: size, height: size }}>
						<Star size={size} className="text-gray-200" fill="currentColor" />
						{fill > 0 && (
							<span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
								<Star size={size} className="text-amber-400" fill="currentColor" />
							</span>
						)}
					</span>
				);
			})}
		</span>
	);
}

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, onVote }: { review: ReviewItem; onVote?: (id: string, vote: "HELPFUL" | "NOT_HELPFUL") => void }) {
	return (
		<article className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm">
			<div className="flex items-start justify-between gap-3 mb-2">
				<div>
					<Stars value={review.rating} size={13} />
					{review.title && <p className="font-semibold text-sm text-gray-900 mt-1">{review.title}</p>}
				</div>
				{review.isVerifiedPurchase && (
					<span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5 shrink-0">
						<BadgeCheck size={11} />
						Verified Purchase
					</span>
				)}
			</div>

			<p className="text-sm text-gray-700 leading-relaxed">{review.body}</p>

			{review.images.length > 0 && (
				<div className="flex gap-2 mt-3 flex-wrap">
					{review.images.map((img, i) => (
						<img key={i} src={img.url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-100" loading="lazy" />
					))}
				</div>
			)}

			<div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 flex-wrap gap-2">
				<div className="text-xs text-gray-400">
					<span className="font-medium text-gray-600">{review.authorName}</span>
					{review.authorLocation && <span> · {review.authorLocation}</span>}
					<span> · {new Date(review.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
				</div>
				{onVote && (
					<div className="flex items-center gap-3 text-xs text-gray-400">
						<span>Helpful?</span>
						<button onClick={() => onVote(review.id, "HELPFUL")} className={`flex items-center gap-1 hover:text-green-600 transition-colors ${review.myVote === "HELPFUL" ? "text-green-600 font-medium" : ""}`}>
							<ThumbsUp size={12} /> {review.helpfulCount}
						</button>
						<button onClick={() => onVote(review.id, "NOT_HELPFUL")} className={`flex items-center gap-1 hover:text-red-500 transition-colors ${review.myVote === "NOT_HELPFUL" ? "text-red-500 font-medium" : ""}`}>
							<ThumbsDown size={12} /> {review.notHelpfulCount}
						</button>
					</div>
				)}
			</div>
		</article>
	);
}

// ── Star selector (write review) ──────────────────────────────────────────────

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
	const [hovered, setHovered] = useState(0);
	return (
		<div className="flex gap-1">
			{[1, 2, 3, 4, 5].map((s) => (
				<button
					key={s}
					type="button"
					onClick={() => onChange(s)}
					onMouseEnter={() => setHovered(s)}
					onMouseLeave={() => setHovered(0)}
					className="transition-transform hover:scale-110"
					aria-label={`${s} star${s > 1 ? "s" : ""}`}
				>
					<Star
						size={28}
						className={(hovered || value) >= s ? "text-amber-400" : "text-gray-300"}
						fill={(hovered || value) >= s ? "currentColor" : "none"}
					/>
				</button>
			))}
		</div>
	);
}

// ── Write Review Modal ────────────────────────────────────────────────────────

function WriteReviewModal({ productSlug, productId, onClose, customer }: { productSlug: string; productId: string; onClose: () => void; customer: ActiveCustomer | null }) {
	const fetcher = useFetcher<{ ok: boolean; error?: string }>();
	const [rating, setRating] = useState(0);
	const [done, setDone] = useState(false);
	const [imageFiles, setImageFiles] = useState<File[]>([]);
	const [previews, setPreviews] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.ok) setDone(true);
	}, [fetcher.state, fetcher.data]);

	// Revoke object URLs on cleanup
	useEffect(() => () => { previews.forEach(URL.revokeObjectURL); }, [previews]);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const selected = Array.from(e.target.files ?? []);
		const remaining = 5 - imageFiles.length;
		const toAdd = selected.slice(0, remaining);
		setImageFiles((prev) => [...prev, ...toAdd]);
		setPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
		e.target.value = "";
	}

	function removeImage(idx: number) {
		URL.revokeObjectURL(previews[idx]);
		setImageFiles((prev) => prev.filter((_, i) => i !== idx));
		setPreviews((prev) => prev.filter((_, i) => i !== idx));
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!rating) return;
		const fd = new FormData(e.currentTarget);
		setUploadError(null);

		let imageUrls: string[] = [];
		if (imageFiles.length > 0) {
			setUploading(true);
			try {
				const form = new FormData();
				imageFiles.forEach((f) => form.append("files", f));
				const res = await fetch("/review-images/upload", { method: "POST", body: form });
				const data = await res.json() as { urls?: string[]; error?: string };
				if (!res.ok) throw new Error(data.error ?? "Image upload failed");
				imageUrls = data.urls ?? [];
			} catch (err) {
				setUploadError(err instanceof Error ? err.message : "Image upload failed");
				setUploading(false);
				return;
			}
			setUploading(false);
		}

		const body: Record<string, unknown> = {
			_intent: "submit",
			productId,
			rating,
			body: fd.get("body") as string,
			languageCode: fd.get("languageCode") as string,
			imageUrls,
		};
		const title = (fd.get("title") as string).trim();
		const loc = (fd.get("authorLocation") as string).trim();
		if (title) body.title = title;
		if (loc) body.authorLocation = loc;
		fetcher.submit(body as Parameters<typeof fetcher.submit>[0], { method: "POST", action: "/api/reviews", encType: "application/json" });
	}

	const busy = uploading || fetcher.state !== "idle";

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="fixed inset-0 bg-black/50" onClick={onClose} />
			<div className="flex min-h-full items-center justify-center p-4">
				<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10">
					<button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
						<X size={20} />
					</button>

					{!customer ? (
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
								<BadgeCheck size={32} className="text-primary" />
							</div>
							<h3 className="text-lg font-bold text-gray-900 mb-2">Sign in to Write a Review</h3>
							<p className="text-sm text-gray-500 mb-6">You need to be logged in to share your experience.</p>
							<div className="flex flex-col gap-3">
								<Link to={`/login?redirect=${encodeURIComponent(`/products/${productSlug}/reviews#write`)}`} onClick={onClose} className="w-full text-center bg-[#3b8578] hover:bg-[#2e6b61] text-white font-semibold py-3 rounded-full transition-colors text-sm">
									Sign In
								</Link>
								<Link to={`/register?redirect=${encodeURIComponent(`/products/${productSlug}/reviews#write`)}`} onClick={onClose} className="w-full text-center border border-primary text-primary font-semibold py-3 rounded-full hover:bg-primary/5 transition-colors text-sm">
									Create Account
								</Link>
								<button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
							</div>
						</div>
					) : done ? (
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<BadgeCheck size={32} className="text-green-600" />
							</div>
							<h3 className="text-lg font-bold text-gray-900 mb-2">Review Submitted!</h3>
							<p className="text-sm text-gray-500 mb-6">Thank you. Your review is pending approval and will appear shortly.</p>
							<button onClick={onClose} className="bg-primary text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">Close</button>
						</div>
					) : (
						<>
							<h2 className="text-lg font-bold text-gray-900 mb-1">Write a Review</h2>
							<p className="text-sm text-gray-500 mb-5">Share your experience to help other shoppers.</p>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">Your Rating <span className="text-red-500">*</span></label>
									<StarSelector value={rating} onChange={setRating} />
									{!rating && fetcher.data && <p className="text-xs text-red-500 mt-1">Please select a rating.</p>}
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Review Title</label>
									<input name="title" type="text" placeholder="Summarise your experience" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Review <span className="text-red-500">*</span></label>
									<textarea name="body" required rows={4} placeholder="Tell others what you think..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
									<input name="authorLocation" type="text" placeholder="e.g. Doha, Qatar" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
									<select name="languageCode" defaultValue="en" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
										<option value="en">English</option>
										<option value="ar">Arabic</option>
										<option value="other">Other</option>
									</select>
								</div>

								{/* Image upload */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Photos <span className="text-gray-400 font-normal">(optional · up to 5)</span>
									</label>
									<div className="flex flex-wrap gap-2">
										{previews.map((src, i) => (
											<div key={i} className="relative w-16 h-16 shrink-0">
												<img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
												<button
													type="button"
													onClick={() => removeImage(i)}
													className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
													aria-label="Remove image"
												>
													<X size={10} className="text-gray-500" />
												</button>
											</div>
										))}
										{imageFiles.length < 5 && (
											<label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors shrink-0">
												<ImagePlus size={16} className="text-gray-400" />
												<span className="text-[10px] text-gray-400 mt-0.5">Add</span>
												<input
													type="file"
													accept="image/jpeg,image/png,image/webp,image/gif"
													multiple
													className="sr-only"
													onChange={handleFileChange}
												/>
											</label>
										)}
									</div>
									{uploadError && <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>}
								</div>

								{fetcher.data?.error && (
									<div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{fetcher.data.error}</div>
								)}

								<button
									type="submit"
									disabled={busy || !rating}
									className="w-full bg-[#3b8578] hover:bg-[#2e6b61] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full transition-colors text-sm"
								>
									{uploading ? "Uploading photos…" : fetcher.state !== "idle" ? "Submitting…" : "Submit Review"}
								</button>
							</form>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: ReviewSortOrder; label: string }[] = [
	{ value: "MOST_RELEVANT", label: "Most Relevant" },
	{ value: "NEWEST", label: "Newest" },
	{ value: "HIGHEST_RATED", label: "Highest Rated" },
	{ value: "LOWEST_RATED", label: "Lowest Rated" },
	{ value: "MOST_HELPFUL", label: "Most Helpful" },
];

export default function ProductReviewsPage({ loaderData }: Route.ComponentProps) {
	const { slug, productId, productName, summary, reviews, totalReviews, page, sort, ratingFilter, languageCode, verifiedOnly, withImagesOnly } = loaderData;
	const rootData = useRouteLoaderData("root") as { activeCustomer: ActiveCustomer | null } | undefined;
	const customer = rootData?.activeCustomer ?? null;
	const [writeOpen, setWriteOpen] = useState(false);
	const voteFetcher = useFetcher();
	const totalPages = Math.ceil(totalReviews / TAKE);

	// Open write modal if hash is #write
	useEffect(() => {
		if (typeof window !== "undefined" && window.location.hash === "#write") {
			setWriteOpen(true);
		}
	}, []);

	function buildUrl(overrides: Record<string, string | number | null>) {
		const params = new URLSearchParams();
		const merged = { sort, rating: ratingFilter, lang: languageCode, verified: verifiedOnly ? "true" : null, images: withImagesOnly ? "true" : null, page, ...overrides };
		for (const [k, v] of Object.entries(merged)) {
			if (v !== null && v !== undefined && v !== "") params.set(k, String(v));
		}
		if (params.get("sort") === "MOST_RELEVANT") params.delete("sort");
		if (params.get("page") === "1") params.delete("page");
		const q = params.toString();
		return `/products/${slug}/reviews${q ? `?${q}` : ""}`;
	}

	function handleVote(reviewId: string, vote: "HELPFUL" | "NOT_HELPFUL") {
		voteFetcher.submit({ _intent: "vote", reviewId, vote }, { method: "POST", action: "/api/reviews", encType: "application/json" });
	}

	const maxCount = summary ? Math.max(...summary.distribution.map((d) => d.count), 1) : 1;

	return (
		<div className="min-h-screen bg-gray-50">
			{writeOpen && <WriteReviewModal productSlug={slug} productId={productId} onClose={() => setWriteOpen(false)} customer={customer} />}

			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="container mx-auto px-4 py-5">
					<Link to={`/products/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-3">
						<ChevronLeft size={14} />
						Back to {productName}
					</Link>
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h1 className="text-xl font-bold text-gray-900">Customer Reviews</h1>
						<button
							onClick={() => setWriteOpen(true)}
							className="bg-[#3b8578] hover:bg-[#2e6b61] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
						>
							Write a Review
						</button>
					</div>
					{productName && <p className="text-sm text-gray-500 mt-0.5">for <span className="font-medium text-gray-700">{productName}</span></p>}
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">

						{/* Sidebar — always visible */}
					<aside className="lg:sticky lg:top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">

						{/* Score + distribution — only when summary exists */}
						{summary ? (
							<>
								<div className="flex flex-col items-center py-2">
									<span className="text-5xl font-black text-gray-900">{summary.averageRating.toFixed(1)}</span>
									<Stars value={summary.averageRating} size={18} />
									<span className="text-xs text-gray-500 mt-1">{summary.totalReviews.toLocaleString()} reviews</span>
								</div>

								<div className="space-y-1.5">
									{[5, 4, 3, 2, 1].map((star) => {
										const count = summary.distribution.find((d) => d.rating === star)?.count ?? 0;
										const pct = Math.round((count / maxCount) * 100);
										const isActive = ratingFilter === star;
										return (
											<Link key={star} to={buildUrl({ rating: isActive ? null : star, page: 1 })} className={`flex items-center gap-2 group rounded-lg px-1 py-0.5 transition-colors ${isActive ? "bg-amber-50" : "hover:bg-gray-50"}`}>
												<span className="text-xs text-gray-500 w-4 text-right shrink-0">{star}</span>
												<Star size={10} className="text-amber-400 shrink-0" fill="currentColor" />
												<div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
													<div className={`h-full rounded-full transition-all ${isActive ? "bg-amber-500" : "bg-amber-400 group-hover:bg-amber-500"}`} style={{ width: `${pct}%` }} />
												</div>
												<span className="text-xs text-gray-400 w-12 shrink-0 text-right">{count.toLocaleString()}</span>
											</Link>
										);
									})}
								</div>
							</>
						) : (
							/* No summary — show plain star filter buttons */
							<div>
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Stars</p>
								<div className="space-y-1">
									{[5, 4, 3, 2, 1].map((star) => {
										const isActive = ratingFilter === star;
										return (
											<Link key={star} to={buildUrl({ rating: isActive ? null : star, page: 1 })} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg transition-colors ${isActive ? "bg-amber-50 text-amber-700 font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
												<span className="flex gap-0.5">
													{Array.from({ length: star }).map((_, i) => <Star key={i} size={11} className="text-amber-400" fill="currentColor" />)}
												</span>
												<span>{star} star{star !== 1 ? "s" : ""}</span>
											</Link>
										);
									})}
								</div>
							</div>
						)}

						{/* Language filter — only when summary has > 1 language */}
						{summary && summary.languageSummary.length > 1 && (
							<div>
								<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Language</p>
								<div className="space-y-1">
									<Link to={buildUrl({ lang: null, page: 1 })} className={`flex justify-between text-sm px-2 py-1 rounded-lg transition-colors ${!languageCode ? "bg-primary/10 text-primary font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
										<span>All</span>
										<span className="text-gray-400">{summary.totalReviews.toLocaleString()}</span>
									</Link>
									{summary.languageSummary.map((l) => (
										<Link key={l.languageCode} to={buildUrl({ lang: l.languageCode === languageCode ? null : l.languageCode, page: 1 })} className={`flex justify-between text-sm px-2 py-1 rounded-lg transition-colors ${languageCode === l.languageCode ? "bg-primary/10 text-primary font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
											<span className="capitalize">{l.languageCode === "en" ? "English" : l.languageCode === "ar" ? "Arabic" : l.languageCode}</span>
											<span className="text-gray-400">{l.count.toLocaleString()}</span>
										</Link>
									))}
								</div>
							</div>
						)}

						{/* Quick filters — always visible */}
						<div>
							<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter</p>
							<div className="space-y-1">
								<Link to={buildUrl({ verified: verifiedOnly ? null : "true", page: 1 })} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg transition-colors ${verifiedOnly ? "bg-primary/10 text-primary font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
									<BadgeCheck size={13} />
									Verified only
								</Link>
								<Link to={buildUrl({ images: withImagesOnly ? null : "true", page: 1 })} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg transition-colors ${withImagesOnly ? "bg-primary/10 text-primary font-medium" : "hover:bg-gray-50 text-gray-600"}`}>
									<ImagePlus size={13} />
									With photos
								</Link>
							</div>
						</div>
					</aside>

					{/* Main — review list */}
					<div className="space-y-4">
						{/* Sort bar */}
						<div className="flex items-center gap-3 flex-wrap">
							<span className="text-sm text-gray-500">{totalReviews.toLocaleString()} reviews</span>
							<div className="ml-auto flex items-center gap-2">
								<span className="text-sm text-gray-500 hidden sm:inline">Sort:</span>
								<select
									value={sort}
									onChange={(e) => window.location.href = buildUrl({ sort: e.target.value, page: 1 })}
									className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
								>
									{SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							{/* Active filters */}
							{ratingFilter && (
								<Link to={buildUrl({ rating: null, page: 1 })} className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium hover:bg-amber-200 transition-colors">
									{ratingFilter}★ only <X size={11} />
								</Link>
							)}
							{languageCode && (
								<Link to={buildUrl({ lang: null, page: 1 })} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium hover:bg-blue-200 transition-colors">
									{languageCode === "en" ? "English" : languageCode === "ar" ? "Arabic" : languageCode} <X size={11} />
								</Link>
							)}
						</div>

						{reviews.length === 0 ? (
							<div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
								<Star size={40} className="text-gray-200 mx-auto mb-3" fill="currentColor" />
								<p className="text-gray-500 font-medium">No reviews match your filters.</p>
								<Link to={`/products/${slug}/reviews`} className="text-sm text-primary hover:underline mt-2 inline-block">Clear all filters</Link>
							</div>
						) : (
							<>
								{reviews.map((r) => <ReviewCard key={r.id} review={r} onVote={handleVote} />)}

								{/* Pagination */}
								{totalPages > 1 && (
									<nav aria-label="Review pages" className="flex items-center justify-center gap-1 pt-4">
										{page > 1 && (
											<Link to={buildUrl({ page: page - 1 })} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors">
												<ChevronLeft size={16} />
											</Link>
										)}
										{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
											const p = totalPages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? totalPages : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
											return (
												<Link key={i} to={buildUrl({ page: p })} className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${p === page ? "bg-primary text-white font-bold" : "border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"}`}>
													{p}
												</Link>
											);
										})}
										{page < totalPages && (
											<Link to={buildUrl({ page: page + 1 })} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors">
												<ChevronRight size={16} />
											</Link>
										)}
									</nav>
								)}
							</>
						)}
					</div>
				</div>
			</div>

			{/* Sticky Write Review button (mobile) */}
			<div className="fixed bottom-6 right-6 z-40 lg:hidden">
				<button
					onClick={() => setWriteOpen(true)}
					className="bg-[#3b8578] hover:bg-[#2e6b61] text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl transition-colors"
				>
					Write a Review
				</button>
			</div>
		</div>
	);
}
