/**
 * In-memory sliding-window rate limiter for the chat API.
 *
 * Sized for the OpenRouter free tier (~1000 requests/day on accounts with
 * lifetime credits) with a comfortable margin: 8 messages per minute and
 * 40 messages per day per IP. Good-faith visitors never notice it; scrapers
 * and scripted abuse get a soft stop instead of burning the studio's quota.
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
 * Limiter for the OpenRouter LLM path only — sized to protect the free-tier
 * quota (8/min, 40/day). Because the route only consults this AFTER the
 * preprogrammed/FAQ/cache layers, deterministic answers never consume the
 * studio's OpenRouter budget.
 */
export const chatRateLimiter = createRateLimiter();

/**
 * Generous abuse cap applied to ALL chat traffic, including free layers.
 * Deterministic replies cost the studio nothing, so good-faith visitors get
 * plenty of headroom (30/min, 240/day) — but scrapers hammering the catalog
 * through the preprogrammed layer still hit a soft stop.
 */
export const freeLayerRateLimiter = createRateLimiter({ perMinute: 30, perDay: 240 });
