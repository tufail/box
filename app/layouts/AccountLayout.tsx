import { useLocation } from "react-router";
import Link from "~/components/LocaleLink";
import { User, Package, Share2, Lock, ChevronRight, MapPin, Wallet, HeartPulse, RefreshCw } from "lucide-react";
import type { CustomerProfile } from "~/graphql/account";
import { getLocaleFromPathname, stripLocalePrefix } from "~/lib/i18n";

interface NavItem {
  path: string;
  labelEn: string;
  labelAr: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { path: "/account", labelEn: "Profile", labelAr: "الملف الشخصي", icon: User },
  { path: "/account/orders", labelEn: "My Orders", labelAr: "طلباتي", icon: Package },
  { path: "/account/addresses", labelEn: "Addresses", labelAr: "العناوين", icon: MapPin },
  { path: "/account/wallet", labelEn: "My Wallet", labelAr: "محفظتي", icon: Wallet },
  { path: "/account/subscriptions", labelEn: "Subscriptions", labelAr: "الاشتراكات", icon: RefreshCw },
  { path: "/wellness", labelEn: "Wellness Plan", labelAr: "خطة العافية", icon: HeartPulse },
  { path: "/account/social", labelEn: "Social Accounts", labelAr: "الحسابات الاجتماعية", icon: Share2 },
  { path: "/account/reset-password", labelEn: "Security", labelAr: "الأمان", icon: Lock },
];

// AI-translated (not yet reviewed by a native Arabic speaker) — fine as a
// starting point, but worth a marketing/native review pass before this is
// considered final customer-facing copy.
const COPY = {
  en: { home: "Home", account: "Account" },
  ar: { home: "الرئيسية", account: "الحساب" },
} as const;

interface AccountLayoutProps {
  children: React.ReactNode;
  customer: CustomerProfile;
}

export default function AccountLayout({ children, customer }: AccountLayoutProps) {
  const { pathname } = useLocation();
  const locale = getLocaleFromPathname(pathname);
  const t = COPY[locale];
  // Account routes aren't indexed/crawled and stay unprefixed internally — comparing
  // against the bare path (after stripping /ar/*) keeps active-state matching correct
  // on both locales instead of only ever matching the English URLs.
  const bare = stripLocalePrefix(pathname);
  const currentNav = navItems.find((n) => n.path === bare);
  const label = (n: NavItem) => (locale === "ar" ? n.labelAr : n.labelEn);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-emerald-600 transition-colors">
            {t.home}
          </Link>
          <ChevronRight size={14} className="rtl:rotate-180" />
          <span className="text-gray-900 font-medium">
            {currentNav ? label(currentNav) : t.account}
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="md:w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Avatar card */}
              <div className="bg-emerald-600 px-6 py-5">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
                  <span className="text-white text-xl font-bold select-none">
                    {customer.firstName[0]?.toUpperCase()}
                    {customer.lastName[0]?.toUpperCase()}
                  </span>
                </div>
                <p className="text-white font-semibold truncate">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="text-emerald-100 text-xs truncate mt-0.5">
                  {customer.emailAddress}
                </p>
              </div>

              {/* Mobile tab strip */}
              <div className="flex md:hidden overflow-x-auto border-b border-gray-100">
                {navItems.map((item) => {
                  const active = bare === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                        active
                          ? "border-emerald-600 text-emerald-700"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <item.icon size={16} />
                      {label(item)}
                    </Link>
                  );
                })}
              </div>

              {/* Desktop nav links */}
              <nav className="hidden md:block py-2">
                {navItems.map((item) => {
                  const active = bare === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                        active
                          ? "text-emerald-700 bg-emerald-50 border-e-2 border-emerald-600"
                          : "text-gray-600 hover:text-emerald-700 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon size={16} />
                      {label(item)}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
