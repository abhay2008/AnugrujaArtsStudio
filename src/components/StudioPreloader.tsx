'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readPerfTier } from '@/lib/perfTier';

const EXIT_MS = 420;

/** Body-level opaque intro: the landing surface never moves during handoff. */
export default function StudioPreloader() {
  const [armed, setArmed] = useState(false);
  const [entering, setEntering] = useState(false);
  const [gone, setGone] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [anchored, setAnchored] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const crestRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const leaveRef = useRef<() => void>(() => {});

  const syncAnchor = useCallback(() => {
    const root = rootRef.current;
    const crest = crestRef.current;
    if (!root || !crest) return;
    const rect = crest.getBoundingClientRect();
    root.style.setProperty('--pl-orbit-y', `${Math.round(rect.top + rect.height / 2)}px`);
  }, []);

  useEffect(() => {
    const doc = document.documentElement;
    if (doc.getAttribute('data-preloader') !== 'on') {
      setGone(true);
      return;
    }
    const surface = document.getElementById('site-surface');
    if (surface) surface.inert = true;
    let alive = true;
    let left = false;
    let fontsReady = false;
    let minDone = false;
    let exitTimer: number | undefined;
    let settleFrame = 0;
    const finish = () => {
      if (!alive) return;
      doc.removeAttribute('data-preloader');
      doc.removeAttribute('data-preloader-exit');
      doc.classList.remove('preloader-lock');
      if (surface) surface.inert = false;
      setGone(true);
      // Header/hero effects start only AFTER the veil has completely gone.
      window.dispatchEvent(new CustomEvent('studio-preloader-complete'));
    };
    const leave = () => {
      if (!alive || left) return;
      left = true;
      // Commit the settled page before starting the single opacity animation.
      doc.setAttribute('data-preloader-exit', 'true');
      settleFrame = requestAnimationFrame(() => {
        setEntering(true);
        exitTimer = window.setTimeout(finish, EXIT_MS);
      });
    };
    leaveRef.current = leave;
    const maybeLeave = () => { if (minDone && fontsReady) leave(); };
    const fontPromises = document.fonts ? [
      document.fonts.load('700 24px "Cinzel Decorative"'),
      document.fonts.load('600 24px "Playfair Display"'),
    ] : [];
    void Promise.allSettled(fontPromises).then(() => {
      if (!alive) return;
      fontsReady = true;
      syncAnchor();
      maybeLeave();
    });
    const frame = requestAnimationFrame(() => {
      syncAnchor();
      setAnchored(true);
      setArmed(true);
      if (logoRef.current?.complete) setLogoReady(true);
    });
    const minTimer = window.setTimeout(() => { minDone = true; maybeLeave(); }, readPerfTier() === 'lite' ? 650 : 1100);
    const hardCap = window.setTimeout(leave, 3000);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') leave(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', syncAnchor);
    return () => {
      alive = false;
      leaveRef.current = () => {};
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settleFrame);
      window.clearTimeout(minTimer);
      window.clearTimeout(hardCap);
      window.clearTimeout(exitTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', syncAnchor);
      if (surface) surface.inert = false;
    };
  }, [syncAnchor]);

  if (gone) return null;
  let letterIndex = 0;
  return (
    <div aria-hidden="true" className="pl-root" ref={rootRef} data-entering={entering ? 'true' : 'false'} onClick={() => leaveRef.current()}>
      <div className="pl-veil" />
      <div className={`pl-pulse${anchored ? ' is-anchored' : ''}`} />
      <div className="pl-dust" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => <i key={i} className="pl-mote" style={{ '--i': i } as React.CSSProperties} />)}
      </div>
      {anchored && <div className="pl-orbits" aria-hidden="true"><span className="pl-ring pl-ring--a" /><span className="pl-ring pl-ring--b" /></div>}
      <div className="pl-crest" ref={crestRef} aria-hidden="true">
        <span className="pl-crest-rim" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={logoRef} src="/images/logo-intro.png" alt="" className={`pl-crest-img${logoReady ? ' is-loaded' : ''}`} fetchPriority="high" decoding="async" onLoad={() => setLogoReady(true)} />
      </div>
      <h2 className="pl-name" aria-label="Anugruja Arts Studio">
        {['Anugruja', 'Arts', 'Studio'].map((word) => <span key={word} className="pl-word">
          {word.split('').map((ch) => {
            const i = letterIndex++;
            return <span key={i} className={`pl-ch${armed ? ' is-in' : ''}`} style={{ '--ch-i': i } as React.CSSProperties}>{ch}</span>;
          })}
        </span>)}
      </h2>
      <p className={`pl-tagline${armed ? ' is-in' : ''}`}>&ldquo;Discovering ourselves through colour and form&rdquo;</p>
      <span className={`pl-beam${armed ? ' is-in' : ''}`} />
      <p className={`pl-hint${armed ? ' is-in' : ''}`}>Tap to enter</p>
    </div>
  );
}
