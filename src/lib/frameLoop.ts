/**
 * One frame loop for the whole page.
 *
 * Before this existed, every JS-driven animation owned its own
 * `requestAnimationFrame` loop: the four botanical corners each spun one
 * forever (even off-screen and in background tabs) and the carousels ran one
 * each for as long as they were in view. On a phone that is four to eight
 * concurrent loops competing for the same main thread.
 *
 * Subscribers now share a single loop, may declare their own frame rate, and
 * simply stop when they have nothing left to animate — when the last one
 * unsubscribes the loop stops requesting frames entirely, so an idle page
 * costs zero script time.
 *
 * Usage:
 *   const sub = subscribe((now) => update(now), { fps: 30 });
 *   sub.stop();   // and always stop on unmount
 */

export interface FrameSubscription {
  /** Detach from the loop. Idempotent. */
  stop(): void;
}

export type FrameCallback = (now: number, dt: number) => void;

interface Subscriber {
  fn: FrameCallback;
  /** Minimum frame interval in ms. */
  interval: number;
  /** Earliest timestamp this subscriber may run again. */
  next: number;
  last: number;
}

/** Gaps longer than this (tab restore, long task) are clamped, never integrated raw. */
const MAX_DT = 64;

const subscribers = new Set<Subscriber>();
let rafId: number | null = null;

function schedule() {
  if (rafId !== null || subscribers.size === 0) return;
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
  rafId = window.requestAnimationFrame(run);
}

function run(now: number) {
  rafId = null;
  const due: Subscriber[] = [];
  for (const sub of subscribers) {
    if (now >= sub.next) due.push(sub);
  }
  for (const sub of due) {
    // A subscriber may have unsubscribed while an earlier one ran this frame.
    if (!subscribers.has(sub)) continue;
    const dt = sub.last === 0 ? 0 : Math.min(MAX_DT, now - sub.last);
    sub.last = now;
    sub.next = now + sub.interval;
    try {
      sub.fn(now, dt);
    } catch {
      /* One broken subscriber must never take the shared loop down. */
    }
  }
  schedule();
}

/**
 * Join the shared loop. `fps` caps how often the callback runs on this device
 * (60 = every frame on a 60Hz display; lower values shed work on weak hardware
 * without changing what the animation looks like, only how finely it steps).
 */
export function subscribe(fn: FrameCallback, opts?: { fps?: number }): FrameSubscription {
  if (typeof window === 'undefined') return { stop() {} };

  const fps = Math.min(60, Math.max(1, opts?.fps ?? 60));
  const sub: Subscriber = { fn, interval: 1000 / fps, next: 0, last: 0 };
  subscribers.add(sub);
  schedule();

  return {
    stop() {
      subscribers.delete(sub);
    },
  };
}

/** Number of live subscribers — used by verification scripts and tests. */
export function frameLoopSize(): number {
  return subscribers.size;
}
