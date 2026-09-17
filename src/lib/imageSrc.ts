import manifest from './imageVariants.json';

/**
 * Resolves the pre-built WebP derivatives produced by
 * `npm run images:optimize` (scripts/optimize-images.mjs).
 *
 * Used by the places that deliberately use a plain <img> instead of
 * next/image — the painting lightbox, the filmstrip thumbnails and the
 * homepage event photos. Those used to hand the browser the original
 * 250–420 KB JPEG; now they get a 30–130 KB WebP at the right width.
 *
 * Every function degrades to the original URL when a derivative is missing
 * (admin uploads created after the last optimize run, remote placeholders,
 * data URLs), so call sites never need to guard.
 */

export interface ImageVariantEntry {
  /** Natural width of the original. */
  w: number;
  /** Natural height of the original. */
  h: number;
  /** Derivative widths that exist on disk, ascending. */
  v: number[];
}

const ENTRIES = manifest as unknown as Record<string, ImageVariantEntry>;

const PREFIX = '/images/';
const OPT_DIR = '/images/opt/';

/** Flat derivative name: `/images/hero/fern.png` → `hero-fern`. */
function derivativeBase(src: string): string | null {
  if (!src.startsWith(PREFIX) || src.startsWith(OPT_DIR)) return null;
  const rest = src.slice(PREFIX.length);
  if (!rest || rest.includes('..')) return null;
  return rest.replace(/\.[^.]+$/, '').replace(/\//g, '-');
}

/** Size of a local upload, when we know it. */
export function imageSize(src: string): { width: number; height: number } | null {
  const entry = ENTRIES[src];
  if (!entry) return null;
  return { width: entry.w, height: entry.h };
}

/** True when derivatives exist for this source. */
export function hasImageVariants(src: string): boolean {
  const entry = ENTRIES[src];
  return Boolean(entry && entry.v.length > 0 && derivativeBase(src));
}

/** The derivative closest to (but never smaller than) `width`, else the original. */
export function imageUrl(src: string, width: number): string {
  const entry = ENTRIES[src];
  const base = derivativeBase(src);
  if (!entry || !base || entry.v.length === 0) return src;
  const width_ = entry.v.find((w) => w >= width) ?? entry.v[entry.v.length - 1];
  return `${OPT_DIR}${base}-${width_}.webp`;
}

/** The tiny placeholder (a few hundred bytes) for blur-up style loading. */
export function lqipUrl(src: string): string | null {
  const base = derivativeBase(src);
  if (!base || !ENTRIES[src]) return null;
  return `${OPT_DIR}${base}-32.webp`;
}

/**
 * Full `<img>` prop set for an in-flow image: real dimensions (no layout
 * shift) plus a srcset across every derivative that exists.
 */
export function responsiveImage(
  src: string,
  sizes: string,
  fallbackWidth = 960
): {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
} {
  const entry = ENTRIES[src];
  const base = derivativeBase(src);
  if (!entry || !base || entry.v.length === 0) {
    return { src, width: entry?.w, height: entry?.h };
  }
  const srcSet = entry.v.map((w) => `${OPT_DIR}${base}-${w}.webp ${w}w`).join(', ');
  return {
    src: imageUrl(src, fallbackWidth),
    srcSet,
    width: entry.w,
    height: entry.h,
  };
}

/**
 * Widest useful lightbox image for this screen — phones never need the full
 * re-encode, desktops get it. Used both for the <img> and for the intent
 * preload, so the two always agree.
 */
export function lightboxWidth(): number {
  if (typeof window === 'undefined') return 960;
  return window.innerWidth >= 1024 ? 1600 : 960;
}

/** Sizes descriptor matching the lightbox frame: min(92vw, 1080px). */
export const LIGHTBOX_SIZES = '(max-width: 640px) 92vw, min(92vw, 1080px)';
