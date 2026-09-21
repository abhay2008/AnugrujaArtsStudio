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
 * hydration pass agree, then settles on the real value in an effect — and
 * follows a late promotion from the frame-time probe below.
 */
export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>('full');

  useEffect(() => {
    const sync = () => setTier(readPerfTier());
    sync();
    window.addEventListener(TIER_EVENT, sync);
    return () => window.removeEventListener(TIER_EVENT, sync);
  }, []);

  return tier;
}

/** Fired when a running page is demoted to `lite` (see `armTierProbe`). */
export const TIER_EVENT = 'studio-perf-tier';

/**
 * Demote this page to `lite` after the fact. One way, once per session: a
 * device that struggled does not get to prove itself again on the next swipe.
 */
function promoteToLite() {
  if (typeof document === 'undefined') return;
  if (document.documentElement.getAttribute(PERF_TIER_ATTRIBUTE) === 'lite') return;
  document.documentElement.setAttribute(PERF_TIER_ATTRIBUTE, 'lite');
  try {
    window.dispatchEvent(new CustomEvent(TIER_EVENT, { detail: { tier: 'lite' } }));
  } catch {
    /* the attribute already did the work; the event is only for React */
  }
}

/**
 * Measure the device instead of trusting the platform APIs.
 *
 * `navigator.deviceMemory` and `navigator.connection` are Chromium-only, so on
 * Safari and Firefox — which is where a lot of older phones live — the pre-paint
 * script can only see `hardwareConcurrency`, which vendors report optimistically.
 * Those visitors therefore used to get the full treatment on hardware that
 * cannot render it.
 *
 * This samples real frame times instead: while the page is visible, if a clear
 * majority of the first frames land slower than ~30 fps, the tier is demoted to
 * `lite` and every `[data-perf='lite']` rule in the stylesheet takes over. The
 * flip is CSS-only (the attribute on `<html>`), so nothing re-renders; the
 * event keeps `usePerfTier()` honest for the few behaviours that branch on it.
 *
 * Returns a teardown function. Safe to call anywhere, any number of times.
 */
export function armTierProbe(opts?: { maxMs?: number; sample?: number }): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (readPerfTier() === 'lite') return () => {};

  const maxMs = opts?.maxMs ?? 7000;
  const needed = opts?.sample ?? 36;
  const started = window.performance.now();
  let raf = 0;
  let last = 0;
  let frames = 0;
  let slow = 0;
  let done = false;

  const stop = () => {
    done = true;
    if (raf) window.cancelAnimationFrame(raf);
  };

  const tick = (now: number) => {
    if (done) return;
    /* A hidden tab (or a stall the browser caused) says nothing about this
       device, so those samples are dropped rather than counted. */
    const hidden = document.visibilityState === 'hidden';
    if (last && !hidden) {
      const dt = now - last;
      if (dt > 33) slow += 1;
      frames += 1;
    }
    last = now;

    if (frames >= needed) {
      stop();
      if (slow / frames > 0.5) promoteToLite();
      return;
    }
    if (now - started > maxMs) {
      stop();
      return;
    }
    raf = window.requestAnimationFrame(tick);
  };

  raf = window.requestAnimationFrame(tick);
  return stop;
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
