'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
 *   ~150ms  the studio crest scales in — logo, halo sweep, gilded rim
 *   300ms+  the name cascades in letter by letter, molten gold sweep
 *   ~1s     tagline + gold beam draw beneath the name
 *   ~1.5s   "touch anywhere to enter" hint breathes in   * ready + 1.9s (or any touch / Escape)   iris collapses onto the landing
   *           page's own emblem, handing the logo over to the hero
 *
 * NOTE: this component must stay mounted at BODY level in
 * src/app/layout.tsx — ancestors with transforms (route transition
 * wrapper) would break its viewport-fixed positioning.
 */
export default function StudioPreloader() {
  const [armed, setArmed] = useState(false); // hydration done — start cascade
  const [entering, setEntering] = useState(false); // exit choreography running
  const [gone, setGone] = useState(false); // overlay unmounted
  const [logoReady, setLogoReady] = useState(false); // crest logo decoded
  const [anchored, setAnchored] = useState(false); // crest measured once — orbit layers fade in AFTER this so they never jump from their CSS default position to the crest

  const rootRef = useRef<HTMLDivElement>(null);
  const crestRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  /**
   * Keeps the orbital rings, breathing glow and iris-exit point pinned to
   * the crest's real on-screen position. The crest lives in the flex
   * column above the name, so its centre is always measured, never
   * assumed — this survives font swaps, rotation and small screens.
   */
  const syncAnchor = useCallback(() => {
    const root = rootRef.current;
    const crest = crestRef.current;
    if (!root || !crest) return;
    const r = crest.getBoundingClientRect();
    const x = `${Math.round(r.left + r.width / 2)}px`;
    const y = `${Math.round(r.top + r.height / 2)}px`;
    root.style.setProperty('--pl-orbit-y', y);
    root.style.setProperty('--pl-iris-x', x);
    root.style.setProperty('--pl-iris-y', y);
  }, []);

  /**
   * The iris must collapse onto the LANDING PAGE's emblem — the logo the
   * visitor is about to meet — not the intro's own crest. Measures the
   * hero emblem's live position (it has settled behind the veil by exit
   * time) and aims the clip circle there, clamped so the closing iris can
   * never slide off-screen. Falls back to the crest itself.
   */
  const aimIrisAtHeroEmblem = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    let x: number | null = null;
    let y: number | null = null;
    let radius = 0;

    const emblem = document.querySelector<HTMLElement>('#banner .hero-emblem');
    if (emblem) {
      const r = emblem.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) {
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
        radius = (Math.hypot(r.width, r.height) / 2) * 1.12;
      }
    }
    if (x == null || y == null) {
      const crest = crestRef.current;
      if (!crest) return;
      const r = crest.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
      radius = (r.width / 2) * 1.18;
    }

    // The collapsed disc must stay on-screen even if the emblem hugs an edge.
    const m = 60;
    x = Math.min(Math.max(x, m), window.innerWidth - m);
    y = Math.min(Math.max(y, m), window.innerHeight - m);
    radius = Math.max(radius, 30);
    root.style.setProperty('--pl-iris-x', `${Math.round(x)}px`);
    root.style.setProperty('--pl-iris-y', `${Math.round(y)}px`);
    root.style.setProperty('--pl-iris-end', `${Math.round(radius)}px`);
  }, []);

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
      aimIrisAtHeroEmblem(); // final aim: collapse onto the landing-page logo
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

    const raf = window.requestAnimationFrame(() => {
      syncAnchor(); // measure BEFORE the orbit layers become visible
      setAnchored(true);
      setArmed(true);
      // Cached images can finish before React attaches onLoad — catch that.
      if (logoRef.current?.complete) setLogoReady(true);
    });

    // The crest's position shifts when webfonts land or the viewport
    // rotates — re-sync so rings and iris never drift off the crest.
    const onResize = () => syncAnchor();
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(syncAnchor).catch(() => {});

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
      window.removeEventListener('resize', onResize);
    };
  }, [syncAnchor, aimIrisAtHeroEmblem]);

  const enter = () => {
    if (entering) return;
    aimIrisAtHeroEmblem(); // final aim: collapse onto the landing-page logo
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
  // Words are grouped so narrow screens wrap BETWEEN words, never mid-word.
  // --ch-i stays the global letter index for the cascade timing.
  const words = ['Anugruja', 'Arts', 'Studio'];
  let letterIndex = 0;

  return (
    <div
      aria-hidden="true"
      className="pl-root"
      ref={rootRef}
      data-entering={entering ? 'true' : 'false'}
      onClick={enter}
      onTouchStart={enter}
    >
      {/* Deep-space ground + breathing radial */}
      <div className="pl-veil" />
      <div className={`pl-pulse${anchored ? ' is-anchored' : ''}`} />

      {/* Gold foil dust drifting upward */}
      <div className="pl-dust" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <i key={i} className="pl-mote" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* Concentric orbital rings + satellites around the crest. Rendered
          only after the crest has been measured, so they are born centred
          on it — never at a default position that then corrects itself. */}
      {anchored && (
        <div className="pl-orbits" aria-hidden="true">
          <span className="pl-ring pl-ring--a" />
          <span className="pl-ring pl-ring--b" />
          <span className="pl-ring pl-ring--c" />
          <span className="pl-sat pl-sat--a" />
          <span className="pl-sat pl-sat--b" />
        </div>
      )}

      {/* Studio crest — mirrors HeroEmblem on the landing page and is the
          iris-exit target: the veil collapses precisely onto this disc.
          Uses a small quantized copy (26KB vs 218KB) + fetchPriority so the
          logo decodes with the veil itself; the fade is gated on real load. */}
      <div className="pl-crest" ref={crestRef} aria-hidden="true">
        <span className="pl-crest-halo" />
        <span className="pl-crest-rim" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={logoRef}
          src="/images/logo-intro.png"
          alt=""
          className={`pl-crest-img${logoReady ? ' is-loaded' : ''}`}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setLogoReady(true)}
        />
      </div>

      {/* The statement: the full studio name */}
      <h2 className="pl-name" aria-label={name}>
        {words.map((word) => (
          <span key={word} className="pl-word">
            {word.split('').map((ch) => {
              const i = letterIndex++;
              return (
                <span
                  key={i}
                  className={`pl-ch${armed ? ' is-in' : ''}`}
                  style={{ '--ch-i': i } as React.CSSProperties}
                >
                  {ch}
                </span>
              );
            })}
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
