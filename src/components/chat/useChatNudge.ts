'use client';

import { useEffect, useState } from 'react';
import { readPerfTier } from '@/lib/perfTier';

/**
 * Chat nudge — a small speech bubble that occasionally pops out of the chat
 * FAB to invite the visitor to try the AI assistant.
 *
 * Triggers (both share one cap):
 *   • Time-based: ~28s after the widget mounts, then every 45–75s randomised,
 *     capped at 4 per browser session.
 *   • Section-based: when a landmark section scrolls into view for the first
 *     time, that section's message fires once. Landmarks are cheap:
 *     IntersectionObserver only, unobserved after the first hit.
 *
 * Cost discipline (phones first):
 *   • Lite tier never nudges — the widget still works, it just stays silent.
 *   • Zero polling: timers + one IntersectionObserver, no scroll listeners.
 *   • A nudge auto-hides after 6.5s; opening the chat clears it instantly.
 *
 * Returns the active nudge + a clear() so the widget can dismiss it when the
 * chat opens.
 */
export function useChatNudge(): { nudge: string | null; clear: () => void } {
  const [nudge, setNudge] = useState<string | null>(null);

  useEffect(() => {
    // Lite tier: no ambient animation at all.
    if (readPerfTier() === 'lite') return;

    // One cap + dedupe store per browser session.
    const KEY = 'chitra_nudge';
    let shown: number;
    let sectionDone: string[];
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) || '{}') as {
        shown?: number;
        sectionDone?: string[];
      };
      shown = saved.shown ?? 0;
      sectionDone = saved.sectionDone ?? [];
    } catch {
      shown = 0;
      sectionDone = [];
    }

    if (shown >= 4) return; // already exhausted — zero work this session

    const persist = () => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ shown, sectionDone }));
      } catch {}
    };

    let timer: number | undefined;
    let hide: number | undefined;
    let alive = true;
    let lastShownAt = 0;

    const show = (text: string) => {
      if (!alive || shown >= 4) return;
      shown += 1;
      lastShownAt = Date.now();
      persist();
      setNudge(text);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => {
        if (alive) setNudge(null);
      }, 6500);
    };

    // ── 1. Time-based random invites ──
    const scheduleNext = () => {
      if (!alive) return;
      timer = window.setTimeout(
        () => {
          if (!alive || shown >= 4) return;
          show(pick());
          scheduleNext();
        },
        28000 + Math.random() * 20000
      );
    };
    scheduleNext();

    // ── 2. Section-aware invites (landing page sections) ──
    const SECTION_MESSAGES: Record<string, string> = {
      'buy-paintings': 'Chitra can quote painting prices in seconds — try her!',
      workshops: 'Ask Chitra which workshops are coming up next 🎨',
      three: 'Want honest opinions? Chitra can share what students say!',
    };
    const SECTION_GAP_MS = 8000; // never two bubbles within 8s of each other

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        (entries) => {
          if (!alive) return;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const id = entry.target.id;
            observer?.unobserve(entry.target);
            if (shown >= 4 || sectionDone.includes(id)) continue;
            if (Date.now() - lastShownAt < SECTION_GAP_MS) continue;
            sectionDone.push(id);
            show(SECTION_MESSAGES[id]);
          }
        },
        { threshold: 0.25 }
      );
    }
    if (observer) {
      for (const id of Object.keys(SECTION_MESSAGES)) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
    }

    // Hidden tabs pause nudging entirely; returning re-arms the timer.
    const onVis = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
        window.clearTimeout(hide);
        if (alive) setNudge(null);
      } else if (alive) {
        lastShownAt = Date.now();
        scheduleNext();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearTimeout(hide);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return { nudge, clear: () => setNudge(null) };
}

/** Random invite copy — rotates so repeat nudges rarely repeat verbatim. */
function pick(): string {
  const LINES = [
    'Try asking our AI assistant a question ✨',
    'Curious about a painting? Ask Chitra!',
    'I can check class availability — try the chatbot!',
    'Try me: “How much is painting 7?”',
    'Ask the AI chatbot about classes or prices',
  ];
  return LINES[Math.floor(Math.random() * LINES.length)];
}
