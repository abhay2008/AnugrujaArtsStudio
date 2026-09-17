'use client';

import { useEffect } from 'react';
import { initDustParticles } from '@/scripts/atelierDust';
import { readPerfTier } from '@/lib/perfTier';

/**
 * Mounts the compositor-only atmospheric dust once the hero exists in the DOM.
 * The performance tier only changes how many flecks there are — the effect,
 * the drift and the palette are identical.
 */
export default function AtelierMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lite = readPerfTier() === 'lite';
    const count = lite ? (window.innerWidth < 768 ? 6 : 10) : undefined;
    return initDustParticles(document.getElementById('dustField'), count, reducedMotion);
  }, []);

  return null;
}
