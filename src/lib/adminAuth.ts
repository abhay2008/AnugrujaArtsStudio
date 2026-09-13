export const COOKIE_NAME = 'anugruja_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60; // 1 hour session

export function adminPassword(): string {
  return (process.env.ADMIN_PASSWORD || 'REDACTED-SECRET-REMOVED-FROM-HISTORY').trim();
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

  const expectedSig = await hmacSign(`anugruja-v1:${parts[0]}`);
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
