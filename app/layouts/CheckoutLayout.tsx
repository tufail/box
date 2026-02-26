import { Outlet, Link } from "react-router";

export default function CheckoutLayout({ children }: { children?: React.ReactNode }) {
	return (
		<div className="min-h-screen flex flex-col bg-gray-50">
			<header className="bg-white border-b">
				<div className="container mx-auto p-4 flex items-center">
					<Link to="/" className="font-bold text-xl">
						PHQ
					</Link>
					<div className="ml-auto">Checkout</div>
				</div>
			</header>

			<main className="flex-1 container mx-auto p-4">
				<div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">{children ?? <Outlet />}</div>
			</main>

			<footer className="border-t p-4 text-center">Need help? support@phq.example</footer>
		</div>
	);
}
