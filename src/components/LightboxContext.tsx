'use client';

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

export interface LightboxSlide {
  src: string;
  title?: string;
  description?: string;
}

interface LightboxContextType {
  activeImage: string | null;
  activeTitle: string | null;
  activeDescription: string | null;
  /** Index within the open gallery, or -1 when a single image is open */
  activeIndex: number;
  gallerySize: number;
  /** Full slide list when a gallery is open, else [] */
  slides: LightboxSlide[];
  openLightbox: (src: string, title?: string, description?: string) => void;
  /** Open a lightbox with full gallery navigation (prev/next, keyboard, swipe) */
  openGallery: (slides: LightboxSlide[], startIndex: number) => void;
  closeLightbox: () => void;
  nextImage: () => void;
  prevImage: () => void;
}

const LightboxContext = createContext<LightboxContextType>({
  activeImage: null,
  activeTitle: null,
  activeDescription: null,
  activeIndex: -1,
  gallerySize: 0,
  slides: [],
  openLightbox: () => {},
  openGallery: () => {},
  closeLightbox: () => {},
  nextImage: () => {},
  prevImage: () => {},
});

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [slides, setSlides] = useState<LightboxSlide[]>([]);
  const [single, setSingle] = useState<LightboxSlide | null>(null);
  const [index, setIndex] = useState(-1);

  const openLightbox = useCallback((src: string, title?: string, description?: string) => {
    setSingle({ src, title, description });
    setSlides([]);
    setIndex(-1);
  }, []);

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

  const value = useMemo<LightboxContextType>(() => {
    const active = slides.length > 0 && index >= 0 ? slides[index] : single;
    return {
      activeImage: active?.src ?? null,
      activeTitle: active?.title ?? null,
      activeDescription: active?.description ?? null,
      activeIndex: index,
      gallerySize: slides.length,
      slides,
      openLightbox,
      openGallery,
      closeLightbox,
      nextImage,
      prevImage,
    };
  }, [slides, single, index, openLightbox, openGallery, closeLightbox, nextImage, prevImage]);

  return <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>;
}

export const useLightbox = () => useContext(LightboxContext);
