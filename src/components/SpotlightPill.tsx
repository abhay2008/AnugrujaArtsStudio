'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowRight, CalendarDays, Users } from 'lucide-react';
import { studioData } from '@/data/studioData';

/**
 * Dynamic spotlight pill — the admin-managed "what's happening at the atelier"
 * announcement that floats above the hero headline. Retires itself entirely
 * when `studioData.spotlight.isActive` is false.
 */
export default function SpotlightPill({ className = '' }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const { isActive, category, headline, dateBadge, actionUrl } = studioData.spotlight;
  /* Widened: `studioData` is `as const`, so the literal type would otherwise
     make the singular/plural branch unreachable. */
  const seatsRemaining = Number(studioData.spotlight.seatsRemaining);

  if (!isActive) return null;

  const seatsCopy =
    seatsRemaining > 0
      ? `${seatsRemaining} seat${seatsRemaining === 1 ? '' : 's'} left`
      : 'Waitlist open';

  return (
    <motion.div
      className={`spotlight-pill-wrap ${className}`.trim()}
      initial={reducedMotion ? false : { opacity: 0, y: -14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
    >
      <Link href={actionUrl} className="spotlight-pill group" aria-label={`${category}: ${headline}`}>
        <span className="spotlight-pill-dot" aria-hidden>
          {!reducedMotion && (
            <motion.span
              className="spotlight-pill-radar"
              animate={{ scale: [1, 2.4], opacity: [0.65, 0] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </span>

        <span className="spotlight-pill-eyebrow">
          <Sparkles className="h-3 w-3" aria-hidden />
          {category}
        </span>

        <span className="spotlight-pill-headline">{headline}</span>

        <span className="spotlight-pill-meta">
          <span className="spotlight-pill-chip">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {dateBadge}
          </span>
          <span className="spotlight-pill-chip spotlight-pill-chip--seats">
            <Users className="h-3 w-3" aria-hidden />
            {seatsCopy}
          </span>
        </span>

        <ArrowRight className="spotlight-pill-arrow h-4 w-4" aria-hidden />
      </Link>
    </motion.div>
  );
}
