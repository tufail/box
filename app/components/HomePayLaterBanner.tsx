import { useId } from "react";
import type { Locale } from "~/lib/i18n";

// Homepage side card promoting the PayLater (buy now, pay later) checkout option.
// Background/wave/shimmer are HTML/SVG/CSS; the brand marks are PayLater's own assets
// (public/images/paylater-logo.png, paylater-symbol-3d.webp). Animations live in
// app.css (.pl-*) and are switched off under prefers-reduced-motion.

const COPY = {
	en: { before: "Split your payments in ", four: "4", after: ", interest-free.", label: "PayLater: split your payments in 4, interest-free" },
	ar: { before: "قسّم مدفوعاتك على ", four: "4", after: " دفعات بدون فوائد.", label: "PayLater: قسّم مدفوعاتك على 4 دفعات بدون فوائد" },
} as const;

export default function HomePayLaterBanner({ locale }: { locale: Locale }) {
	const t = COPY[locale];
	// Unique per instance: the banner renders twice (mobile + desktop copies), and a duplicate
	// gradient id would resolve to the first — possibly display:none — copy, blanking the wave.
	const waveGradId = `pl-wave-${useId().replace(/:/g, "")}`;
	return (
		<div
			role="img"
			aria-label={t.label}
			className="pl-banner relative flex-1 min-h-[88px] rounded-xl overflow-hidden flex items-center gap-3 px-4 shadow-md shadow-black/10 bg-[linear-gradient(120deg,#5b2be0_0%,#4326c4_45%,#3a22b0_100%)]"
		>
			{/* Violet glow, top-left */}
			<div className="pl-glow absolute -top-10 -start-10 w-32 h-32 rounded-full bg-[#8b4dff]/60 blur-2xl pointer-events-none" />

			{/* Teal wave, bottom-right */}
			<svg className="pl-wave absolute -bottom-px -end-px w-[calc(100%+2px)] h-[85%] pointer-events-none rtl:-scale-x-100" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
				<defs>
					<linearGradient id={waveGradId} x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor="#4a2fc9" stopOpacity="0" />
						<stop offset="55%" stopColor="#2f7fd6" stopOpacity="0.55" />
						<stop offset="100%" stopColor="#1fd1b4" stopOpacity="0.95" />
					</linearGradient>
				</defs>
				<path d="M0,100 C90,98 160,82 215,58 C255,40 282,18 300,6 L300,100 Z" fill={`url(#${waveGradId})`} />
			</svg>

			{/* Shimmer sweep */}
			<div className="pl-shine absolute inset-y-0 -start-1/2 w-1/3 pointer-events-none bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg]" />

			{/* Text */}
			<div className="relative z-10 flex-1 min-w-0">
				<img src="/images/paylater-logo.png" alt="PayLater" width={480} height={111} className="h-7 w-auto" />
				<p className="text-white/90 text-xs leading-snug mt-1.5">
					{t.before}
					<strong className="text-white font-extrabold text-sm">{t.four}</strong>
					<span className="font-semibold">{t.after}</span>
				</p>
				{/* Four instalments filling one after another */}
				<div className="flex gap-1 mt-1.5 w-28" aria-hidden="true">
					{[0, 1, 2, 3].map((i) => (
						<span key={i} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
							<span className="pl-step block h-full rounded-full bg-gradient-to-r from-[#5ef0c8] to-[#1fd1b4]" style={{ animationDelay: `${i * 0.6}s` }} />
						</span>
					))}
				</div>
			</div>

			{/* PayLater 3D symbol */}
			<div className="pl-ring-wrap relative z-10 shrink-0 w-24" aria-hidden="true">
				<div className="pl-ring">
					<img src="/images/paylater-symbol-3d.webp" alt="" width={420} height={320} loading="eager" className="w-full h-auto drop-shadow-[0_8px_12px_rgba(20,10,80,0.5)]" />
				</div>
			</div>
		</div>
	);
}
