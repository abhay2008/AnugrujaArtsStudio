'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLightbox } from './LightboxContext';
import { ArtItem } from '@/data/artData';

interface InteractiveSlideshowProps {
  items: ArtItem[];
  autoAdvanceIntervalMs?: number;
}

export default function InteractiveSlideshow({
  items,
  autoAdvanceIntervalMs = 3500,
}: InteractiveSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const { openGallery } = useLightbox();

  useEffect(() => {
    const onVisibility = () => setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (isPaused || isTabHidden) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoAdvanceIntervalMs);

    return () => clearInterval(timer);
  }, [items.length, isPaused, isTabHidden, autoAdvanceIntervalMs]);

  const goTo = (index: number) => {
    setIsPaused(true);
    setCurrentIndex(((index % items.length) + items.length) % items.length);
  };

  const prevSlide = () => goTo(currentIndex - 1);
  const nextSlide = () => goTo(currentIndex + 1);

  // Touch swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 45) {
      if (delta < 0) nextSlide();
      else prevSlide();
    }
  };

  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  const openInLightbox = () => {
    openGallery(
      items.map((it) => ({ src: it.src, title: it.title })),
      currentIndex
    );
  };

  return (
    <div
      className="relative w-full max-w-2xl mx-auto flex items-center justify-center p-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Previous Button */}
      <button
        onClick={prevSlide}
        aria-label="Previous artwork"
        className="absolute left-1 sm:left-2 md:-left-6 z-20 touch-target w-11 h-11 rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset hover:scale-110 active:scale-95 flex items-center justify-center shadow-xl transition-all"
      >
        <ChevronLeft className="w-6 h-6 text-studio-sunset" />
      </button>

      {/* Slide Image — click opens gallery lightbox, swipe navigates */}
      <div
        onClick={openInLightbox}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative w-full h-[320px] md:h-[420px] rounded-3xl overflow-hidden border-2 border-studio-gold/80 shadow-2xl bg-studio-dark/95 flex items-center justify-center cursor-pointer group touch-pan-y"
      >
        <Image
          key={currentItem.id}
          src={currentItem.src}
          alt={currentItem.title}
          fill
          sizes="(max-width: 768px) 92vw, 650px"
          quality={85}
          className="object-contain p-2 sm:p-3 animate-crossIn transition-transform duration-500 group-hover:scale-105"
          priority={currentIndex === 0}
        />
        <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full glass-pill text-xs text-studio-gold font-blippo shadow-md">
          {currentIndex + 1} / {items.length}
        </div>
        {/* Zoom hint on hover (desktop) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3 pointer-events-none">
          <span className="text-xs text-amber-200/90 font-blippo tracking-wider px-3 py-1 rounded-full glass-pill">
            Click to view full size in gallery
          </span>
        </div>
      </div>

      {/* Next Button */}
      <button
        onClick={nextSlide}
        aria-label="Next artwork"
        className="absolute right-1 sm:right-2 md:-right-6 z-20 touch-target w-11 h-11 rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset hover:scale-110 active:scale-95 flex items-center justify-center shadow-xl transition-all"
      >
        <ChevronRight className="w-6 h-6 text-studio-sunset" />
      </button>
    </div>
  );
}
