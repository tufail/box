import { redirect, useLocation } from "react-router";
import type { Route } from "./+types/about";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CMS_PAGE_BY_SLUG, type CmsPageData } from "~/graphql/pages";
import { SITE_NAME, SITE_URL } from "~/lib/seo";
import { getLocaleFromPathname, localizePath, localeHomeUrl, hreflangTags } from "~/lib/i18n";

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: {
    title: "About NutriBox Qatar — Premium Health & Quality",
    description: "Learn about NutriBox Qatar's mission to deliver 100% authentic health and sports nutrition products across Qatar.",
    breadcrumbHome: "Home",
    breadcrumbAbout: "About",
    h1: "About NutriBox",
    p1: "NutriBox is your trusted destination for premium health and sports nutrition products in Qatar. We guarantee 100% authentic products sourced directly from certified distributors.",
    p2: "Our mission is to support your health journey with quality supplements, fast delivery, and exceptional customer service.",
    contactHeading: "Contact Us",
    contactLine: "Customer Care: +974 7015 7900",
  },
  ar: {
    title: "عن NutriBox قطر — الصحة والجودة أولاً",
    description: "تعرّف على مهمة NutriBox قطر في توفير منتجات صحية ورياضية أصلية 100% في جميع أنحاء قطر.",
    breadcrumbHome: "الرئيسية",
    breadcrumbAbout: "من نحن",
    h1: "عن NutriBox",
    p1: "NutriBox هي وجهتك الموثوقة للمنتجات الصحية والرياضية المتميزة في قطر. نضمن لك منتجات أصلية 100% مصدرها موزعون معتمدون مباشرة.",
    p2: "مهمتنا هي دعم رحلتك الصحية بمكملات عالية الجودة، وتوصيل سريع، وخدمة عملاء متميزة.",
    contactHeading: "تواصل معنا",
    contactLine: "خدمة العملاء: 7900 7015 974+",
  },
} as const;

// "About" content belongs in the CMS pages system, same as the Terms/Privacy/
// Refund Policy pages already managed there — a hardcoded route with no image,
// no admin editability, and no indexing control is the odd one out. Rather than
// assuming a CMS page with slug "about" already exists, this checks for one and
// permanently redirects to it if found (staying within the same locale, e.g.
// /ar/about -> /ar/pages/about, never dropping an Arabic visitor into English),
// canonicalizing on the CMS version going forward; the static content below
// stays as a fallback until an admin creates that page, so this route never
// breaks either way.
export async function loader({ context, request }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const locale = getLocaleFromPathname(new URL(request.url).pathname);
  try {
    const { data } = await graphqlRequest<CmsPageData>(env, GET_CMS_PAGE_BY_SLUG, { slug: "about" }, { request });
    if (data.getCmsPageBySlug) {
      throw redirect(localizePath("/pages/about", locale), 301);
    }
  } catch (e) {
    if (e instanceof Response) throw e;
  }
  return null;
}

export function meta({ location }: Route.MetaArgs) {
  const locale = getLocaleFromPathname(location.pathname);
  const { title, description } = COPY[locale];
  const canonicalUrl = `${SITE_URL}${localizePath("/about", locale)}`;
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link" as const, rel: "canonical", href: canonicalUrl },
    ...hreflangTags(SITE_URL, "/about"),
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonicalUrl },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

function buildJsonLd(locale: "en" | "ar") {
  const { title, description, breadcrumbHome, breadcrumbAbout } = COPY[locale];
  const canonicalUrl = `${SITE_URL}${localizePath("/about", locale)}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: title,
      url: canonicalUrl,
      description,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: breadcrumbHome, item: localeHomeUrl(SITE_URL, locale) },
        { "@type": "ListItem", position: 2, name: breadcrumbAbout, item: canonicalUrl },
      ],
    },
  ];
}

export default function About() {
  const locale = getLocaleFromPathname(useLocation().pathname);
  const jsonLd = buildJsonLd(locale);
  const { h1, p1, p2, contactHeading, contactLine } = COPY[locale];

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {jsonLd.map((schema, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}
      <h1 className="text-3xl font-bold mb-6">{h1}</h1>
      <p className="text-gray-700 mb-4">{p1}</p>
      <p className="text-gray-700 mb-4">{p2}</p>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">{contactHeading}</h2>
        <p className="text-gray-700">{contactLine}</p>
      </div>
    </div>
  );
}
