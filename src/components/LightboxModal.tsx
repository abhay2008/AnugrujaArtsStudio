'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { useLightbox } from './LightboxContext';
import { formatPrice } from '@/lib/price';
import { paintingInquiryLink } from '@/lib/inquiry';
import { useScrollLock } from '@/lib/scrollLock';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.4;

const WHATSAPP_ICON_PATH =
  'M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z';

export default function LightboxModal() {
  const {
    activeImage,
    activeTitle,
    activeDescription,
    activePrice,
    activeCategory,
    activeMedium,
    activeIndex,
    gallerySize,
    slides,
    closeLightbox,
    nextImage,
    prevImage,
  } = useLightbox();

  const isOpen = Boolean(activeImage);
  useScrollLock(isOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [scale, setScale] = useState(MIN_SCALE);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ dist: 0, scale: 1 });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseTx: 0,
    baseTy: 0,
    moved: false,
  });
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });

  const hasGallery = gallerySize > 1;

  // Reset zoom & position whenever active slide changes
  const resetTransform = useCallback(() => {
    scaleRef.current = MIN_SCALE;
    txRef.current = 0;
    tyRef.current = 0;
    setScale(MIN_SCALE);
    setTx(0);
    setTy(0);
  }, []);

  useEffect(() => {
    resetTransform();
    setIsLoaded(false);
  }, [activeImage, resetTransform]);

  // Preload neighboring images for instant transitions
  useEffect(() => {
    if (!hasGallery || activeIndex < 0) return;
    const nextIdx = (activeIndex + 1) % gallerySize;
    const prevIdx = (activeIndex - 1 + gallerySize) % gallerySize;
    [nextIdx, prevIdx].forEach((i) => {
      const slide = slides[i];
      if (!slide?.src) return;
      const pre = new window.Image();
      pre.src = slide.src;
    });
  }, [hasGallery, activeIndex, gallerySize, slides]);

  // Keep pan bounded inside viewable area
  const clampPan = useCallback((s: number, x: number, y: number) => {
    const vp = viewportRef.current;
    if (!vp || s <= 1.01) {
      return { cx: 0, cy: 0 };
    }
    const maxBoundX = (vp.clientWidth * (s - 1)) / 2 + 50;
    const maxBoundY = (vp.clientHeight * (s - 1)) / 2 + 50;
    return {
      cx: Math.max(-maxBoundX, Math.min(maxBoundX, x)),
      cy: Math.max(-maxBoundY, Math.min(maxBoundY, y)),
    };
  }, []);

  const updateTransform = useCallback(
    (newScale: number, newTx: number, newTy: number) => {
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      const { cx, cy } = clampPan(clampedScale, newTx, newTy);

      scaleRef.current = clampedScale;
      txRef.current = cx;
      tyRef.current = cy;

      setScale(clampedScale);
      setTx(cx);
      setTy(cy);
    },
    [clampPan]
  );

  // Zoom to specific point
  const zoomAtPoint = useCallback(
    (targetScale: number, focalX: number, focalY: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const originX = focalX - (rect.left + rect.width / 2);
      const originY = focalY - (rect.top + rect.height / 2);

      const currentScale = scaleRef.current;
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

      if (clampedScale <= MIN_SCALE + 0.01) {
        resetTransform();
        return;
      }

      const nextTx = originX - ((originX - txRef.current) * clampedScale) / currentScale;
      const nextTy = originY - ((originY - tyRef.current) * clampedScale) / currentScale;

      updateTransform(clampedScale, nextTx, nextTy);
    },
    [resetTransform, updateTransform]
  );

  // Button zooms
  const handleZoomIn = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    zoomAtPoint(scaleRef.current + 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleZoomOut = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    zoomAtPoint(scaleRef.current - 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  // Keyboard navigation & Esc
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowRight' && hasGallery) {
        if (scaleRef.current <= 1.05) {
          e.preventDefault();
          nextImage();
        }
      } else if (e.key === 'ArrowLeft' && hasGallery) {
        if (scaleRef.current <= 1.05) {
          e.preventDefault();
          prevImage();
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetTransform();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, hasGallery, closeLightbox, nextImage, prevImage, resetTransform]);

  // Wheel zoom with passive: false to prevent ANY page scroll behind modal
  useEffect(() => {
    const container = containerRef.current;
    if (!isOpen || !container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const vp = viewportRef.current;
      if (!vp) return;

      const rect = vp.getBoundingClientRect();
      const cursorX = e.clientX;
      const cursorY = e.clientY;

      // Handle trackpad pinch (ctrlKey) and regular mouse wheel
      const isPinch = e.ctrlKey;
      const delta = isPinch ? -e.deltaY * 0.02 : -e.deltaY * 0.0022;
      const factor = isPinch ? Math.exp(delta) : Math.exp(delta);
      const nextScale = scaleRef.current * factor;

      if (nextScale <= MIN_SCALE + 0.01) {
        resetTransform();
        return;
      }

      zoomAtPoint(nextScale, cursorX, cursorY);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [isOpen, resetTransform, zoomAtPoint]);

  // Pointer events for touch pinch, double tap, and drag pan
  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two finger touch pinch
    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()];
      pinchRef.current = {
        dist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        scale: scaleRef.current,
      };
      dragRef.current.active = false;
      setIsDragging(false);
      return;
    }

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseTx: txRef.current,
      baseTy: tyRef.current,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two finger pinch handling
    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (pinchRef.current.dist > 0) {
        const ratio = dist / pinchRef.current.dist;
        const nextScale = pinchRef.current.scale * ratio;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        zoomAtPoint(nextScale, midX, midY);
      }
      return;
    }

    const d = dragRef.current;
    if (!d.active) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (Math.hypot(dx, dy) > 5) {
      d.moved = true;
    }

    // When zoomed in, pan the image
    if (scaleRef.current > 1.01) {
      setIsDragging(true);
      updateTransform(scaleRef.current, d.baseTx + dx, d.baseTy + dy);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current.dist = 0;
    }

    const d = dragRef.current;
    setIsDragging(false);

    if (d.active && !d.moved) {
      // Tap / Click handling: double-tap toggles zoom
      const now = performance.now();
      const last = lastTapRef.current;
      const isDouble =
        now - last.t < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30;

      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };

      if (isDouble) {
        if (scaleRef.current > 1.2) {
          resetTransform();
        } else {
          zoomAtPoint(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
        }
        lastTapRef.current.t = 0;
      }
    } else if (d.active && d.moved && scaleRef.current <= 1.05 && hasGallery) {
      // Swipe left/right between slides when not zoomed
      const dx = e.clientX - d.startX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) nextImage();
        else prevImage();
      }
    }

    d.active = false;
  };

  if (!isOpen || !activeImage) return null;

  const price = formatPrice(activePrice ?? undefined);
  const buyHref = paintingInquiryLink(activeTitle || 'Artwork', activePrice || undefined);
  const isZoomed = scale > 1.01;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={activeTitle ? `Artwork enlarged: ${activeTitle}` : 'Enlarged artwork viewer'}
      className="fixed inset-0 z-[999999] flex flex-col justify-between bg-[#08040d]/95 backdrop-blur-2xl select-none animate-fadeIn overflow-hidden touch-none"
    >
      {/* ── Top Bar ── */}
      <div className="relative z-50 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-studio-gold/15 bg-studio-dark/80 backdrop-blur-md">
        {/* Left: Gallery counter / badge */}
        <div className="flex items-center gap-2">
          {hasGallery ? (
            <span className="px-3 py-1 rounded-full glass-pill text-xs sm:text-sm font-semibold text-studio-gold">
              {activeIndex + 1} / {gallerySize}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full glass-pill text-xs sm:text-sm font-semibold text-studio-gold">
              Masterpiece View
            </span>
          )}

          {activeCategory && (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs text-amber-200/70 border border-white/10">
              {activeCategory}
            </span>
          )}
        </div>

        {/* Center: Interactive Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-full glass-pill border border-studio-gold/30 bg-black/40">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE + 0.01}
            aria-label="Zoom out"
            className="p-1.5 rounded-full text-studio-gold hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={resetTransform}
            aria-label="Reset zoom to 100%"
            className="px-2 py-0.5 rounded text-xs font-mono font-bold text-amber-200 hover:text-white transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE - 0.01}
            aria-label="Zoom in"
            className="p-1.5 rounded-full text-studio-gold hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {isZoomed && (
            <button
              type="button"
              onClick={resetTransform}
              aria-label="Reset zoom"
              className="p-1.5 rounded-full text-studio-sunset hover:text-white hover:bg-white/10 transition-all border-l border-white/10 ml-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Close Button */}
        <button
          type="button"
          onClick={closeLightbox}
          aria-label="Close enlarged view"
          className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset hover:rotate-90 transition-all duration-300 active:scale-95 shadow-lg"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-studio-sunset" />
        </button>
      </div>

      {/* ── Main Viewport Area ── */}
      <div
        ref={viewportRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-zoom-in"
        style={{
          cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Next / Prev Gallery Buttons */}
        {hasGallery && !isZoomed && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              aria-label="Previous artwork"
              className="touch-target min-w-[48px] min-h-[48px] absolute left-3 sm:left-6 z-40 flex items-center justify-center rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset hover:scale-110 active:scale-95 shadow-2xl transition-all"
            >
              <ChevronLeft className="w-7 h-7 text-studio-sunset" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              aria-label="Next artwork"
              className="touch-target min-w-[48px] min-h-[48px] absolute right-3 sm:right-6 z-40 flex items-center justify-center rounded-full glass-pill text-studio-gold hover:text-white hover:border-studio-sunset hover:scale-110 active:scale-95 shadow-2xl transition-all"
            >
              <ChevronRight className="w-7 h-7 text-studio-sunset" />
            </button>
          </>
        )}

        {/* The Enlargeable Image */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center p-2 sm:p-4 will-change-transform transition-[transform] duration-75 ease-out select-none"
          style={{
            transform: `translate3d(${tx}px, ${ty}px, 0px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Local images go through the optimizer at lightbox-friendly sizes.
              These are the exact URLs the carousel preloads, so the enlarged
              view renders from cache instantly — no raw-multi-MB fetch. */}
          {(() => {
            const isLocal = activeImage?.startsWith('/');
            const optUrl = isLocal
              ? `/_next/image?url=${encodeURIComponent(activeImage!)}&w=1080&q=90`
              : activeImage;
            const wideUrl = isLocal
              ? `/_next/image?url=${encodeURIComponent(activeImage!)}&w=1920&q=90`
              : undefined;
            const srcSet = isLocal
              ? [
                  `/_next/image?url=${encodeURIComponent(activeImage!)}&w=640&q=75 640w`,
                  `/_next/image?url=${encodeURIComponent(activeImage!)}&w=1080&q=90 1080w`,
                  `/_next/image?url=${encodeURIComponent(activeImage!)}&w=1920&q=90 1920w`,
                ].join(', ')
              : undefined;
            return (
              <>
                {!isLoaded && (
                  <div
                    className="absolute inset-6 sm:inset-10 rounded-xl bg-gradient-to-br from-purple-950/60 to-[#1d062e]/40 border border-studio-gold/10 animate-pulse-soft"
                    aria-hidden
                  />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={optUrl}
                  srcSet={srcSet}
                  sizes="92vw"
                  alt={activeTitle || 'Enlarged Artwork'}
                  decoding="async"
                  fetchPriority="high"
                  draggable={false}
                  onLoad={() => setIsLoaded(true)}
                  onError={() => setIsLoaded(true)}
                  className={`relative max-w-[92vw] max-h-[70vh] sm:max-h-[72vh] object-contain rounded-xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-studio-gold/25 transition-all duration-500 ${
                    isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.985]'
                  }`}
                />
                {/* Warm the widest variant during idle time for big screens */}
                {isLocal && wideUrl && typeof window !== 'undefined' && (
                  <link rel="preload" as="image" href={wideUrl} />
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Bottom Information & Action Bar ── */}
      <div className="relative z-50 px-4 py-3 sm:px-6 sm:py-4 border-t border-studio-gold/15 bg-studio-dark/85 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="min-w-0 max-w-2xl">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            {activeTitle && (
              <h2 className="font-decorative text-lg sm:text-xl font-bold text-studio-gold tracking-wide truncate">
                {activeTitle}
              </h2>
            )}
            {activeMedium && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-amber-200/80 border border-white/10 font-sans">
                {activeMedium}
              </span>
            )}
          </div>
          {activeDescription && (
            <p className="mt-1 font-editorial text-xs sm:text-sm text-theme-muted italic line-clamp-2">
              {activeDescription}
            </p>
          )}
          <p className="mt-1 hidden sm:block text-[10px] uppercase tracking-wider text-studio-gold/50 font-mono">
            Scroll or pinch to zoom • Double-click to magnify • Drag to pan • Esc to close
          </p>
        </div>

        {/* Price & Purchase Link */}
        <div className="flex items-center gap-3 shrink-0">
          {price && (
            <span className="px-3.5 py-1.5 rounded-full border border-studio-gold/40 bg-studio-gold/10 font-mono text-sm sm:text-base font-bold text-studio-gold shadow-sm">
              {price}
            </span>
          )}

          {price && (
            <a
              href={buyHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="buy-painting-btn buy-painting-btn--sm touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold active:scale-95 shadow-lg"
            >
              <svg className="buy-painting-ico w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden>
                <path d={WHATSAPP_ICON_PATH} />
              </svg>
              <span>Inquire to Buy</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
