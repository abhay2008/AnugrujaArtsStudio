'use client';

import { useEffect, useState } from 'react';

/**
 * Single owner of the reduced-motion policy. Every kinetic component consumes
 * this hook so the OS setting is honoured identically everywhere — components
 * must not roll their own matchMedia.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(mq.matches);
      const onChange = () => setReduced(mq.matches);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      /* No matchMedia support — treat as full motion. */
      setReduced(false);
    }
  }, []);

  return reduced;
}
