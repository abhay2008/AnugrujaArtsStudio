'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { useLightbox } from './LightboxContext';
import { ArtItem } from '@/data/artData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AutoScrollerProps {
  items: ArtItem[];
  itemHeight?: string;
  autoScrollIntervalMs?: number;
}

export default function AutoScroller({
  items,
  itemHeight = 'h-64 md:h-80',
  autoScrollIntervalMs = 3000,
}: AutoScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { openGallery } = useLightbox();
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Pause auto-scroll when the scroller is scrolled out of view (saves CPU/battery)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isHovered || !isVisible) return;

    const interval = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const step = (el.firstElementChild as HTMLElement)?.clientWidth || 280;
        el.scrollBy({ left: step + 16, behavior: 'smooth' });
      }
    }, autoScrollIntervalMs);

    return () => clearInterval(interval);
  }, [isHovered, isVisible, autoScrollIntervalMs]);

  const scrollByAmount = (amount: number) => {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const openAt = (idx: number) => {
    openGallery(
      items.map((it) => ({ src: it.src, title: it.title })),
      idx
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Navigation Buttons — visible on desktop hover AND always on touch devices */}
      <button
        onClick={() => scrollByAmount(-350)}
        aria-label="Scroll Left"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-studio-purple/90 border border-studio-gold/60 text-studio-gold hover:text-white hover:scale-110 active:scale-95 shadow-lg transition-all duration-300 items-center justify-center hidden md:flex md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={() => scrollByAmount(350)}
        aria-label="Scroll Right"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-studio-purple/90 border border-studio-gold/60 text-studio-gold hover:text-white hover:scale-110 active:scale-95 shadow-lg transition-all duration-300 items-center justify-center hidden md:flex md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Mobile navigation buttons (always visible below scroller) */}
      <div className="flex md:hidden justify-center gap-4 mt-1">
        <button
          onClick={() => scrollByAmount(-350)}
          aria-label="Scroll Left"
          className="p-3 rounded-full bg-studio-purple/90 border border-studio-gold/60 text-studio-gold active:scale-95 shadow-lg transition-transform"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => scrollByAmount(350)}
          aria-label="Scroll Right"
          className="p-3 rounded-full bg-studio-purple/90 border border-studio-gold/60 text-studio-gold active:scale-95 shadow-lg transition-transform"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Scroller Container */}
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto gap-4 py-4 px-2 no-scrollbar scroll-smooth snap-x snap-mandatory edge-fade"
      >
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => openAt(idx)}
            className={`relative flex-none ${itemHeight} w-auto min-w-[200px] max-w-[85vw] md:max-w-[420px] rounded-xl overflow-hidden border-2 border-studio-gold/80 hover:border-white shadow-xl hover:shadow-[0_10px_30px_rgba(242,215,112,0.4)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 cursor-pointer bg-studio-dark/90 snap-center`}
          >
            <Image
              src={item.src}
              alt={item.title}
              width={450}
              height={360}
              loading={idx < 4 ? 'eager' : 'lazy'}
              quality={80}
              className="w-auto h-full object-contain mx-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
