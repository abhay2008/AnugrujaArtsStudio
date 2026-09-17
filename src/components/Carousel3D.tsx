'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play } from 'lucide-react';
import { useLightbox } from '@/components/LightboxContext';
import { ArtItem } from '@/data/artData';
import { formatPrice } from '@/lib/price';
import { paintingInquiryLink } from '@/lib/inquiry';
import { subscribe, type FrameSubscription } from '@/lib/frameLoop';
import { isConstrainedConnection, usePerfTier } from '@/lib/perfTier';
import { hasImageVariants, imageUrl, lightboxWidth } from '@/lib/imageSrc';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Each variant is a deliberately different piece of UI so the four home-page
 * carousels never read as the same widget repeated:
 *
 *  spotlight — glossy cinematic coverflow (Buy Paintings)
 *  rail      — flat museum wall with a thumbnail filmstrip (Art Gallery)
 *  deck      — fanned card stack with a numbered counter (Workshops)
 *  polaroid  — flat photo wall with tilted matte prints (Testimonies)
 */
export type CarouselVariant = 'spotlight' | 'rail' | 'deck' | 'polaroid';

interface Carousel3DProps {
  items: ArtItem[];
  /** Autoplay cadence in ms. Pass 0 to disable autoplay entirely. */
  autoAdvanceIntervalMs?: number;
  showInfo?: boolean;
  /** Legacy aliases `showcase` → spotlight and `default` → rail are still accepted. */
  variant?: CarouselVariant | 'showcase' | 'default';
}

const VARIANT_LOOKUP: Record<string, CarouselVariant> = {
  spotlight: 'spotlight',
  rail: 'rail',
  deck: 'deck',
  polaroid: 'polaroid',
  showcase: 'spotlight',
  default: 'rail',
};

interface Beat {
  /** rotateY degrees added per unit of offset */
  skew: number;
  /** rotateZ degrees added per unit of offset */
  tilt: number;
  /** multiplier on the stage spacing */
  gap: number;
  /** scale lost per unit of offset */
  shrink: number;
  /** opacity lost per unit of offset (the spotlight dims hard, the rail barely) */
  fade: number;
  /** max blur applied to the furthest visible card */
  blur: number;
  /** vertical arc, px per unit of offset */
  arc: number;
  /** z push, px per unit of offset */
  depth: number;
  /** how bright the side cards stay */
  dim: number;
  spacingFactor: number;
  spacingMax: number;
  spacingMin: number;
}

const BEATS: Record<CarouselVariant, Beat> = {
  // Cinematic 3D coverflow: side cards swing back, dim and blur out.
  spotlight: {
    skew: 42,
    tilt: 0,
    gap: 1,
    shrink: 0.15,
    fade: 0.55,
    blur: 0.5,
    arc: 14,
    depth: 240,
    dim: 0.3,
    spacingFactor: 0.32,
    spacingMax: 280,
    spacingMin: 150,
  },
  // Flat wall: no blur at all, gentle push-back, wide landscape plates.
  rail: {
    skew: 9,
    tilt: 0,
    gap: 1.16,
    shrink: 0.1,
    fade: 0.3,
    blur: 0,
    arc: 6,
    depth: 120,
    dim: 0.18,
    spacingFactor: 0.42,
    spacingMax: 340,
    spacingMin: 190,
  },
  // Fanned deck: cards pile up close, rotating like a held hand of cards.
  // The gap is wide enough that each side card keeps a clickable sliver.
  deck: {
    skew: 3,
    tilt: 7.5,
    gap: 0.78,
    shrink: 0.12,
    fade: 0.4,
    blur: 0.35,
    arc: 20,
    depth: 300,
    dim: 0.26,
    spacingFactor: 0.32,
    spacingMax: 300,
    spacingMin: 150,
  },
  // Photo wall: zero 3D rotation, each print sits at its own slight angle.
  polaroid: {
    skew: 0,
    tilt: 3.4,
    gap: 0.94,
    shrink: 0.11,
    fade: 0.32,
    blur: 0,
    arc: 28,
    depth: 150,
    dim: 0.2,
    spacingFactor: 0.3,
    spacingMax: 270,
    spacingMin: 145,
  },
};

const IMAGE_SIZES: Record<CarouselVariant, string> = {
  spotlight: '(max-width: 640px) 68vw, 420px',
  rail: '(max-width: 640px) 58vw, 470px',
  deck: '(max-width: 640px) 66vw, 400px',
  polaroid: '(max-width: 640px) 62vw, 380px',
};

const WHATSAPP_ICON_PATH =
  'M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z';

const captionVariants: Variants = {
  initial: { y: 14, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { y: -8, opacity: 0, transition: { duration: 0.2 } },
};

function circularOffset(index: number, pos: number, count: number) {
  if (count <= 0) return 0;
  let d = index - pos;
  while (d > count / 2) d -= count;
  while (d < -count / 2) d += count;
  return d;
}

interface CardLayout {
  scale: number;
  rotateY: number;
  rotateZ: number;
  x: number;
  y: number;
  z: number;
  opacity: number;
  blur: number;
  brightness: number;
}

/**
 * Interpolate one card's transform for offsets in [-1.5, 1.5].
 * The per-variant `Beat` is what makes each carousel feel different.
 */
function layoutForOffset(
  offset: number,
  spacing: number,
  variant: CarouselVariant,
  cardIndex: number,
  /** Lite tier turns the depth blur off: same geometry, no full-card filter resample. */
  allowBlur = true
): CardLayout {
  const beat = BEATS[variant];
  const abs = Math.abs(offset);
  const clamped = Math.min(abs, 1.25);

  /* The photo wall keeps a per-card resting angle so prints never line up. */
  const restingTilt =
    variant === 'polaroid' ? (cardIndex % 2 === 0 ? -1 : 1) * 3.4 : 0;

  return {
    scale: 1 - clamped * beat.shrink,
    rotateY: -offset * beat.skew,
    rotateZ: restingTilt + offset * beat.tilt,
    x: offset * spacing * beat.gap,
    y: clamped * beat.arc,
    z: -clamped * beat.depth,
    opacity: 1 - clamped * beat.fade,
    /* Fade the blur in late so the near neighbours of the centre stay sharp. */
    blur:
      allowBlur && beat.blur > 0 && clamped > 0.15
        ? Math.min(beat.blur, (clamped - 0.1) * beat.blur * 1.6)
        : 0,
    brightness: 1 - clamped * beat.dim,
  };
}

/** Short blurb printed under every card title. */
function cardBlurb(item: ArtItem): string {
  if (item.description) return item.description;
  return [item.category, item.medium].filter(Boolean).join(' • ');
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function Carousel3D({
  items,
  /** Autoplay is opt-in: pass a cadence to enable it. Default: off. */
  autoAdvanceIntervalMs = 0,
  showInfo = true,
  variant: variantProp = 'rail',
}: Carousel3DProps) {
  const variant = VARIANT_LOOKUP[variantProp] ?? 'rail';
  const beat = BEATS[variant];
  const count = items.length;
  /* Variant never changes for a mounted instance; a ref lets deep callbacks
     (keydown/click handlers) branch without re-creating them. */
  const isSpotlightRef = useRef(variant === 'spotlight');
  const { openGallery } = useLightbox();
  const reducedMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [spacing, setSpacing] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  /* Starts false so autoplay can never run before the first visibility measure. */
  const [inView, setInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  /* Any deliberate interaction (drag/wheel/arrow/dot/card) retires autoplay
     for the rest of the session — the visitor has taken the reins. */
  const [hasEngaged, setHasEngaged] = useState(false);

  const tier = usePerfTier();
  /* Lite tier keeps every transform, depth cue and transition, but drops the
     per-card blur: a blur filter that must be resampled for each moving card
     every frame is the most expensive thing in this widget. */
  const blurAllowed = tier === 'full';

  const posRef = useRef(0);
  const targetRef = useRef(0);
  const velRef = useRef(0);
  const indexRef = useRef(0);
  /* Handle on the shared page frame loop — detached whenever the carousel has
     settled, so a parked carousel costs exactly zero script time. */
  const frameSubRef = useRef<FrameSubscription | null>(null);
  /* Last payload written per card, keyed by rounded values: a card whose
     geometry has not changed is never touched again. */
  const writeCacheRef = useRef<string[]>([]);
  const liveRef = useRef<boolean[]>([]);
  const preloadedRef = useRef<Set<string>>(new Set());
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    startTime: 0,
    locked: false,
    isDirectionLocked: false,
    isHorizontal: false,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const vitrineRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const progressRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastTickRef = useRef<number | null>(null);

  /** Stable callback ref — an inline arrow would null the ref on every render. */
  const attachRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    vitrineRef.current = node;
  }, []);

  const wrapIndex = useCallback(
    (i: number) => {
      if (count <= 0) return 0;
      return ((Math.round(i) % count) + count) % count;
    },
    [count]
  );

  /**
   * Paint the stage. Two things keep this cheap:
   *   • every card caches the payload that was last written to it, so cards
   *     whose geometry has not changed are not touched at all;
   *   • `will-change: transform` is only ever set on the handful of cards that
   *     are on screen — promoting all of them permanently costs the phone a
   *     GPU layer per card (14 + 15 + 12 …) for no benefit.
   */
  const applyTransforms = useCallback(() => {
    const pos = posRef.current;
    const cache = writeCacheRef.current;
    const live = liveRef.current;

    for (let i = 0; i < count; i++) {
      const el = cardsRef.current[i];
      if (!el) continue;
      const offset = circularOffset(i, pos, count);
      const abs = Math.abs(offset);

      if (abs > 1.55) {
        if (cache[i] === 'hidden') continue;
        cache[i] = 'hidden';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.visibility = 'hidden';
        continue;
      }

      const L = layoutForOffset(offset, spacing, variant, i, blurAllowed);
      const x = Math.round(L.x * 10) / 10;
      const y = Math.round(L.y * 10) / 10;
      const z = Math.round(L.z);
      const rotateY = Math.round(L.rotateY * 100) / 100;
      const rotateZ = Math.round(L.rotateZ * 100) / 100;
      const scale = Math.round(L.scale * 1000) / 1000;
      const opacity = Math.round(L.opacity * 1000) / 1000;
      const brightness = Math.round(L.brightness * 1000) / 1000;
      const blur = Math.round(L.blur * 100) / 100;
      const zIndex = 140 - Math.round(abs * 50);
      const clickable = abs <= 1.4;
      const payload = `${x}|${y}|${z}|${rotateY}|${rotateZ}|${scale}|${opacity}|${brightness}|${blur}|${zIndex}|${clickable}`;

      if (cache[i] === payload) continue;
      cache[i] = payload;

      el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.zIndex = String(zIndex);
      el.style.filter = blur > 0 ? `blur(${blur}px) brightness(${brightness})` : 'none';
      el.style.visibility = 'visible';
      /* Every visible card is clickable — side cards focus themselves, the
         centre card opens the lightbox. */
      el.style.pointerEvents = clickable ? 'auto' : 'none';

      const shouldBeLive = clickable;
      if (live[i] !== shouldBeLive) {
        live[i] = shouldBeLive;
        el.classList.toggle('is-live', shouldBeLive);
      }
    }
  }, [blurAllowed, count, spacing, variant]);

  /**
   * One integration step. Returns false once the carousel has settled, which is
   * the signal to detach from the frame loop — the physics stay identical, only
   * the empty frames after they finish are gone.
   */
  const step = useCallback((): boolean => {
    const d = dragRef.current;
    if (!d.active) {
      if (Math.abs(velRef.current) > 0.0018) {
        posRef.current += velRef.current;
        velRef.current *= 0.9;
        if (Math.abs(velRef.current) <= 0.0018) {
          velRef.current = 0;
          targetRef.current = Math.round(posRef.current);
        }
      } else {
        const target = targetRef.current;
        const delta = target - posRef.current;
        const stiffness = reducedMotion ? 1 : 0.17;
        posRef.current += delta * stiffness;
        if (Math.abs(delta) < 0.002) posRef.current = target;
      }

      if (count > 0 && Math.abs(targetRef.current) > count * 8) {
        const w = wrapIndex(targetRef.current);
        const shift = targetRef.current - w;
        targetRef.current = w;
        posRef.current -= shift;
      }
    }

    applyTransforms();

    const idx = wrapIndex(posRef.current);
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      setIndex(idx);
    }

    const settled =
      !dragRef.current.active &&
      velRef.current === 0 &&
      Math.abs(targetRef.current - posRef.current) < 0.002;
    const tabHidden = typeof document !== 'undefined' && document.hidden;
    return !settled && !tabHidden;
  }, [applyTransforms, count, reducedMotion, wrapIndex]);

  const park = useCallback(() => {
    frameSubRef.current?.stop();
    frameSubRef.current = null;
  }, []);

  /** Start (or keep) the loop running. Safe to call from anywhere, any number of times. */
  const wake = useCallback(() => {
    if (frameSubRef.current) return;
    frameSubRef.current = subscribe(() => {
      if (!step()) park();
    });
  }, [park, step]);

  /**
   * Brief stage pulse when the carousel advances. Replaces the old anime.js
   * timeline with a compositor-driven Web Animation: no library, no per-frame
   * JavaScript.
   */
  const pulseStage = useCallback(
    (dir: number) => {
      if (reducedMotion || tier === 'lite') return;
      const stage = stageRef.current;
      if (stage && typeof stage.animate === 'function') {
        stage.animate(
          [
            { transform: 'rotateY(0deg)' },
            { transform: `rotateY(${dir >= 0 ? -2.5 : 2.5}deg)` },
            { transform: 'rotateY(0deg)' },
          ],
          { duration: 680, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      }
      const vitrine = variant === 'rail' ? vitrineRef.current : null;
      if (vitrine && typeof vitrine.animate === 'function') {
        vitrine.animate(
          [
            { boxShadow: '0 28px 70px -24px rgba(0, 0, 0, 0.45)' },
            { boxShadow: '0 32px 80px -20px rgba(242, 215, 112, 0.22)' },
            { boxShadow: '0 28px 70px -24px rgba(0, 0, 0, 0.45)' },
          ],
          { duration: 720, easing: 'ease-in-out' }
        );
      }
    },
    [reducedMotion, tier, variant]
  );

  /**
   * Visibility is measured from the element rect on scroll/resize rather than
   * via IntersectionObserver: it is deterministic, cheap, and the carousel only
   * auto-advances while it is genuinely on screen.
   */
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      const node = rootRef.current;
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (!node || vh <= 0) return;
      const rect = node.getBoundingClientRect();
      if (rect.height <= 0) return;
      const shown = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      const ratio = shown / Math.min(rect.height, vh);
      setInView(ratio >= 0.35);
    };

    /* Coalesce bursts of scroll events into one measure per frame. */
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    /* rAF can be throttled in background tabs, so also run a direct pass. */
    const onScroll = () => {
      schedule();
      measure();
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    const settle = window.setTimeout(measure, 350);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    };
  }, [count]);

  /**
   * Ride the shared page frame loop, and only while the carousel is genuinely
   * on screen. `step` detaches itself the moment everything has settled, so a
   * static carousel, an off-screen carousel and a background tab all run zero
   * JavaScript — which is what used to make phones hot and stuttery.
   */
  useEffect(() => {
    if (!inView) return;
    wake();
    return park;
  }, [inView, park, wake]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const w = stage.clientWidth;
      setSpacing(
        Math.max(
          beat.spacingMin,
          Math.round(Math.min(w * beat.spacingFactor, beat.spacingMax))
        )
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [beat.spacingFactor, beat.spacingMax, beat.spacingMin]);

  useEffect(() => {
    applyTransforms();
    wake();
  }, [applyTransforms, items, wake]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const resetProgress = useCallback(() => {
    progressRef.current = 0;
    if (progressBarRef.current) progressBarRef.current.style.width = '0%';
  }, []);

  const commitStep = useCallback(
    (dir: number) => {
      if (count < 2) return;
      targetRef.current = Math.round(targetRef.current) + (dir >= 0 ? 1 : -1);
      velRef.current = 0;
      resetProgress();
      wake();
      pulseStage(dir);
    },
    [count, pulseStage, resetProgress, wake]
  );

  const goTo = useCallback(
    (i: number) => {
      if (count < 1) return;
      const current = wrapIndex(targetRef.current);
      let delta = i - current;
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;
      if (delta === 0) return;
      targetRef.current = Math.round(targetRef.current) + delta;
      velRef.current = 0;
      resetProgress();
      wake();
      pulseStage(delta >= 0 ? 1 : -1);
    },
    [count, wake, wrapIndex, pulseStage, resetProgress]
  );

  /** Any deliberate interaction kills autoplay for the rest of the session. */
  const engage = useCallback(() => setHasEngaged(true), []);

  /* Arrow buttons sit outside the stage (no pointerdown capture), so they
     engage explicitly. Autoplay's own advance calls commitStep directly and
     must NOT engage. */
  const next = useCallback(() => {
    engage();
    commitStep(1);
  }, [commitStep, engage]);
  const prev = useCallback(() => {
    engage();
    commitStep(-1);
  }, [commitStep, engage]);

  /* Only the Buy spotlight opts into autoplay; every other rail is user-driven. */
  const autoplayEnabled = autoAdvanceIntervalMs > 0;

  /*
   * Autoplay runs only while the carousel is on screen and the tab is visible.
   * Progress is written straight to the DOM so the 60fps loop never re-renders
   * React (which previously caused the jumpy transitions).
   */
  useEffect(() => {
    if (!autoplayEnabled || !isPlaying || hasEngaged || tabHidden || isDragging || !inView || count < 2) return;

    lastTickRef.current = null;
    /* The timer only moves a progress bar, so 30fps is indistinguishable and
       halves the work the autoplay costs on a weak device. */
    const sub = subscribe(
      (now) => {
        if (lastTickRef.current == null) lastTickRef.current = now;
        const dt = now - lastTickRef.current;
        lastTickRef.current = now;
        if (!dragRef.current.active && Math.abs(velRef.current) < 0.01) {
          progressRef.current += (dt / autoAdvanceIntervalMs) * 100;
          if (progressRef.current >= 100) {
            progressRef.current = 0;
            commitStep(1);
          }
          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${Math.min(100, progressRef.current)}%`;
          }
        }
      },
      { fps: 30 }
    );
    return () => sub.stop();
  }, [autoplayEnabled, isPlaying, hasEngaged, tabHidden, isDragging, inView, count, autoAdvanceIntervalMs, commitStep]);

  /**
   * Warm the lightbox image — but only on intent.
   *
   * The old version downloaded the ORIGINAL jpeg *and* a 1920px optimizer
   * variant on every index change; with the spotlight autoplaying every 4.6s
   * that was a permanent background download competing with the page the
   * visitor was actually looking at. Now: one pre-built derivative, fetched
   * when a pointer lands on the card, never on a slow or metered connection.
   */
  const preloadFor = useCallback(
    (src: string) => {
      if (tier === 'lite' || isConstrainedConnection()) return;
      if (!src || !hasImageVariants(src) || preloadedRef.current.has(src)) return;
      preloadedRef.current.add(src);
      const img = new window.Image();
      img.decoding = 'async';
      img.src = imageUrl(src, lightboxWidth());
    },
    [tier]
  );

  /** Enlarge the artwork in the high-performance zoomable lightbox */
  const openImageAt = useCallback(
    (i: number) => {
      const it = items[i];
      if (!it) return;
      openGallery(
        items.map((item) => ({
          src: item.src,
          title: item.title,
          description: cardBlurb(item) || undefined,
          price: item.price,
          category: item.category,
          medium: item.medium,
          status: item.status,
        })),
        i
      );
    },
    [items, openGallery]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (count < 2) return;
    /* Do NOT setPointerCapture here. Capture retargets the subsequent click
       to the stage, so the image's onClick (enlarge) never fires. Capture is
       taken lazily in onPointerMove once a real drag is confirmed. */
    const now = performance.now();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: now,
      startTime: now,
      locked: false,
      isDirectionLocked: false,
      isHorizontal: false,
    };
    velRef.current = 0;
    setIsDragging(true);
    engage();
    wake();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    wake();
    const now = performance.now();
    const dx = e.clientX - d.lastX;
    const dt = Math.max(1, now - d.lastT);
    d.lastX = e.clientX;
    d.lastT = now;

    const totalDx = e.clientX - d.startX;
    const totalDy = e.clientY - d.startY;

    if (!d.isDirectionLocked) {
      if (Math.hypot(totalDx, totalDy) > 6) {
        d.isDirectionLocked = true;
        d.isHorizontal = Math.abs(totalDx) >= Math.abs(totalDy);
      }
    }

    if (d.isDirectionLocked && !d.isHorizontal) {
      return;
    }

    if (Math.abs(totalDx) > 8) {
      d.locked = true;
      /* Real drag confirmed — now capture the pointer so moves outside the
         stage still pan the carousel. Taking it here (not on pointer-down)
         keeps plain clicks free to reach the image's enlarge handler. */
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        /* Capture is best-effort */
      }
    }

    posRef.current -= dx / spacing;
    const instantVel = (-dx / dt) * 12;
    velRef.current = velRef.current * 0.3 + instantVel * 0.7;
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    setIsDragging(false);
    engage();
    wake();

    const totalDx = d.lastX - d.startX;
    const totalDt = Math.max(1, performance.now() - d.startTime);
    const speed = Math.abs(totalDx) / totalDt;

    // A swipe is detected if:
    // 1. Distance moved is significant (>= 30px), OR
    // 2. Quick flick (speed > 0.22 and >= 15px), OR
    // 3. Significant velocity
    const isSwipe =
      Math.abs(totalDx) >= 30 ||
      (speed > 0.22 && Math.abs(totalDx) >= 15) ||
      Math.abs(velRef.current) > 0.25;

    if (isSwipe && (d.isHorizontal || !d.isDirectionLocked)) {
      const dir = totalDx !== 0 ? (totalDx < 0 ? 1 : -1) : velRef.current > 0 ? 1 : -1;
      commitStep(dir);
      velRef.current = 0;
    } else {
      const snapped = Math.round(posRef.current);
      const currentTarget = Math.round(targetRef.current);
      if (snapped !== currentTarget) {
        commitStep(snapped > currentTarget ? 1 : -1);
      } else {
        targetRef.current = snapped;
      }
    }

    window.setTimeout(() => {
      dragRef.current.locked = false;
    }, 150);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let accum = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      engage();
      accum += e.deltaX;
      if (Math.abs(accum) > 56) {
        commitStep(accum > 0 ? 1 : -1);
        accum = 0;
      }
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [commitStep, engage]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      engage();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      engage();
      prev();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openImageAt(index);
    }
  };

  /**
   * "if the card is clicked then that card should come front, nothing else"
   */
  const onCardClick = (i: number) => {
    if (dragRef.current.locked) return;
    engage();
    if (i !== index) {
      goTo(i);
    }
  };

  /** Any deliberate image click opens that exact image; card captions still only navigate. */
  const onImageClick = (e: React.MouseEvent, i: number) => {
    if (dragRef.current.locked) return;
    e.stopPropagation();
    engage();
    openImageAt(i);
  };

  const current = items[index];
  const price = current ? formatPrice(current.price) : '';
  const inquiryHref = current ? paintingInquiryLink(current.title, current.price) : '';

  const dotWindow = 7;
  let dotStart = 0;
  if (count > dotWindow) {
    dotStart = index - Math.floor(dotWindow / 2);
    if (dotStart < 0) dotStart = 0;
    if (dotStart > count - dotWindow) dotStart = count - dotWindow;
  }
  const visibleDots = count > dotWindow ? dotWindow : count;

  if (count === 0) return null;

  const isSpotlight = variant === 'spotlight';
  const isRail = variant === 'rail';
  const isDeck = variant === 'deck';
  const isPolaroid = variant === 'polaroid';

  const whatsappButton = (extra = '') =>
    current ? (
      <a
        href={inquiryHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Inquire about ${current?.title} on WhatsApp`}
        className={`c3d-wa flex shrink-0 items-center justify-center rounded-full ${extra}`}
      >
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d={WHATSAPP_ICON_PATH} />
        </svg>
      </a>
    ) : null;

  const playToggle = (extra = '') =>
    count > 1 && !hasEngaged ? (
      <button
        type="button"
        onClick={() => setIsPlaying((p) => !p)}
        aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
        className={`c3d-play ${extra}`}
      >
        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3" />}
      </button>
    ) : null;

  const dots = (dotClass: string, activeClass: string) => (
    <div className="c3d-dots flex items-center gap-1.5" role="tablist" aria-label="Slide position">
      {Array.from({ length: visibleDots }, (_, wi) => {
        const real = dotStart + wi;
        const isCurrent = real === index;
        return (            <button
              key={real}
              type="button"
              role="tab"
              aria-label={`Go to slide ${real + 1}`}
              aria-selected={isCurrent}
              onClick={() => {
                engage();
                goTo(real);
              }}
              className={`${dotClass} ${isCurrent ? activeClass : ''}`}
            />
        );
      })}
    </div>
  );

  return (
    <div
      ref={attachRoot}
      data-carousel-in-view={inView ? 'true' : 'false'}
      data-carousel-index={index}
      data-carousel-count={count}
      data-carousel-variant={variant}
      className={`c3d-root c3d-root--${variant}${isRail ? ' gallery-vitrine' : ''} relative w-full select-none`}
    >
      {isRail && (
        <>
          <span className="gallery-corner gallery-corner-tl" aria-hidden />
          <span className="gallery-corner gallery-corner-tr" aria-hidden />
          <span className="gallery-corner gallery-corner-bl" aria-hidden />
          <span className="gallery-corner gallery-corner-br" aria-hidden />
        </>
      )}

      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Artwork carousel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`c3d-stage c3d-stage--${variant} relative w-full overflow-hidden outline-none touch-pan-y ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } focus-visible:ring-2 focus-visible:ring-studio-gold/60`}
        style={{ perspective: reducedMotion ? 'none' : undefined }}
      >
        {isSpotlight && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(242,215,112,0.1),transparent_62%)]" />
        )}
        {isDeck && <div className="c3d-deck-floor pointer-events-none absolute inset-0" />}
        {(isSpotlight || isRail) && (
          <>
            <div className="carousel-edge-fade-l pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 sm:w-16" />
            <div className="carousel-edge-fade-r pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 sm:w-16" />
          </>
        )}

        {isRail && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous artwork"
              className="c3d-edge-btn c3d-edge-btn--l"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next artwork"
              className="c3d-edge-btn c3d-edge-btn--r"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {items.map((item, i) => {
          const isCentre = i === index;
          const adjacency = Math.abs(circularOffset(i, index, count));
          const hiddenFromAT = adjacency > 1;
          /*
           * Only cards near the centre get an <Image> at all.
           *
           * Every card is kept in the DOM (the loop animates them all), but a
           * carousel of 14 works used to request 14 image files the moment the
           * page was scrolled near it — most of them for cards the visitor
           * cannot see, on a phone, on a bad connection. Three slots either side
           * of the centre is more than the slide ever reveals at once, so the
           * incoming card is always already loaded.
           */
          const nearCentre = adjacency <= 3;
          const blurb = cardBlurb(item);
          return (
            <div
              key={item.id}
              data-c3d-card={i}
              data-c3d-centre={isCentre ? 'true' : 'false'}
              ref={(node) => {
                cardsRef.current[i] = node;
              }}
              onClick={() => onCardClick(i)}
              onPointerEnter={() => preloadFor(item.src)}
              role={hiddenFromAT ? undefined : 'button'}
              tabIndex={isCentre ? 0 : -1}
              aria-label={
                hiddenFromAT
                  ? undefined
                  : isCentre
                    ? `Artwork ${item.title}`
                    : `Bring ${item.title} to front`
              }
              className={`c3d-card-shell absolute left-1/2 top-1/2 outline-none ${
                isCentre ? 'cursor-default' : 'cursor-pointer'
              }`}
              style={{
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                transform: 'translate3d(-50%, -50%, -300px) scale(0.75)',
                opacity: 0,
              }}
              aria-hidden={hiddenFromAT}
            >
              {/* Accent halo — sampled per painting from studioData */}
              {isCentre && item.accentGlow && (
                <span
                  className="c3d-accent-glow"
                  style={{ background: item.accentGlow }}
                  aria-hidden
                />
              )}

              <div className="c3d-card">
                {/* The frame *is* the image — only clicking the centre image enlarges it; clicking a side card brings it forward */}
                <div
                  onClick={(e) => onImageClick(e, i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onImageClick(e as unknown as React.MouseEvent, i);
                    }
                  }}
                  role="button"
                  tabIndex={isCentre ? 0 : -1}
                  aria-label={`Enlarge image of ${item.title}`}
                  title="Click image to enlarge"
                  /* `is-centre` is what the flank-recession rules key off — every
                     `.c3d-card-media:not(.is-centre)` rule in globals.css was
                     matching the centre card too, because nothing ever set the
                     class. */
                  className={`c3d-card-media cursor-zoom-in${isCentre ? ' is-centre' : ''}`}
                >
                  {nearCentre && (
                    <Image
                      src={item.src}
                      alt={item.title}
                      fill
                      sizes={IMAGE_SIZES[variant]}
                      quality={isCentre ? 90 : 80}
                      draggable={false}
                      priority={i === 0}
                      /* Only the card that is centred at first paint is eager.
                         The old rule eagerly fetched indices 0-3 in every
                         carousel, so ~12 full-size images raced the first paint
                         on phones. */
                      loading={i === 0 ? undefined : 'lazy'}
                      fetchPriority={i === 0 ? undefined : 'low'}
                      className="c3d-card-img object-cover pointer-events-none select-none"
                    />
                  )}
                  {isSpotlight && <span className="c3d-gloss" aria-hidden />}
                  {item.status && (
                    <span className="c3d-status" data-status={item.status.toLowerCase()}>
                      {item.status}
                    </span>
                  )}
                  {isDeck && (
                    <span className="c3d-ribbon" aria-hidden>
                      {item.category || 'Exhibition'}
                    </span>
                  )}
                  {isPolaroid && <span className="c3d-pin" aria-hidden />}
                  {isCentre && (
                    <span
                      className="c3d-view-badge"
                      title="Click to enlarge"
                      onClick={(e) => onImageClick(e, i)}
                    >
                      <Maximize2 className="h-3 w-3" />
                      View
                    </span>
                  )}
                </div>

                {/* Name + description in its own reserved row: clicking card brings it front */}
                <div
                  className={`c3d-card-caption ${isCentre ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={() => onCardClick(i)}
                >
                  <p className="c3d-card-name">{item.title}</p>
                  {blurb && <p className="c3d-card-blurb">{blurb}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------- per-variant metadata ---------------- */}

      {showInfo && current && isSpotlight && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            variants={reducedMotion ? undefined : captionVariants}
            initial={reducedMotion ? false : 'initial'}
            animate="animate"
            exit="exit"
            className="c3d-plaque--spotlight relative mx-auto mt-3 w-full max-w-xl px-1 sm:mt-4"
          >
            <p className="c3d-spot-name">{current.title}</p>
            {cardBlurb(current) && <p className="c3d-spot-desc">{cardBlurb(current)}</p>}
            <div className="c3d-spot-row">
              {price && (
                <span className="c3d-spot-price" aria-label={`Listed price ${price}`}>
                  {price}
                </span>
              )}
              <a
                href={inquiryHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Buy ${current.title} — inquire on WhatsApp`}
                className="buy-painting-btn"
              >
                <svg className="buy-painting-ico" viewBox="0 0 24 24" aria-hidden>
                  <path d={WHATSAPP_ICON_PATH} />
                </svg>
                <span>Buy this painting</span>
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {showInfo && current && isRail && (
        <div className="c3d-plaque mt-4 flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <span className="c3d-plaque-no hidden shrink-0 sm:inline">
            Plate {pad2(index + 1)}
          </span>
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.id}
                variants={reducedMotion ? undefined : captionVariants}
                initial={reducedMotion ? false : 'initial'}
                animate="animate"
                exit="exit"
                className="truncate font-decorative text-xs font-bold tracking-[0.08em] text-studio-gold sm:text-sm"
              >
                {current.title}
              </motion.p>
            </AnimatePresence>
            <p className="truncate text-[11px] tracking-[0.14em] text-theme-subtle uppercase">
              {cardBlurb(current) || 'Original studio work'}
            </p>
          </div>
          {price && (
            <span className="c3d-price shrink-0 whitespace-nowrap">{price}</span>
          )}
          {whatsappButton('h-8 w-8')}
        </div>
      )}

      {showInfo && current && isDeck && (
        /* Story plate: name + category up top, a two-line description beneath —
           every workshop image carries its own explanation. */
        <div className="c3d-deck-plate c3d-deck-plate--story mt-3 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-3">
            <span className="c3d-deck-no">{pad2(index + 1)}</span>
            <p className="c3d-story-title min-w-0 flex-1 truncate">{current.title}</p>
            {current.category && (
              <span className="c3d-story-cat shrink-0">{current.category}</span>
            )}
          </div>
          <p className="c3d-story-desc mt-1.5">
            {cardBlurb(current) || 'Workshop & events archive'}
          </p>
        </div>
      )}

      {showInfo && current && isPolaroid && (
        <div className="mt-4 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              variants={reducedMotion ? undefined : captionVariants}
              initial={reducedMotion ? false : 'initial'}
              animate="animate"
              exit="exit"
            >
              <p className="font-editorial text-sm text-studio-gold italic sm:text-base">
                {current.title}
              </p>
              <p className="mt-0.5 text-[11px] tracking-[0.12em] text-theme-subtle uppercase">
                {cardBlurb(current) || 'Student work'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ---------------- per-variant controls ---------------- */}

      {isSpotlight && (
        <div className="relative mt-2.5 flex items-center justify-center gap-3 pb-0.5 sm:mt-3">
          <div className="c3d-cluster inline-flex items-center gap-0.5 rounded-full px-1.5 py-1">
            <button type="button" onClick={prev} aria-label="Previous artwork" className="c3d-arrow">
              <ChevronLeft className="h-5 w-5" />
            </button>
            {dots('c3d-dot', 'is-active')}
            <button type="button" onClick={next} aria-label="Next artwork" className="c3d-arrow">
              <ChevronRight className="h-5 w-5" />
            </button>
            {playToggle('ml-0.5 border-l border-studio-gold/20')}
          </div>
        </div>
      )}

      {isRail && (
        <div className="mt-3 flex flex-col items-center gap-2.5">
          <div className="flex w-full items-center gap-3">
            <span className="c3d-counter shrink-0 tabular-nums">
              {pad2(index + 1)}
              <em>/ {pad2(count)}</em>
            </span>
            <div className="c3d-filmstrip flex-1" role="tablist" aria-label="Thumbnail navigator">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show ${it.title}`}
                  onClick={() => goTo(i)}
                  className={`c3d-thumb${i === index ? ' is-active' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/* Derivative instead of the original: 30 KB per thumb, not 300 KB. */}
                  <img src={imageUrl(it.src, 480)} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
            {playToggle('')}
          </div>
        </div>
      )}

      {isDeck && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={prev} aria-label="Previous artwork" className="c3d-round">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="c3d-deck-counter tabular-nums">
              <b>{pad2(index + 1)}</b>
              <span>/ {pad2(count)}</span>
            </div>
            <button type="button" onClick={next} aria-label="Next artwork" className="c3d-round">
              <ChevronRight className="h-5 w-5" />
            </button>
            {playToggle('')}
          </div>
          <div className="c3d-track">
            <div ref={progressBarRef} className="c3d-track-fill" style={{ width: '0%' }} />
          </div>
        </div>
      )}

      {isPolaroid && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <button type="button" onClick={prev} aria-label="Previous artwork" className="c3d-text-btn">
            ‹ Prev
          </button>
          {dots('c3d-dot c3d-dot--soft', 'is-active')}
          <button type="button" onClick={next} aria-label="Next artwork" className="c3d-text-btn">
            Next ›
          </button>
          {playToggle('c3d-play--bare')}
        </div>
      )}

      {(isRail || isDeck) && (
        <p className="c3d-hint">
          {index + 1} / {count} — tap a photo to bring it forward, tap it again to enlarge
        </p>
      )}
      {isPolaroid && (
        <p className="c3d-hint">
          {index + 1} / {count} — student work, tap the centre print to enlarge
        </p>
      )}

    </div>
  );
}
