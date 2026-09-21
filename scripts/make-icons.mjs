/**
 * Favicon / apple-touch derivatives of the studio crest.
 *
 * `public/images/logo.png` is a 492x467 transparent crest that weighs ~216 KB.
 * It is the right file for the hero emblem (next/image re-encodes it per
 * request), but it used to be the favicon too — every page load fetched the
 * whole thing to paint 16 pixels. These two derivatives are what the metadata
 * points at instead.
 *
 *   npm run images:icons
 */
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const SRC = resolve('public/images/logo.png');

/** [output, size] — 64px for the tab bar, 180px for iOS home screens. */
const TARGETS = [
  ['public/images/logo-64.png', 64],
  ['public/images/logo-180.png', 180],
];

const kb = (p) => Math.round(statSync(p).size / 1024);

for (const [out, size] of TARGETS) {
  await sharp(SRC)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toFile(resolve(out));
  console.log(`${out}  ${size}x${size}  ${kb(resolve(out))} KB`);
}

console.log(`source ${SRC} ${kb(SRC)} KB`);
