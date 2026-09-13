'use client';

import { useEffect } from 'react';

/**
 * Global scroll-reveal engine.
 * Observes every `.reveal` element on the page and adds `.is-visible`
 * when it enters the viewport. Uses one shared IntersectionObserver,
 * re-scanned whenever the route changes so client-side navigations
 * are covered too.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    const attach = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        observer.observe(el);
      });
    };

    attach();
    // Re-scan after route changes (Next.js client navigation swaps DOM)
    const mutation = new MutationObserver(() => attach());
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return null;
}
