'use client';

import { useLightbox } from './LightboxContext';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

export default function LightboxModal() {
  const {
    activeImage,
    activeTitle,
    activeDescription,
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/92 backdrop-blur-2xl p-3 sm:p-6 animate-fadeIn select-none"
      role="dialog"
      aria-modal="true"
      aria-label={activeTitle ? `Artwork: ${activeTitle}` : 'Artwork preview'}
    >
      {/* Close button — 44px min touch target */}
      <button
        onClick={closeLightbox}
        aria-label="Close Lightbox"
        className="touch-target min-w-[44px] min-h-[44px] absolute top-4 sm:top-6 right-4 sm:right-6 z-50 p-2.5 rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset transition-all transform hover:scale-110 hover:rotate-90 active:scale-95 shadow-xl"
      >
        <X className="w-6 h-6 text-studio-sunset" />
      </button>

      {/* Counter pill (gallery mode) */}
      {hasGallery && (
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-50 px-4 py-2 rounded-full glass-pill text-sm text-studio-gold font-blippo shadow-lg">
          {activeIndex + 1} / {gallerySize}
        </div>
      )}

      {/* Prev / Next buttons (gallery mode) — 48px min touch target */}
      {hasGallery && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            aria-label="Previous artwork"
            className="touch-target min-w-[48px] min-h-[48px] absolute left-2 sm:left-6 z-50 p-3 rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset transition-all hover:scale-110 active:scale-95 shadow-2xl"
          >
            <ChevronLeft className="w-7 h-7 text-studio-sunset" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            aria-label="Next artwork"
            className="touch-target min-w-[48px] min-h-[48px] absolute right-2 sm:right-6 z-50 p-3 rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset transition-all hover:scale-110 active:scale-95 shadow-2xl"
          >
            <ChevronRight className="w-7 h-7 text-studio-sunset" />
          </button>
        </>
      )}

      {/* Image + caption in luxury glass frame */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[min(96vw,1500px)] flex-col items-center"
      >
        <div
          key={activeImage}
          className="relative w-full overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.35)] bg-studio-dark/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] animate-crossIn"
          style={{ height: 'min(78vh, 88vw)' }}
        >
          <Image
            src={activeImage}
            alt={activeTitle || 'Artwork Preview'}
            fill
            sizes="100vw"
            quality={90}
            className="object-contain p-2 sm:p-3"
            priority
          />
        </div>
        {activeTitle && (
          <p className="mt-4 text-center font-serifDisplay text-xl font-medium tracking-[0.04em] text-[#f7efe0] sm:text-2xl">
            {activeTitle}
          </p>
        )}
        {activeDescription && (
          <p className="mx-auto mt-1.5 max-w-2xl px-4 text-center font-editorial text-sm italic leading-relaxed text-[rgba(240,232,218,0.72)] sm:text-base">
            {activeDescription}
          </p>
        )}
        {hasGallery && (
          <p className="mt-2 hidden text-center font-serif-display text-xs text-amber-100/50 md:block">
            Use &larr; &rarr; arrow keys or swipe to browse
          </p>
        )}
      </div>
    </div>
  );
}
