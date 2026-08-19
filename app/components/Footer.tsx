import { useState } from "react";
import Link from "~/components/LocaleLink";
import { Headphones, RotateCcw, Truck, ShieldCheck, MapPin, Phone, Mail, Ghost, ArrowUpRight } from "lucide-react";
import type { PageSection } from "~/graphql/pages";
import { useLocation, useFetcher } from "react-router";
import { getLocaleFromPathname } from "~/lib/i18n";

// ── SVG icons ─────────────────────────────────────────────────────────────────

function FacebookIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
			<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
		</svg>
	);
}

function InstagramIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
			<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
		</svg>
	);
}

function TikTokIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
			<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
		</svg>
	);
}

// Snapchat has no exact-mark asset available in our icon set (lucide-react has no
// brand icons) — using a generic ghost silhouette as a stand-in until we add the
// real trademarked SVG.
function SnapchatIcon() {
	return <Ghost className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />;
}

function GoogleIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
			<path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
		</svg>
	);
}

function WhatsAppIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true">
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
		</svg>
	);
}

// ── Data ──────────────────────────────────────────────────────────────────────

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const FOOTER_COPY = {
	en: {
		trustBadges: [
			{ icon: Headphones, title: "24/7 Support", desc: "Dedicated Support" },
			{ icon: RotateCcw, title: "Easy returns and refunds", desc: "Hassle-free returns" },
			{ icon: Truck, title: "Fast Delivery Service", desc: "Express delivery within 2 hours" },
			{ icon: ShieldCheck, title: "100% Authentic Products", desc: "We only deal with original products" },
		],
		getDirections: "Get directions on Google Maps",
		hours: "Sat-Thu 9am to 8pm",
		followUs: "Follow Us",
		tagline: "Your trusted destination for authentic sports nutrition, health supplements, and wellness products across Qatar.",
		contactUs: "Contact Us",
		newsletterBannerTitle: "Subscribe to our newsletter for the latest deals and updates",
		newsletterBlurb: "Be the first to get promo offers and reward perks straight to your inbox.",
		newsletterSignup: "Newsletter signup",
		emailAddress: "Email Address",
		subscribe: "Subscribe",
		subscribing: "Subscribing…",
		subscribed: "Thanks — you're subscribed!",
		subscribeError: "Couldn't subscribe you — please try again.",
		unsubscribeNote: "You can unsubscribe at any time. Read our privacy policy",
		here: "here",
		copyright: (year: number) => `Copyright © ${year} NutriBox. All rights reserved.`,
		acceptedPaymentMethods: "Accepted payment methods",
		paymentMethod: (n: number) => `Payment method ${n}`,
		chatOnWhatsapp: "Chat with us on WhatsApp",
	},
	ar: {
		trustBadges: [
			{ icon: Headphones, title: "دعم على مدار الساعة", desc: "دعم مخصص" },
			{ icon: RotateCcw, title: "إرجاع واسترداد سهل", desc: "إرجاع بدون تعقيد" },
			{ icon: Truck, title: "خدمة توصيل سريعة", desc: "توصيل سريع خلال ساعتين" },
			{ icon: ShieldCheck, title: "منتجات أصلية 100%", desc: "نتعامل فقط مع المنتجات الأصلية" },
		],
		getDirections: "الحصول على الاتجاهات عبر خرائط جوجل",
		hours: "السبت-الخميس من 9 صباحًا حتى 8 مساءً",
		followUs: "تابعنا",
		tagline: "وجهتك الموثوقة للمكملات الرياضية الأصلية والمكملات الصحية ومنتجات العافية في جميع أنحاء قطر.",
		contactUs: "تواصل معنا",
		newsletterBannerTitle: "اشترك في نشرتنا الإخبارية لأحدث العروض والتحديثات",
		newsletterBlurb: "كن أول من يحصل على العروض الترويجية ومكافآت الولاء مباشرة في بريدك الإلكتروني.",
		newsletterSignup: "الاشتراك في النشرة الإخبارية",
		emailAddress: "البريد الإلكتروني",
		subscribe: "اشتراك",
		subscribing: "جارٍ الاشتراك…",
		subscribed: "شكرًا لك — تم اشتراكك!",
		subscribeError: "تعذّر الاشتراك — يرجى المحاولة مرة أخرى.",
		unsubscribeNote: "يمكنك إلغاء الاشتراك في أي وقت. اطلع على سياسة الخصوصية",
		here: "هنا",
		copyright: (year: number) => `جميع الحقوق محفوظة © ${year} نوتري بوكس.`,
		acceptedPaymentMethods: "طرق الدفع المقبولة",
		paymentMethod: (n: number) => `طريقة الدفع ${n}`,
		chatOnWhatsapp: "تحدث معنا عبر واتساب",
	},
} as const;

const paymentMethods = [1, 2, 3, 4, 5];

// PageSection.name comes from the CMS pages plugin and has no `translations` field on
// the backend at all (confirmed via introspection — unlike CmsPage.title, which has the
// translations relation but no Arabic rows entered yet), so it can never come back
// translated from the API regardless of locale. This is a frontend-only stopgap keyed
// by the section's stable slug; real fix is adding translation support on the backend.
const SECTION_LABEL_OVERRIDES: Record<string, { en: string; ar: string }> = {
	company: { en: "Company", ar: "الشركة" },
	help: { en: "Help", ar: "المساعدة" },
};

// Snapchat/TikTok hrefs are placeholders ("#") until those accounts are set up.
const socialLinks = [
	{ href: "https://www.facebook.com/nutribox.qa", label: "Facebook", Icon: FacebookIcon },
	{ href: "https://www.instagram.com/nutribox.qa/", label: "Instagram", Icon: InstagramIcon },
	{ href: "#", label: "TikTok", Icon: TikTokIcon },
	{ href: "#", label: "Snapchat", Icon: SnapchatIcon },
	{ href: "https://share.google/m4uyBRqwEYe654INv", label: "Google", Icon: GoogleIcon },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface FooterProps {
	pageSections: PageSection[];
}

export default function Footer({ pageSections }: FooterProps) {
	const [email, setEmail] = useState("");
	const locale = getLocaleFromPathname(useLocation().pathname);
	const t = FOOTER_COPY[locale];
	const newsletterFetcher = useFetcher<{ ok?: boolean; error?: string }>();
	const subscribing = newsletterFetcher.state !== "idle";
	const subscribed = newsletterFetcher.data?.ok === true;

	return (
		<>
			<footer>
				{/* Trust badges */}
				<div className="border-t border-stone-200 bg-white py-5">
					<div className="container mx-auto px-4">
						<div className="grid grid-cols-2 md:grid-cols-4">
							{t.trustBadges.map(({ icon: Icon, title, desc }, i) => (
								<div key={title} className={`flex items-center gap-3 py-4 px-4 md:py-3 ${i !== 0 ? "md:border-l md:border-gray-200" : ""} ${i >= 2 ? "border-t border-gray-100 md:border-t-0" : ""} ${i % 2 === 1 ? "border-l border-gray-100 md:border-l md:border-gray-200" : ""}`}>
									<span className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center">
										<Icon size={22} strokeWidth={1.5} className={`shrink-0 ${i === 1 ? "text-primary" : "text-gray-800"}`} aria-hidden="true" />
									</span>
									<div>
										<p className="font-semibold text-xs md:text-sm text-gray-900 leading-tight">{title}</p>
										<p className="text-xs text-gray-500 mt-0.5">{desc}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Newsletter banner — the one embossed/raised element; everything else in the
				    footer matches the page body's own background instead of its own block color. */}
				<div className="bg-stone-100 pt-6 md:pt-12 pb-6 md:pb-10">
					<div className="container mx-auto px-4">
						<div className="relative rounded-3xl bg-gradient-to-br from-primary to-[#08191c] shadow-[0_25px_60px_-15px_rgba(34,77,83,0.45)] ps-6 pe-6 md:ps-[210px] md:pe-12 lg:ps-[270px] py-8 md:py-10">
							{/* Illustration deliberately bleeds above (and slightly below) the box,
							    same composition as the reference — needs the ancestors to allow
							    overflow, which they do (no overflow-hidden above this). */}
							<img
								src="/images/healthy-smile.png"
								alt=""
								aria-hidden="true"
								className="hidden md:block absolute bottom-0 start-4 lg:start-10 w-40 lg:w-52 h-auto object-contain pointer-events-none select-none"
							/>
							<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
								<div className="max-w-md">
									<h2 className="text-xl md:text-2xl font-bold text-white leading-snug">{t.newsletterBannerTitle}</h2>
									<p className="text-sm text-white/80 mt-2">{t.newsletterBlurb}</p>
								</div>
								<div className="w-full md:w-auto md:min-w-[380px]">
									{subscribed ? (
										<p className="text-sm font-medium text-lime-300 py-3">{t.subscribed}</p>
									) : (
										<form
											onSubmit={(e) => {
												e.preventDefault();
												newsletterFetcher.submit({ email }, { method: "post", encType: "application/json", action: "/api/newsletter" });
												setEmail("");
											}}
											className="flex"
											aria-label={t.newsletterSignup}
										>
											<label htmlFor="footer-banner-email" className="sr-only">
												{t.emailAddress}
											</label>
											<input id="footer-banner-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailAddress} required autoComplete="email" disabled={subscribing} className="flex-1 min-w-0 px-4 py-3 text-sm text-gray-900 bg-white rounded-s-full focus:outline-none focus:ring-2 focus:ring-lime-300 disabled:opacity-70" />
											<button type="submit" disabled={subscribing} className="bg-lime-300 hover:bg-lime-400 text-primary text-sm font-bold px-6 py-3 rounded-e-full transition-colors whitespace-nowrap cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
												{subscribing ? t.subscribing : t.subscribe}
											</button>
										</form>
									)}
									{newsletterFetcher.data?.error && <p className="text-xs text-red-300 mt-1.5">{newsletterFetcher.data.error}</p>}
									<p className="text-xs text-white/60 mt-2.5">
										{t.unsubscribeNote}{" "}
										<Link to="/privacy-policy" className="underline hover:text-white">
											{t.here}
										</Link>
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Main footer section — matches the page body background (bg-stone-100), not
				    its own dark block; the newsletter banner above is the only raised/colored
				    element. */}
				<div className="bg-stone-100 text-gray-900">
					<div className="container mx-auto px-4 py-10">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
							{/* Col 1 — Logo, tagline, social */}
							<div>
								<Link to="/" className="inline-block mb-3">
									<img src="/images/logo.png" alt="NutriBox Logo" width={772} height={223} className="h-8 w-auto" />
								</Link>
								<p className="text-xs text-gray-600 leading-relaxed mb-5">{t.tagline}</p>
								<div className="flex items-center gap-3">
									{socialLinks.map(({ href, label, Icon }) => (
										<a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-gray-500 hover:text-primary transition-colors">
											<Icon />
										</a>
									))}
								</div>
							</div>

							{/* Cols 2–3 — Dynamic page sections (Help, Company, …) */}
							{pageSections.length > 0
								? pageSections.slice(0, 2).map((section, idx) => {
										const label = SECTION_LABEL_OVERRIDES[section.slug]?.[locale] ?? section.name;
										return (
										<nav key={section.id} aria-label={label}>
											<h3 className="font-bold text-gray-900 mb-2 text-sm">{label}</h3>
											<div className="h-1 w-18 rounded-full bg-gradient-to-r from-lime-400 to-transparent mb-4" />
											<ul className="space-y-2.5">
												{section.pages.map((page) => {
													const url = page.externalUrl?.trim();
													const isExternal = !!url;
													const isNewTab = isExternal && url.startsWith("http");
													return (
														<li key={page.id}>
															{isExternal ? (
																<a href={url} {...(isNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="text-xs text-gray-600 hover:text-primary transition-colors">
																	{page.title}
																</a>
															) : (
																<Link to={`/pages/${page.slug}`} className="text-xs text-gray-600 hover:text-primary transition-colors">
																	{page.title}
																</Link>
															)}
														</li>
													);
												})}
											</ul>
										</nav>
										);
									})
								: null}

							{/* Col 4 — Contact Us */}
							<address className="not-italic">
								<h3 className="font-bold text-gray-900 mb-2 text-sm">{t.contactUs}</h3>
								<div className="h-1 w-18 rounded-full bg-gradient-to-r from-lime-400 to-transparent mb-4" />
								<div className="space-y-3 text-xs">
									<div className="flex items-start gap-2">
										<MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
										<span className="leading-relaxed text-gray-600">
											AK Group Building Office no 2, 2nd Floor Building No. 41, 343 Al Sadd St, Doha, Qatar{" "}
											<a href="https://maps.app.goo.gl/5mGR6br5M2dZexCR7" target="_blank" rel="noopener noreferrer" aria-label={t.getDirections} className="inline-flex align-text-top text-gray-400 hover:text-primary transition-colors">
												<ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
											</a>
										</span>
									</div>
									<div className="flex items-start gap-2">
										<Phone size={14} className="shrink-0 text-gray-400 mt-0.5" aria-hidden="true" />
										<div>
											<a href="tel:+97470157900" className="text-gray-700 hover:text-primary transition-colors">
												+974 7015 7900
											</a>
											<p className="text-xs text-gray-400 mt-0.5">{t.hours}</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Mail size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
										<a href="mailto:sales@nutribox.qa" className="text-gray-700 hover:text-primary transition-colors break-all">
											sales@nutribox.qa
										</a>
									</div>
								</div>
							</address>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="border-t border-gray-200">
						<div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
							<p className="text-xs text-gray-500">{t.copyright(new Date().getFullYear())}</p>
							<div className="flex items-center gap-1 flex-wrap justify-center" aria-label={t.acceptedPaymentMethods}>
								{paymentMethods.map((m) => (
									<span key={m} className="bg-white border border-gray-200 rounded px-2 py-0.5 text-xs font-bold text-gray-700 tracking-tight">
										<img src={`/images/payments/PAY-${m}.jpg`} alt={t.paymentMethod(m)} className="h-6" width={40} height={24} />
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</footer>

			{/* WhatsApp floating button */}
			<a href="https://wa.me/97470157900" target="_blank" rel="noopener noreferrer" aria-label={t.chatOnWhatsapp} className="fixed bottom-6 end-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-3 shadow-xl transition-colors">
				<WhatsAppIcon />
			</a>
		</>
	);
}
