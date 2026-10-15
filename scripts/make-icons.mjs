/**
 * Favicon & App Icon Generator for Anugruja Arts Studio.
 *
 * Produces both:
 * 1. Dark-theme tab favicons (original bright gold crest on transparent alpha)
 * 2. Light-theme tab favicons (rich burnished bronze-gold crest on transparent alpha)
 * 3. Adaptive SVG favicon (automatically switches based on prefers-color-scheme)
 *
 * Syncs generated assets to both the public site and admin portal.
 *
 * Run via: npm run images:icons
 */
import { statSync, existsSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

const ROOT_SRC = resolve('public/images/logo.png');
const ADMIN_DIR = resolve('../AnugrujaArtsStudio-Admin');

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let val = t;
      if (val < 0) val += 1;
      if (val > 1) val -= 1;
      if (val < 1 / 6) return p + (q - p) * 6 * val;
      if (val < 1 / 2) return q;
      if (val < 2 / 3) return p + (q - p) * (2 / 3 - val) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const kb = (p) => Math.round(statSync(p).size / 1024);

async function main() {
  console.log('🌟 Generating studio favicon & logo theme assets...');

  // 1. Process dark gold variant for light background/tab theme
  const origImg = sharp(ROOT_SRC);
  const { data, info } = await origImg.raw().toBuffer({ resolveWithObject: true });
  const darkGoldBuf = Buffer.from(data);

  for (let i = 0; i < darkGoldBuf.length; i += 4) {
    const alpha = darkGoldBuf[i + 3];
    if (alpha === 0) continue;

    const r = darkGoldBuf[i];
    const g = darkGoldBuf[i + 1];
    const b = darkGoldBuf[i + 2];
    const [, s, l] = rgbToHsl(r, g, b);

    // Warm deep amber/bronze-gold (hue ~ 37.5 deg)
    const targetHue = 0.104;
    // Lightness scaled down with gamma curve for crisp contrast on light gray / white browser tabs
    const targetL = Math.pow(l, 1.40) * 0.38;
    // Saturated metallic gold feel
    const targetS = Math.max(0.70, Math.min(0.98, s * 1.35));

    const [nr, ng, nb] = hslToRgb(targetHue, targetS, targetL);
    darkGoldBuf[i] = nr;
    darkGoldBuf[i + 1] = ng;
    darkGoldBuf[i + 2] = nb;
  }

  const darkGoldFull = sharp(darkGoldBuf, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });

  // Save full-size light-theme (dark gold) logo
  const lightModeFullOut = resolve('public/images/logo-dark-gold.png');
  await darkGoldFull.clone().png({ compressionLevel: 9 }).toFile(lightModeFullOut);
  console.log(`[Asset] ${lightModeFullOut} (${kb(lightModeFullOut)} KB)`);

  // Target sizes to produce
  const SIZES = [
    { name: 'logo-64.png', darkName: 'logo-dark-gold-64.png', size: 64 },
    { name: 'logo-32.png', darkName: 'logo-dark-gold-32.png', size: 32 },
    { name: 'logo-180.png', darkName: 'logo-dark-gold-180.png', size: 180 },
  ];

  let darkFaviconBase64 = '';
  let lightFaviconBase64 = '';

  for (const { name, darkName, size } of SIZES) {
    const origOut = resolve(`public/images/${name}`);
    const darkOut = resolve(`public/images/${darkName}`);

    // Dark-tab (original bright gold)
    const origBuf = await sharp(ROOT_SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, quality: 95 })
      .toBuffer();
    writeFileSync(origOut, origBuf);

    // Light-tab (darker bronze-gold)
    const darkBuf = await darkGoldFull
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, quality: 95 })
      .toBuffer();
    writeFileSync(darkOut, darkBuf);

    if (size === 64) {
      darkFaviconBase64 = origBuf.toString('base64');
      lightFaviconBase64 = darkBuf.toString('base64');
    }

    console.log(`[Icon] ${name} ${size}x${size} (${kb(origOut)} KB) | ${darkName} (${kb(darkOut)} KB)`);
  }

  // 2. Generate Adaptive SVG Favicon
  // Browsers that support SVG favicons will automatically toggle via CSS @media without JS!
  const svgFaviconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <style>
    :root { color-scheme: light dark; }
    .icon-dark-tab { display: block; }
    .icon-light-tab { display: none; }
    @media (prefers-color-scheme: light) {
      .icon-dark-tab { display: none; }
      .icon-light-tab { display: block; }
    }
  </style>
  <image class="icon-dark-tab" href="data:image/png;base64,${darkFaviconBase64}" width="64" height="64" />
  <image class="icon-light-tab" href="data:image/png;base64,${lightFaviconBase64}" width="64" height="64" />
</svg>`;

  const svgFaviconPath = resolve('public/favicon.svg');
  writeFileSync(svgFaviconPath, svgFaviconContent, 'utf-8');
  console.log(`[SVG] ${svgFaviconPath} (${kb(svgFaviconPath)} KB)`);

  // 3. Mirror all assets to Admin repo if present
  if (existsSync(ADMIN_DIR)) {
    console.log('🔄 Syncing favicon and logo assets to AnugrujaArtsStudio-Admin...');
    const adminImagesDir = resolve(ADMIN_DIR, 'public/images');
    const adminPublicDir = resolve(ADMIN_DIR, 'public');

    const copyList = [
      'public/images/logo.png',
      'public/images/logo-dark-gold.png',
      'public/images/logo-64.png',
      'public/images/logo-32.png',
      'public/images/logo-180.png',
      'public/images/logo-dark-gold-64.png',
      'public/images/logo-dark-gold-32.png',
      'public/images/logo-dark-gold-180.png',
    ];

    for (const srcRel of copyList) {
      const srcFile = resolve(srcRel);
      const destFile = resolve(ADMIN_DIR, srcRel);
      copyFileSync(srcFile, destFile);
    }
    copyFileSync(svgFaviconPath, resolve(adminPublicDir, 'favicon.svg'));
    console.log('✅ Admin portal assets successfully synchronized.');
  }

  console.log('🎉 All logo and favicon assets generated successfully!');
}

main().catch((err) => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
