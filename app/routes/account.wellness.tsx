import { redirect } from "react-router";
import type { Route } from "./+types/account.wellness";
import { getLocaleFromPathname, localizePath } from "~/lib/i18n";

// The wellness quiz moved to /wellness so guests can use it without an account
// (logged-in customers still get the save/persist behavior there). This route
// stays only to keep old bookmarks/links alive.
export async function loader({ request }: Route.LoaderArgs) {
	const locale = getLocaleFromPathname(new URL(request.url).pathname);
	return redirect(localizePath("/wellness", locale));
}
