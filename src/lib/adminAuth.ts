export const COOKIE_NAME = 'anugruja_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60; // 1 hour session

/**
 * The admin password lives only in the environment — Vercel Project Settings in
 * production, `.env.local` locally. Fails closed when unset, so no built-in
 * default password can ever ship in the repository.
 */
export function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) {
    // Fail closed: never ship a built-in fallback password.
    throw new Error(
      'ADMIN_PASSWORD environment variable is not set. ' +
        'Configure it in Vercel Project Settings (or .env.local for local dev).'
    );
  }
  return password;
}

async function hmacSign(message: string): Promise<string> {
  const secret = adminPassword();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const sig = await hmacSign(`anugruja-v1:${expiresAt}`);
  return `${expiresAt}.${sig}`;
}

export async function cookieIsValid(value?: string | null): Promise<boolean> {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length !== 2) return false;

  const expiresAt = parseInt(parts[0], 10);
  const now = Date.now();
  if (isNaN(expiresAt) || now >= expiresAt) {
    return false;
  }

  // Reject timestamps claiming expiry far into future (skew limit: 2 mins)
  if (expiresAt > now + SESSION_MAX_AGE_SECONDS * 1000 + 120000) {
    return false;
  }

  let expectedSig: string;
  try {
    expectedSig = await hmacSign(`anugruja-v1:${parts[0]}`);
  } catch {
    // ADMIN_PASSWORD is not configured: deny every session instead of throwing.
    return false;
  }
  const actualSig = parts[1];
  if (expectedSig.length !== actualSig.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expectedSig.length; i += 1) {
    mismatch |= expectedSig.charCodeAt(i) ^ actualSig.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getSessionExpiry(value?: string | null): number | null {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const expiresAt = parseInt(parts[0], 10);
  const now = Date.now();
  if (isNaN(expiresAt) || now >= expiresAt) return null;
  if (expiresAt > now + SESSION_MAX_AGE_SECONDS * 1000 + 120000) return null;
  return expiresAt;
}
