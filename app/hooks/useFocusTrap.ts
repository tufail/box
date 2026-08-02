import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared modal/dialog behavior: on open, remembers whatever had focus and moves
// focus inside the container; while open, Tab cycles only through focusable
// elements inside the container (so background page content can't receive
// focus) and Escape calls onClose; on close, focus returns to the trigger.
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
	const previouslyFocused = useRef<HTMLElement | null>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!active) return;
		const container = containerRef.current;
		if (!container) return;

		previouslyFocused.current = document.activeElement as HTMLElement | null;

		const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
		const first = focusables()[0];
		(first ?? container).focus({ preventScroll: true });

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onCloseRef.current();
				return;
			}
			if (e.key !== "Tab") return;
			const els = focusables();
			if (els.length === 0) return;
			const firstEl = els[0];
			const lastEl = els[els.length - 1];
			if (e.shiftKey && document.activeElement === firstEl) {
				e.preventDefault();
				lastEl.focus();
			} else if (!e.shiftKey && document.activeElement === lastEl) {
				e.preventDefault();
				firstEl.focus();
			}
		}

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			previouslyFocused.current?.focus?.({ preventScroll: true });
		};
	}, [active]);
}
