'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Palette, Lock, KeyRound, ArrowRight, Loader2 } from 'lucide-react';
import { ADMIN_STORAGE_KEY } from '@/context/SiteContext';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    passwordInputRef.current?.focus();
    if (searchParams.get('reason') === 'expired') {
      setIsExpired(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    fetch(`/api/auth?_t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.ok) return;
        const returnTo = searchParams.get('from') || '/admin';
        router.push(returnTo);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();
    if (!cleanPassword) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPassword }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Incorrect admin password');
        setLoading(false);
        return;
      }

      try {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      } catch {}

      const returnTo = searchParams.get('from') || '/admin';
      router.push(returnTo);
    } catch {
      setError('Network connection error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-radial from-[#240837] via-[#12031c] to-[#08010d] text-[#fdf5cf]">
      <div className="relative w-full max-w-md rounded-3xl bg-[#1b0629]/95 border border-studio-gold/40 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 backdrop-blur-xl space-y-8 animate-fadeIn">
        {/* Header Icon */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-800 to-amber-600 p-0.5 shadow-xl">
            <div className="w-full h-full bg-[#1b0629] rounded-[14px] flex items-center justify-center text-studio-gold">
              <Palette className="w-8 h-8" />
            </div>
          </div>

          <h1 className="font-blippo text-3xl md:text-4xl text-[#ffe76c]">
            Anugruja Studio
          </h1>
          <p className="text-sm text-yellow-100/70">
            Sign in to access artwork management &amp; gallery studio
          </p>
        </div>

        {/* Expired Session Alert */}
        {isExpired && (
          <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 text-center">
            Your admin session has expired. Please enter your password to resume.
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 text-center animate-shake">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-yellow-200/70">
              Admin Master Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type="password"
                required
                value={password}
                placeholder="Enter password..."
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#280a3e] border border-studio-gold/40 text-yellow-100 placeholder-yellow-200/30 text-sm focus:outline-none focus:border-yellow-300 transition-colors"
              />
              <Lock className="w-5 h-5 text-yellow-200/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-sm tracking-wide shadow-xl disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Sign in to Studio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-yellow-200/40 font-mono">
            Protected with HMAC-SHA256 authenticated sessions
          </p>
        </div>
      </div>
    </div>
  );
}
