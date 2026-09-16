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

  return {
    check(identifier: string, now: number = Date.now()): RateVerdict {
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

/** Singleton used by the chat route. */
export const chatRateLimiter = createRateLimiter();
