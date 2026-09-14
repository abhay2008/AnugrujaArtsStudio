/* Throwaway audit: WCAG contrast ratios for the luxury light theme.
   Run: node scripts/contrast-audit.mjs  (not part of the build) */

function srgb(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function ratio(fg, bg) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// Composite translucent ink over the effective canvas (paper alpha < 1)
function composite(fgHex, alpha, bgHex) {
  const p = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1).slice(i, i + 2), 16));
  const f = p(fgHex), b = p(bgHex);
  const out = f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)));
  return '#' + out.map((c) => c.toString(16).padStart(2, '0')).join('');
}

const CANVAS = '#f9f6f0';
const CARD = '#ffffff';

// [label, ink, effective background, minimum]
const checks = [
  ['Headline gradient start  #1B140E', '#1b140e', CANVAS, 7],
  ['Headline gradient mid    #8C6514', '#8c6514', CANVAS, 4.5],
  ['Headline gradient end    #B38728', '#b38728', CANVAS, 3],
  ['Subtitle espresso        #2E2620', '#2e2620', CANVAS, 7],
  ['Body muted charcoal      #5C5449', '#5c5449', CANVAS, 4.5],
  ['Overline / gold ink      #7A5C1E', '#7a5c1e', CANVAS, 4.5],
  ['Mantra amethyst          #5B2C6F', '#5b2c6f', CANVAS, 7],
  ['Nav secondary            #6B6255', '#6b6255', CANVAS, 4.5],
  ['Solid button ink         #14100A', '#14100a', '#e5c378', 7],
  ['Outline button ink       #1E1A16', '#1e1a16', CARD, 7],
  ['Seats badge (composite)  #9A3412 on rgba(180,83,9,.08)', composite('#9a3412', 0.92, CARD), '#f2e7dc', 4.5],
];

let fail = 0;
console.log(`WCAG audit — canvas ${CANVAS} (lum ${lum(CANVAS).toFixed(4)})\n`);
for (const [label, fg, bg, min] of checks) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (min ${min}:1)  ${label}`);
}
console.log(fail === 0 ? '\nAll pairs pass.' : `\n${fail} pair(s) below minimum.`);
process.exit(fail === 0 ? 0 : 1);
