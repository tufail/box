import { useEffect, useRef, useState } from "react";

// Shared by every place that shows a brand's logo from /images/brands/{code}.jpg
// (MegaMenu.tsx's desktop dropdown and mobile drawer, the /brands page) — only
// some brands have a real logo file. A missing one falls back to a single-letter
// monogram (not the full name) since the name doesn't fit legibly in a small
// box and just wraps/truncates awkwardly.
//
// State-driven (not the imperative e.currentTarget.style.display flavor of
// this pattern) because of an SSR hydration race: the browser starts fetching
// an <img>'s src as soon as it parses the server-rendered HTML, often before
// React hydrates and attaches the onError listener. A same-origin 404 (this
// is all of them, for brands with no logo file) frequently resolves faster
// than hydration completes, so the native error event fires on a
// listener-less node and is lost — the fallback never shows, even though the
// image genuinely failed. The mount-time check below catches that: it
// inspects the already-loaded (successfully or not) image via its ref,
// independent of whether the error event was there to hear it. Confirmed via
// direct DOM inspection during the /brands page build, not just a screenshot.
export default function BrandLogo({ code, name, className, rounded = "rounded-lg", padding = "p-2" }: { code: string; name: string; className?: string; rounded?: string; padding?: string }) {
	const [errored, setErrored] = useState(false);
	const imgRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		if (imgRef.current?.complete && imgRef.current.naturalWidth === 0) {
			setErrored(true);
		}
	}, []);

	if (errored) {
		return (
			<div className={`relative bg-lime-300 ${rounded} flex items-center justify-center ${className ?? ""}`}>
				<span className="font-heading font-extrabold text-black text-lg">{name.trim()[0]?.toUpperCase()}</span>
			</div>
		);
	}

	return (
		<div className={`relative bg-white ${rounded} overflow-hidden ${className ?? ""}`}>
			<img ref={imgRef} src={`/images/brands/${code}.jpg`} alt={name} className={`w-full h-full object-contain ${padding}`} loading="lazy" onError={() => setErrored(true)} />
		</div>
	);
}
