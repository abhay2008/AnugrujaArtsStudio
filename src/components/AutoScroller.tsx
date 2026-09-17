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
      {/* Desktop Navigation Buttons — visible on desktop hover */}
      <button
        onClick={() => scrollByAmount(-350)}
        aria-label="Scroll Left"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 touch-target w-11 h-11 rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset hover:scale-110 active:scale-95 shadow-xl transition-all duration-300 items-center justify-center hidden md:flex md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={() => scrollByAmount(350)}
        aria-label="Scroll Right"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 touch-target w-11 h-11 rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset hover:scale-110 active:scale-95 shadow-xl transition-all duration-300 items-center justify-center hidden md:flex md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Scroller Container */}
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto gap-4 py-4 px-2 no-scrollbar scroll-smooth snap-x snap-mandatory edge-fade"
      >
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => openAt(idx)}
            className={`relative flex-none ${itemHeight} w-auto min-w-[180px] max-w-[85vw] md:max-w-[420px] rounded-2xl overflow-hidden glass-card border border-white/10 hover:border-studio-sunset/60 shadow-xl hover:shadow-[0_12px_35px_rgba(249,115,22,0.25)] transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer bg-studio-dark/90 snap-center`}
          >
            <Image
              src={item.src}
              alt={item.title}
              width={450}
              height={360}
              loading="lazy"
              quality={80}
              className="w-auto h-full object-contain mx-auto p-1"
            />
          </div>
        ))}
      </div>

      {/* Mobile navigation controls placed below scroller with 44px touch targets */}
      <div className="flex md:hidden justify-center items-center gap-4 mt-2">
        <button
          onClick={() => scrollByAmount(-300)}
          aria-label="Scroll Left"
          className="touch-target min-w-[44px] min-h-[44px] p-2.5 rounded-full glass-pill text-studio-gold hover:text-white active:scale-95 shadow-md transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-studio-sunset" />
        </button>
        <span className="text-xs font-blippo text-amber-200/60 uppercase tracking-wider">
          Swipe or Tap
        </span>
        <button
          onClick={() => scrollByAmount(300)}
          aria-label="Scroll Right"
          className="touch-target min-w-[44px] min-h-[44px] p-2.5 rounded-full glass-pill text-studio-gold hover:text-white active:scale-95 shadow-md transition-transform"
        >
          <ChevronRight className="w-5 h-5 text-studio-sunset" />
        </button>
      </div>
    </div>
  );
}
