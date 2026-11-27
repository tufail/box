import { redirect, useLocation } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/contact-us";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CMS_PAGE_BY_SLUG, type CmsPageData } from "~/graphql/pages";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, hreflangTags } from "~/lib/i18n";
import { FAQS } from "~/lib/faqData";
import { MessageCircle, Mail, Clock, MapPin, Send, Navigation, ChevronDown, Truck, ShieldCheck, Headphones, CreditCard } from "lucide-react";

const REAL_PHONE = "+974 7015 7900";
const REAL_PHONE_TEL = "+97470157900";
const REAL_EMAIL = "sales@nutribox.qa";
const REAL_ADDRESS = "AK Group Building Office no 2, 1st Floor Building No. 41, 343 Al Sadd St, Doha, Qatar";
// Google's documented cross-platform "Get Directions" URL. A short business-name
// query resolves to the actual POI (showing "NutriBox" as the destination); the
// full street address alone tends to just resolve to a raw address point instead.
const MAPS_LINK = "https://www.google.com/maps/dir/?api=1&destination=NutriBox,+Doha,+Qatar";
// Google's stable per-place permalink (cid = the place's unique Google Maps ID,
// decimal form of the CID in its share link) -- unlike a lat/lng or text-search
// query, this always resolves to the actual "NutriBox" business listing, so the
// embedded pin is labeled with our name instead of showing an anonymous dot.
const MAPS_EMBED_SRC = "https://www.google.com/maps?cid=14438553157542370874&output=embed";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
	en: {
		title: "Supplement Store in Doha, Qatar - Location & Contact | NutriBox",
		description: "Visit NutriBox, a supplement and protein store on Al Sadd St, Doha. Get directions, or call or WhatsApp +974 7015 7900 for orders and same-day delivery.",
		breadcrumbHome: "Home",
		breadcrumbContact: "Contact Us",
		eyebrow: "Contact Us",
		h1: "Visit Our Doha Supplement Store",
		intro: "Drop by our store on Al Sadd St in Doha, or reach our team about a product, your order or delivery. We're always happy to help.",
		contactInfoHeading: "Contact Information",
		contactInfoIntro: "You can reach us anytime through WhatsApp, call or email. We usually respond within a few hours.",
		whatsappCallLabel: "WhatsApp / Call",
		emailLabel: "Email",
		hoursLabel: "Store & Support Hours",
		hours: "Sat-Thu 11am-10pm, Fri 3:30-9:30pm",
		locationLabel: "Our Location",
		locationCity: "Al Sadd, Doha, Qatar",
		formHeading: "Send Us a Message",
		nameLabel: "Your Name",
		emailFieldLabel: "Your Email",
		subjectLabel: "Select Subject",
		subjects: ["Order Inquiry", "Product Question", "Business & Wholesale", "General Enquiry"],
		messageLabel: "Your Message",
		send: "Send Message",
		mapHeading: "Visit NutriBox: Sports Nutrition & Supplements Store in Al Sadd, Doha",
		storeIntro: "Explore whey protein, creatine, pre-workout, vitamins and wellness supplements from leading international brands at our Al Sadd store, or shop online with express delivery in Doha and nationwide.",
		getDirections: "Get Directions",
		faqHeading: "Frequently Asked Questions",
		// Location FAQs, shown before the general ones (and in the FAQPage schema).
		// Facts only from what the site already states (address, hours, pickup).
		// Delivery pricing is distance-based (qatar-shipping plugin), so no fixed
		// fee/zone promise here -- checkout shows the real quote.
		localFaqs: [
			{ q: "Where is NutriBox located in Doha?", a: "NutriBox is at AK Group Building, Office No. 2, 1st Floor, Building No. 41, 343 Al Sadd St, Doha, Qatar. Use the Get Directions button above for Google Maps directions." },
			{ q: "Can I visit the NutriBox store in Al Sadd?", a: "Yes. Our Al Sadd store is open Saturday to Thursday, 11am to 10pm, and Friday, 3:30pm to 9:30pm. You can also choose store pickup for online orders, or have them delivered to your location." },
			{ q: "What can I find at the NutriBox store?", a: "Sports nutrition and health supplements from leading international brands, including whey protein, creatine, pre-workout, amino acids, vitamins, collagen and wellness products, subject to availability." },
			{ q: "Does NutriBox deliver outside Al Sadd?", a: "Yes. We deliver across Qatar, with express delivery in Doha. The delivery fee depends on your distance from our store and is shown before you pay at checkout." },
		],
		viewAll: "View All",
		trust: [
			{ icon: Truck, title: "Fast Doha Delivery" },
			{ icon: ShieldCheck, title: "100% Original Products" },
			{ icon: Headphones, title: "Dedicated Support" },
			{ icon: CreditCard, title: "Secure Shopping" },
		],
	},
	ar: {
		title: "متجر مكملات غذائية في الدوحة، قطر - الموقع والتواصل | نوتري بوكس",
		description: "زوروا نوتري بوكس، متجر المكملات الغذائية والبروتين في شارع السد بالدوحة. احصلوا على الاتجاهات أو اتصلوا أو راسلونا عبر واتساب على +974 7015 7900 للطلبات والتوصيل في نفس اليوم.",
		breadcrumbHome: "الرئيسية",
		breadcrumbContact: "تواصل معنا",
		eyebrow: "تواصل معنا",
		h1: "زوروا متجرنا للمكملات الغذائية في الدوحة",
		intro: "مرحبًا بكم في متجرنا في شارع السد بالدوحة، أو تواصلوا مع فريقنا بخصوص منتج أو طلب أو توصيل. يسعدنا مساعدتكم دائمًا.",
		contactInfoHeading: "معلومات التواصل",
		contactInfoIntro: "يمكنك التواصل معنا في أي وقت عبر واتساب أو الاتصال أو البريد الإلكتروني. نرد عادةً خلال ساعات قليلة.",
		whatsappCallLabel: "واتساب / اتصال",
		emailLabel: "البريد الإلكتروني",
		hoursLabel: "ساعات المتجر والدعم",
		hours: "السبت-الخميس 11 ص-10 م، الجمعة 3:30-9:30 م",
		locationLabel: "موقعنا",
		locationCity: "السد، الدوحة، قطر",
		formHeading: "أرسل لنا رسالة",
		nameLabel: "اسمك",
		emailFieldLabel: "بريدك الإلكتروني",
		subjectLabel: "اختر الموضوع",
		subjects: ["استفسار عن طلب", "سؤال عن منتج", "الأعمال والجملة", "استفسار عام"],
		messageLabel: "رسالتك",
		send: "إرسال الرسالة",
		mapHeading: "زوروا نوتري بوكس: متجر التغذية الرياضية والمكملات الغذائية في السد، الدوحة",
		storeIntro: "اكتشفوا بروتين مصل اللبن والكرياتين ومكملات ما قبل التمرين والفيتامينات ومنتجات العافية من أفضل العلامات العالمية في متجرنا بالسد، أو تسوقوا أونلاين مع توصيل سريع داخل الدوحة ولجميع أنحاء الدولة.",
		getDirections: "احصل على الاتجاهات",
		faqHeading: "الأسئلة الشائعة",
		localFaqs: [
			{ q: "أين يقع نوتري بوكس في الدوحة؟", a: "يقع نوتري بوكس في مبنى AK Group، مكتب رقم 2، الطابق الأول، مبنى رقم 41، 343 شارع السد، الدوحة، قطر. استخدموا زر «احصل على الاتجاهات» أعلاه للوصول عبر خرائط Google." },
			{ q: "هل يمكنني زيارة متجر نوتري بوكس في السد؟", a: "نعم. متجرنا في السد مفتوح من السبت إلى الخميس من 11 صباحًا حتى 10 مساءً، ويوم الجمعة من 3:30 حتى 9:30 مساءً. ويمكنكم أيضًا اختيار الاستلام من المتجر لطلباتكم الإلكترونية، أو توصيلها إلى موقعكم." },
			{ q: "ماذا أجد في متجر نوتري بوكس؟", a: "مكملات التغذية الرياضية والمكملات الصحية من أفضل العلامات العالمية، منها بروتين مصل اللبن والكرياتين ومكملات ما قبل التمرين والأحماض الأمينية والفيتامينات والكولاجين ومنتجات العافية، حسب التوفر." },
			{ q: "هل يوصّل نوتري بوكس خارج منطقة السد؟", a: "نعم. نوصّل لجميع أنحاء قطر، مع توصيل سريع داخل الدوحة. تعتمد رسوم التوصيل على المسافة من متجرنا، وتظهر قبل الدفع عند إتمام الطلب." },
		],
		viewAll: "عرض الكل",
		trust: [
			{ icon: Truck, title: "توصيل سريع في الدوحة" },
			{ icon: ShieldCheck, title: "منتجات أصلية 100%" },
			{ icon: Headphones, title: "دعم مخصص" },
			{ icon: CreditCard, title: "تسوق آمن" },
		],
	},
} as const;

// "Contact Us" content belongs in the CMS pages system, same as About/Terms/
// Privacy/Refund Policy already managed there — a hardcoded route with no
// admin editability is the odd one out. Rather than assuming a CMS page with
// slug "contact-us" already exists, this checks for one and permanently
// redirects to it if found (staying within the same locale, e.g.
// /ar/contact-us -> /ar/pages/contact-us, never dropping an Arabic visitor
// into English), canonicalizing on the CMS version going forward; the static
// content below stays as a fallback until an admin creates that page, so this
// route never breaks either way. (Mirrors about.tsx's exact same pattern.)
export async function loader({ context, request }: Route.LoaderArgs) {
	const env = context.cloudflare.env;
	const locale = getLocaleFromPathname(new URL(request.url).pathname);
	try {
		const { data } = await graphqlRequest<CmsPageData>(env, GET_CMS_PAGE_BY_SLUG, { slug: "contact-us", languageCode: locale }, { request });
		if (data.getCmsPageBySlug) {
			throw redirect(localizePath("/pages/contact-us", locale), 301);
		}
	} catch (e) {
		if (e instanceof Response) throw e;
	}
	return null;
}

export function meta({ location }: Route.MetaArgs) {
	const locale = getLocaleFromPathname(location.pathname);
	const { title, description } = COPY[locale];
	const canonicalUrl = `${SITE_URL}${localizePath("/contact-us", locale)}`;
	return [{ title }, { name: "description", content: description }, { tagName: "link" as const, rel: "canonical", href: canonicalUrl }, ...hreflangTags(SITE_URL, "/contact-us"), { property: "og:type", content: "website" }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:url", content: canonicalUrl }, { property: "og:site_name", content: SITE_NAME }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: title }, { name: "twitter:description", content: description }];
}

// Location questions first, then the two top general store FAQs.
const pageFaqs = (locale: "en" | "ar") => [...COPY[locale].localFaqs, ...FAQS[locale].slice(0, 2)];

function buildJsonLd(locale: "en" | "ar") {
	const { title, description, breadcrumbHome, breadcrumbContact } = COPY[locale];
	const canonicalUrl = `${SITE_URL}${localizePath("/contact-us", locale)}`;
	const faqs = pageFaqs(locale);
	return [
		{ "@context": "https://schema.org", "@type": "ContactPage", name: title, url: canonicalUrl, description },
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: breadcrumbHome, item: localeHomeUrl(SITE_URL, locale) },
				{ "@type": "ListItem", position: 2, name: breadcrumbContact, item: canonicalUrl },
			],
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: faqs.map((item) => ({
				"@type": "Question",
				name: item.q,
				acceptedAnswer: { "@type": "Answer", text: item.a },
			})),
		},
	];
}

// No transactional email service is wired into this app (only Listmonk for
// newsletter signups) — rather than fake an AJAX submit that silently goes
// nowhere, or hold this page back on backend work, the form opens the
// visitor's own email client with the fields pre-filled -- an actual email to
// a real inbox, not a no-op. Swap for a real POST once a contact-form
// backend/email service exists.
function buildMailtoHref(name: string, email: string, subject: string, message: string): string {
	const lines = [message, "", name && email ? `${name} <${email}>` : name || email].filter(Boolean).join("\n");
	const params = new URLSearchParams({ subject: subject || "Website enquiry", body: lines });
	return `mailto:${REAL_EMAIL}?${params.toString()}`;
}

export default function ContactUs() {
	const locale = getLocaleFromPathname(useLocation().pathname);
	const jsonLd = buildJsonLd(locale);
	const t = COPY[locale];
	const faqs = pageFaqs(locale);

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		window.location.href = buildMailtoHref(name, email, subject, message);
	}

	return (
		<div>
			{jsonLd.map((schema, i) => (
				<script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
			))}

			{/* Hero */}
			<div className="relative overflow-hidden bg-[#f4cab9]">
				<img src="/images/contact-us-banner.jpg" className="w-full h-full absolute top-0 object-cover" alt="contact us" />
				<div className="container max-w-6xl z-10 mx-auto px-4 grid grid-cols-2 items-center gap-6 min-h-[140px] md:min-h-[300px]">
					<div className="py-8 md:py-0 relative z-10">
						<p className="hidden md:block text-xs font-bold uppercase tracking-widest text-primary mb-2">{t.eyebrow}</p>
						<h1 className="font-heading text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-3">{t.h1}</h1>
						<p className="hidden md:block text-sm text-gray-700 max-w-md">{t.intro}</p>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 py-10 max-w-6xl">
				{/* Contact Information / Send Us a Message / Our Location */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10 items-start">
					{/* Contact Information */}
					<div className="p-5">
						<h2 className="font-bold text-gray-900 mb-2">{t.contactInfoHeading}</h2>
						<p className="text-xs text-gray-500 mb-5">{t.contactInfoIntro}</p>
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
									<MessageCircle size={16} className="text-primary" />
								</span>
								<div>
									<p className="text-xs text-gray-500">{t.whatsappCallLabel}</p>
									<a href={`tel:${REAL_PHONE_TEL}`} className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">
										{REAL_PHONE}
									</a>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
									<Mail size={16} className="text-primary" />
								</span>
								<div>
									<p className="text-xs text-gray-500">{t.emailLabel}</p>
									<a href={`mailto:${REAL_EMAIL}`} className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors break-all">
										{REAL_EMAIL}
									</a>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
									<Clock size={16} className="text-primary" />
								</span>
								<div>
									<p className="text-xs text-gray-500">{t.hoursLabel}</p>
									<p className="font-semibold text-sm text-gray-900">{t.hours}</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
									<MapPin size={16} className="text-primary" />
								</span>
								<div>
									<p className="text-xs text-gray-500">{t.locationLabel}</p>
									<p className="font-semibold text-sm text-gray-900">{t.locationCity}</p>
								</div>
							</div>
						</div>
					</div>

					{/* Send Us a Message */}
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
						<h2 className="font-bold text-gray-900 mb-4">{t.formHeading}</h2>
						<form onSubmit={handleSubmit} className="flex flex-col gap-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<input required value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder={`${t.nameLabel} *`} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
								<input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={`${t.emailFieldLabel} *`} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
							</div>
							<select required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700">
								<option value="" disabled>
									{t.subjectLabel} *
								</option>
								{t.subjects.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
							<textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`${t.messageLabel} *`} rows={5} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
							<button type="submit" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm py-3 rounded-full transition-colors">
								<Send size={16} />
								{t.send}
							</button>
						</form>
					</div>

					{/* Our Location */}
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
						<h2 className="font-bold text-gray-900 p-5 pb-0 mb-3">{t.mapHeading}</h2>
						<iframe title={t.mapHeading} src={MAPS_EMBED_SRC} className="w-full h-48 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
						<div className="p-5 flex items-start gap-3">
							<MapPin size={16} className="text-primary flex-shrink-0 mt-0.5" />
							<div className="min-w-0 flex-1">
								<p className="font-semibold text-sm text-gray-900">{SITE_NAME}</p>
								<p className="text-xs text-gray-500">{REAL_ADDRESS}</p>
							</div>
						</div>
						<p className="px-5 pb-4 -mt-1 text-xs text-gray-600 leading-relaxed">{t.storeIntro}</p>
						<a href={MAPS_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 mx-5 mb-5 border border-primary text-primary hover:bg-primary hover:text-white text-sm font-semibold py-2.5 rounded-full transition-colors">
							<Navigation size={14} />
							{t.getDirections}
						</a>
					</div>
				</div>

				{/* FAQ */}
				<div className="mb-4">
					<div className="flex items-center justify-between mb-5">
						<h2 className="text-xl font-bold text-gray-900">{t.faqHeading}</h2>
						<a href="/#faq" className="text-sm font-medium text-primary hover:underline">
							{t.viewAll}
						</a>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{faqs.map((item, i) => (
							<details key={i} className="group bg-white open:bg-gray-50 rounded-xl border border-gray-100 shadow-sm open:shadow-md px-4 py-3 transition-all">
								<summary className="flex items-center justify-between gap-3 cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
									<span className="text-sm font-semibold text-gray-900">{item.q}</span>
									<ChevronDown size={16} className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
								</summary>
								<p className="text-xs text-gray-500 leading-relaxed mt-2">{item.a}</p>
							</details>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
