'use client';

import { useLightbox } from './LightboxContext';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

export default function LightboxModal() {
  const {
    activeImage,
    activeTitle,
    activeIndex,
    gallerySize,
    slides,
    closeLightbox,
    nextImage,
    prevImage,
  } = useLightbox();

  const touchStartX = useRef<number | null>(null);
  const hasGallery = gallerySize > 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (hasGallery && e.key === 'ArrowRight') nextImage();
      if (hasGallery && e.key === 'ArrowLeft') prevImage();
    },
    [closeLightbox, hasGallery, nextImage, prevImage]
  );

  useEffect(() => {
    if (activeImage) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [activeImage, handleKeyDown]);

  // Preload neighboring images for instant navigation
  useEffect(() => {
    if (!hasGallery || activeIndex < 0) return;
    const nextIdx = (activeIndex + 1) % gallerySize;
    const prevIdx = (activeIndex - 1 + gallerySize) % gallerySize;
    [nextIdx, prevIdx].forEach((i) => {
      const slide = slides[i];
      if (!slide) return;
      const img = new window.Image();
      img.src = slide.src;
    });
  }, [hasGallery, activeIndex, gallerySize, slides]);

  // Touch swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasGallery) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 50) {
      if (delta < 0) nextImage();
      else prevImage();
    }
  };

  if (!activeImage) return null;

  return (
    <div
      onClick={closeLightbox}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/92 backdrop-blur-md p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={activeTitle ? `Artwork: ${activeTitle}` : 'Artwork preview'}
    >
      {/* Close button */}
      <button
        onClick={closeLightbox}
        aria-label="Close Lightbox"
        className="absolute top-5 right-5 z-50 p-2.5 rounded-full bg-studio-purple/80 hover:bg-studio-purple border border-studio-gold/60 text-studio-gold hover:text-white transition-all transform hover:scale-110 hover:rotate-90 shadow-lg"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter pill (gallery mode) */}
      {hasGallery && (
        <div className="absolute top-5 left-5 z-50 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-studio-gold/40 text-sm text-studio-gold font-blippo">
          {activeIndex + 1} / {gallerySize}
        </div>
      )}

      {/* Prev / Next buttons (gallery mode) */}
      {hasGallery && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            aria-label="Previous artwork"
            className="absolute left-3 md:left-6 z-50 p-3 rounded-full bg-studio-purple/70 hover:bg-studio-purple border border-studio-gold/50 text-studio-gold hover:text-white transition-all hover:scale-110 shadow-xl"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            aria-label="Next artwork"
            className="absolute right-3 md:right-6 z-50 p-3 rounded-full bg-studio-purple/70 hover:bg-studio-purple border border-studio-gold/50 text-studio-gold hover:text-white transition-all hover:scale-110 shadow-xl"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}

      {/* Image + caption */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full flex flex-col items-center"
      >
        <div
          key={activeImage}
          className="relative w-full h-[78vh] max-w-4xl rounded-2xl overflow-hidden border-2 border-studio-gold shadow-[0_0_60px_rgba(242,215,112,0.15)] bg-studio-dark/80 animate-crossIn"
        >
          <Image
            src={activeImage}
            alt={activeTitle || 'Artwork Preview'}
            fill
            sizes="(max-width: 1024px) 100vw, 1200px"
            className="object-contain p-2"
            priority
          />
        </div>
        {activeTitle && (
          <p className="mt-4 text-studio-gold font-blippo text-lg tracking-wide text-center px-4">
            {activeTitle}
          </p>
        )}
        {hasGallery && (
          <p className="mt-1 text-yellow-100/50 text-xs text-center hidden md:block">
            Use ← → arrow keys or swipe to browse
          </p>
        )}
      </div>
    </div>
  );
}
