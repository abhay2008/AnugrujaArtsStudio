#!/usr/bin/env node
/**
 * Cross-engine CSS compatibility audit.
 *
 * Why this exists: the site was designed and reviewed on macOS/Chromium, and the
 * failures that reach users are the ones no single browser shows you — WebKit
 * quietly dropping an unprefixed property, Gecko tiling a backdrop filter,
 * Chromium keeping a stale rasterisation, Safari 26 sampling a sticky header for
 * browser-chrome tint. See CROSS_BROWSER_RENDERING.md.
 *
 * It reads hand-written CSS only. Tailwind utilities are compiled by Tailwind
 * itself (which already emits `-webkit-backdrop-filter` alongside the standard
 * property), so the gap this guards is the CSS we write by hand.
 *
 *   node scripts/audit-css-compat.mjs            # fail on anything new
 *   node scripts/audit-css-compat.mjs --all      # print every finding
 *   node scripts/audit-css-compat.mjs --update   # rewrite the baseline
 *
 * Findings are keyed by `file|selector|rule` rather than by line number, so a
 * baseline entry survives unrelated edits that shift the line.
 *
 * Limitation worth knowing: rules are matched within a single declaration block.
 * The risk of clipped text inside a *composited ancestor* is therefore only
 * caught when the SAME rule composites; ancestor cases are enumerated by hand in
 * CROSS_BROWSER_RENDERING.md and need human review.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = 'scripts/css-compat-baseline.json';

/* ------------------------------------------------------------------ rules */

/** Properties WebKit only understands prefixed. `needs` narrows by value. */
const PREFIXED = [
  { property: 'backdrop-filter', needs: () => true },
  { property: 'background-clip', needs: (v) => v.trim() === 'text' },
  { property: 'text-fill-color', needs: () => true },
  { property: 'text-size-adjust', needs: () => true },
  { property: 'mask', needs: () => true },
  { property: 'mask-image', needs: () => true },
  { property: 'appearance', needs: () => true },
  { property: 'user-select', needs: () => true },
  { property: 'overflow-scrolling', needs: () => true },
  { property: 'line-clamp', needs: () => true },
  { property: 'hyphens', needs: () => true },
  { property: 'box-decoration-break', needs: () => true },
  { property: 'font-smoothing', needs: () => true },
  { property: 'backface-visibility', needs: () => true },
  { property: 'transform-style', needs: () => true },
];

/** Features that work but need a minimum engine. Reported, never fatal. */
const ENGINE_FLOOR = [
  { pattern: /:has\(/, name: ':has()', floor: 'Safari 15.4 / Firefox 121 / Chrome 105' },
  { pattern: /@container/, name: '@container queries', floor: 'Safari 16 / Firefox 110 / Chrome 105' },
  { pattern: /content-visibility/, name: 'content-visibility', floor: 'Safari 18 / Firefox 125 / Chrome 85' },
  { pattern: /\b\d*\.?\d*(?:dvh|svh|lvh)\b/, name: 'dynamic viewport units', floor: 'Safari 15.4 / Firefox 101 / Chrome 108' },
  { pattern: /text-wrap:\s*balance/, name: 'text-wrap: balance', floor: 'Safari 17.5 / Firefox 121 / Chrome 114' },
  { pattern: /color-mix\(/, name: 'color-mix()', floor: 'Safari 16.2 / Firefox 113 / Chrome 111' },
  { pattern: /oklch\(/, name: 'oklch()', floor: 'Safari 15.4 / Firefox 113 / Chrome 111' },
  { pattern: /light-dark\(/, name: 'light-dark()', floor: 'Safari 17.5 / Firefox 120 / Chrome 123' },
  { pattern: /scrollbar-gutter/, name: 'scrollbar-gutter', floor: 'Safari 18.2 / Firefox 97 / Chrome 94' },
  { pattern: /overscroll-behavior/, name: 'overscroll-behavior', floor: 'Safari 16 / Firefox 59 / Chrome 63' },
  { pattern: /:focus-visible/, name: ':focus-visible', floor: 'Safari 15.4 / Firefox 85 / Chrome 86' },
  { pattern: /accent-color/, name: 'accent-color', floor: 'Safari 15.4 / Firefox 92 / Chrome 93' },
];

const RISK = {
  STICKY_GLASS:
    'Safari 26 scans sticky/fixed elements near the viewport edge and tints browser chrome from their background-color and backdrop-filter. Put the glass on an absolute child; Safari ignores absolute children and pseudo-elements',
  STICKY_BG:
    'Safari 26 reads background-color on a sticky/fixed element near the viewport edge when tinting browser chrome',
  FIXED_PLUS_BACKDROP:
    'Gecko tiles/artifacts when backdrop-filter meets background-attachment: fixed (webcompat #207254, Bugzilla 1741305)',
  CLIPPED_TEXT_COMPOSITED:
    'background-clip: text whose fill is the layer itself paints blank or smeared once that layer is promoted (WebKit; Windows Chromium)',
  WILL_CHANGE_SCALE:
    'will-change: transform suppresses re-rasterisation on transform-scale change in Chromium and WebKit, so magnified content stays soft',
  BLEND_LAYER:
    'mix-blend-mode over a composited or backdrop-filtered layer is the least portable blend path; check per engine',
};

/* --------------------------------------------------------------- parsing */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.css')) out.push(full);
  }
  return out;
}

function lineAt(source, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) if (source[i] === '\n') line++;
  return line;
}

/**
 * Character scanner. Handles comments, strings, at-rule nesting and rules whose
 * body sits on the opening line. Returns [{ selector, line, declarations }].
 */
function parseBlocks(source) {
  const blocks = [];
  const stack = [];
  let buffer = '';
  let i = 0;

  const flushRule = (top, endIndex) => {
    const body = source.slice(top.bodyStart, endIndex);
    const declarations = [];
    for (const { text, start } of splitDeclarations(body)) {
      const colon = text.indexOf(':');
      if (colon === -1) continue;
      const property = text.slice(0, colon).trim().toLowerCase();
      const value = text.slice(colon + 1).trim();
      if (property && !property.startsWith('@')) {
        declarations.push({
          property,
          value,
          line: lineAt(source, top.bodyStart + start + colon),
        });
      }
    }
    blocks.push({ selector: top.selector, line: top.line, declarations });
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < source.length && source[j] !== quote) {
        if (source[j] === '\\') j++;
        j++;
      }
      buffer += source.slice(i, Math.min(j + 1, source.length));
      i = j + 1;
      continue;
    }

    if (ch === '{') {
      const prelude = buffer.trim().replace(/\s+/g, ' ');
      const isAtRule = prelude === '' || prelude.startsWith('@') || prelude.startsWith('&');
      stack.push({
        type: isAtRule ? 'container' : 'rule',
        selector: prelude,
        line: lineAt(source, i),
        bodyStart: i + 1,
      });
      buffer = '';
      i++;
      continue;
    }

    if (ch === '}') {
      const top = stack.pop();
      if (top && top.type === 'rule') flushRule(top, i);
      buffer = '';
      i++;
      continue;
    }

    buffer += ch;
    i++;
  }

  return blocks;
}

/**
 * Split a rule body on `;` at paren depth 0, keeping each declaration's offset
 * inside the body so reported line numbers stay exact.
 */
function splitDeclarations(body) {
  const out = [];
  let current = '';
  let start = 0;
  let depth = 0;
  const push = () => {
    const text = current.trim();
    if (text) {
      const leading = current.length - current.trimStart().length;
      out.push({ text, start: start + leading });
    }
    current = '';
    start = 0;
  };
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) {
      push();
      continue;
    }
    if (current === '') start = i;
    current += ch;
  }
  push();
  return out;
}

/* ---------------------------------------------------------------- checks */

function analyse(file, blocks) {
  const findings = [];
  const rel = relative(ROOT, file);

  for (const block of blocks) {
    const props = new Map();
    for (const d of block.declarations) if (!props.has(d.property)) props.set(d.property, d);
    const value = (p) => props.get(p)?.value.trim() ?? '';

    for (const { pattern, name, floor } of ENGINE_FLOOR) {
      const hit = block.declarations.find(
        (d) => pattern.test(`${d.property}:${d.value}`) || pattern.test(block.selector)
      );
      if (hit) {
        findings.push({
          kind: 'floor',
          key: `${rel}|${block.selector}|floor:${name}`,
          file: rel,
          line: hit.line,
          selector: block.selector,
          message: `${name} needs ${floor}`,
        });
      }
    }

    for (const rule of PREFIXED) {
      const decl = props.get(rule.property);
      if (!decl || !rule.needs(decl.value)) continue;
      if (props.has(`-webkit-${rule.property}`)) continue;
      findings.push({
        kind: 'prefix',
        key: `${rel}|${block.selector}|-webkit-${rule.property}`,
        file: rel,
        line: decl.line,
        selector: block.selector,
        message: `\`${rule.property}: ${decl.value}\` has no \`-webkit-${rule.property}\` twin — WebKit drops it`,
      });
    }

    const backdrop = props.get('backdrop-filter');
    const webkitBackdrop = props.get('-webkit-backdrop-filter');
    const isGlass =
      (backdrop && backdrop.value.trim() !== 'none') ||
      (webkitBackdrop && webkitBackdrop.value.trim() !== 'none');
    const isStuck = /sticky|fixed/.test(value('position'));
    const hasBg = props.has('background-color') || props.has('background');

    if (isStuck && isGlass) {
      findings.push({
        kind: 'risk',
        key: `${rel}|${block.selector}|risk:sticky-glass`,
        file: rel,
        line: (backdrop ?? webkitBackdrop).line,
        selector: block.selector,
        message: RISK.STICKY_GLASS,
      });
    } else if (isStuck && hasBg) {
      findings.push({
        kind: 'risk',
        key: `${rel}|${block.selector}|risk:sticky-bg`,
        file: rel,
        line: block.line,
        selector: block.selector,
        message: RISK.STICKY_BG,
      });
    }

    if (isGlass && value('background-attachment').includes('fixed')) {
      findings.push({
        kind: 'risk',
        key: `${rel}|${block.selector}|risk:fixed-backdrop`,
        file: rel,
        line: block.line,
        selector: block.selector,
        message: RISK.FIXED_PLUS_BACKDROP,
      });
    }

    const clip = props.get('background-clip') ?? props.get('-webkit-background-clip');
    const clipsText =
      value('background-clip') === 'text' || value('-webkit-background-clip') === 'text';
    if (clipsText) {
      const compositing = ['transform', 'will-change', 'filter', 'backdrop-filter', 'opacity', 'mix-blend-mode', 'perspective']
        .filter((p) => props.has(p));
      if (isStuck) compositing.push('position:' + value('position'));
      if (compositing.length) {
        findings.push({
          kind: 'risk',
          key: `${rel}|${block.selector}|risk:clipped-text-composited`,
          file: rel,
          line: clip.line,
          selector: block.selector,
          message: `${RISK.CLIPPED_TEXT_COMPOSITED} (this rule also sets ${compositing.join(', ')})`,
        });
      }
    }

    const willChange = props.get('will-change');
    if (willChange && /transform/.test(willChange.value)) {
      const scales = ['transform', 'scale', 'zoom'].some((p) => props.has(p));
      findings.push({
        kind: 'risk',
        key: `${rel}|${block.selector}|risk:will-change-transform`,
        file: rel,
        line: willChange.line,
        selector: block.selector,
        message: scales
          ? `${RISK.WILL_CHANGE_SCALE} (this rule also transforms the element)`
          : RISK.WILL_CHANGE_SCALE,
      });
    }

    if (props.has('mix-blend-mode')) {
      findings.push({
        kind: 'risk',
        key: `${rel}|${block.selector}|risk:blend`,
        file: rel,
        line: props.get('mix-blend-mode').line,
        selector: block.selector,
        message: RISK.BLEND_LAYER,
      });
    }
  }

  return findings;
}

/* ------------------------------------------------------------------- main */

const args = new Set(process.argv.slice(2));
const files = walk(join(ROOT, 'src'));
const findings = files.flatMap((f) => analyse(f, parseBlocks(readFileSync(f, 'utf8'))));

const fatal = findings.filter((f) => f.kind === 'prefix');
const risks = findings.filter((f) => f.kind === 'risk');
const floors = findings.filter((f) => f.kind === 'floor');

let baseline = { keys: [] };
try {
  baseline = JSON.parse(readFileSync(join(ROOT, BASELINE_PATH), 'utf8'));
} catch {
  /* first run: everything is new */
}
const known = new Set(baseline.keys ?? []);
const key = (f) => f.key;

const group = (list) => {
  const byFile = new Map();
  for (const f of list) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, items] of byFile) {
    console.log(`\n  ${file}`);
    for (const f of items) {
      console.log(`    ${String(f.line).padStart(5)}  ${f.selector}`);
      console.log(`           ${f.message}`);
    }
  }
};

console.log('CSS cross-engine compatibility audit');
console.log(
  `  ${files.length} stylesheets · ${findings.length} findings · ` +
    `${fatal.length} missing prefixes · ${risks.length} fragile combinations · ${floors.length} engine floors`
);

if (args.has('--all')) {
  console.log('\nMissing WebKit prefixes:'); group(fatal);
  console.log('\nFragile combinations:'); group(risks);
  console.log('\nEngine floors (informational):'); group(floors);
}

const newFatal = fatal.filter((f) => !known.has(key(f)));
const newRisks = risks.filter((f) => !known.has(key(f)));
const resolved = [...known].filter((k) => !findings.some((f) => key(f) === k));

if (!args.has('--all')) {
  if (newFatal.length) { console.log('\nNEW missing WebKit prefixes:'); group(newFatal); }
  if (newRisks.length) { console.log('\nNEW fragile combinations:'); group(newRisks); }
}

if (args.has('--update')) {
  const keys = [...new Set(findings.map(key))].sort();
  writeFileSync(
    join(ROOT, BASELINE_PATH),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        note: 'Known cross-engine findings when this baseline was written. The audit fails only on findings NOT listed here. Re-run with `npm run audit:css -- --update` after intentionally fixing or accepting entries.',
        keys,
      },
      null,
      2
    ) + '\n'
  );
  console.log(`\nBaseline written: ${BASELINE_PATH} (${keys.length} keys)`);
  process.exit(0);
}

if (!newFatal.length && !newRisks.length) {
  const extra = resolved.length
    ? ` (${resolved.length} baseline entries no longer apply — re-run with --update to prune)`
    : '';
  console.log(`\nOK — no new cross-engine findings.${extra}`);
  process.exit(0);
}

console.log(
  `\n${newFatal.length + newRisks.length} new finding(s). Fix them, or re-run with --update to accept them into the baseline.`
);
process.exit(1);
