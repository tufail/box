import { useEffect, useState } from "react";

// Defaults to false (matches the server-rendered markup, so there's no
// hydration mismatch) and flips true once the client confirms the viewport is
// at least the site's `md` breakpoint (768px, same one the header's own
// `hidden md:flex` / `md:hidden` nav switches on) — stays in sync across resizes.
export function useIsDesktop() {
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		const mql = window.matchMedia("(min-width: 768px)");
		setIsDesktop(mql.matches);
		const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return isDesktop;
}
