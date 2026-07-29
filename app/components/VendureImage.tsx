import { useState, useRef, useEffect } from "react";

// The asset server only accepts named presets (?preset=) — crop-vs-resize is
// baked into the preset name itself, so "cover" (crop-to-fill) and "contain"
// (resize, keep the whole image) each need their own size ladder rather than
// a single list + a separate mode param.
export type ImagePreset =
  | "tiny" | "thumb" | "small" | "medium" | "large" | "xlarge"
  | "crop-300" | "crop-500" | "crop-800" | "crop-1400";

// "blur" is a separate, dedicated preset for blur-up placeholders (20×20 crop)
// — distinct from "tiny" (50×50) — so it's not part of either size ladder.
type AnyPreset = ImagePreset | "blur";

interface Rung {
  max: number;
  preset: ImagePreset;
}

// objectFit="cover" ladder (crop-to-fill).
const CROP_LADDER: Rung[] = [
  { max: 50, preset: "tiny" },
  { max: 150, preset: "thumb" },
  { max: 300, preset: "crop-300" },
  { max: 500, preset: "crop-500" },
  { max: 800, preset: "crop-800" },
  { max: Infinity, preset: "crop-1400" },
];

// objectFit="contain" ladder (resize, whole image preserved).
const RESIZE_LADDER: Rung[] = [
  { max: 300, preset: "small" },
  { max: 500, preset: "medium" },
  { max: 800, preset: "large" },
  { max: Infinity, preset: "xlarge" },
];

function ladderFor(objectFit: "cover" | "contain"): Rung[] {
  return objectFit === "contain" ? RESIZE_LADDER : CROP_LADDER;
}

// Picks the smallest preset on the relevant ladder whose ceiling covers the
// requested pixel size, capping at that ladder's largest preset.
export function presetForSize(px: number, objectFit: "cover" | "contain" = "cover"): ImagePreset {
  const ladder = ladderFor(objectFit);
  return (ladder.find((rung) => px <= rung.max) ?? ladder[ladder.length - 1]).preset;
}

function stepUp(preset: ImagePreset, objectFit: "cover" | "contain"): ImagePreset {
  const ladder = ladderFor(objectFit);
  const idx = ladder.findIndex((rung) => rung.preset === preset);
  return idx === -1 || idx === ladder.length - 1 ? preset : ladder[idx + 1].preset;
}

export function vendureImageUrl(
  src: string,
  vendureBase: string,
  opts: { preset: AnyPreset; format?: "webp" | "jpg" | "png" }
): string {
  const base = vendureBase.replace(/\/shop-api\/?$/, "");
  const resolved = src.startsWith("http") ? src : `${base}${src}`;
  if (!base || !resolved.startsWith(base)) return resolved;
  try {
    const u = new URL(resolved);
    u.searchParams.set("preset", opts.preset);
    if (opts.format) u.searchParams.set("format", opts.format);
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
  const fit = objectFit === "cover" ? "object-cover" : "object-contain";

  const preset = presetForSize(Math.max(width, height), objectFit);
  const preset2x = stepUp(preset, objectFit);

  const optimizedSrc = isVendure
    ? vendureImageUrl(src, vendureBase, { preset, format: "webp" })
    : resolved;

  const srcSet = isVendure
    ? [
        `${vendureImageUrl(src, vendureBase, { preset, format: "webp" })} 1x`,
        `${vendureImageUrl(src, vendureBase, { preset: preset2x, format: "webp" })} 2x`,
      ].join(", ")
    : undefined;

  // No blur placeholder for eager images — they should be visible immediately,
  // and the extra request would compete with the LCP image itself.
  const blurSrc = !eager && isVendure ? vendureImageUrl(src, vendureBase, { preset: "blur", format: "webp" }) : null;

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
