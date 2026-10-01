import Link from "~/components/LocaleLink";
import { useSearchParams } from "react-router";
import { SHOP_COPY } from "~/lib/shopCopy";
import type { Locale } from "~/lib/i18n";

interface PaginationProps {
	page: number;
	totalPages: number;
	locale: Locale;
}

const LINK_CLASS =
	"px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm hover:border-primary hover:text-primary transition-colors";
const DISABLED_CLASS = "px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm opacity-40 cursor-not-allowed";

// Real <a href="?page=N"> links (not onClick buttons) so crawlers can follow
// pagination and discover products beyond page 1. Other params (sort, fv) are
// preserved; page 1 drops the param so it stays the bare canonical URL.
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
		<nav aria-label="Pagination" className="flex justify-center items-center gap-3 mt-10">
			{page > 1 ? (
				<Link to={hrefFor(page - 1)} rel="prev" className={LINK_CLASS}>
					{t.prev}
				</Link>
			) : (
				<span className={DISABLED_CLASS}>{t.prev}</span>
			)}
			<span className="text-sm text-gray-600">{t.pageOf(page, totalPages)}</span>
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
