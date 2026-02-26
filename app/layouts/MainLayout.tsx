import { Outlet, Link } from "react-router";
import MegaMenu from "~/components/MegaMenu";

export default function MainLayout({ children }: { children?: React.ReactNode }) {
	return (
		<div className="min-h-screen flex flex-col">
			<div className="bg-secondary py-1 ">
				<div className="container text-xs mx-auto px-4 flex justify-between items-center">
					<div>100% Authentic Products</div>
					<div>Customer Care: +974 77689275</div>
				</div>
			</div>
			<header className="bg-white border-b border-gray-200">
				<div className="container mx-auto p-4 flex justify-between items-center">
					<Link to="/" className="font-bold text-xl">
						<img src="/images/logo.png" alt="PHQ Logo" className="h-8 inline-block mr-2" />
					</Link>
					<nav>
						<Link to="/" className="mr-4">
							Home
						</Link>
						<Link to="/about" className="mr-4">
							About
						</Link>
						<Link to="/checkout">Checkout</Link>
					</nav>
				</div>
				<MegaMenu />
			</header>

			<main className="flex-1 container mx-auto p-4">{children ?? <Outlet />}</main>

			<footer className="border-t p-4 text-center">© {new Date().getFullYear()} PHQ</footer>
		</div>
	);
}
