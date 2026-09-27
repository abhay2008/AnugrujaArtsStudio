'use client';

import { useEffect } from 'react';

/**
 * Global scroll-reveal engine.
 * Observes every `.reveal` element on the page and adds `.is-visible`
 * when it enters the viewport. Uses one shared IntersectionObserver,
 * re-scanned whenever the route changes so client-side navigations
 * are covered too.
 *
 * The observer's root is extended far ABOVE the viewport, so "intersecting"
 * means "anywhere above the reveal line", not "inside the viewport". That
 * closes the gap where a fast fling, an anchor jump or a `content-visibility`
 * section that rendered late moved an element straight from below the
 * viewport to above it without a single intersecting frame — which used to
 * leave it at `opacity: 0` for good (the Testimonies heading).
 */
export default function ScrollReveal() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      /* CSS already shows `.reveal` under reduced motion; mark them anyway so
         nothing depends on the media query alone. */
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: '100000px 0px -8% 0px' }
    );

    const attach = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        observer.observe(el);
      });
    };

    attach();
    // Re-scan after route changes (Next.js client navigation swaps DOM).
    // Batched per frame: carousels mutate the DOM continuously.
    let raf = 0;
    const mutation = new MutationObserver(() => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        attach();
      });
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return null;
}
