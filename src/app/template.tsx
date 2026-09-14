'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Route-level arrival transition: every page fades and rises in once on mount.
 * Reduced motion collapses it to a bare opacity change.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
