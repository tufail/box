// Shared SEO constants — keeping these in one place avoids each route
// re-deriving the same site facts.
export const SITE_URL = "https://nutribox.qa";
// Includes "Qatar" (not just the brand mark) deliberately — this is the actual
// public-facing business name (confirmed on the live nutribox.qa site's own
// "Company Name" field) and reinforces local SEO for a single-country, .qa business.
// Used for title suffixes, og:site_name, and JSON-LD name fields; the visual
// header/footer brand lockup stays plain "NutriBox" since that's the logo mark.
export const SITE_NAME = "NutriBox Qatar";
// Default social-share image (1200x630) for pages without their own image.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/common.jpg`;

// Adds "Page N" to a listing title from page 2 on, so paginated pages don't all share
// page 1's exact title. The label goes right after the main title (before the first
// " | " segment, or before the trailing " - SITE_NAME"), e.g.
//   "Whey Protein | Quick Delivery | NutriBox"  ->  "Whey Protein - Page 2 | Quick Delivery | NutriBox"
//   "Creatine - NutriBox Qatar"                 ->  "Creatine - Page 2 - NutriBox Qatar"
// Page 1 is returned untouched.
export function withPageSuffix(title: string, page: number, locale: "en" | "ar"): string {
  if (page <= 1) return title;
  const label = `${locale === "ar" ? "صفحة" : "Page"} ${page}`;
  const parts = title.split(/\s*\|\s*/).map((part) => part.trim());
  if (parts.length > 1) {
    parts[0] = `${parts[0]} - ${label}`;
    return parts.join(" | ");
  }
  const siteSuffix = ` - ${SITE_NAME}`;
  return title.endsWith(siteSuffix) ? `${title.slice(0, -siteSuffix.length)} - ${label}${siteSuffix}` : `${title} - ${label}`;
}

// The admin rich-text editor (TipTap) stamps every link it creates with
// target="_blank" rel="noopener noreferrer nofollow". For links to our own site that
// is wrong: nofollow tells Google not to pass ranking signal to the page we're
// deliberately linking (e.g. a blog post pointing at a category), and a new tab is
// odd for in-store navigation. For internal links (relative, #anchor, or
// https://nutribox.qa/...) this strips target/nofollow and makes absolute URLs
// relative. External links are left untouched.
export function cleanInternalLinks(html: string | null | undefined): string {
  if (!html) return html ?? "";
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    const href = /\shref\s*=\s*"([^"]*)"/i.exec(tag)?.[1];
    if (href == null) return tag;
    const abs = /^https?:\/\/(?:www\.)?nutribox\.qa(\/[^"]*)?$/i.exec(href);
    const internal = !!abs || (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#");
    if (!internal) return tag;
    let out = tag;
    if (abs) out = out.replace(/(\shref\s*=\s*")[^"]*"/i, (_m, pre: string) => `${pre}${abs[1] || "/"}"`);
    out = out.replace(/\starget\s*=\s*"[^"]*"/i, "");
    out = out.replace(/\srel\s*=\s*"([^"]*)"/i, (_m, v: string) => {
      const kept = v.split(/\s+/).filter((t) => t && !/^(nofollow|noopener|noreferrer)$/i.test(t));
      return kept.length ? ` rel="${kept.join(" ")}"` : "";
    });
    return out;
  });
}

// Same idea for meta descriptions: page 2+ get a "Page N:" prefix so the paginated
// pages don't share page 1's exact description. Page 1 is returned untouched.
export function withPagePrefix(description: string, page: number, locale: "en" | "ar"): string {
  if (page <= 1) return description;
  return `${locale === "ar" ? "صفحة" : "Page"} ${page}: ${description}`;
}
