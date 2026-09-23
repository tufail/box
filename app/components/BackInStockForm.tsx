import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Bell, CheckCircle } from "lucide-react";
import type { Locale } from "~/lib/i18n";

// Cloudflare Turnstile: off unless VITE_TURNSTILE_SITE_KEY is set at build time
// (paired with TURNSTILE_SECRET_KEY on the worker, see workers/turnstile.ts).
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
	interface Window {
		turnstile?: {
			render: (el: HTMLElement, opts: Record<string, unknown>) => string;
			reset: (id: string) => void;
			remove: (id: string) => void;
		};
	}
}

function loadTurnstile(): Promise<void> {
	if (window.turnstile) return Promise.resolve();
	const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
	return new Promise((resolve, reject) => {
		const script = existing ?? document.createElement("script");
		script.addEventListener("load", () => resolve());
		script.addEventListener("error", () => reject());
		if (!existing) {
			script.src = TURNSTILE_SCRIPT;
			script.async = true;
			document.head.appendChild(script);
		}
	});
}

const COPY = {
	en: {
		notifyMe: "Notify Me",
		subtext: "This item is out of stock. We'll email you once when it's back.",
		emailAddress: "Email address",
		submit: "Notify Me",
		sending: "Sending...",
		done: "Done! We'll email you as soon as it's back in stock.",
		already: "You're already on the list for this item.",
	},
	ar: {
		notifyMe: "أبلغني عند التوفر",
		subtext: "هذا المنتج غير متوفر حاليًا. سنرسل لك بريدًا إلكترونيًا مرة واحدة عند توفره.",
		emailAddress: "البريد الإلكتروني",
		submit: "أبلغني",
		sending: "جارٍ الإرسال...",
		done: "تم! سنرسل لك بريدًا إلكترونيًا فور توفر المنتج.",
		already: "أنت مسجل بالفعل للإشعار بهذا المنتج.",
	},
};

interface BackInStockFormProps {
	productVariantId: string;
	locale: Locale;
	/** Pre-filled for logged-in customers */
	defaultEmail?: string;
}

/** Replaces the Add to Cart button on sold-out variants. */
export default function BackInStockForm({ productVariantId, locale, defaultEmail }: BackInStockFormProps) {
	const t = COPY[locale];
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState(defaultEmail ?? "");
	const [submittedFor, setSubmittedFor] = useState<string | null>(null);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const fetcher = useFetcher<{ ok?: boolean; alreadySubscribed?: boolean; error?: string }>();
	const sending = fetcher.state !== "idle";
	// Anti-bot: see workers/botCheck.ts. "company" below is the honeypot.
	const renderedAt = useRef(Date.now());
	const containerRef = useRef<HTMLDivElement>(null);
	const turnstileRef = useRef<HTMLDivElement>(null);
	const widgetId = useRef<string | null>(null);

	// Switching flavor shows a fresh form for the newly selected sold-out variant. Arriving
	// from a product card's "Notify Me" link (#notify-me) opens it straight away.
	useEffect(() => {
		setSubmittedFor(null);
		const fromNotifyLink = window.location.hash === "#notify-me";
		setOpen(fromNotifyLink);
		if (fromNotifyLink) containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [productVariantId]);

	const succeeded = fetcher.data?.ok === true && submittedFor === productVariantId;

	// Turnstile throws if asked to reset/remove a widget whose container React has
	// already unmounted (e.g. the form swapping to the success message), and a throw
	// inside an effect takes down the whole page. Never let it.
	function safeTurnstile(action: (id: string) => void) {
		const id = widgetId.current;
		if (!id || !window.turnstile) return;
		try {
			action(id);
		} catch {
			// widget already gone
		}
	}

	useEffect(() => {
		if (!open || succeeded || !TURNSTILE_SITE_KEY || !turnstileRef.current) return;
		let cancelled = false;
		loadTurnstile()
			.then(() => {
				if (cancelled || !turnstileRef.current || !window.turnstile) return;
				widgetId.current = window.turnstile.render(turnstileRef.current, {
					sitekey: TURNSTILE_SITE_KEY,
					// Invisible for most visitors; only shows a checkbox if Cloudflare is unsure.
					appearance: "interaction-only",
					language: locale,
					callback: (token: string) => setTurnstileToken(token),
					"expired-callback": () => setTurnstileToken(null),
					"error-callback": () => setTurnstileToken(null),
				});
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			safeTurnstile((id) => window.turnstile!.remove(id));
			widgetId.current = null;
			setTurnstileToken(null);
		};
	}, [open, succeeded, locale]);

	// Turnstile tokens are single-use: after a failed submission (the form is still
	// on screen) get a fresh one so the shopper can retry.
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data && !succeeded) {
			setTurnstileToken(null);
			safeTurnstile((id) => window.turnstile!.reset(id));
		}
	}, [fetcher.state, fetcher.data, succeeded]);
	const waitingForTurnstile = !!TURNSTILE_SITE_KEY && !turnstileToken;

	return (
		<div ref={containerRef} id="notify-me">
			{succeeded ? (
				<div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
					<CheckCircle size={18} className="mt-0.5 shrink-0" />
					<span>{fetcher.data?.alreadySubscribed ? t.already : t.done}</span>
				</div>
			) : !open ? (
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#3b8578] py-4 text-base font-bold text-white transition-colors hover:bg-[#2e6b61]"
				>
					<Bell size={18} />
					{t.notifyMe}
				</button>
			) : (
				<div className="w-full min-w-0">
					<p className="text-xs text-gray-500">{t.subtext}</p>
					<form
						className="relative mt-2 flex flex-col gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							const company = (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value ?? "";
							setSubmittedFor(productVariantId);
							fetcher.submit(
								{ productVariantId, email, company, renderedAt: renderedAt.current, locale, turnstileToken },
								{ method: "POST", action: "/api/stock-notification", encType: "application/json" },
							);
						}}
					>
						{/* Honeypot: off-screen and out of tab order, so real users never see or fill it. */}
						<input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden" />
						<label htmlFor="back-in-stock-email" className="sr-only">
							{t.emailAddress}
						</label>
						<input
							id="back-in-stock-email"
							type="email"
							required
							autoFocus
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t.emailAddress}
							disabled={sending}
							className="w-full min-w-0 rounded-full border border-gray-300 bg-white px-5 py-3.5 text-sm focus:border-primary focus:outline-none disabled:opacity-70"
						/>
						<button
							type="submit"
							disabled={sending || waitingForTurnstile}
							className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#3b8578] py-4 text-base font-bold text-white transition-colors hover:bg-[#2e6b61] disabled:cursor-not-allowed disabled:opacity-70"
						>
							{sending ? t.sending : t.submit}
						</button>
					</form>
					{TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="mt-2" />}
					{fetcher.data?.error && submittedFor === productVariantId && <p className="mt-1.5 text-xs text-red-600">{fetcher.data.error}</p>}
				</div>
			)}
		</div>
	);
}
