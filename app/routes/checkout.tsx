import CheckoutLayout from "../layouts/CheckoutLayout";
import { Outlet } from "react-router";

export default function CheckoutRoute() {
	return (
		<CheckoutLayout>
			<Outlet />
		</CheckoutLayout>
	);
}
