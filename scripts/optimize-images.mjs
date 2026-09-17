/**
 * Build WebP derivatives for every image in public/images.
 *
 * Why this exists: the studio's gallery JPEGs are 250–420 KB each, and several
 * places in the UI (the painting lightbox, the filmstrip thumbnails, the
 * homepage event photos) served the full original file straight to the browser.
 * On a phone with a patchy connection that is the difference between an image
 * that appears and one that doesn't.
 *
 * What it writes:
 *   public/images/opt/<name>-<width>.webp   one per useful width
 *   public/images/opt/<name>-32.webp        a tiny LQIP placeholder
 *   src/lib/imageVariants.json              real dimensions + available widths,
 *                                           consumed by src/lib/imageSrc.ts
 *                                           (generated file — do not hand-edit)
 *
 * Originals are never modified or deleted. Re-running is a no-op unless the
 * source is newer than its derivatives; pass --force to rebuild everything.
 *
 * Usage:  npm run images:optimize   [-- --force]
 */

import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'public', 'images');
const OUT_DIR = path.join(SOURCE_DIR, 'opt');
const MANIFEST_PATH = path.join(ROOT, 'src', 'lib', 'imageVariants.json');

/** Standard widths. Bigger sources also get one full-width re-encode. */
const WIDTHS = [480, 960, 1600];
/** Above this, a "full" re-encode costs more than it gains — stop at 1600. */
const FULL_REENCODE_CAP = 1920;
const LQIP_WIDTH = 32;
const WEBP = { quality: 78, effort: 5 };
const LQIP_WEBP = { quality: 40, effort: 3 };

const SKIP_DIRS = new Set(['opt']);
const SOURCE_EXT = /\.(jpe?g|png|webp|avif)$/i;

const force = process.argv.includes('--force');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...(await walk(full)));
    } else if (SOURCE_EXT.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** `/images/hero/fern.png` → `hero-fern.png` → `hero-fern` (flat, collision-free). */
function derivativeBase(file) {
  const rel = path.relative(SOURCE_DIR, file).split(path.sep).join('-');
  return rel.replace(/\.[^.]+$/, '');
}

/** Public URL for an original file on disk. */
function publicUrl(file) {
  const rel = path.relative(path.join(ROOT, 'public'), file).split(path.sep).join('/');
  return `/${rel}`;
}

async function isFresh(source, output) {
  if (force) return false;
  try {
    const [s, o] = await Promise.all([stat(source), stat(output)]);
    return o.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await walk(SOURCE_DIR)).sort();
  if (files.length === 0) {
    console.log('No images found under public/images — nothing to do.');
    return;
  }

  const manifest = {};
  let written = 0;
  let skipped = 0;
  let sourceBytes = 0;
  let derivativeBytes = 0;

  for (const file of files) {
    const meta = await sharp(file).metadata();
    if (!meta.width || !meta.height) {
      console.warn(`  ! ${publicUrl(file)} — no dimensions, skipped`);
      continue;
    }

    const base = derivativeBase(file);
    sourceBytes += (await stat(file)).size;

    /** @type {number[]} */
    const widths = WIDTHS.filter((w) => w <= meta.width);
    const largestUseful = widths.length > 0 ? widths[widths.length - 1] : 0;
    if (meta.width > largestUseful && meta.width <= FULL_REENCODE_CAP) {
      widths.push(meta.width);
    }
    if (widths.length === 0) widths.push(meta.width);

    for (const width of widths) {
      const out = path.join(OUT_DIR, `${base}-${width}.webp`);
      if (await isFresh(file, out)) {
        skipped += 1;
        derivativeBytes += (await stat(out)).size;
        continue;
      }
      await sharp(file)
        .resize({ width, withoutEnlargement: true })
        .webp(WEBP)
        .toFile(out);
      written += 1;
      derivativeBytes += (await stat(out)).size;
    }

    // LQIP placeholder — a few hundred bytes that make a slow load look instant.
    const lqip = path.join(OUT_DIR, `${base}-${LQIP_WIDTH}.webp`);
    if (!(await isFresh(file, lqip))) {
      await sharp(file).resize({ width: LQIP_WIDTH }).webp(LQIP_WEBP).toFile(lqip);
      written += 1;
    }
    derivativeBytes += (await stat(lqip)).size;

    manifest[publicUrl(file)] = { w: meta.width, h: meta.height, v: widths };
  }

  const sorted = {};
  for (const key of Object.keys(manifest).sort()) sorted[key] = manifest[key];
  // Compact on purpose: this lands in the client bundle, and it is generated.
  await writeFile(MANIFEST_PATH, `${JSON.stringify(sorted)}\n`, 'utf8');

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(`Images:      ${files.length} sources scanned`);
  console.log(`Derivatives: ${written} written, ${skipped} already fresh`);
  console.log(`Manifest:    ${path.relative(ROOT, MANIFEST_PATH)} (${Object.keys(sorted).length} entries)`);
  console.log(`Originals:   ${mb(sourceBytes)}`);
  console.log(`Derivatives: ${mb(derivativeBytes)} (what the browser now fetches instead)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
