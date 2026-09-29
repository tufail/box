import type { Locale } from "~/lib/i18n";

// Shared with SeoFooterContent.tsx (homepage) and contact-us.tsx -- one source
// of truth rather than duplicating/drifting copies of the same real answers.
// Grounded in facts already established elsewhere on the site (trust badges,
// checkout flow, footer contact info) — not generic filler.
export const FAQS: Record<Locale, { q: string; a: string }[]> = {
	en: [
		{ q: "Does NutriBox deliver across Qatar?", a: "Yes - we deliver nationwide, with express delivery available in as little as two hours to same day and free delivery on orders over QAR 99." },
		{ q: "Are the products 100% authentic?", a: "Yes. Every product is sourced through verified channels - we only sell 100% authentic products from leading international brands." },
		{ q: "What payment methods can I use?", a: "You can pay online by card or choose Cash on Delivery at checkout." },
		{ q: "Do I need an account to place an order?", a: "No - you can check out as a guest with just your email address, or sign in with Google or Facebook for a faster checkout next time." },
		{ q: "Can I return a product if I change my mind?", a: "Yes, we offer hassle-free returns and refunds - details are shown at checkout and on our policy pages." },
		{ q: "How can I get in touch with NutriBox?", a: "Chat with us on WhatsApp, call +974 7015 7900, or email sales@nutribox.qa." },
	],
	ar: [
		{ q: "هل يوصل نوتري بوكس إلى جميع أنحاء قطر؟", a: "نعم - نوصل إلى جميع أنحاء قطر، مع إمكانية التوصيل السريع من ساعتين إلى نفس اليوم، وتوصيل مجاني للطلبات فوق 99 ريال قطري." },
		{ q: "هل المنتجات أصلية 100%؟", a: "نعم، يتم توفير كل منتج من خلال قنوات موثوقة - نتعامل فقط مع منتجات أصلية 100% من أشهر العلامات التجارية العالمية." },
		{ q: "ما هي طرق الدفع المتاحة؟", a: "يمكنك الدفع إلكترونيًا بالبطاقة أو اختيار الدفع عند الاستلام عند إتمام الطلب." },
		{ q: "هل يجب إنشاء حساب لإتمام الطلب؟", a: "لا - يمكنك إتمام الشراء كزائر باستخدام بريدك الإلكتروني فقط، أو تسجيل الدخول عبر جوجل أو فيسبوك لتسريع عملية الشراء في المرة القادمة." },
		{ q: "هل يمكنني إرجاع منتج إذا غيّرت رأيي؟", a: "نعم، نوفر سياسة إرجاع واسترداد سهلة وبدون تعقيد - التفاصيل متوفرة أثناء إتمام الطلب وفي صفحات سياساتنا." },
		{ q: "كيف يمكنني التواصل مع نوتري بوكس؟", a: "تواصل معنا عبر واتساب، أو اتصل على +974 7015 7900، أو راسلنا على sales@nutribox.qa." },
	],
} as const;
