import type { Route } from "./+types/checkout";
import CheckoutLayout from "../layouts/CheckoutLayout";
import { Outlet } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Checkout — PHQ" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function CheckoutRoute() {
  return (
    <CheckoutLayout>
      <Outlet />
    </CheckoutLayout>
  );
}
