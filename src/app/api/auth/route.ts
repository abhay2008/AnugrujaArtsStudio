import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import {
  adminPassword,
  cookieIsValid,
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionToken,
  getSessionExpiry,
} from '@/lib/adminAuth';

function passwordMatches(input: unknown): boolean {
  if (typeof input !== 'string' || !input) return false;
  const expected = createHash('sha256').update(adminPassword().trim()).digest();
  const received = createHash('sha256').update(input.trim()).digest();
  return timingSafeEqual(expected, received);
}

export async function GET(req: NextRequest) {
  const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
  const ok = await cookieIsValid(cookieVal);
  const expiresAt = ok ? getSessionExpiry(cookieVal) : null;

  return NextResponse.json(
    { ok, expiresAt },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!passwordMatches(body?.password)) {
      return NextResponse.json({ error: 'Wrong admin password' }, { status: 401 });
    }
  } catch {
    // adminPassword() throws when ADMIN_PASSWORD is not configured — fail closed.
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  try {
    const token = await sessionToken();
    const expiresAt = getSessionExpiry(token);

    const response = NextResponse.json({ ok: true, expiresAt });
    const isHttps = req.nextUrl.protocol === 'https:';

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
