import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { getLocaleFromPathname } from "~/lib/i18n";
import type { GoogleReviewsPayload } from "~/routes/api.google-reviews";

// Google Maps listing (opens Maps with the reviews), not the share.google short link, which lands on a search results page.
const GOOGLE_PROFILE_URL = "https://www.google.com/maps/search/?api=1&query=NutriBox&query_place_id=ChIJR-0KkFrbRT4ROl7oGZkLYMg";

// Opens Google's review form for our listing directly (same target the QR encodes).
const WRITE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJR-0KkFrbRT4ROl7oGZkLYMg";

const COPY = {
	en: { title: "Google Reviews", stars: "Stars", reviews: "reviews", prev: "Previous reviews", next: "Next reviews", scanToReview: "Click or scan to write a review", writeReview: "Write a review", viewAll: "View all reviews", qrAlt: "QR code to write a Google review for NutriBox" },
	ar: { title: "تقييمات جوجل", stars: "نجوم", reviews: "تقييم", prev: "التقييمات السابقة", next: "التقييمات التالية", scanToReview: "انقر أو امسح لكتابة تقييم", writeReview: "اكتب تقييمًا", viewAll: "عرض كل التقييمات", qrAlt: "رمز QR لكتابة تقييم على جوجل لنوتري بوكس" },
} as const;

function GoogleLogo() {
	return (
		<svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
			<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
			<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
			<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
			<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
		</svg>
	);
}

function Stars({ size }: { size: number }) {
	return (
		<span className="inline-flex gap-0.5 text-amber-400" aria-hidden="true">
			{[0, 1, 2, 3, 4].map((i) => (
				<Star key={i} size={size} fill="currentColor" strokeWidth={0} />
			))}
		</span>
	);
}

export default function GoogleReviewsWidget() {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];
	const [data, setData] = useState<GoogleReviewsPayload | null>(null);
	const trackRef = useRef<HTMLDivElement>(null);

	// Client-side on purpose: a third-party-backed, below-the-fold widget
	// shouldn't hold up (or fail) the SSR of every page.
	useEffect(() => {
		let cancelled = false;
		fetch("/api/google-reviews")
			.then((r) => (r.ok ? (r.json() as Promise<GoogleReviewsPayload>) : null))
			.then((d) => !cancelled && setData(d))
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!data || data.reviews.length === 0) return null;

	function scrollBy(dir: 1 | -1) {
		const el = trackRef.current;
		if (!el) return;
		// scrollBy's left is physical, so flip for RTL.
		const rtl = getComputedStyle(el).direction === "rtl";
		// One full page (the visible cards + one gap) lands exactly on the next snap point.
		el.scrollBy({ left: dir * (rtl ? -1 : 1) * (el.clientWidth + 24), behavior: "smooth" });
	}

	const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-QA" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

	return (
		<section aria-label={t.title} className="border-b border-gray-200">
			<div className="container mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
				<div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5 shrink-0">
					<div className="flex flex-col items-center gap-1.5 md:w-44 shrink-0 text-center">
					<span className="flex items-center gap-2 text-gray-700 font-medium">
						<GoogleLogo />
						{t.title}
					</span>
					<Stars size={22} />
					{data.rating !== null && (
						<span className="text-sm text-gray-700">
							<strong>{data.rating.toFixed(1)}</strong> {t.stars}
							{data.total !== null && (
								<>
									{" | "}
									<strong>{data.total}</strong> {t.reviews}
								</>
							)}
						</span>
					)}
				<a href={GOOGLE_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center rounded-full border border-primary/30 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">{t.viewAll}</a>
					</div>

					{/* Scan-to-review. A QR is only useful when scanned from another device, so it's
					    shown from md up; on phones the same link is a plain button instead. */}
					<a href={WRITE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="hidden md:flex flex-col items-center gap-1.5 shrink-0">
						<img src="/images/google-review-qr.svg" alt={t.qrAlt} width={84} height={84} loading="lazy" className="w-[84px] h-[84px] rounded-lg border border-gray-200 bg-white p-1" />
						<span className="text-[11px] font-medium text-gray-600 text-center leading-tight max-w-[110px]">{t.scanToReview}</span>
					</a>
					<a href={WRITE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="md:hidden inline-flex items-center rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/5">
						{t.writeReview}
					</a>
				</div>

				<div className="flex min-w-0 flex-1 items-center gap-3">
					{data.reviews.length > 3 && (
						<button type="button" onClick={() => scrollBy(-1)} aria-label={t.prev} className="hidden lg:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-200 shadow text-gray-600 hover:text-primary">
							<ChevronLeft size={16} className="rtl:rotate-180" />
						</button>
					)}
					<div ref={trackRef} className="flex min-w-0 flex-1 gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						{data.reviews.map((r) => (
							<article key={`${r.author}-${r.date}`} className="snap-start shrink-0 basis-[85%] sm:basis-[calc((100%-1.5rem)/2)] lg:basis-[calc((100%-3rem)/3)] flex gap-3">
								{r.photo ? <img src={r.photo} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" /> : <span className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">{r.author[0]}</span>}
								<div className="min-w-0">
									<div className="flex items-baseline gap-2 flex-wrap">
										<span className="text-sm font-semibold text-gray-900">{r.author}</span>
										{r.date && <span className="text-xs text-gray-500">{dateFmt.format(new Date(r.date))}</span>}
									</div>
									<Stars size={16} />
									<p className="text-xs text-gray-600 leading-relaxed mt-1 line-clamp-4">{r.text}</p>
								</div>
							</article>
						))}
					</div>
					{data.reviews.length > 3 && (
						<button type="button" onClick={() => scrollBy(1)} aria-label={t.next} className="hidden lg:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-200 shadow text-gray-600 hover:text-primary">
							<ChevronRight size={16} className="rtl:rotate-180" />
						</button>
					)}
				</div>
			</div>
		</section>
	);
}
