'use client';

import { MotionConfig, motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Route-level arrival transition: every page fades in once on mount.
 *
 * Opacity only, on purpose. This wrapper is an ancestor of the whole site
 * surface, and any transform on it (even `translateY(0.01px)`) makes it the
 * containing block for every `position: fixed` descendant. The previous
 * rise (`y: 14 → 0`) also branched on a reduced-motion hook that flips from
 * `false` to `true` after hydration; the flip dropped `y` from `animate`, so
 * Motion returned it to its base value and the wrapper kept
 * `translateY(~10px)` for the rest of the visit — the fixed chat launcher
 * parked at the footer and the lightbox filled the page box, not the screen.
 * Opacity never creates a containing block and needs no reduced-motion branch.
 *
 * `MotionConfig reducedMotion="user"` is the single reduced-motion policy for
 * every Framer component below: transform animations complete instantly and
 * opacity still fades, so server and client render identical props and no
 * element can be stranded with a server-rendered `opacity: 0`.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
