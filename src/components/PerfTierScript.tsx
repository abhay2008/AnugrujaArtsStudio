import { PERF_TIER_VALUE_SCRIPT } from '@/lib/perfTier';

/**
 * Stamps `data-perf="lite|full"` on <html> before the first paint so the CSS
 * tier overrides and the scroll-locked preloader are correct from the very
 * first frame — no flash of a heavy layer that then gets removed.
 *
 * Must stay in <head>, before any stylesheet-dependent paint.
 */
export default function PerfTierScript() {
  return <script dangerouslySetInnerHTML={{ __html: PERF_TIER_VALUE_SCRIPT }} />;
}
