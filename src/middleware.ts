import { NextResponse, type NextRequest } from 'next/server';
import { cookieIsValid, COOKIE_NAME } from '@/lib/adminAuth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
  const loggedIn = await cookieIsValid(cookieVal);
  const lowerPath = pathname.toLowerCase();
  const isLoginPage = lowerPath === '/login' || lowerPath === '/login/';
  const isAdminArea = lowerPath.startsWith('/admin');

  // Allow public access to login page
  if (isLoginPage) {
    if (loggedIn) {
      const fromParam = req.nextUrl.searchParams.get('from') || '/admin';
      return NextResponse.redirect(new URL(fromParam, req.url));
    }
    return NextResponse.next();
  }

  // Protect /admin routes
  if (isAdminArea) {
    if (!loggedIn) {
      const loginUrl = new URL('/login', req.url);
      if (cookieVal) {
        loginUrl.searchParams.set('reason', 'expired');
      }
      loginUrl.searchParams.set('from', pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
