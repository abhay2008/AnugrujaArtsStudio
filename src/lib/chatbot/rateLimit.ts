/**
 * In-memory sliding-window rate limiter for the chat API.
 *
 * Active AI quota: 30 requests per 25-minute sliding window per IP.
 * Legacy minute/day factories remain for compatibility with older callers;
 * the chat endpoint uses only createSlidingRateLimiter.
 */

export interface RateVerdict {
  allowed: boolean;
  /** Seconds until the visitor may retry (only when blocked). */
  retryAfterSeconds: number;
  reason: 'minute' | 'day' | null;
}

interface WindowState {
  minuteTimestamps: number[];
  dayTimestamps: number[];
}

export interface RateLimiter {
  check(identifier: string, now?: number): RateVerdict;
}

export function createRateLimiter(options: { perMinute?: number; perDay?: number } = {}): RateLimiter {
  const perMinute = options.perMinute ?? 8;
  const perDay = options.perDay ?? 40;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const store = new Map<string, WindowState>();

  // Bound memory: drop windows that can no longer affect any decision
  // (older than the 24h day window). Runs at most once a minute.
  let lastPrune = 0;
  const prune = (now: number) => {
    if (now - lastPrune < 60_000) return;
    lastPrune = now;
    if (store.size < 500) return;
    for (const [key, win] of store) {
      const newest = win.dayTimestamps[win.dayTimestamps.length - 1];
      if (newest !== undefined && now - newest >= DAY_MS) store.delete(key);
    }
  };

  return {
    check(identifier: string, now: number = Date.now()): RateVerdict {
      prune(now);
      const window: WindowState = store.get(identifier) ?? { minuteTimestamps: [], dayTimestamps: [] };

      // Prune expired entries.
      window.minuteTimestamps = window.minuteTimestamps.filter((t) => now - t < 60_000);
      window.dayTimestamps = window.dayTimestamps.filter((t) => now - t < DAY_MS);

      if (window.minuteTimestamps.length >= perMinute) {
        const oldest = window.minuteTimestamps[0];
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((60_000 - (now - oldest)) / 1000)),
          reason: 'minute',
        };
      }
      if (window.dayTimestamps.length >= perDay) {
        const oldest = window.dayTimestamps[0];
        return {
          allowed: false,
          retryAfterSeconds: Math.max(60, Math.ceil((DAY_MS - (now - oldest)) / 1000)),
          reason: 'day',
        };
      }

      window.minuteTimestamps.push(now);
      window.dayTimestamps.push(now);
      store.set(identifier, window);

      return { allowed: true, retryAfterSeconds: 0, reason: null };
    },
  };
}

/**
 * Exact AI sliding window with bounded memory. The local responder is used
 * after the quota, rather than emitting an unhelpful HTTP 429.
 */
export function createSlidingRateLimiter(options: { maxRequests?: number; windowMs?: number; maxIdentifiers?: number } = {}) {
  const maxRequests = options.maxRequests ?? 30;
  const windowMs = options.windowMs ?? 25 * 60 * 1000;
  const maxIdentifiers = options.maxIdentifiers ?? 10_000;
  const logs = new Map<string, number[]>();
  let lastPrune = 0;
  return {
    check(identifier: string, now = Date.now()) {
      if (now - lastPrune >= 60_000) {
        lastPrune = now;
        for (const [key, times] of logs) {
          if (now - times[times.length - 1] >= windowMs) logs.delete(key);
        }
      }
      const times = (logs.get(identifier) ?? []).filter((t) => now - t < windowMs);
      if (times.length >= maxRequests) {
        logs.set(identifier, times);
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000)) };
      }
      // Do not evict active quotas to make room: unknown IPs use the local
      // responder while the bounded store is saturated.
      if (!logs.has(identifier) && logs.size >= maxIdentifiers) {
        return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
      }
      times.push(now);
      logs.set(identifier, times);
      return { allowed: true, remaining: maxRequests - times.length, retryAfterSeconds: 0 };
    },
  };
}

export const chatRateLimiter = createSlidingRateLimiter();

/**
 * Generous abuse cap applied to ALL chat traffic, including free layers.
 * Deterministic replies cost the studio nothing, so good-faith visitors get
 * plenty of headroom (30/min, 240/day) — but scrapers hammering the catalog
 * through the preprogrammed layer still hit a soft stop.
 */
export const freeLayerRateLimiter = createRateLimiter({ perMinute: 30, perDay: 240 });
