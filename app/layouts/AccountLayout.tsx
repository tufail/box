import { Link, useLocation } from "react-router";
import { User, Package, Share2, Lock, ChevronRight } from "lucide-react";
import type { CustomerProfile } from "~/graphql/account";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { path: "/account", label: "Profile", icon: User },
  { path: "/account/orders", label: "My Orders", icon: Package },
  { path: "/account/social", label: "Social Accounts", icon: Share2 },
  { path: "/account/reset-password", label: "Security", icon: Lock },
];

interface AccountLayoutProps {
  children: React.ReactNode;
  customer: CustomerProfile;
}

export default function AccountLayout({ children, customer }: AccountLayoutProps) {
  const { pathname } = useLocation();
  const currentNav = navItems.find((n) => n.path === pathname);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-emerald-600 transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">
            {currentNav?.label ?? "Account"}
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
                {navItems.map(({ path, label, icon: Icon }) => {
                  const active = pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      className={`flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                        active
                          ? "border-emerald-600 text-emerald-700"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  );
                })}
              </div>

              {/* Desktop nav links */}
              <nav className="hidden md:block py-2">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const active = pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                        active
                          ? "text-emerald-700 bg-emerald-50 border-r-2 border-emerald-600"
                          : "text-gray-600 hover:text-emerald-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
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
