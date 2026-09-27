'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';

export interface LightboxSlide {
  src: string;
  title?: string;
  description?: string;
  price?: number | string;
  /** Admin-saved stamp; absent → the lightbox masks the price (XXXX). */
  priceConfirmedAt?: string | boolean;
  category?: string;
  medium?: string;
  status?: string;
}

interface LightboxContextType {
  activeImage: string | null;
  activeTitle: string | null;
  activeDescription: string | null;
  activePrice: number | string | null;
  activePriceConfirmed: boolean | null;
  activeCategory: string | null;
  activeMedium: string | null;
  activeStatus: string | null;
  /** Index within the open gallery, or -1 when a single image is open */
  activeIndex: number;
  gallerySize: number;
  /** Full slide list when a gallery is open, else [] */
  slides: LightboxSlide[];
  openLightbox: (
    src: string,
    title?: string,
    description?: string,
    price?: number | string,
    category?: string,
    medium?: string,
    priceConfirmedAt?: string | boolean
  ) => void;
  /** Open a lightbox with full gallery navigation (prev/next, keyboard, swipe) */
  openGallery: (slides: LightboxSlide[], startIndex: number) => void;
  closeLightbox: () => void;
  nextImage: () => void;
  prevImage: () => void;
  goToIndex: (index: number) => void;
}

const LightboxContext = createContext<LightboxContextType>({
  activeImage: null,
  activeTitle: null,
  activeDescription: null,
  activePrice: null,
  activePriceConfirmed: null,
  activeCategory: null,
  activeMedium: null,
  activeStatus: null,
  activeIndex: -1,
  gallerySize: 0,
  slides: [],
  openLightbox: () => {},
  openGallery: () => {},
  closeLightbox: () => {},
  nextImage: () => {},
  prevImage: () => {},
  goToIndex: () => {},
});

/** Marker on the history entry that represents "the lightbox is open". */
const HISTORY_KEY = '__lightbox';

function isLightboxEntry(state: unknown): boolean {
  return Boolean(state && typeof state === 'object' && (state as Record<string, unknown>)[HISTORY_KEY]);
}

/**
 * History contract — the system back button / edge swipe closes the lightbox
 * instead of leaving the site:
 *  1. Opening pushes ONE same-URL entry carrying `__lightbox`. The current
 *     state is spread into it so the Next.js App Router keys (`__NA`, tree)
 *     survive and its popstate handler treats the entry as its own.
 *     Switching slides or opening another painting while open pushes nothing.
 *  2. Back (`popstate` to a non-lightbox entry) closes the modal. The URL never
 *     changes and the scroll lock kept the page where it was.
 *  3. Closing from the UI (X, Esc, backdrop) consumes the entry with
 *     `history.back()` so no dangling entry is left for Back to land on.
 *     `ownsEntryRef` is cleared first, so that popstate is ignored.
 *  4. Arriving on a stale `__lightbox` entry (Forward after Back) re-uses it
 *     via `replaceState` on the next open rather than stacking another.
 * The push happens inside the click handler, i.e. with user activation, so
 * Chrome's back-button intervention does not skip the entry.
 */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [slides, setSlides] = useState<LightboxSlide[]>([]);
  const [single, setSingle] = useState<LightboxSlide | null>(null);
  const [index, setIndex] = useState(-1);
  const ownsEntryRef = useRef(false);

  const claimHistoryEntry = useCallback(() => {
    if (typeof window === 'undefined' || ownsEntryRef.current) return;
    const state = { ...(window.history.state ?? {}), [HISTORY_KEY]: true };
    try {
      if (isLightboxEntry(window.history.state)) {
        window.history.replaceState(state, '');
      } else {
        window.history.pushState(state, '');
      }
      ownsEntryRef.current = true;
    } catch {
      /* History unavailable (sandboxed iframe) — the modal still works. */
    }
  }, []);

  const resetState = useCallback(() => {
    setSlides([]);
    setSingle(null);
    setIndex(-1);
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (!ownsEntryRef.current || isLightboxEntry(event.state)) return;
      ownsEntryRef.current = false;
      resetState();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [resetState]);

  const openLightbox = useCallback(
    (
      src: string,
      title?: string,
      description?: string,
      price?: number | string,
      category?: string,
      medium?: string,
      priceConfirmedAt?: string | boolean
    ) => {
      setSingle({ src, title, description, price, priceConfirmedAt, category, medium });
      setSlides([]);
      setIndex(-1);
      claimHistoryEntry();
    },
    [claimHistoryEntry]
  );

  const openGallery = useCallback(
    (newSlides: LightboxSlide[], startIndex: number) => {
      setSlides(newSlides);
      setSingle(null);
      setIndex(startIndex);
      claimHistoryEntry();
    },
    [claimHistoryEntry]
  );

  const closeLightbox = useCallback(() => {
    resetState();
    if (!ownsEntryRef.current) return;
    ownsEntryRef.current = false;
    if (isLightboxEntry(window.history.state)) window.history.back();
  }, [resetState]);

  const nextImage = useCallback(() => {
    setIndex((i) => (slides.length > 1 ? (i + 1) % slides.length : i));
  }, [slides.length]);

  const prevImage = useCallback(() => {
    setIndex((i) => (slides.length > 1 ? (i - 1 + slides.length) % slides.length : i));
  }, [slides.length]);

  const goToIndex = useCallback(
    (newIndex: number) => {
      if (slides.length > 0 && newIndex >= 0 && newIndex < slides.length) {
        setIndex(newIndex);
      }
    },
    [slides.length]
  );

  const value = useMemo<LightboxContextType>(() => {
    const active = slides.length > 0 && index >= 0 ? slides[index] : single;
    return {
      activeImage: active?.src ?? null,
      activeTitle: active?.title ?? null,
      activeDescription: active?.description ?? null,
      activePrice: active?.price ?? null,
      activePriceConfirmed: active?.priceConfirmedAt != null ? Boolean(active.priceConfirmedAt) : null,
      activeCategory: active?.category ?? null,
      activeMedium: active?.medium ?? null,
      activeStatus: active?.status ?? null,
      activeIndex: index,
      gallerySize: slides.length,
      slides,
      openLightbox,
      openGallery,
      closeLightbox,
      nextImage,
      prevImage,
      goToIndex,
    };
  }, [slides, single, index, openLightbox, openGallery, closeLightbox, nextImage, prevImage, goToIndex]);

  return <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>;
}

export const useLightbox = () => useContext(LightboxContext);
