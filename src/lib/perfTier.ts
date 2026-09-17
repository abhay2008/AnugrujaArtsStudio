'use client';

import { useEffect, useState } from 'react';

/**
 * Performance tier — the one place that decides how much the browser is asked
 * to do for this visitor.
 *
 * Policy (see PERF_TIER_VALUE_SCRIPT): a device is put on `lite` only when it
 * is genuinely constrained — the visitor asked for reduced motion, the
 * connection is 2G/3G or data-saver, or the device reports 2 GB of memory /
 * two cores. Everything else keeps the full treatment.
 *
 * The tier is stamped on <html data-perf="…"> by an inline script in <head>,
 * before the first paint, so:
 *   • CSS branches on `[data-perf='lite']` with no flash of the wrong layout,
 *   • React reads the attribute instead of re-deriving it, so server and
 *     client markup can never disagree (no hydration mismatch),
 *   • the expensive layers are never painted even once on a weak device.
 *
 * Adding a new tier cost: put *visual* changes in CSS keyed off the attribute;
 * use this hook only for behaviour (frame rates, what to preload, dust counts).
 */

export type PerfTier = 'lite' | 'full';

export const PERF_TIER_ATTRIBUTE = 'data-perf';

/**
 * Runs in <head> before paint. Kept as a plain string so it can be dropped into
 * a <script> tag with zero imports — it must never wait for a bundle.
 */
export const PERF_TIER_VALUE_SCRIPT = `(function(){try{
  var d=document.documentElement;
  var forced=(new URLSearchParams(location.search).get('perf')||'').toLowerCase();
  if(forced==='lite'||forced==='full'){d.setAttribute('data-perf',forced);return;}
  var reduced=false;
  try{reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  var c=navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;
  var saveData=!!(c&&c.saveData);
  var type=(c&&c.effectiveType)||'';
  var slowNet=(type==='slow-2g'||type==='2g'||type==='3g');
  var mem=typeof navigator.deviceMemory==='number'?navigator.deviceMemory:null;
  var cores=typeof navigator.hardwareConcurrency==='number'?navigator.hardwareConcurrency:null;
  var weak=reduced||saveData||slowNet||(mem!==null&&mem<=2)||(cores!==null&&cores<=2);
  d.setAttribute('data-perf',weak?'lite':'full');
}catch(e){}})();`;

/** Read the tier the inline script already decided. Safe during SSR. */
export function readPerfTier(): PerfTier {
  if (typeof document === 'undefined') return 'full';
  return document.documentElement.getAttribute(PERF_TIER_ATTRIBUTE) === 'lite' ? 'lite' : 'full';
}

/**
 * Live tier for behaviour decisions. Starts on `full` so the server and the
 * hydration pass agree, then settles on the real value in an effect.
 */
export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>('full');

  useEffect(() => {
    setTier(readPerfTier());
  }, []);

  return tier;
}

/**
 * True when the visitor is on a metered or slow link. Used to skip speculative
 * image work — never to remove content.
 */
export function isConstrainedConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!c) return false;
  return Boolean(c.saveData) || c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g';
}
