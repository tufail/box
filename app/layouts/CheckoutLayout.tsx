import { Link } from "react-router";
import { Lock } from "lucide-react";
import Footer from "~/components/Footer";

export default function CheckoutLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img
              src="/images/logo.svg"
              alt="PHQ"
              width={260}
              height={56}
              className="h-8 md:h-14 md:min-w-[260px] inline-block mr-2 md:mt-[-12px]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement)!.style.display =
                  "block";
              }}
            />
            <span className="hidden font-bold text-xl text-gray-900">PHQ</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock size={14} />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

      <Footer pageSections={[]} />
    </div>
  );
}
