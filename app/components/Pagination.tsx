import Link from "~/components/LocaleLink";
import { useSearchParams } from "react-router";
import { SHOP_COPY } from "~/lib/shopCopy";
import type { Locale } from "~/lib/i18n";

interface PaginationProps {
	page: number;
	totalPages: number;
	locale: Locale;
}

const BASE = "min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-full border text-sm transition-colors";
const LINK_CLASS = `${BASE} bg-white border-gray-100 shadow-sm text-gray-700 hover:border-primary hover:text-primary`;
const CURRENT_CLASS = `${BASE} bg-black border-black text-white font-semibold`;
const DISABLED_CLASS = `${BASE} bg-white border-gray-100 shadow-sm opacity-40 cursor-not-allowed`;

// 1 … 4 5 [6] 7 8 … 20 -- always first/last plus a window around the current page.
function pageItems(page: number, totalPages: number): (number | "gap")[] {
	const keep = new Set<number>([1, totalPages]);
	for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) keep.add(p);
	const sorted = [...keep].sort((a, b) => a - b);
	const items: (number | "gap")[] = [];
	sorted.forEach((p, i) => {
		if (i > 0 && p - sorted[i - 1] > 1) items.push("gap");
		items.push(p);
	});
	return items;
}

// Real <a href="?page=N"> links (not onClick buttons) so crawlers can follow
// pagination and reach every page, with numbered links to keep deep pages a
// click or two away. Other params (sort, fv) are preserved; page 1 drops the
// param so it stays the bare canonical URL.
export default function Pagination({ page, totalPages, locale }: PaginationProps) {
	const [searchParams] = useSearchParams();
	const t = SHOP_COPY[locale];
	if (totalPages <= 1) return null;

	function hrefFor(target: number): string {
		const next = new URLSearchParams(searchParams);
		if (target <= 1) next.delete("page");
		else next.set("page", String(target));
		const qs = next.toString();
		return qs ? `?${qs}` : "?";
	}

	return (
		<nav aria-label="Pagination" className="flex flex-wrap justify-center items-center gap-2 mt-10">
			{page > 1 ? (
				<Link to={hrefFor(page - 1)} rel="prev" className={LINK_CLASS}>
					{t.prev}
				</Link>
			) : (
				<span className={DISABLED_CLASS}>{t.prev}</span>
			)}

			{pageItems(page, totalPages).map((item, i) =>
				item === "gap" ? (
					<span key={`gap-${i}`} className="px-1 text-gray-400">
						…
					</span>
				) : item === page ? (
					<span key={item} aria-current="page" className={CURRENT_CLASS}>
						{item}
					</span>
				) : (
					<Link key={item} to={hrefFor(item)} className={LINK_CLASS}>
						{item}
					</Link>
				),
			)}

			{page < totalPages ? (
				<Link to={hrefFor(page + 1)} rel="next" className={LINK_CLASS}>
					{t.next}
				</Link>
			) : (
				<span className={DISABLED_CLASS}>{t.next}</span>
			)}
		</nav>
	);
}
