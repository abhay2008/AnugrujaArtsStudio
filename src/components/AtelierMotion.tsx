'use client';

import { useEffect } from 'react';
import { initDustParticles } from '@/scripts/atelierDust';

/** Mounts the compositor-only atmospheric dust once the hero exists in the DOM. */
export default function AtelierMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return initDustParticles(document.getElementById('dustField'), undefined, reducedMotion);
  }, []);

  return null;
}
