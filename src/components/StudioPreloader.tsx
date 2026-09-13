'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'anugruja-preloader-shown';

/**
 * Branded loading flash — shows once per browser session for ~300ms,
 * then fades out. Skips entirely on repeat visits so navigation and
 * reloads feel instant. Respects reduced-motion users.
 */
export default function StudioPreloader() {
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let session = 'unknown';
    try {
      session = window.sessionStorage.getItem(SESSION_KEY) ?? 'new';
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (session === 'shown' || reducedMotion) {
        return; // never render the overlay again
      }
    } catch {
      // storage unavailable — show the flash, it's harmless
    }

    setMounted(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, 'shown');
    } catch {
      /* ignore */
    }

    const fadeTimer = setTimeout(() => setFading(true), 320);
    const killTimer = setTimeout(() => setMounted(false), 900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(killTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#2b0844_0%,_#11031c_100%)] transition-opacity duration-500 pointer-events-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-3 text-center px-4">
        {/* Palette ring — pure CSS spin */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-studio-gold/20 border-t-studio-gold border-b-purple-300 animate-spin" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#f0df2a] shadow-[0_0_10px_#f0df2a] top-1/2 left-1/2 -mt-1 -ml-1 translate-x-7" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#ff5252] shadow-[0_0_10px_#ff5252] top-1/2 left-1/2 -mt-1 -ml-1 translate-y-7" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#e040fb] shadow-[0_0_10px_#e040fb] top-1/2 left-1/2 -mt-1 -ml-1 -translate-x-7" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#00e5ff] shadow-[0_0_10px_#00e5ff] top-1/2 left-1/2 -mt-1 -ml-1 -translate-y-7" />
        </div>

        <h2 className="font-blippo text-2xl md:text-3xl gold-shimmer tracking-widest">
          Anugruja Arts
        </h2>

        <div className="w-44 h-1 bg-purple-300/20 rounded-full overflow-hidden">
          <div className="w-full h-full origin-left bg-gradient-to-r from-studio-gold via-studio-accent to-[#00e5ff] preloader-progress" />
        </div>
      </div>
    </div>
  );
}
