/**
 * Windows rendering tier — the OS counterpart to the perf tier.
 *
 * Chromium on Windows still regularly falls back to software compositing
 * (driver blocklists, "hardware acceleration" toggled off by default on some
 * builds, fractional display scaling like the default 125%). Under software
 * rendering two classes of effect that are free on macOS/Android become
 * visibly broken or brutally expensive:
 *
 *   • `-webkit-background-clip: text` headlines can rasterise blank or black
 *     (the gradient layer is dropped and the text keeps its transparent fill);
 *   • per-frame `filter: blur()` resamples the whole layer on the CPU, which
 *     is why the carousels smear, tear and stutter;
 *   • `backdrop-filter` layers (sticky glass cards, the lightbox scrim)
 *     glitch, flicker or never paint at all.
 *
 * The tier is stamped on `<html data-os="…">` by an inline script in <head>
 * before the first paint, so:
 *   • CSS branches on `[data-os='windows']` with no flash of broken styling;
 *   • React reads the attribute instead of sniffing the UA again, so server
 *     and client markup can never disagree (no hydration mismatch).
 *
 * Visual fallbacks live in the `html[data-os='windows']` block at the end of
 * globals.css; behaviour decisions read the attribute directly (see
 * Carousel3D). It carries no judgement about device power — a gaming PC on
 * Windows keeps the full effects; only the known-broken ones are swapped.
 */

export const WINDOWS_OS_ATTRIBUTE = 'data-os';
export const WINDOWS_OS_VALUE = 'windows';

/**
 * Runs in <head> before paint. Kept as a plain string so it can be dropped
 * into a <script> tag with zero imports — it must never wait for a bundle.
 */
export const OS_TAG_VALUE_SCRIPT = `(function(){try{
  var d=document.documentElement;
  var m=/Windows NT ([0-9]+)/.exec(navigator.userAgent||'');
  d.setAttribute('data-os', m ? 'windows' : 'other');
}catch(e){}})();`;

/** Pre-paint read of the OS tag. Safe during SSR (defaults to 'other'). */
export function readOsTag(): string {
  if (typeof document === 'undefined') return 'other';
  return document.documentElement.getAttribute(WINDOWS_OS_ATTRIBUTE) || 'other';
}
