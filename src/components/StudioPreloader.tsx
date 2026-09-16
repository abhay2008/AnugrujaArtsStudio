'use client';

import { useEffect, useState } from 'react';

const EXIT_MS = 1150; // keep in sync with .pl-root[data-entering] animation durations

/**
 * Luxury intro preloader — "Anugruja Arts Studio" first.
 *
 * The overlay markup is server-rendered, so the studio name is the literal
 * first paint: PreloaderScript (in <head>) stamps html[data-preloader="on"]
 * before anything renders, and preloader.css keeps the page scroll-locked
 * behind the veil. React then takes over: staggers the letter cascade,
 * waits for the page to actually be ready, and performs the iris reveal.
 *
 * Choreography (first visit per browser session only):
 *   ~0ms    veil in — deep plum ground, breathing gold radial, rising dust
 *   300ms+  the name cascades in letter by letter, molten gold sweep
 *   ~1s     tagline + gold beam draw beneath the name
 *   ~1.5s   "touch anywhere to enter" hint breathes in
 *   ready + 1.9s (or any touch / Escape)   iris opens into the page
 *
 * NOTE: this component must stay mounted at BODY level in
 * src/app/layout.tsx — ancestors with transforms (route transition
 * wrapper) would break its viewport-fixed positioning.
 */
export default function StudioPreloader() {
  const [armed, setArmed] = useState(false); // hydration done — start cascade
  const [entering, setEntering] = useState(false); // exit choreography running
  const [gone, setGone] = useState(false); // overlay unmounted

  useEffect(() => {
    const doc = document.documentElement;
    const active = doc.getAttribute('data-preloader') === 'on';
    if (!active) return; // repeat visit / reduced motion — CSS keeps this hidden

    let pageReady = false;
    let minTimeDone = false;
    let left = false;

    const sampleReady = () => {
      pageReady =
        document.readyState === 'complete' ||
        document.readyState === 'interactive';
    };
    sampleReady();

    const leave = () => {
      if (left) return;
      left = true;
      setEntering(true);
      window.dispatchEvent(new CustomEvent('studio-preloader-complete'));
      window.setTimeout(() => {
        doc.removeAttribute('data-preloader');
        doc.classList.remove('preloader-lock');
        setGone(true);
      }, EXIT_MS);
    };

    const maybeLeave = () => {
      if (minTimeDone && pageReady) leave();
    };

    const raf = window.requestAnimationFrame(() => setArmed(true));

    const minTime = window.setTimeout(() => {
      minTimeDone = true;
      sampleReady();
      maybeLeave();
    }, 1900);

    // Safety nets — the intro can never trap a visitor.
    const hardCap = window.setTimeout(leave, 4200);
    const onLoad = () => {
      sampleReady();
      maybeLeave();
    };
    window.addEventListener('load', onLoad, { once: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(minTime);
      window.clearTimeout(hardCap);
      window.removeEventListener('load', onLoad);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const enter = () => {
    if (entering) return;
    setEntering(true);
    window.dispatchEvent(new CustomEvent('studio-preloader-complete'));
    window.setTimeout(() => {
      document.documentElement.removeAttribute('data-preloader');
      document.documentElement.classList.remove('preloader-lock');
      setGone(true);
    }, EXIT_MS);
  };

  if (gone) return null;

  const name = 'Anugruja Arts Studio';

  return (
    <div
      aria-hidden="true"
      className="pl-root"
      data-entering={entering ? 'true' : 'false'}
      onClick={enter}
      onTouchStart={enter}
    >
      {/* Deep-space ground + breathing radial */}
      <div className="pl-veil" />
      <div className="pl-pulse" />

      {/* Gold foil dust drifting upward */}
      <div className="pl-dust" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <i key={i} className="pl-mote" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* Concentric orbital rings + satellites around the name */}
      <div className="pl-orbits" aria-hidden="true">
        <span className="pl-ring pl-ring--a" />
        <span className="pl-ring pl-ring--b" />
        <span className="pl-ring pl-ring--c" />
        <span className="pl-sat pl-sat--a" />
        <span className="pl-sat pl-sat--b" />
      </div>

      {/* The statement: the full studio name */}
      <h2 className="pl-name" aria-label={name}>
        {name.split('').map((ch, i) => (
          <span
            key={i}
            className={`pl-ch${armed ? ' is-in' : ''}`}
            style={{ '--ch-i': i } as React.CSSProperties}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        ))}
      </h2>

      {/* Tagline + gold beam */}
      <p className={`pl-tagline${armed ? ' is-in' : ''}`}>
        &ldquo;Discovering ourselves through colour and form&rdquo;
      </p>
      <span className={`pl-beam${armed ? ' is-in' : ''}`} />

      <p className={`pl-hint${armed ? ' is-in' : ''}`}>Touch anywhere to enter</p>
    </div>
  );
}
