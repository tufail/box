import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCart } from "~/context/CartContext";
import type { ActiveCustomer } from "~/graphql/checkout";

// The signed-in customer and the cart badge count, loaded in the browser instead of in the root
// loader. They used to be two uncached backend calls on every server render of every page, which
// also made each page's HTML visitor-specific. Now the loader only reports whether a session
// cookie exists (it is HttpOnly, so the browser can't tell), and this provider fetches
// /api/session once after hydration -- and again whenever the root loader revalidates (after
// login/logout, cart changes, ...), which is when these values used to refresh too. Visitors with
// no session cookie never make the call: they have no cart and no account by definition.
interface SessionContextValue {
	activeCustomer: ActiveCustomer | null;
}

const SessionContext = createContext<SessionContextValue>({ activeCustomer: null });

export function SessionProvider({ hasSession, revalidationKey, children }: { hasSession: boolean; revalidationKey: unknown; children: React.ReactNode }) {
	const { setCartCount } = useCart();
	const [activeCustomer, setActiveCustomer] = useState<ActiveCustomer | null>(null);
	const hadSession = useRef(false);

	useEffect(() => {
		if (!hasSession) {
			// Logged out (cookie cleared): drop the customer and the badge. A visitor who never had a
			// session keeps whatever the cart actions set -- no cookie yet means no server cart to read.
			setActiveCustomer(null);
			if (hadSession.current) setCartCount(0);
			hadSession.current = false;
			return;
		}
		hadSession.current = true;
		const controller = new AbortController();
		fetch("/api/session", { signal: controller.signal, credentials: "same-origin" })
			.then((r) => (r.ok ? (r.json() as Promise<{ cartCount: number; activeCustomer: ActiveCustomer | null }>) : null))
			.then((data) => {
				if (!data) return;
				setActiveCustomer(data.activeCustomer ?? null);
				setCartCount(data.cartCount ?? 0);
			})
			.catch(() => {
				// Aborted by a newer revalidation, or offline: keep the current values.
			});
		return () => controller.abort();
		// setCartCount is a stable useState setter.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasSession, revalidationKey]);

	return <SessionContext.Provider value={{ activeCustomer }}>{children}</SessionContext.Provider>;
}

export function useSession() {
	return useContext(SessionContext);
}
