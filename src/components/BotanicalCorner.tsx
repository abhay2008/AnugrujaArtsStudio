'use client';

import React, { useEffect, useMemo, useRef } from 'react';

type FrondTone = 'gold' | 'violet';
type FrondBranch = 'primary' | 'secondary';

interface BotanicalCornerProps {
  tone: FrondTone;
  branch: FrondBranch;
  className: string;
}

/* Veins/comets read theme-aware CSS vars so the foliage re-tones with the
   palette; blade/stem fills stay url(#…Grad) refs — those gradients themselves
   are var-driven (see AtelierDefs in LandingHero). */
const foil = {
  gold: {
    blade: 'url(#goldLeafGrad)',
    stem: 'url(#goldStemGrad)',
    vein: 'var(--vein-gold)',
    highlight: 'rgba(255, 252, 220, 0.42)',
  },
  violet: {
    blade: 'url(#purpleLeafGrad)',
    stem: 'url(#purpleStemGrad)',
    vein: 'var(--vein-violet)',
    highlight: 'rgba(240, 195, 255, 0.38)',
  },
} as const;

/** Cubic control points of each frond's stem, in a 300×300 corner-anchored viewBox.
    Cascades gracefully along the golden vitrine border, framing the corner with
    delicate weeping willow curvature without encroaching into the center-left studio title. */
const STEM_CONFIGS = {
  primary: {
    p0: [22, 20] as [number, number],
    p1: [36, 105] as [number, number],
    p2: [68, 180] as [number, number],
    p3: [124, 246] as [number, number],
    leafCount: 16,
  },
  secondary: {
    p0: [20, 24] as [number, number],
    p1: [42, 112] as [number, number],
    p2: [76, 175] as [number, number],
    p3: [132, 238] as [number, number],
    leafCount: 14,
  },
} as const;

interface LeafMeta {
  t: number;
  len: number;
  wid: number;
  side: number;
  sweep: number;
  isTip: boolean;
}

function bezCubic(t: number, a: number, b: number, c: number, d: number) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

function bezTanCubic(t: number, a: number, b: number, c: number, d: number) {
  const u = 1 - t;
  return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c);
}

function generateLeavesMeta(branch: FrondBranch): LeafMeta[] {
  const cfg = STEM_CONFIGS[branch];
  const list: LeafMeta[] = [];
  const count = cfg.leafCount;

  for (let i = 0; i < count; i++) {
    const t = 0.09 + i * (0.82 / (count - 1));
    const swell = 0.68 + 0.44 * Math.sin(Math.PI * Math.min(1, t * 1.15));
    const len = (20 + 26 * t) * swell;
    const wid = len * 0.52;
    const side = i % 2 === 0 ? -1 : 1;
    const sweep = 45 + side * 3;

    list.push({
      t,
      len,
      wid,
      side,
      sweep,
      isTip: false,
    });
  }

  // Crowning terminal leaf
  list.push({
    t: 0.99,
    len: 24,
    wid: 12,
    side: 0,
    sweep: 0,
    isTip: true,
  });

  return list;
}

function leafPath(len: number, wid: number, side: number) {
  const w = wid / 2;
  const c = side * wid * 0.16;
  return `M 0 0 C ${len * 0.22} ${-w * 1.1 + c}, ${len * 0.65} ${-w * 0.9 + c * 1.5}, ${len} ${c * 2} C ${len * 0.68} ${w * 0.9 + c * 1.5}, ${len * 0.25} ${w * 1.1 + c}, 0 0 Z`;
}

function leafHighlightPath(len: number, wid: number, side: number) {
  const w = wid / 2;
  const c = side * wid * 0.16;
  return `M 0 0 C ${len * 0.2} ${-w * 0.95 + c}, ${len * 0.55} ${-w * 0.65 + c * 1.3}, ${len * 0.85} ${c * 1.6} C ${len * 0.52} ${-w * 0.2 + c * 1.2}, ${len * 0.2} ${-w * 0.3 + c}, 0 0 Z`;
}

function leafVeinPath(len: number, wid: number, side: number) {
  const c = side * wid * 0.16;
  return `M ${len * 0.08} 0 C ${len * 0.38} ${c * 0.7}, ${len * 0.68} ${c * 1.4}, ${len * 0.88} ${c * 1.85}`;
}

const ORIENTATION = {
  tl: 'translate(0,0)',
  tr: 'translate(300,0) scale(-1,1)',
  bl: 'translate(0,300) scale(1,-1)',
  br: 'translate(300,300) scale(-1,-1)',
} as const;

function cornerKey(className: string): keyof typeof ORIENTATION {
  if (className.includes('corner-tr')) return 'tr';
  if (className.includes('corner-bl')) return 'bl';
  if (className.includes('corner-br')) return 'br';
  return 'tl';
}

/**
 * Botanical Laurel & Willow Frond with living wind-bending stem.
 * Cascades gracefully along the golden vitrine border; all leaves stay
 * mathematically anchored to the stem curve without any detachment.
 */
export default function BotanicalCorner({ tone, branch, className }: BotanicalCornerProps) {
  const fill = foil[tone];
  const corner = cornerKey(className);
  const phase = corner === 'tl' ? 0 : corner === 'tr' ? 2.1 : corner === 'bl' ? 4.2 : 6.3;
  const cfg = STEM_CONFIGS[branch];
  const leavesMeta = useMemo(() => generateLeavesMeta(branch), [branch]);

  const stemRef = useRef<SVGPathElement>(null);
  const cometRef = useRef<SVGPathElement>(null);
  const leafRefs = useRef<(SVGGElement | null)[]>([]);

  // Compute resting stem curve and initial leaf placements for zero-shift SSR
  const initialStemPath = `M ${cfg.p0[0]} ${cfg.p0[1]} C ${cfg.p1[0]} ${cfg.p1[1]}, ${cfg.p2[0]} ${cfg.p2[1]}, ${cfg.p3[0]} ${cfg.p3[1]}`;

  const initialLeaves = useMemo(() => {
    return leavesMeta.map((meta) => {
      const lx = bezCubic(meta.t, cfg.p0[0], cfg.p1[0], cfg.p2[0], cfg.p3[0]);
      const ly = bezCubic(meta.t, cfg.p0[1], cfg.p1[1], cfg.p2[1], cfg.p3[1]);
      const tanX = bezTanCubic(meta.t, cfg.p0[0], cfg.p1[0], cfg.p2[0], cfg.p3[0]);
      const tanY = bezTanCubic(meta.t, cfg.p0[1], cfg.p1[1], cfg.p2[1], cfg.p3[1]);
      const stemDeg = (Math.atan2(tanY, tanX) * 180) / Math.PI;
      const deg = meta.isTip ? stemDeg : stemDeg + meta.side * meta.sweep;
      return {
        ...meta,
        x: lx,
        y: ly,
        deg,
      };
    });
  }, [cfg, leavesMeta]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let animId: number;

    const update = () => {
      const now = performance.now() * 0.001;
      const t = now + phase;
      // Gentle compound wind gust: ~8.4s period + subtle whisper
      const w = Math.sin(t * 0.75) * 0.72 + Math.sin(t * 1.62 + 0.65) * 0.28;

      const p0 = cfg.p0;
      const p1: [number, number] = [
        cfg.p1[0] + w * 4.5,
        cfg.p1[1] + w * 2.5,
      ];
      const p2: [number, number] = [
        cfg.p2[0] + w * 16,
        cfg.p2[1] - w * 5,
      ];
      const p3: [number, number] = [
        cfg.p3[0] + w * 28,
        cfg.p3[1] + w * 12,
      ];

      const d = `M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} C ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}, ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`;

      if (stemRef.current) stemRef.current.setAttribute('d', d);
      if (cometRef.current) cometRef.current.setAttribute('d', d);

      for (let i = 0; i < leavesMeta.length; i++) {
        const meta = leavesMeta[i];
        const el = leafRefs.current[i];
        if (!el) continue;

        const lx = bezCubic(meta.t, p0[0], p1[0], p2[0], p3[0]);
        const ly = bezCubic(meta.t, p0[1], p1[1], p2[1], p3[1]);
        const tanX = bezTanCubic(meta.t, p0[0], p1[0], p2[0], p3[0]);
        const tanY = bezTanCubic(meta.t, p0[1], p1[1], p2[1], p3[1]);
        const stemDeg = (Math.atan2(tanY, tanX) * 180) / Math.PI;
        const deg = meta.isTip ? stemDeg : stemDeg + meta.side * meta.sweep;

        el.setAttribute(
          'transform',
          `translate(${lx.toFixed(2)} ${ly.toFixed(2)}) rotate(${deg.toFixed(2)})`
        );
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [phase, cfg, leavesMeta]);

  const stemLen = 310;

  return (
    <svg
      className={`deco-corner botanical-corner ${className}`}
      viewBox="0 0 300 300"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={ORIENTATION[corner]}>
        <g className="botanical-branch">
          {/* Main stem curve that bends and arches dynamically in the wind */}
          <path
            ref={stemRef}
            d={initialStemPath}
            stroke={fill.stem}
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Living bead of light running along the curving stem */}
          <path
            ref={cometRef}
            className="leaf-comet"
            d={initialStemPath}
            stroke={fill.vein}
            strokeWidth="3.2"
            strokeLinecap="round"
            style={{
              strokeDasharray: `30 ${stemLen}`,
              animationDelay: `${phase + 1.2}s`,
            }}
          />

          {/* Leaves stay permanently rooted to the stem at exact mathematical coordinates */}
          {initialLeaves.map((leaf, index) => (
            <g
              key={`leaf-${branch}-${index}`}
              ref={(el) => {
                leafRefs.current[index] = el;
              }}
              transform={`translate(${leaf.x.toFixed(2)} ${leaf.y.toFixed(2)}) rotate(${leaf.deg.toFixed(2)})`}
            >
              <path
                className="leaf-blade"
                d={leafPath(leaf.len, leaf.wid, leaf.side)}
                fill={fill.blade}
                filter="drop-shadow(0 1.5px 3px rgba(0, 0, 0, 0.22))"
              />
              <path
                className="leaf-highlight"
                d={leafHighlightPath(leaf.len, leaf.wid, leaf.side)}
                fill={fill.highlight}
                pointerEvents="none"
              />
              <path
                className="leaf-vein"
                d={leafVeinPath(leaf.len, leaf.wid, leaf.side)}
                stroke={fill.vein}
                strokeWidth="1.1"
                strokeLinecap="round"
                pointerEvents="none"
              />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
