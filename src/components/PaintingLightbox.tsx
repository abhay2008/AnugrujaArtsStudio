'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { X } from 'lucide-react';
import { paintingInquiryLink } from '@/lib/inquiry';
import { formatPrice } from '@/lib/price';
import { useReducedMotion } from '@/lib/useReducedMotion';

export interface PaintingLightboxItem {
  src: string;
  title: string;
  description?: string;
  price?: number | string;
  /** Live screen rect of the clicked card — the FLIP entrance starts here. */
  originRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Buy-section painting lightbox.
 *
 * - The image is PRELOADED by the carousel the moment a card becomes centre,
 *   so on open it renders instantly (browser cache hit) while the chrome
 *   animates in around it.
 * - GSAP FLIP: the frame spawns at the clicked card's exact screen rect and
 *   tweens to its centred resting place (power3.out). Closing runs in reverse.
 * - Zoom: wheel / trackpad-pinch (ctrl+wheel) 1x–4x toward the cursor,
 *   two-finger pinch on touch, double-click/double-tap toggle, drag to pan
 *   while zoomed. Transforms are clamped; page scroll is locked while open.
 */
export default function PaintingLightbox({ item, onClose }: { item: PaintingLightboxItem | null; onClose: () => void }) {
  const reducedMotion = useReducedMotion();

  const scrimRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const openTlRef = useRef<gsap.core.Timeline | null>(null);

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ dist: 0, scale: 1 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseTx: 0, baseTy: 0, moved: false });
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });
  const [zoomed, setZoomed] = useState(false);

  const clampPan = useCallback(() => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img) return;
    const s = scaleRef.current;
    if (s <= 1.001) {
      txRef.current = 0;
      tyRef.current = 0;
      return;
    }
    const maxX = (img.naturalWidth ? (frame.clientWidth * (s - 1)) / 2 : 400) + 60;
    const maxY = (img.naturalHeight ? (frame.clientHeight * (s - 1)) / 2 : 400) + 60;
    txRef.current = Math.max(-maxX, Math.min(maxX, txRef.current));
    tyRef.current = Math.max(-maxY, Math.min(maxY, tyRef.current));
  }, []);

  const applyZoomTransform = useCallback(
    (animateMs = 0) => {
      const zoom = zoomRef.current;
      if (!zoom) return;
      clampPan();
      const props = {
        scale: scaleRef.current,
        x: txRef.current,
        y: tyRef.current,
        duration: animateMs / 1000,
        ease: 'power2.out',
        overwrite: 'auto' as const,
      };
      if (animateMs > 0 && !reducedMotion) {
        gsap.to(zoom, props);
      } else {
        gsap.set(zoom, { scale: props.scale, x: props.x, y: props.y });
      }
      setZoomed(scaleRef.current > 1.02);
    },
    [clampPan, reducedMotion]
  );

  const resetZoom = useCallback(
    (instant = false) => {
      scaleRef.current = MIN_SCALE;
      txRef.current = 0;
      tyRef.current = 0;
      applyZoomTransform(instant ? 0 : 260);
    },
    [applyZoomTransform]
  );

  /* ---------------- open / close choreography ---------------- */

  useLayoutEffect(() => {
    if (!item) return;
    const scrim = scrimRef.current;
    const frame = frameRef.current;
    if (!scrim || !frame) return;

    openTlRef.current?.kill();

    if (reducedMotion) {
      gsap.set(scrim, { autoAlpha: 1 });
      gsap.set(frame, { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }

    const rect = item.originRect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetW = Math.min(vw * 0.92, 1080);
    const targetH = Math.min(vh * 0.8, targetW * 0.78);

    if (rect && rect.width > 4) {
      gsap.set(frame, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        autoAlpha: 1,
      });
    } else {
      gsap.set(frame, {
        top: vh / 2 - targetH / 2,
        left: vw / 2 - targetW / 2,
        width: targetW,
        height: targetH,
        autoAlpha: 1,
      });
    }

    gsap.set(scrim, { autoAlpha: 0 });

    const tl = gsap.timeline();
    tl.to(scrim, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }, 0);
    tl.to(
      frame,
      {
        top: vh / 2 - targetH / 2,
        left: vw / 2 - targetW / 2,
        width: targetW,
        height: targetH,
        duration: 0.65,
        ease: 'power3.out',
      },
      0
    );
    openTlRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [item, reducedMotion]);

  const close = useCallback(() => {
    const scrim = scrimRef.current;
    const frame = frameRef.current;
    if (!scrim || !frame || reducedMotion) {
      onClose();
      return;
    }
    openTlRef.current?.kill();
    const origin = item?.originRect;
    gsap.killTweensOf([scrim, frame]);
    if (origin && origin.width > 4) {
      gsap.to(frame, {
        top: origin.top,
        left: origin.left,
        width: origin.width,
        height: origin.height,
        duration: 0.4,
        ease: 'power3.in',
      });
    } else {
      gsap.to(frame, { autoAlpha: 0, scale: 0.92, duration: 0.3, ease: 'power2.in' });
    }
    gsap.to(scrim, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' });
    const finished = () => {
      scrim.removeEventListener('transitionend', finished);
      onClose();
    };
    // Let the reverse FLIP breathe, then unmount.
    window.setTimeout(finished, 400);
  }, [item, onClose, reducedMotion]);

  /* ---------------- scroll lock + keyboard ---------------- */

  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [item, close]);

  /* ---------------- wheel / pinch zoom ---------------- */

  useEffect(() => {
    const frame = frameRef.current;
    if (!item || !frame) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const img = imgRef.current;
      const zoom = zoomRef.current;
      if (!img || !zoom) return;
      const rect = zoom.getBoundingClientRect();
      const cx = e.clientX - (rect.left + rect.width / 2);
      const cy = e.clientY - (rect.top + rect.height / 2);
      const prevScale = scaleRef.current;
      const factor = Math.exp(-e.deltaY * 0.0022);
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale * factor));
      if (next === prevScale) return;
      // Keep the point under the cursor pinned while zooming.
      txRef.current = cx - ((cx - txRef.current) * next) / prevScale;
      tyRef.current = cy - ((cy - tyRef.current) * next) / prevScale;
      scaleRef.current = next;
      if (next <= MIN_SCALE + 0.001) {
        txRef.current = 0;
        tyRef.current = 0;
      }
      applyZoomTransform(next > prevScale ? 90 : 140);
    };

    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, [item, applyZoomTransform]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: scaleRef.current };
      dragRef.current.active = false;
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
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchRef.current.dist > 0) {
        scaleRef.current = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchRef.current.scale * (dist / pinchRef.current.dist)));
        applyZoomTransform(0);
      }
      return;
    }
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    if (scaleRef.current > 1.02) {
      txRef.current = d.baseTx + dx;
      tyRef.current = d.baseTy + dy;
      applyZoomTransform(0);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current.dist = 0;

    const d = dragRef.current;
    if (d.active && !d.moved) {
      // Tap / click — treat as a zoom toggle (double-tap-aware).
      const now = performance.now();
      const last = lastTapRef.current;
      const isDouble = now - last.t < 320 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 32;
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
      if (isDouble) {
        const target = scaleRef.current > 1.2 ? MIN_SCALE : DOUBLE_TAP_SCALE;
        if (target === MIN_SCALE) {
          resetZoom();
        } else {
          const rect = frameRef.current?.getBoundingClientRect();
          if (rect) {
            const cx = e.clientX - (rect.left + rect.width / 2);
            const cy = e.clientY - (rect.top + rect.height / 2);
            txRef.current = -cx * (target - 1) / target;
            tyRef.current = -cy * (target - 1) / target;
          }
          scaleRef.current = target;
          applyZoomTransform(300);
        }
        lastTapRef.current.t = 0;
      } else if (!zoomed) {
        // Single tap while at rest: zoom into the tapped point.
        const rect = frameRef.current?.getBoundingClientRect();
        if (rect) {
          const cx = e.clientX - (rect.left + rect.width / 2);
          const cy = e.clientY - (rect.top + rect.height / 2);
          txRef.current = (-cx * (DOUBLE_TAP_SCALE - 1)) / DOUBLE_TAP_SCALE;
          tyRef.current = (-cy * (DOUBLE_TAP_SCALE - 1)) / DOUBLE_TAP_SCALE;
        }
        scaleRef.current = DOUBLE_TAP_SCALE;
        applyZoomTransform(300);
      } else {
        resetZoom();
      }
    }
    dragRef.current.active = false;
  };

  if (!item) return null;

  const price = formatPrice(item.price);
  const ctaHref = paintingInquiryLink(item.title, item.price);

  return (
    <div
      ref={scrimRef}
      className="painting-lb fixed inset-0 z-[99999] flex items-center justify-center p-3 opacity-0 invisible sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Artwork enlarged: ${item.title}`}
    >
      <div className="painting-lb-scrim absolute inset-0" onClick={close} aria-hidden />

      <button
        type="button"
        onClick={close}
        aria-label="Close enlarged artwork"
        className="painting-lb-close"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        ref={frameRef}
        className="painting-lb-frame opacity-0 invisible"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={zoomRef}
          className={`painting-lb-zoom ${zoomed ? 'is-zoomed' : ''}`}
        >
          {/* Plain <img> on purpose: the carousel has already warmed the cache
              for this exact URL, so we skip the optimizer hop and show it
              instantly. Fetch priority high — it IS the content. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={item.src}
            alt={item.title}
            fetchPriority="high"
            decoding="async"
            draggable={false}
            className="painting-lb-img"
            onLoad={() => applyZoomTransform(0)}
          />
        </div>

        <div className="painting-lb-meta">
          <p className="painting-lb-title">{item.title}</p>
          {item.description && <p className="painting-lb-desc">{item.description}</p>}
          <div className="painting-lb-row">
            {price && <span className="painting-lb-price">{price}</span>}
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="buy-painting-btn buy-painting-btn--sm"
            >
              <svg className="buy-painting-ico" viewBox="0 0 24 24" aria-hidden>
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Buy this painting</span>
            </a>
          </div>
          <p className="painting-lb-hint">Scroll or pinch to zoom · double-tap to magnify · Esc to close</p>
        </div>
      </div>
    </div>
  );
}
