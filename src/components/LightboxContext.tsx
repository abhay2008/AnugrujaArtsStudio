'use client';

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

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

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [slides, setSlides] = useState<LightboxSlide[]>([]);
  const [single, setSingle] = useState<LightboxSlide | null>(null);
  const [index, setIndex] = useState(-1);

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
    },
    []
  );

  const openGallery = useCallback((newSlides: LightboxSlide[], startIndex: number) => {
    setSlides(newSlides);
    setSingle(null);
    setIndex(startIndex);
  }, []);

  const closeLightbox = useCallback(() => {
    setSlides([]);
    setSingle(null);
    setIndex(-1);
  }, []);

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
