'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Crop,
  Loader2,
  Move,
  RotateCcw,
  RotateCw,
  Undo2,
  X,
} from 'lucide-react';
import {
  ASPECT_PRESETS,
  buildOrientedCanvas,
  CENTER,
  deriveCrop,
  drawFramed,
  MAX_STRAIGHTEN,
  MAX_ZOOM,
  MIN_ZOOM,
  normalizeRotation,
  outputSize,
  rotatePointCCW,
  rotatePointCW,
  type Framing,
  type Point,
  type Rotation,
} from '@/lib/photoFraming';
import { MAX_IMAGE_DIMENSION, encodeCanvasToDataUrl } from '@/lib/imageOptimize';

export interface FramedResult {
  framing: Framing;
  dataUrl: string;
  filename: string;
}

interface ArtworkFramerProps {
  file: File;
  /** Shown in the header so the admin knows which painting they're framing. */
  title: string;
  /** Previous framing, so reopening the editor resumes where they left off. */
  initial?: Framing;
  onCancel: () => void;
  onApply: (result: FramedResult) => void;
}

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpointOf = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Frame a painting photo, kept deliberately as plain as a phone's photo editor:
 * pinching or scrolling zooms, dragging moves, one button turns the photo
 * upright, and one slider tilts it level. No grid overlays, no mirroring, no
 * pixel readouts — the studio owner is not a photographer.
 *
 * The on-screen canvas is drawn by the same code that produces the exported
 * file, and tilting automatically pulls the crop in so only real paint is ever
 * kept — never the grey wedges a naive rotation would bake in.
 */
export default function ArtworkFramer({
  file,
  title,
  initial,
  onCancel,
  onApply,
}: ArtworkFramerProps) {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  const [rotate, setRotate] = useState<Rotation>(initial?.rotate ?? 0);
  const [straighten, setStraighten] = useState(initial?.straighten ?? 0);
  const [aspect, setAspect] = useState<number | null>(initial?.aspect ?? null);
  const [zoom, setZoom] = useState(initial?.zoom ?? 1);
  const [center, setCenter] = useState<Point>(initial?.center ?? CENTER);
  const [dragging, setDragging] = useState(false);
  // Mirroring is not offered here any more, but a framing made before the
  // framer was simplified must still round-trip untouched.
  const [flipH] = useState(Boolean(initial?.flipH));
  const [flipV] = useState(Boolean(initial?.flipV));

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<
    | { kind: 'pan'; from: Point; center: Point }
    | { kind: 'pinch'; distance: number; mid: Point; zoom: number; center: Point }
    | null
  >(null);

  // Escape closes, and the page behind must not scroll while framing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  // Decode the photo once; the blob URL is only needed until the bitmap exists.
  useEffect(() => {
    let revoked = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!revoked) setSource(img);
    };
    img.onerror = () => {
      if (!revoked) setError('This photo could not be opened. Try another file.');
    };
    img.src = url;
    return () => {
      revoked = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [source]);

  // 90° rotation is baked once, so every later step is upright math.
  const oriented = useMemo(
    () => (source ? buildOrientedCanvas(source, rotate, flipH, flipV) : null),
    [source, rotate, flipH, flipV]
  );
  const dims = oriented ? { w: oriented.width, h: oriented.height } : null;

  const crop = useMemo(
    () =>
      dims
        ? deriveCrop({ aspect, zoom, center, angle: straighten, w: dims.w, h: dims.h })
        : { x: 0, y: 0, w: 1, h: 1 },
    [dims, aspect, zoom, center, straighten]
  );

  const display = useMemo(() => {
    if (!dims || stage.w < 16 || stage.h < 16) return null;
    const out = outputSize(crop, dims.w, dims.h);
    const scale = Math.min(stage.w / out.w, stage.h / out.h);
    return {
      /** CSS pixels per native crop pixel — the pointer maths depends on it. */
      scale,
      dw: Math.max(1, Math.round(out.w * scale)),
      dh: Math.max(1, Math.round(out.h * scale)),
    };
  }, [dims, crop, stage]);

  // Paint the preview. Identical geometry to the export, just a smaller scale,
  // drawn at device resolution so it stays crisp on a retina screen.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !oriented || !dims || !display) return;
    const ratio = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
    canvas.width = Math.round(display.dw * ratio);
    canvas.height = Math.round(display.dh * ratio);
    canvas.style.width = `${display.dw}px`;
    canvas.style.height = `${display.dh}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    drawFramed(
      ctx,
      oriented,
      dims.w,
      dims.h,
      { crop, straighten },
      display.scale,
      display.dw,
      display.dh,
      ratio
    );
  }, [oriented, dims, crop, straighten, display]);

  // Scroll or trackpad-pinch zooms. A native listener is required: React's
  // synthetic wheel handler is passive and cannot stop the page from scrolling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clampZoom(z * Math.exp(-e.deltaY * 0.0015)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [source]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!display || !dims) return;
    // Capture keeps a gesture alive when the finger leaves the canvas; some
    // engines refuse it for an inactive pointer, which must not break the drag.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const fingers = [...pointersRef.current.values()];
    if (fingers.length >= 2) {
      gestureRef.current = {
        kind: 'pinch',
        distance: Math.max(1, distanceBetween(fingers[0], fingers[1])),
        mid: midpointOf(fingers[0], fingers[1]),
        zoom,
        center,
      };
      setDragging(true);
    } else {
      gestureRef.current = { kind: 'pan', from: { x: e.clientX, y: e.clientY }, center };
      setDragging(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || !display || !dims) return;
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // One CSS pixel of finger travel, in normalized crop units.
    const perX = 1 / (dims.w * display.scale);
    const perY = 1 / (dims.h * display.scale);

    if (gesture.kind === 'pan') {
      // The photo follows the finger, so the crop window moves the other way.
      setCenter({
        x: gesture.center.x - (e.clientX - gesture.from.x) * perX,
        y: gesture.center.y - (e.clientY - gesture.from.y) * perY,
      });
      return;
    }

    const fingers = [...pointersRef.current.values()];
    if (fingers.length < 2) return;
    const distance = Math.max(1, distanceBetween(fingers[0], fingers[1]));
    const mid = midpointOf(fingers[0], fingers[1]);
    // Pinching out zooms in, and the fingers dragging together pan as they go.
    setZoom(clampZoom(gesture.zoom * (distance / gesture.distance)));
    setCenter({
      x: gesture.center.x - (mid.x - gesture.mid.x) * perX,
      y: gesture.center.y - (mid.y - gesture.mid.y) * perY,
    });
  };

  /** Re-anchor on the fingers that are left, so a lift never jumps the photo. */
  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const fingers = [...pointersRef.current.values()];
    if (fingers.length >= 2) {
      gestureRef.current = {
        kind: 'pinch',
        distance: Math.max(1, distanceBetween(fingers[0], fingers[1])),
        mid: midpointOf(fingers[0], fingers[1]),
        zoom,
        center,
      };
    } else if (fingers.length === 1) {
      gestureRef.current = { kind: 'pan', from: { ...fingers[0] }, center };
    } else {
      gestureRef.current = null;
      setDragging(false);
    }
  };

  const rotateBy = (delta: 90 | -90) => {
    setRotate((prev) => normalizeRotation(prev + delta));
    // Keep the crop over the same area of paint as the photo turns.
    setCenter((prev) => (delta > 0 ? rotatePointCW(prev) : rotatePointCCW(prev)));
  };

  const resetAll = () => {
    setRotate(0);
    setStraighten(0);
    setAspect(null);
    setZoom(1);
    setCenter(CENTER);
  };

  const handleApply = () => {
    if (!oriented || !dims || applying) return;
    setApplying(true);
    setError('');
    try {
      const out = outputSize(crop, dims.w, dims.h);
      // Never upscale past the source, and keep the same 2000px ceiling the
      // optimizer uses so a framed upload is no heavier than an untouched one.
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(out.w, out.h));
      const dw = Math.max(1, Math.round(out.w * scale));
      const dh = Math.max(1, Math.round(out.h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('This browser could not prepare the cropped image.');

      const framing: Framing = { rotate, straighten, flipH, flipV, aspect, zoom, center, crop };
      drawFramed(ctx, oriented, dims.w, dims.h, framing, scale, dw, dh);
      const { dataUrl, filename } = encodeCanvasToDataUrl(canvas, file.name);
      onApply({ framing, dataUrl, filename });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply this framing.');
      setApplying(false);
    }
  };

  const tilted = Math.abs(straighten) > 0.01;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Frame the painting"
    >
      <div className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-studio-gold/40 bg-[#150523] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-purple-900/60 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-studio-gold/40 bg-purple-950/70 text-studio-gold">
              <Crop className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-blippo text-xl leading-none text-[#ffe76c]">Frame the painting</h3>
              <p className="mt-1 truncate text-[11px] text-yellow-100/60">
                {title.trim() || file.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close the framer"
            className="shrink-0 rounded-lg p-1.5 text-yellow-200 transition-colors hover:bg-purple-900/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stage — the canvas *is* the crop, drawn by the export code itself. */}
        <div className="min-h-0 flex-1 bg-[#0d0114] px-3 pb-2 pt-3 sm:px-4">
          <div
            ref={stageRef}
            className="flex h-[40vh] min-h-[220px] items-center justify-center sm:h-[46vh]"
          >
            {error ? (
              <p className="max-w-sm rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
                {error}
              </p>
            ) : !source ? (
              <span className="inline-flex items-center gap-2 text-sm text-yellow-100/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading the photo…
              </span>
            ) : (
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
                className={`block max-w-full touch-none rounded-md border border-white/25 bg-black shadow-[0_0_28px_rgba(0,0,0,0.7)] ${
                  dragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              />
            )}
          </div>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-yellow-100/50">
            <Move className="h-3.5 w-3.5" />
            Drag to move · pinch or scroll to zoom in
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-3 border-t border-purple-900/60 px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-200/60">
              Shape
            </span>
            {ASPECT_PRESETS.map((preset) => {
              const active = aspect === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setAspect(preset.value);
                    setCenter(CENTER);
                    setZoom(1);
                  }}
                  className={`rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'border-studio-gold/70 bg-studio-purple text-studio-gold'
                      : 'border-purple-800/70 bg-purple-950/60 text-yellow-100/75 hover:border-studio-gold/40 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => rotateBy(90)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-purple-800/70 bg-purple-950/60 px-3.5 py-2.5 text-xs font-bold text-yellow-100/85 transition-colors hover:border-studio-gold/40 hover:text-white"
            >
              <RotateCw className="h-4 w-4" />
              Turn 90°
            </button>
            <button
              type="button"
              onClick={() => rotateBy(-90)}
              aria-label="Turn 90° the other way"
              title="Turn 90° the other way"
              className="inline-flex shrink-0 items-center rounded-xl border border-purple-800/70 bg-purple-950/60 p-2.5 text-yellow-100/70 transition-colors hover:border-studio-gold/40 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="min-w-[13rem] flex-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="framer-tilt"
                  className="text-[10px] font-bold uppercase tracking-wider text-yellow-200/60"
                >
                  Straighten
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-yellow-100/70">
                    {straighten > 0 ? '+' : ''}
                    {straighten.toFixed(1)}°
                  </span>
                  <button
                    type="button"
                    onClick={() => setStraighten(0)}
                    disabled={!tilted}
                    title="Back to level"
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-800/70 bg-purple-950/60 px-2 py-0.5 text-[10px] font-semibold text-yellow-100/75 transition-colors hover:bg-purple-900 disabled:opacity-40"
                  >
                    <Undo2 className="h-3 w-3" />
                    0°
                  </button>
                </div>
              </div>
              <input
                id="framer-tilt"
                type="range"
                min={-MAX_STRAIGHTEN}
                max={MAX_STRAIGHTEN}
                step={0.5}
                value={straighten}
                onChange={(e) => setStraighten(Number(e.target.value))}
                className="mt-1 w-full accent-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-purple-900/60 bg-[#160523] px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-800/70 bg-purple-950/60 px-3.5 py-2 text-xs font-semibold text-yellow-100/75 transition-colors hover:bg-purple-900"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Start over
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-purple-800/70 bg-purple-950/60 px-4 py-2 text-sm font-medium text-yellow-100 transition-colors hover:bg-purple-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!source || applying || Boolean(error)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 px-5 py-2 text-sm font-extrabold text-black shadow-lg transition-all hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
