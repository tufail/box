import { useState, useRef, useEffect } from "react";

export function vendureImageUrl(
  src: string,
  vendureBase: string,
  opts: { w?: number; h?: number; format?: "webp" | "jpg" | "png"; mode?: "crop" | "resize" } = {}
): string {
  const base = vendureBase.replace(/\/shop-api\/?$/, "");
  const resolved = src.startsWith("http") ? src : `${base}${src}`;
  if (!base || !resolved.startsWith(base)) return resolved;
  try {
    const u = new URL(resolved);
    if (opts.w !== undefined) u.searchParams.set("w", String(opts.w));
    if (opts.h !== undefined) u.searchParams.set("h", String(opts.h));
    if (opts.format) u.searchParams.set("format", opts.format);
    if (opts.mode) u.searchParams.set("mode", opts.mode);
    return u.toString();
  } catch {
    return resolved;
  }
}

interface Props {
  src: string;
  vendureBase: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  objectFit?: "cover" | "contain";
}

export default function VendureImage({
  src,
  vendureBase,
  alt,
  width,
  height,
  className = "",
  imgClassName = "",
  eager = false,
  objectFit = "cover",
}: Props) {
  // Eager images start as loaded=true so SSR renders them visible immediately.
  // Hiding them with opacity-0 until JS fires onLoad would delay LCP by the full
  // hydration time (typically 1–3 s), since the browser doesn't consider an
  // opacity-0 element as "painted" for LCP purposes.
  const [loaded, setLoaded] = useState(eager);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!eager) {
      setLoaded(false);
      if (imgRef.current?.complete) setLoaded(true);
    }
  }, [src, eager]);

  const base = vendureBase.replace(/\/shop-api\/?$/, "");
  const resolved = src.startsWith("http") ? src : `${base}${src}`;
  const isVendure = base.length > 0 && resolved.startsWith(base);
  const mode = objectFit === "cover" ? "crop" : "resize";
  const fit = objectFit === "cover" ? "object-cover" : "object-contain";

  const optimizedSrc = isVendure
    ? vendureImageUrl(src, vendureBase, { w: width, h: height, format: "webp", mode })
    : resolved;

  const srcSet = isVendure
    ? [
        `${vendureImageUrl(src, vendureBase, { w: width, h: height, format: "webp", mode })} 1x`,
        `${vendureImageUrl(src, vendureBase, { w: width * 2, h: height * 2, format: "webp", mode })} 2x`,
      ].join(", ")
    : undefined;

  // No blur placeholder for eager images — they should be visible immediately,
  // and the extra request would compete with the LCP image itself.
  const blurSrc = !eager && isVendure
    ? vendureImageUrl(src, vendureBase, { w: 20, h: 20, format: "webp", mode: "crop" })
    : null;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {blurSrc && (
        <img
          src={blurSrc}
          aria-hidden="true"
          alt=""
          className={`absolute inset-0 w-full h-full ${fit} scale-110 blur-xl transition-opacity duration-300 ${
            loaded ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        />
      )}
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(eager ? { fetchPriority: "high" } as any : { decoding: "async" })}
        onLoad={() => setLoaded(true)}
        className={`relative w-full h-full ${fit} transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${imgClassName}`}
      />
    </div>
  );
}
