/**
 * Geometry for framing a painting photo before it is published: crop, 90°
 * rotation, flips and fine straightening.
 *
 * Everything here is pure math plus two canvas helpers, and the *same* code
 * drives the on-screen preview and the exported image — so what the admin sees
 * framed is exactly the file that gets committed.
 *
 * Rectangles are normalized (0–1) against the **oriented** image: the source
 * after its 90° rotation and flips are baked in. That keeps the math
 * resolution-independent and stable when the browser scales the canvas.
 */

export type Rotation = 0 | 90 | 180 | 270;

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A photo's framing. The first seven fields are the admin's *intent* (what the
 * framer restores when reopened); `crop` is the resolved rectangle the export
 * actually uses.
 */
export interface Framing {
  rotate: Rotation;
  /** Fine straightening in degrees, clockwise, within ±MAX_STRAIGHTEN. */
  straighten: number;
  flipH: boolean;
  flipV: boolean;
  /** Locked output shape (pixel width / height), or null for the photo's own. */
  aspect: number | null;
  /** Crop size relative to the largest wedge-free crop. 1 = as large as fits. */
  zoom: number;
  /** Crop centre in normalized oriented space. */
  center: Point;
  crop: CropRect;
}

export const MAX_STRAIGHTEN = 15;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };
export const CENTER: Point = { x: 0.5, y: 0.5 };

/**
 * Shape choices in the framer — deliberately only the four a shop owner needs.
 * `null` keeps the photo's own shape; the others make a tidy gallery grid.
 */
export const ASPECT_PRESETS: { label: string; value: number | null }[] = [
  { label: 'Whole photo', value: null },
  { label: 'Square', value: 1 },
  { label: 'Portrait', value: 4 / 5 },
  { label: 'Landscape', value: 3 / 2 },
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Slack for the "is this crop covered by paint" test, in image pixels.
 *
 * Only large enough to absorb floating-point noise (trig error on a 2000px
 * coordinate is ~1e-12px). A looser tolerance here — half a pixel, say — lets
 * the binary searches below park the crop just past the edge of the photo,
 * which is how a hairline of unpainted background sneaks into an export.
 */
const EDGE_EPSILON = 1e-9;

// ---------------------------------------------------------------- rotations

/** Rotate a normalized rect 90° clockwise inside its image. */
export function rotateCropCW(rect: CropRect): CropRect {
  return { x: 1 - rect.y - rect.h, y: rect.x, w: rect.h, h: rect.w };
}

/** Rotate a normalized rect 90° counter-clockwise inside its image. */
export function rotateCropCCW(rect: CropRect): CropRect {
  return { x: rect.y, y: 1 - rect.x - rect.w, w: rect.h, h: rect.w };
}

export function rotatePointCW(p: Point): Point {
  return { x: 1 - p.y, y: p.x };
}

export function rotatePointCCW(p: Point): Point {
  return { x: p.y, y: 1 - p.x };
}

/** Normalize a degree value onto the four 90° steps. */
export function normalizeRotation(deg: number): Rotation {
  const wrapped = ((deg % 360) + 360) % 360;
  const step = (Math.round(wrapped / 90) * 90) % 360;
  return (step === 0 || step === 90 || step === 180 ? step : 270) as Rotation;
}

// ------------------------------------------------------------- crop validity

export function rectCorners(rect: CropRect, w: number, h: number): [number, number][] {
  const x0 = rect.x * w;
  const y0 = rect.y * h;
  const x1 = (rect.x + rect.w) * w;
  const y1 = (rect.y + rect.h) * h;
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

export function rectCenter(rect: CropRect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function rectAtSize(rect: CropRect, center: Point): CropRect {
  return { x: center.x - rect.w / 2, y: center.y - rect.h / 2, w: rect.w, h: rect.h };
}

export function scaleRectAboutCenter(rect: CropRect, scale: number): CropRect {
  return rectAtSize(
    { ...rect, w: rect.w * scale, h: rect.h * scale },
    rectCenter(rect)
  );
}

/**
 * True when the crop is fully covered by the image once the content is
 * straightened by `angle` degrees about the crop's centre.
 *
 * Un-rotating the crop rect by `-angle` and requiring it to sit inside the
 * image is the exact condition for "no empty wedges" — the failure mode that
 * would otherwise publish a painting with soft grey corners.
 */
export function cropIsValid(rect: CropRect, angle: number, w: number, h: number): boolean {
  if (rect.w <= 0 || rect.h <= 0) return false;
  const c = rectCenter(rect);
  const cx = c.x * w;
  const cy = c.y * h;
  const rad = toRad(-angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  for (const [px, py] of rectCorners(rect, w, h)) {
    const dx = px - cx;
    const dy = py - cy;
    const rx = cx + dx * cos - dy * sin;
    const ry = cy + dx * sin + dy * cos;
    if (
      rx < -EDGE_EPSILON ||
      ry < -EDGE_EPSILON ||
      rx > w + EDGE_EPSILON ||
      ry > h + EDGE_EPSILON
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Shrink the crop about its centre until no empty wedges remain. Assumes the
 * centre sits inside the image (the crop is only ever panned through valid
 * positions, so it always does).
 *
 * Validity is monotone under this scaling — the centre stays put and each
 * corner travels a straight line into a convex region — so a binary search
 * finds the largest valid size exactly.
 */
export function fitCrop(rect: CropRect, angle: number, w: number, h: number): CropRect {
  if (cropIsValid(rect, angle, w, h)) return rect;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (cropIsValid(scaleRectAboutCenter(rect, mid), angle, w, h)) lo = mid;
    else hi = mid;
  }
  return scaleRectAboutCenter(rect, lo);
}

/** The largest centred crop with this shape (pixel width/height) and no wedges. */
export function maxCropFor(
  aspect: number | null,
  angle: number,
  w: number,
  h: number
): CropRect {
  let pxW = w;
  let pxH = h;
  if (aspect && aspect > 0) {
    if (w / h > aspect) pxW = h * aspect;
    else pxH = w / aspect;
  }
  const rect: CropRect = {
    x: (1 - pxW / w) / 2,
    y: (1 - pxH / h) / 2,
    w: pxW / w,
    h: pxH / h,
  };
  return fitCrop(rect, angle, w, h);
}

/**
 * The furthest crop centre along the line from a known-valid point to the
 * point the admin panned to, so dragging stops cleanly at the edge instead of
 * jumping or exposing background.
 */
export function furthestValidCenter(
  rect: CropRect,
  from: Point,
  to: Point,
  angle: number,
  w: number,
  h: number
): Point {
  if (cropIsValid(rectAtSize(rect, to), angle, w, h)) return to;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    const probe = { x: from.x + (to.x - from.x) * mid, y: from.y + (to.y - from.y) * mid };
    if (cropIsValid(rectAtSize(rect, probe), angle, w, h)) lo = mid;
    else hi = mid;
  }
  return { x: from.x + (to.x - from.x) * lo, y: from.y + (to.y - from.y) * lo };
}

export interface DeriveCropInput {
  aspect: number | null;
  zoom: number;
  center: Point;
  angle: number;
  /** Oriented image size in pixels. */
  w: number;
  h: number;
}

/**
 * Resolve the admin's intent (shape, zoom, position, straighten angle) into
 * the crop rectangle. Straightening automatically shrinks the available area,
 * because the largest wedge-free crop gets smaller as the angle grows.
 */
export function deriveCrop({ aspect, zoom, center, angle, w, h }: DeriveCropInput): CropRect {
  const safeZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const max = maxCropFor(aspect, angle, w, h);
  const sized = scaleRectAboutCenter(max, 1 / safeZoom);
  const origin = rectCenter(max);
  const target = { x: clamp01(center.x), y: clamp01(center.y) };
  return rectAtSize(sized, furthestValidCenter(sized, origin, target, angle, w, h));
}

export function outputSize(crop: CropRect, w: number, h: number): { w: number; h: number } {
  return { w: Math.max(1, crop.w * w), h: Math.max(1, crop.h * h) };
}

/** Has the admin actually changed anything? Identity framing is not worth storing. */
export function framingChangesThePhoto(framing: Framing): boolean {
  const c = framing.crop;
  // "Untrimmed" means the crop still spans the whole frame — testing the width
  // with `< 1` would call every trim unchanged and quietly drop the crop.
  const untrimmed = c.x > -0.002 && c.y > -0.002 && c.w > 0.998 && c.h > 0.998;
  return (
    framing.rotate !== 0 ||
    framing.flipH ||
    framing.flipV ||
    Math.abs(framing.straighten) > 0.01 ||
    !untrimmed
  );
}

// ------------------------------------------------------------------ canvases

/**
 * Bake the 90° rotation and flips into a canvas, so the rest of the pipeline
 * only ever deals with an upright, normalized image.
 */
export function buildOrientedCanvas(
  source: HTMLImageElement,
  rotate: Rotation,
  flipH: boolean,
  flipV: boolean
): HTMLCanvasElement {
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const swapped = rotate === 90 || rotate === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swapped ? sh : sw;
  canvas.height = swapped ? sw : sh;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(toRad(rotate));
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(source, -sw / 2, -sh / 2, sw, sh);
  return canvas;
}

/**
 * Draw the framed result. `scale` maps native crop pixels onto the output
 * canvas (1 = full resolution, smaller = the on-screen preview) and `outW`/
 * `outH` are CSS pixels, so `pixelRatio` can render the preview crisply on a
 * retina screen without changing any of the geometry.
 */
export function drawFramed(
  ctx: CanvasRenderingContext2D,
  oriented: CanvasImageSource,
  imageW: number,
  imageH: number,
  framing: Pick<Framing, 'crop' | 'straighten'>,
  scale: number,
  outW: number,
  outH: number,
  pixelRatio = 1
): void {
  const center = rectCenter(framing.crop);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, outW, outH);
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(toRad(framing.straighten));
  ctx.scale(scale, scale);
  // The crop's centre lands at the output's centre, then the whole oriented
  // image is drawn around it — rotation pivots on the painting, not the file.
  ctx.drawImage(oriented, -center.x * imageW, -center.y * imageH, imageW, imageH);
}
