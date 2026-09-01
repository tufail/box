import { useLocation } from "react-router";
import { ChevronRight } from "lucide-react";
import Link from "~/components/LocaleLink";
import { getLocaleFromPathname } from "~/lib/i18n";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "Get Your Personalized Supplement Stack.",
		subtitle: "Unlock your science-based recommendation by taking our 3-minute quiz.",
		cta: "Find my Supplement Routine",
		imageAlt: "Sports nutrition essentials for an active lifestyle",
	},
	ar: {
		title: "احصل على باقة مكملاتك الشخصية.",
		subtitle: "اكتشف توصيتك المبنية على أساس علمي من خلال اختبار سريع لا يستغرق سوى 3 دقائق.",
		cta: "اعثر على روتين مكملاتي",
		imageAlt: "أساسيات التغذية الرياضية لأسلوب حياة نشط",
	},
} as const;

export default function HomeWellnessBanner() {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = COPY[locale];

	return (
		<section className="grid md:grid-cols-2 bg-white">
			<div className="flex items-center justify-center md:justify-end">
				<div className="max-w-lg px-6 py-10 md:px-10 lg:px-14 md:py-16 md:me-0">
					<h2 className="font-heading text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight">{t.title}</h2>
					<p className="text-sm md:text-base text-gray-600 mt-3">{t.subtitle}</p>
					<Link
						to="/wellness"
						className="inline-flex items-center gap-1.5 mt-6 bg-lime-300 text-black font-bold text-sm px-6 py-3 rounded-full hover:brightness-105 transition-all"
					>
						{t.cta}
						<ChevronRight size={16} className="rtl:rotate-180" />
					</Link>
				</div>
			</div>
			<div className="relative h-56 md:h-auto">
				<img src="/images/batminton_accessories.jpg" alt={t.imageAlt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
			</div>
		</section>
	);
}
