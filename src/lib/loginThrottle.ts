/**
 * Sign-in throttle for the admin gate.
 *
 * Keeps a stranger who finds `/login` from guessing the password quickly: after
 * a handful of failures from the same client, further attempts are refused for
 * a cooling-off window. Successful sign-in clears the counter.
 *
 * Scope: this is per-process state, which is exactly right for a single
 * long-lived Node server (local dev, a VPS, a container). On multi-instance
 * serverless it limits each instance separately, so treat it as a speed bump
 * rather than a hard guarantee — the fail-closed ADMIN_PASSWORD check and the
 * signed session cookie remain the real gate.
 *
 * Nothing here stores or logs the submitted password.
 */

const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // count failures inside this window
const LOCKOUT_MS = 15 * 60 * 1000; // refuse attempts for this long once tripped
const MAX_TRACKED_CLIENTS = 5000;

interface AttemptRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

/** Stable identifier for the caller: first proxy hop when present, else unknown. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

function prune(now: number): void {
  if (attempts.size <= MAX_TRACKED_CLIENTS) return;
  for (const [key, record] of attempts) {
    const idle = now - record.firstFailureAt > FAILURE_WINDOW_MS && now >= record.lockedUntil;
    if (idle) attempts.delete(key);
  }
}

export interface ThrottleState {
  locked: boolean;
  retryAfterSeconds: number;
  failuresRemaining: number;
}

export function checkThrottle(key: string): ThrottleState {
  const now = Date.now();
  prune(now);

  const record = attempts.get(key);
  if (!record) return { locked: false, retryAfterSeconds: 0, failuresRemaining: MAX_FAILURES };

  if (record.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((record.lockedUntil - now) / 1000)),
      failuresRemaining: 0,
    };
  }

  // Lock elapsed — start a clean window.
  if (record.lockedUntil && record.lockedUntil <= now) {
    attempts.delete(key);
    return { locked: false, retryAfterSeconds: 0, failuresRemaining: MAX_FAILURES };
  }

  // Failures older than the window no longer count against the caller.
  if (now - record.firstFailureAt > FAILURE_WINDOW_MS) {
    attempts.delete(key);
    return { locked: false, retryAfterSeconds: 0, failuresRemaining: MAX_FAILURES };
  }

  return {
    locked: false,
    retryAfterSeconds: 0,
    failuresRemaining: Math.max(0, MAX_FAILURES - record.failures),
  };
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstFailureAt > FAILURE_WINDOW_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now, lockedUntil: 0 });
    return;
  }

  record.failures += 1;
  if (record.failures >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

export function recordSuccess(key: string): void {
  attempts.delete(key);
}
