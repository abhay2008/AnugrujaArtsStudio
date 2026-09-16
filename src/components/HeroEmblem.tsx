'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type EmblemSize = 'sm' | 'lg';

/** Mobile uses a compact medallion; desktop scales it to the editorial column. */
const SHELL: Record<EmblemSize, string> = {
  sm: 'w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36',
  lg: 'w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-[clamp(260px,26vw,360px)] lg:h-[clamp(260px,26vw,360px)]',
};

/**
 * Multi-layer circular studio emblem for the landing hero.
 *
 * Carries the same halo sweep + orbiting glints as the preloader's crest
 * (preloader.css), so when the intro's iris collapses onto the logo the
 * page emblem takes over in identical form — no visual jump. A brief
 * golden aura fires when the preloader hands over.
 */
export default function HeroEmblem({
  size = 'sm',
  className = '',
}: {
  size?: EmblemSize;
  className?: string;
}) {
  const [arriving, setArriving] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let clearTimer: number | undefined;
    const onPreloaderDone = () => {
      setArriving(true);
      clearTimer = window.setTimeout(() => setArriving(false), 2800);
    };
    window.addEventListener('studio-preloader-complete', onPreloaderDone, { once: true });
    return () => {
      window.removeEventListener('studio-preloader-complete', onPreloaderDone);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);

  return (
    <div
      className={`hero-emblem ${SHELL[size]} relative shrink-0 ${arriving ? 'emblem-arriving' : ''} ${className}`.trim()}
    >
      <span className="emblem-halo" aria-hidden />
      <div className="hero-emblem-ring hero-emblem-ring-outer" />
      <div className="hero-emblem-ring hero-emblem-ring-mid" />
      <div className="hero-emblem-ring hero-emblem-ring-inner" />
      <div className="hero-emblem-core relative overflow-hidden rounded-full">
        <Image
          src="/images/logo.png"
          alt="Anugruja Arts Studio"
          fill
          sizes="(max-width: 1023px) 176px, 360px"
          priority
          className="object-contain p-3 sm:p-4"
        />
      </div>
      <span className="emblem-glint emblem-glint--a" aria-hidden />
      <span className="emblem-glint emblem-glint--b" aria-hidden />
    </div>
  );
}
