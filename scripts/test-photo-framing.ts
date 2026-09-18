/**
 * Geometry checks for the artwork framer (crop / rotate / straighten).
 *
 * Run with:
 *   node --import ./scripts/ts-node-boot.mjs --no-warnings scripts/test-photo-framing.ts
 *
 * The framer's promise is that a straightened crop never publishes the grey
 * wedges a naive rotation would leave behind. That is a pure-math invariant, so
 * it is checked here across a grid of shapes, angles, zooms and pan positions
 * rather than by eyeballing the modal.
 */
import {
  ASPECT_PRESETS,
  cropIsValid,
  deriveCrop,
  fitCrop,
  framingChangesThePhoto,
  FULL_CROP,
  maxCropFor,
  normalizeRotation,
  outputSize,
  rotateCropCCW,
  rotateCropCW,
  scaleRectAboutCenter,
  type CropRect,
} from '@/lib/photoFraming';

let checks = 0;

function assert(condition: boolean, message: string) {
  checks += 1;
  if (!condition) throw new Error(`FAILED: ${message}`);
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${message} (expected ${expected}, got ${actual})`
  );
}

function area(rect: CropRect) {
  return rect.w * rect.h;
}

function testRotationHelpers() {
  const rect: CropRect = { x: 0, y: 0, w: 0.5, h: 0.25 };
  const cw = rotateCropCW(rect);
  assertClose(cw.x, 0.75, 1e-12, '90° clockwise moves the top-left to the top-right');
  assertClose(cw.y, 0, 1e-12, '90° clockwise keeps the row');
  assertClose(cw.w, 0.25, 1e-12, '90° clockwise swaps width');
  assertClose(cw.h, 0.5, 1e-12, '90° clockwise swaps height');

  const roundTrip = rotateCropCCW(cw);
  for (const key of ['x', 'y', 'w', 'h'] as const) {
    assertClose(roundTrip[key], rect[key], 1e-12, `CW then CCW restores ${key}`);
  }

  const origin: CropRect = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
  let spun: CropRect = { ...origin };
  for (let i = 0; i < 4; i += 1) spun = rotateCropCW(spun);
  for (const key of ['x', 'y', 'w', 'h'] as const) {
    assertClose(spun[key], origin[key], 1e-12, `four turns restore ${key}`);
  }

  assert(normalizeRotation(90) === 90, 'normalizeRotation keeps 90');
  assert(normalizeRotation(-90) === 270, 'normalizeRotation wraps -90 to 270');
  assert(normalizeRotation(450) === 90, 'normalizeRotation wraps 450 to 90');
  console.log('  rotation helpers: round-trips and wraps ✓');
}

function testUntouchedAndStraightened() {
  const w = 1600;
  const h = 2000;

  assert(cropIsValid(FULL_CROP, 0, w, h), 'the whole photo is valid with no straightening');

  // Straightening has to shrink the usable area — otherwise the corners of the
  // crop would fall outside the rotated paint.
  const straight = maxCropFor(null, 0, w, h);
  const tilted = maxCropFor(null, 12, w, h);
  assertClose(area(straight), 1, 1e-9, 'an unstraightened portrait keeps the full frame');
  assert(area(tilted) < area(straight) * 0.95, 'a 12° straighten shrinks the crop');
  assert(cropIsValid(tilted, 12, w, h), 'the shrunken crop has no empty wedges');

  // Wider angles must never hand back a *larger* crop.
  let previous = Infinity;
  for (const angle of [0, 1, 3, 5, 7.5, 10, 12.5, 15]) {
    const current = area(maxCropFor(null, angle, w, h));
    assert(current <= previous + 1e-9, `crop area never grows as the angle increases (${angle}°)`);
    previous = current;
  }

  const landscape = maxCropFor(null, 0, 3000, 1200);
  assertClose(area(landscape), 1, 1e-9, 'a landscape photo also keeps its full frame');
  console.log('  straighten shrinks the crop monotonically ✓');
}

function testAspectPresets() {
  const sizes = [
    { w: 1600, h: 2000 },
    { w: 4000, h: 1200 },
    { w: 1200, h: 1200 },
  ];

  for (const { w, h } of sizes) {
    for (const preset of ASPECT_PRESETS) {
      const rect = maxCropFor(preset.value, 0, w, h);
      const size = outputSize(rect, w, h);
      if (preset.value !== null) {
        assertClose(
          size.w / size.h,
          preset.value,
          0.002,
          `${preset.label} on ${w}×${h} keeps its ratio`
        );
      } else {
        assertClose(size.w, w, 0.5, `"whole photo" keeps the full width on ${w}×${h}`);
        assertClose(size.h, h, 0.5, `"whole photo" keeps the full height on ${w}×${h}`);
      }
      assert(cropIsValid(rect, 0, w, h), `${preset.label} stays inside the photo`);
    }
  }
  console.log('  aspect presets keep their exact ratio ✓');
}

function testDerivedCropAlwaysCoversRealPaint() {
  const sizes = [
    { w: 1600, h: 2000 },
    { w: 2400, h: 900 },
    { w: 900, h: 2400 },
  ];
  const angles = [0, 0.5, 3, 7.5, 15, -6, -15];
  const zooms = [1, 1.4, 2.5, 5];
  const centers = [
    { x: 0.5, y: 0.5 },
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 0.1, y: 0.9 },
    { x: 0.85, y: 0.2 },
  ];

  let overflow = 0;
  for (const { w, h } of sizes) {
    for (const preset of ASPECT_PRESETS) {
      for (const angle of angles) {
        for (const zoom of zooms) {
          for (const center of centers) {
            const crop = deriveCrop({ aspect: preset.value, zoom, center, angle, w, h });

            assert(crop.w > 0 && crop.h > 0, 'derived crop has a positive size');
            assert(
              cropIsValid(crop, angle, w, h),
              `no empty wedges (${preset.label}, ${angle}°, ${zoom}×, ${center.x}/${center.y})`
            );
            assert(
              crop.x >= -1e-9 && crop.y >= -1e-9 && crop.x + crop.w <= 1 + 1e-9 && crop.y + crop.h <= 1 + 1e-9,
              `crop stays inside the frame (${preset.label}, ${angle}°, ${zoom}×)`
            );

            const out = outputSize(crop, w, h);
            assert(out.w >= 1 && out.h >= 1, 'export is at least one pixel');
            assert(out.w <= w + 1 && out.h <= h + 1, 'export never exceeds the source');

            // Panning can only reach where the crop still fits; outside the
            // image bounds means nothing is painted there.
            overflow = Math.max(
              overflow,
              -crop.x,
              -crop.y,
              crop.x + crop.w - 1,
              crop.y + crop.h - 1
            );
          }
        }
      }
    }
  }

  assert(overflow < 1e-9, `no crop leaks outside the frame (worst leak ${overflow})`);
  console.log(`  ${checks} derived-crop invariants hold across the grid ✓`);
}

function testZoomAndPanSemantics() {
  const w = 1600;
  const h = 2000;

  // Zoom is "relative to the largest crop that fits", so at the centre it is exact.
  for (const zoom of [1, 2, 3.75, 5]) {
    const crop = deriveCrop({ aspect: null, zoom, center: { x: 0.5, y: 0.5 }, angle: 0, w, h });
    assertClose(crop.w, 1 / zoom, 1e-9, `zoom ${zoom}× trims the width by exactly that factor`);
    assertClose(crop.h, 1 / zoom, 1e-9, `zoom ${zoom}× trims the height by exactly that factor`);
  }

  // Dragging to the edge parks the crop flush against it, never past it.
  const corner = deriveCrop({ aspect: null, zoom: 2, center: { x: 9, y: 9 }, angle: 0, w, h });
  assertClose(corner.x + corner.w, 1, 1e-9, 'a hard right-drag pins the crop to the right edge');
  assertClose(corner.y + corner.h, 1, 1e-9, 'a hard down-drag pins the crop to the bottom edge');

  // Fitting is a no-op on something already valid, and never inverts.
  const already = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
  const fitted = fitCrop(already, 0, w, h);
  assertClose(fitted.x, already.x, 1e-12, 'fitCrop leaves a valid crop untouched');

  const squeezed = fitCrop({ x: 0, y: 0, w: 1, h: 1 }, 15, w, h);
  assert(squeezed.w > 0 && squeezed.w < 1, 'fitCrop shrinks a crop that would show wedges');
  assert(
    area(scaleRectAboutCenter(FULL_CROP, 1)) === 1,
    'scaling by 1 is the identity'
  );
  console.log('  zoom, pan and fit behave as the UI assumes ✓');
}

function testIdentityDetection() {
  const w = 1600;
  const h = 2000;
  const base = {
    rotate: 0 as const,
    straighten: 0,
    flipH: false,
    flipV: false,
    aspect: null,
    zoom: 1,
    center: { x: 0.5, y: 0.5 },
    crop: FULL_CROP,
  };

  assert(!framingChangesThePhoto(base), 'an untouched photo is not re-encoded');
  assert(
    framingChangesThePhoto({ ...base, straighten: 1.5 }),
    'straightening counts as a change'
  );
  assert(framingChangesThePhoto({ ...base, rotate: 90 }), 'rotating counts as a change');
  assert(framingChangesThePhoto({ ...base, flipH: true }), 'mirroring counts as a change');
  assert(
    framingChangesThePhoto({
      ...base,
      crop: deriveCrop({ aspect: null, zoom: 1.2, center: { x: 0.5, y: 0.5 }, angle: 0, w, h }),
    }),
    'trimming counts as a change'
  );
  console.log('  identity framing is detected so nothing is needlessly re-encoded ✓');
}

console.log('--- Testing artwork framing geometry ---');
testRotationHelpers();
testUntouchedAndStraightened();
testAspectPresets();
testDerivedCropAlwaysCoversRealPaint();
testZoomAndPanSemantics();
testIdentityDetection();
console.log(`\nAll framing checks passed (${checks} assertions).`);
