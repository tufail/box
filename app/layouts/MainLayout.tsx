import type { MegaMenuData } from "~/graphql/megamenu";
import MegaMenu from "../components/MegaMenu";
import { Link } from "react-router";
import { CircleUser, Globe, Search, ShoppingCart } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  megaMenu: MegaMenuData["getMegaMenu"];
}

export default function MainLayout({ children, megaMenu }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-black py-1">
        <div className="container text-sm text-white mx-auto px-4 flex justify-between items-center">
          <div>100% Authentic Products</div>
          <button className="flex items-center gap-1 text-white hover:text-primary transition-colors">
            <Globe size={14} />
            <span>العربية</span>
          </button>
        </div>
      </div>
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 pt-3 pb-3 md:pt-4 md:pb-2 flex justify-between items-center">
          <Link to="/" className="font-bold text-xl ml-5 md:ml-0">
            <img
              src="/images/logo.svg"
              alt="PHQ Logo"
              width={120}
              height={40}
              className="h-6 md:h-10 inline-block mr-2"
            />
          </Link>
          <div className="w-1/2 relative hidden md:block">
            <input
              type="text"
              placeholder="Search Products, Brands"
              className="border border-gray-300 rounded-full py-2 text-sm px-4 w-full focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              className="absolute right-0 bg-primary text-white hover:bg-primary-dark rounded-l-none rounded-r-full h-full px-3 -translate-y-1/2 top-1/2 cursor-pointer"
              type="submit"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          </div>
          <div className="flex items-center gap-5">
            <Link
              to="/cart"
              className="text-gray-600 relative hover:text-primary transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={26} />
              <span className="absolute bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center -top-2 -right-2">
                3
              </span>
            </Link>
            <Link
              to="/account"
              className="text-gray-600 hover:text-primary transition-colors"
              aria-label="Account"
            >
              <CircleUser size={26} />
            </Link>
          </div>
        </div>
        <MegaMenu megaMenu={megaMenu} />
      </header>

      <main>{children}</main>

      <footer className="border-t p-4 text-center">© {new Date().getFullYear()} PHQ</footer>
    </div>
  );
}
