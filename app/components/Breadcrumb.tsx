import Link from "~/components/LocaleLink";
import { useLocation } from "react-router";
import { ChevronRight } from "lucide-react";
import { getLocaleFromPathname } from "~/lib/i18n";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const locale = getLocaleFromPathname(useLocation().pathname);
  return (
    <nav aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"} className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={13} className="text-gray-400 flex-shrink-0 rtl:rotate-180" />}
            {isLast || !item.href ? (
              <span className={isLast ? "text-gray-900 font-medium truncate max-w-[200px]" : ""}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-primary transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
