import { redirect } from "react-router";
import type { Route } from "./+types/about";
import { graphqlRequest } from "workers/graphqlClient";
import { GET_CMS_PAGE_BY_SLUG, type CmsPageData } from "~/graphql/pages";
import { SITE_NAME, SITE_URL } from "~/lib/seo";

const TITLE = "About NutriBox Qatar — Premium Health & Quality";
const DESCRIPTION = "Learn about NutriBox Qatar's mission to deliver 100% authentic health and sports nutrition products across Qatar.";
const CANONICAL_URL = `${SITE_URL}/about`;

// "About" content belongs in the CMS pages system, same as the Terms/Privacy/
// Refund Policy pages already managed there — a hardcoded route with no image,
// no admin editability, and no indexing control is the odd one out. Rather than
// assuming a CMS page with slug "about" already exists, this checks for one and
// permanently redirects to it if found, canonicalizing on the CMS version going
// forward; the static content below stays as a fallback until an admin creates
// that page, so this route never breaks either way.
export async function loader({ context, request }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  try {
    const { data } = await graphqlRequest<CmsPageData>(env, GET_CMS_PAGE_BY_SLUG, { slug: "about" }, { request });
    if (data.getCmsPageBySlug) {
      throw redirect("/pages/about", 301);
    }
  } catch (e) {
    if (e instanceof Response) throw e;
  }
  return null;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { tagName: "link" as const, rel: "canonical", href: CANONICAL_URL },
    { property: "og:type", content: "website" },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:url", content: CANONICAL_URL },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: TITLE },
    { name: "twitter:description", content: DESCRIPTION },
  ];
}

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: TITLE,
    url: CANONICAL_URL,
    description: DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "About", item: CANONICAL_URL },
    ],
  },
];

export default function About() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {JSON_LD.map((schema, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}
      <h1 className="text-3xl font-bold mb-6">About NutriBox</h1>
      <p className="text-gray-700 mb-4">
        NutriBox is your trusted destination for premium health and sports nutrition products in Qatar.
        We guarantee 100% authentic products sourced directly from certified distributors.
      </p>
      <p className="text-gray-700 mb-4">
        Our mission is to support your health journey with quality supplements, fast delivery, and
        exceptional customer service.
      </p>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
        <p className="text-gray-700">Customer Care: +974 7015 7900</p>
      </div>
    </div>
  );
}
