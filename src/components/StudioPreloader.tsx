'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'anugruja-preloader-shown';

/**
 * Luxury Motion Graphics Preloader —
 * Orchestrates a celestial art mandala, glowing sunset & gold palette particles,
 * and elegant editorial typography, before performing a radial dissolve transition
 * into the landing page hero.
 */
export default function StudioPreloader() {
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    let session = 'unknown';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const forceIntro = urlParams.get('intro') === 'true';
      session = window.sessionStorage.getItem(SESSION_KEY) ?? 'new';
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!forceIntro && (session === 'shown' || reducedMotion)) {
        return; // skip on repeat in-session visits
      }
    } catch {
      // storage unavailable
    }

    setMounted(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, 'shown');
    } catch {
      /* ignore */
    }

    // Smooth progress simulation
    const p1 = setTimeout(() => setProgress(45), 250);
    const p2 = setTimeout(() => setProgress(80), 550);
    const p3 = setTimeout(() => setProgress(100), 850);

    // Transition into landing page
    const fadeTimer = setTimeout(() => {
      setFading(true);
      window.dispatchEvent(new CustomEvent('studio-preloader-complete'));
    }, 1100);

    const killTimer = setTimeout(() => {
      setMounted(false);
    }, 1750);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(fadeTimer);
      clearTimeout(killTimer);
    };
  }, []);

  const handleSkip = () => {
    setFading(true);
    window.dispatchEvent(new CustomEvent('studio-preloader-complete'));
    setTimeout(() => setMounted(false), 450);
  };

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      onClick={handleSkip}
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_40%,_#32094f_0%,_#170425_50%,_#09010f_100%)] select-none transition-all duration-700 cursor-pointer ${
        fading ? 'animate-preloader-exit pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Ambient background glow orbs */}
      <div className="absolute w-72 h-72 rounded-full bg-studio-sunset/15 blur-[90px] -top-10 -left-10 animate-pulse-slow pointer-events-none" />
      <div className="absolute w-80 h-80 rounded-full bg-purple-700/20 blur-[100px] -bottom-10 -right-10 animate-float pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-4 max-w-md w-full">
        {/* Sacred Geometry / Art Palette Motion Graphic */}
        <div className="relative w-32 h-32 md:w-36 md:h-36 flex items-center justify-center">
          {/* Rotating outer compass ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-studio-gold/40 animate-spin-slow" />

          {/* Counter-rotating dashed ring */}
          <div className="absolute inset-2 rounded-full border border-purple-400/30 border-t-studio-sunset animate-spin-reverse" />

          {/* Pulsing inner gradient aura */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-studio-sunset/20 via-purple-900/40 to-studio-gold/25 blur-sm animate-pulse-soft" />

          {/* Orbiting palette dots with sunset amber, gold, magenta, cyan */}
          <div className="absolute inset-0 animate-spin-slow">
            <span className="absolute top-0 left-1/2 -ml-2 -mt-2 w-4 h-4 rounded-full bg-studio-sunset shadow-[0_0_12px_#f97316]" />
            <span className="absolute bottom-0 left-1/2 -ml-2 -mb-2 w-4 h-4 rounded-full bg-studio-gold shadow-[0_0_12px_#F2D770]" />
            <span className="absolute top-1/2 left-0 -ml-2 -mt-2 w-3.5 h-3.5 rounded-full bg-[#e040fb] shadow-[0_0_10px_#e040fb]" />
            <span className="absolute top-1/2 right-0 -mr-2 -mt-2 w-3.5 h-3.5 rounded-full bg-[#00e5ff] shadow-[0_0_10px_#00e5ff]" />
          </div>

          {/* Central Stylized Brush Monogram */}
          <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-[#280840] to-[#12031d] border-2 border-studio-gold/80 flex items-center justify-center shadow-[0_0_25px_rgba(242,215,112,0.4)]">
            <svg
              className="w-8 h-8 text-studio-gold drop-shadow-[0_2px_8px_rgba(249,115,22,0.5)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.71a1 1 0 0 0-1.42 0l-9.5 9.5 2.83 2.83 9.5-9.5a1 1 0 0 0 0-1.42l-1.41-1.41zM20.71 7.04l-1.41 1.41-2.83-2.83 1.41-1.41a2 2 0 0 1 2.83 0l1.41 1.41a2 2 0 0 1 0 2.83z" />
            </svg>
          </div>
        </div>

        {/* Title in Cinzel Decorative */}
        <div className="space-y-1">
          <h2 className="font-decorative text-2xl md:text-3xl font-bold gold-sunset-shimmer tracking-widest uppercase drop-shadow-[0_2px_15px_rgba(249,115,22,0.3)]">
            Anugruja Arts
          </h2>
          <p className="font-editorial italic text-amber-100/80 text-sm md:text-base tracking-wider">
            &ldquo;Discover ourselves through colors&rdquo;
          </p>
        </div>

        {/* Motion Graphics Progress Track */}
        <div className="w-56 h-1.5 bg-purple-950/60 rounded-full overflow-hidden p-0.5 border border-studio-gold/30 shadow-[0_0_15px_rgba(242,215,112,0.15)]">
          <div
            className="h-full bg-gradient-to-r from-studio-sunset via-studio-gold to-studio-highlight rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_#f97316]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Touch to skip prompt */}
        <p className="text-yellow-200/50 text-xs font-sans tracking-wide pt-1">
          Tap anywhere to enter
        </p>
      </div>
    </div>
  );
}
