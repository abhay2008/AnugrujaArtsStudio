'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldAlert, ArrowLeft } from 'lucide-react';
import { ADMIN_STORAGE_KEY } from '@/context/SiteContext';

/**
 * Standalone admin gate.
 *
 * Deliberately renders on its own — no public header, footer or ambient
 * layers — so nothing of the site is reachable before the password is
 * accepted, matching the Jeeva Art School console's sign-in.
 *
 * The password itself lives only in the ADMIN_PASSWORD environment variable
 * (Vercel Project Settings in production, .env.local locally). This file has
 * no knowledge of its value, and the API compares it as a timing-safe hash.
 */
export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const returnTo = (() => {
    const from = searchParams.get('from') || '/admin';
    // Only same-site paths, never an off-site redirect.
    return from.startsWith('/') && !from.startsWith('//') ? from : '/admin';
  })();

  useEffect(() => {
    passwordInputRef.current?.focus();
    if (searchParams.get('reason') === 'expired') setIsExpired(true);
  }, [searchParams]);

  // An existing valid session skips the form entirely.
  useEffect(() => {
    let active = true;
    fetch(`/api/auth?_t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.ok) router.replace(returnTo);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router, returnTo]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = password.trim();
    if (!clean) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          res.status >= 500
            ? 'This deployment has no admin password configured. Set ADMIN_PASSWORD in your hosting environment and try again.'
            : data.error || 'Incorrect admin password'
        );
        setPassword('');
        passwordInputRef.current?.focus();
        setLoading(false);
        return;
      }

      try {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      } catch {}

      router.replace(returnTo);
    } catch {
      setError('Could not reach the sign-in service. Check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#100318] px-4 py-10">
      {/* Soft studio glow — the only ornament on the gate. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-studio-gold/10 blur-[90px]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-purple-700/15 blur-[90px]"
      />

      <div className="relative w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-studio-gold/30 bg-[#190626]/95 p-7 shadow-[0_0_60px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <span className="logo-chrome relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-studio-gold/50">
              <Image src="/images/logo.png" alt="" fill sizes="48px" className="object-contain p-1" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-yellow-200/60">
                Studio console
              </p>
              <h1 className="font-blippo text-2xl leading-tight text-[#ffe76c]">Admin sign in</h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-yellow-100/70">
            Enter the studio password to continue.
          </p>

          {isExpired && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-950/60 p-3 text-xs leading-relaxed text-amber-200">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your session expired after one hour. Sign in again to continue.
            </p>
          )}

          <label
            htmlFor="admin-password"
            className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-yellow-200/70"
          >
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="admin-password"
              ref={passwordInputRef}
              type={reveal ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-studio-gold/40 bg-[#280a3e] py-3 pl-11 pr-11 text-sm text-yellow-100 transition-colors placeholder:text-yellow-200/30 focus:border-yellow-300 focus:outline-none"
              placeholder="Password"
            />
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-200/50" />
            <button
              type="button"
              onClick={() => setReveal((prev) => !prev)}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-yellow-200/60 transition-colors hover:text-white"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-red-500/40 bg-red-950/60 p-3 text-xs leading-relaxed text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 py-3 text-sm font-extrabold tracking-wide text-black shadow-xl transition-all hover:from-amber-400 hover:to-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-yellow-200/40">
            One-hour session, signed with an HMAC-SHA256 cookie. The password is stored as an
            environment variable and never in this repository.
          </p>
        </form>

        <div className="mt-5 flex items-center justify-center gap-3 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-semibold text-yellow-100/60 transition-colors hover:text-studio-gold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
