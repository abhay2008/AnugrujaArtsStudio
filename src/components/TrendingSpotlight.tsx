'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { readPerfTier } from '@/lib/perfTier';

/**
 * The hero announcement ("Upcoming Workshop — … seats left").
 *
 * It has two homes for one pill. In the hero's flow it sits directly under the
 * Buy Paintings / Explore Classes pair, so it is part of the composition on
 * arrival and the hero reserves its room — that copy is server-rendered and is
 * the announcement's only home when JavaScript never runs (or when the visitor
 * asked for reduced motion, or the device is on the lite tier).
 *
 * For everyone else a fixed copy takes over on the first scroll pixel, starting
 * at the exact position the in-flow pill had at that moment, and rides up to the
 * header's crest — where it tightens into a compact chip, anchored so the
 * navigation behind it stays reachable. Geometry is read from the live layout
 * (never assumed), the transform is the only thing written per frame, and the
 * copy that is not in charge is `visibility: hidden`, so there is always one
 * link, no double announcement and no layout shift.
 */
export interface SpotlightData {
  category: string;
  headline: string;
  dateBadge: string;
  seatsNote: string | null;
  href: string;
}

/* ── Choreography ─────────────────────────────────────────────────────── */

/**
 * Hand-off thresholds are deliberately apart: a trackpad resting near the line
 * would otherwise mount and drop the fixed layer on alternating frames.
 */
const HANDOFF_ON = 12;
const HANDOFF_OFF = 3;
/**
 * >1 lets the pill climb ahead of the page instead of riding with it, so the
 * motion reads as "going up to the header" rather than "stuck to the hero".
 */
const EASE_POWER = 1.75;
const DOCK_SCALE = 0.94;
/** Eased progress at which the pill counts as docked (and compacts). */
const DOCKED_AT = 0.5;
/** The docked chip never crosses the header's top edge. */
const DOCK_MIN_TOP = 6;
/**
 * Nominal height of the *compact* docked chip, and a ceiling on where it may
 * land. Both are constants rather than measurements on purpose: the header
 * opens tall on load (`.gallery-header--expanded`, 6.4em) and eases back to
 * 4.5em on the first scroll — the very same scroll that starts this dock — so
 * the live height can be a transient value, and a target derived from it would
 * park the chip low and then never correct itself.
 */
const DOCK_CHIP_H = 40;
const DOCK_MAX_TOP = 17;
const DOCK_EDGE_GAP = 10;
/** How far left of the crest the docked chip is allowed to start. */
const DOCK_LEFT_BIAS = 10;
/** Breathing room kept between the docked chip and the header's own controls. */
const DOCK_GUARD_GAP = 14;

interface Geometry {
  /** Border-box left/width of the in-flow slot, in viewport pixels. */
  slotLeft: number;
  slotWidth: number;
  /** The slot's top in *document* pixels — the anchor the fixed copy tracks. */
  restTop: number;
  /** Where the docked chip wants to start, and the right-most pixel it may use. */
  dockLeft: number;
  dockRight: number;
  headerH: number;
  pillH: number;
  viewportH: number;
}

interface Frame {
  left: number;
  width: number;
  top: number;
  scale: number;
  docked: boolean;
}

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** One pill, rendered identically in the hero and in the dock. */
function SpotlightBarLink({ data }: { data: SpotlightData }) {
  return (
    <Link href={data.href} className="spotlight-pill">
      <span className="pulsing-status-dot" aria-hidden />
      <span className="spotlight-cat">{data.category}</span>
      <span className="spotlight-title">{data.headline}</span>
      <span className="spotlight-date">{data.dateBadge}</span>
      {data.seatsNote && <span className="spotlight-seats">{data.seatsNote}</span>}
      <span className="spotlight-arrow" aria-hidden>
        ↗
      </span>
    </Link>
  );
}

export default function TrendingSpotlight({ data }: { data: SpotlightData | null }) {
  const reducedMotion = useReducedMotion();
  /** True once the fixed layer is allowed to exist at all (see the effect). */
  const [enhanced, setEnhanced] = useState(false);

  const slotRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);

  const geometry = useRef<Geometry>({
    slotLeft: 0,
    slotWidth: 0,
    restTop: 0,
    dockLeft: 16,
    dockRight: 0,
    headerH: 72,
    pillH: 0,
    viewportH: 0,
  });
  const applied = useRef({ left: NaN, width: NaN, maxWidth: NaN });
  /** Which copy owns the pill right now, and whether it has arrived. */
  const floating = useRef(false);
  const docked = useRef(false);

  /*
   * Reduced motion and the lite tier keep the plain in-flow announcement: no
   * fixed layer, no scroll listener, nothing newly composited. The tier script
   * stamps the attribute before first paint, and this runs in an effect, so
   * server and client markup never disagree about the initial render.
   */
  useEffect(() => {
    setEnhanced(!reducedMotion && readPerfTier() !== 'lite');
  }, [reducedMotion]);

  useEffect(() => {
    if (!enhanced) return;
    const slot = slotRef.current;
    const dock = dockRef.current;
    if (!slot || !dock) return;

    /**
     * Reads the live layout: where the slot sits in the document, how tall the
     * header is, and how much of the header the docked chip may cover. Called
     * on resize, on the way into the dock and once fonts have settled — never
     * per frame, because every read here is a layout flush.
     */
    const measure = () => {
      const g = geometry.current;
      const slotRect = slot.getBoundingClientRect();
      const pill = dock.querySelector<HTMLElement>('.spotlight-pill');
      const headerEl = document.querySelector<HTMLElement>('.gallery-header');
      const crest = document.querySelector<HTMLElement>('.gallery-header .logo-chrome');
      const primaryNav = document.querySelector<HTMLElement>(
        '.gallery-header nav[aria-label="Primary"]'
      );
      const mobileCluster = document.querySelector<HTMLElement>('.header-mobile-cluster');
      const navRect = primaryNav?.getBoundingClientRect();
      /* The docked chip stops short of whichever control cluster is on screen:
         the desktop nav, or the phone's theme/burger cluster. */
      const guard = navRect && navRect.width > 0 ? navRect : mobileCluster?.getBoundingClientRect();

      g.slotLeft = slotRect.left;
      g.slotWidth = slotRect.width;
      g.restTop = slotRect.top + window.scrollY;
      g.headerH = headerEl ? headerEl.offsetHeight : 72;
      g.pillH = pill ? pill.offsetHeight : 0;
      g.viewportH = window.innerHeight;
      g.dockLeft = crest
        ? Math.max(DOCK_MIN_TOP + 2, crest.getBoundingClientRect().left - DOCK_LEFT_BIAS)
        : 16;
      g.dockRight = guard && guard.width > 0 ? Math.max(160, guard.left - DOCK_GUARD_GAP) : 0;
    };

    /** Where the pill should be for a given scroll offset. */
    const frameFor = (scrollY: number): Frame => {
      const g = geometry.current;
      const dockTop = Math.min(
        DOCK_MAX_TOP,
        Math.max(DOCK_MIN_TOP, (g.headerH - DOCK_CHIP_H) / 2)
      );
      const startTop = g.restTop - HANDOFF_ON;
      const travel = Math.max(24, startTop - dockTop);
      const progress = clamp01((scrollY - HANDOFF_ON) / Math.max(24, travel));
      const eased = 1 - Math.pow(1 - progress, EASE_POWER);
      /* Never park the pill below the fold: on a short viewport the slot can
         land under the edge, and an announcement nobody sees is no
         announcement. Clamping here keeps the whole path continuous. */
      const ceiling = g.viewportH ? g.viewportH - g.pillH - DOCK_EDGE_GAP : Infinity;
      return {
        left: g.slotLeft - eased * (g.slotLeft - g.dockLeft),
        width: g.slotWidth,
        top: Math.min(startTop - eased * (startTop - dockTop), ceiling),
        scale: 1 - eased * (1 - DOCK_SCALE),
        docked: progress >= DOCKED_AT,
      };
    };

    const apply = (frame: Frame) => {
      const g = geometry.current;
      const last = applied.current;
      if (frame.left !== last.left) {
        dock.style.left = `${round(frame.left)}px`;
        last.left = frame.left;
      }
      if (frame.width !== last.width) {
        dock.style.width = `${round(frame.width)}px`;
        last.width = frame.width;
      }
      if (g.dockRight) {
        const maxWidth = Math.max(140, round(g.dockRight - frame.left));
        if (maxWidth !== last.maxWidth) {
          dock.style.setProperty('--dock-max-w', `${maxWidth}px`);
          last.maxWidth = maxWidth;
        }
      }
      dock.style.transform = `translate3d(0, ${round(frame.top)}px, 0) scale(${round(frame.scale)})`;
      if (frame.docked !== docked.current) {
        docked.current = frame.docked;
        dock.dataset.docked = frame.docked ? 'true' : 'false';
      }
    };

    const update = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      if (!floating.current) {
        if (scrollY <= HANDOFF_ON) return;
        /*
         * Measure on the way in. Fonts, the mobile URL bar, the hero's own
         * entrance animation and a reload part-way down the page all move the
         * slot, and this is the one moment a stale number would be visible.
         */
        measure();
        const frame = frameFor(scrollY);
        floating.current = true;
        slot.dataset.enhanced = 'true';
        apply(frame);
        dock.dataset.visible = 'true';
        return;
      }

      if (scrollY < HANDOFF_OFF) {
        floating.current = false;
        dock.dataset.visible = 'false';
        slot.dataset.enhanced = 'false';
        return;
      }

      apply(frameFor(scrollY));
    };

    const resync = () => {
      measure();
      update();
    };

    resync();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', resync);
    window.addEventListener('orientationchange', resync);
    /* The webfonts land after the first paint and the hero copy reflows. */
    document.fonts?.ready.then(resync).catch(() => {});

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', resync);
      window.removeEventListener('orientationchange', resync);
      floating.current = false;
      docked.current = false;
      applied.current = { left: NaN, width: NaN, maxWidth: NaN };
      slot.dataset.enhanced = 'false';
      dock.dataset.visible = 'false';
    };
  }, [enhanced]);

  if (!data) return null;

  return (
    <>
      <div ref={slotRef} className="spotlight-slot">
        <SpotlightBarLink data={data} />
      </div>

      {enhanced && typeof document !== 'undefined'
        ? createPortal(
            /*
             * Portalled to <body> on purpose: the hero's entrance animation
             * leaves a transform on an ancestor, which would turn this fixed
             * layer into "positioned against that div", and <main> opens a
             * stacking context (z-index 1) that could never paint over the
             * sticky header.
             */
            <div ref={dockRef} className="spotlight-dock">
              <div className="spotlight-dock-track">
                <SpotlightBarLink data={data} />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
