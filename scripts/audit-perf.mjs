/**
 * Low-end device performance audit.
 *
 * Drives headless Chrome over CDP against a running server at a throttled
 * profile (slow CPU + slow 4G) and records what a weak phone actually pays:
 * main-thread durations, live CSS animations, blur/backdrop/blend/promotion
 * counts, DOM size, bytes by type, and frame times through a scripted scroll.
 *
 *   npm run audit:perf                       # compare against the baseline
 *   npm run audit:perf -- --update           # accept today's numbers
 *   npm run audit:perf -- --all              # print every metric
 *   npm run audit:perf -- --tiers full,lite  # which tiers to sample
 *   PERF_URL=http://127.0.0.1:3311/ npm run audit:perf
 *
 * Baseline and budget live in scripts/perf-baseline.json (same convention as
 * scripts/css-compat-baseline.json). A production build is the honest target:
 *
 *   NEXT_DIST_DIR=.next-perf npm run build
 *   NEXT_DIST_DIR=.next-perf npm run start -- -p 3311
 *
 * Metric choice is deliberate: every budgeted number is either exact (counts,
 * bytes) or averaged over repeated runs (durations), so this can gate changes
 * without being flaky. LCP and frame percentiles are reported but never fail a
 * run — they depend on the machine that happens to be running the audit.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BASELINE_PATH = resolve(HERE, 'perf-baseline.json');

const CHROME =
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
};
const has = (name) => argv.includes(`--${name}`);

const URL_BASE = String(flag('url', process.env.PERF_URL || 'http://127.0.0.1:3311'));
const BASE_CLEAN = URL_BASE.replace(/\/$/, '');
const UPDATE = has('update');
const SHOW_ALL = has('all');
const RUNS = Math.max(1, Number(flag('runs', 1)));
const TIERS = String(flag('tiers', 'full,lite'))
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

/** Low-end Android: ~4x slower CPU, Fast-3G-ish pipe, 412x915 viewport. */
const PROFILE = {
  cpu: Number(flag('cpu', 4)),
  downloadKbps: Number(flag('down', 4000)),
  uploadKbps: Number(flag('up', 3000)),
  latencyMs: Number(flag('latency', 40)),
  width: Number(flag('width', 412)),
  height: Number(flag('height', 915)),
  dpr: Number(flag('dpr', 2)),
};

/** Relaxed budgets: counts must not grow, durations are noisy. */
const TOLERANCE = {
  count: 0.05,
  bytes: 0.05,
  /* Throttled wall-clock on a shared machine: counts are exact, durations
     move by tens of percent between identical runs, so only a large shift
     counts as a regression. */
  duration: 0.5,
  timing: 0.6,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Filled in by measure() when --all is passed. */
let dump = null;
let unrevealed = [];

/* ------------------------------------------------------------------ */
/* CDP plumbing                                                        */
/* ------------------------------------------------------------------ */

function launchChrome(port, profileDir) {
  return spawn(
    CHROME,
    [
      '--headless',
      '--no-first-run',
      '--disable-gpu',
      '--hide-scrollbars',
      '--remote-allow-origins=*',
      `--user-data-dir=${profileDir}`,
      `--window-size=${PROFILE.width},${PROFILE.height}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
}

async function connect(port) {
  let page = null;
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) break;
    } catch {
      /* chrome still booting */
    }
    await sleep(250);
  }
  if (!page) throw new Error('no Chrome page target');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    socket.onopen = res;
    socket.onerror = rej;
  });

  let id = 0;
  const pending = new Map();
  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) => {
    const callId = ++id;
    socket.send(JSON.stringify({ id: callId, method, params }));
    return new Promise((res) => pending.set(callId, res));
  };

  return { send, close: () => socket.close() };
}

const evaluate = async (send, expression) => {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.result?.exceptionDetails) {
    const d = res.result.exceptionDetails;
    const detail = d.exception?.description || d.text || 'unknown';
    throw new Error(
      `evaluate failed: ${detail}\n  expression: ${expression.slice(0, 90).replace(/\s+/g, ' ')}…`
    );
  }
  return res.result?.result?.value;
};

/* ------------------------------------------------------------------ */
/* In-page collectors (installed before the document exists)           */
/* ------------------------------------------------------------------ */

const COLLECTORS = `(() => {
  window.__perf = { lcp: 0, long: [], cls: 0 };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.long.push(e.duration);
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  window.__perfFrames = [];
  (() => {
    let last = performance.now();
    const tick = (t) => {
      window.__perfFrames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();
})();`;

/** Counts what the compositor is being asked to do, and what is on screen. */
const ELEMENT_COUNTERS = `(() => {
  const out = { nodes: 0, animated: 0, animatedInfinite: 0, blurred: 0, backdrop: 0, blended: 0, willChange: 0, fixedFull: 0, backdropInfinite: 0, imgs: 0 };
  const vw = window.innerWidth, vh = window.innerHeight;
  const els = document.querySelectorAll('*');
  out.nodes = els.length;
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.animationName && cs.animationName !== 'none') {
      out.animated++;
      if (cs.animationIterationCount.includes('infinite')) {
        out.animatedInfinite++;
        if (cs.backdropFilter && cs.backdropFilter !== 'none') out.backdropInfinite++;
      }
    }
    const bf = cs.backdropFilter && cs.backdropFilter !== 'none';
    if (bf) out.backdrop++;
    if (cs.filter && cs.filter !== 'none' && (cs.filter.includes('blur') || cs.filter.includes('url('))) {
      out.blurred++;
    }
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') out.blended++;
    if (cs.willChange && cs.willChange !== 'auto') out.willChange++;
    if ((cs.position === 'fixed' || cs.position === 'sticky') && el.getBoundingClientRect().width >= vw * 0.9) {
      out.fixedFull++;
    }
  }
  for (const img of document.images) if (img.currentSrc || img.src) out.imgs++;
  // Below-fold containment must never leave content stuck invisible: every
  // .reveal element on the page has to have been marked visible by the end of
  // the scroll pass. This is the regression guard for content-visibility.
  out.unrevealed = document.querySelectorAll('.reveal:not(.is-visible)').length;
  out.pageHeight = document.documentElement.scrollHeight;
  const bytes = { script: 0, css: 0, font: 0, img: 0, other: 0, total: 0 };
  for (const r of performance.getEntriesByType('resource')) {
    const size = r.transferSize || r.encodedBodySize || 0;
    bytes.total += size;
    // @font-face fetches report initiatorType 'css' in Chromium — attribute by
    // file name so the font budget is real (no regex: this expression is sent
    // through a template literal, where backslashes would be eaten).
    const name = r.name.split('?')[0].toLowerCase();
    if (
      name.endsWith('.woff2') ||
      name.endsWith('.woff') ||
      name.endsWith('.ttf') ||
      name.endsWith('.otf')
    ) {
      bytes.font += size;
    }
    else if (r.initiatorType === 'script') bytes.script += size;
    else if (r.initiatorType === 'link' || r.initiatorType === 'css') bytes.css += size;
    else if (r.initiatorType === 'img' || /image/.test(r.initiatorType)) bytes.img += size;
    else bytes.other += size;
  }
  return JSON.stringify({
    ...out,
    bytes,
    tier: document.documentElement.getAttribute('data-perf'),
    lcp: Math.round(window.__perf.lcp),
    cls: Number(window.__perf.cls.toFixed(4)),
    longTasks: window.__perf.long.length,
    longTaskTotal: Math.round(window.__perf.long.reduce((a, b) => a + b, 0)),
  });
})()`;

/**
 * Groups the paint-cost carriers by class so the CSS work can target the real
 * offenders instead of guessing (`--dump`).
 */
const DUMP_CARRIERS = `(() => {
  const bump = (map, key) => { map[key] = (map[key] || 0) + 1; };
  const out = { animatedInfinite: {}, backdrop: {}, blended: {}, willChange: {}, blurred: {} };
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const key =
      (el.className && typeof el.className === 'string' ? el.className : el.tagName)
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join(' ')
        .slice(0, 60) || el.tagName;
    if (cs.animationName && cs.animationName !== 'none' && cs.animationIterationCount.includes('infinite')) {
      bump(out.animatedInfinite, key + '  ←  ' + cs.animationName);
    }
    if (cs.backdropFilter && cs.backdropFilter !== 'none') bump(out.backdrop, key);
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') bump(out.blended, key + '  [' + cs.mixBlendMode + ']');
    if (cs.willChange && cs.willChange !== 'auto') bump(out.willChange, key);
    if (cs.filter && cs.filter !== 'none' && (cs.filter.includes('blur') || cs.filter.includes('url('))) {
      bump(out.blurred, key + '  [' + cs.filter.slice(0, 40) + ']');
    }
  }
  return JSON.stringify(out);
})()`;

/**
 * Parks the page on each still-hidden `.reveal` element before judging it.
 * Returns the ones that stay hidden even with the page held still on them,
 * which is the only kind that means a visitor would see nothing.
 */
const STUCK_REVEALS = `(async () => {
  const hidden = [...document.querySelectorAll('.reveal:not(.is-visible)')];
  const stuck = [];
  for (const el of hidden) {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 750));
    if (!el.classList.contains('is-visible')) stuck.push(el.className.toString().slice(0, 60));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 150));
  return JSON.stringify(stuck);
})()`;

/**
 * Post-scroll drill-down: which `.reveal` elements never woke up, and why.
 * Reported alongside the count so containment mistakes are diagnosable in one
 * run instead of by hand in DevTools.
 */
const UNREVEALED_DETAIL = `(() => {
  return JSON.stringify([...document.querySelectorAll('.reveal:not(.is-visible)')].map((el) => {
    let contained = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cv = getComputedStyle(p).contentVisibility;
      if (cv === 'auto') { contained = p.id || p.className.toString().slice(0, 40); break; }
    }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      cls: (el.className || '').toString().slice(0, 60),
      containedIn: contained,
      display: cs.display,
      opacity: cs.opacity,
      h: Math.round(r.height),
      text: (el.textContent || '').trim().slice(0, 40),
    };
  }));
})()`;
const SCROLL_PASS = `(async () => {
  window.__perfFrames.length = 0;
  const step = Math.round(window.innerHeight * 0.85);
  let y = 0;
  // The bottom is re-read every step: lazy images and the carousels grow the
  // page while it is being walked, and a pass that commits to the height it
  // measured up front stops short of the footer — which then looks exactly
  // like a reveal bug (it fooled this script once already).
  for (let i = 0; i < 140; i++) {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(y, max));
    await new Promise((r) => setTimeout(r, 120));
    if (y >= max) break;
    y = Math.min(y + step, max);
  }
  await new Promise((r) => setTimeout(r, 320));
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 240));
  const f = window.__perfFrames.slice().sort((a, b) => a - b);
  const at = (p) => Math.round(f[Math.min(f.length - 1, Math.floor(f.length * p))] || 0);
  return JSON.stringify({
    frames: f.length,
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    worst: Math.round(f[f.length - 1] || 0),
    over33: f.filter((x) => x > 33).length,
  });
})()`;

/* ------------------------------------------------------------------ */
/* One measured run                                                    */
/* ------------------------------------------------------------------ */

async function measure(send, target) {
  const url = `${URL_BASE}${target.url}`;
  void dump;

  await send('Emulation.setDeviceMetricsOverride', {
    width: PROFILE.width,
    height: PROFILE.height,
    deviceScaleFactor: PROFILE.dpr,
    mobile: true,
  });
  await send('Emulation.setCPUThrottlingRate', { rate: PROFILE.cpu });
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: PROFILE.latencyMs,
    downloadThroughput: (PROFILE.downloadKbps * 1024) / 8,
    uploadThroughput: (PROFILE.uploadKbps * 1024) / 8,
    connectionType: 'cellular3g',
  });
  await send('Performance.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECTORS });

  const nav = await send('Page.navigate', { url });
  if (nav.result?.errorText) console.error(`  ! navigate ${url}: ${nav.result.errorText}`);
  // Generous settle: throttled LCP plus the intro handover on the full tier.
  await sleep(9000);
  const where = await evaluate(
    send,
    `JSON.stringify({ href: location.href, title: document.title, ready: document.readyState })`
  );
  const counters = JSON.parse(await evaluate(send, ELEMENT_COUNTERS));
  const framing = JSON.parse(await evaluate(send, SCROLL_PASS));
  // Second, slower pass over anything the fast walk missed: a programmatic
  // scroll can outrun IntersectionObserver delivery on a throttled CPU, so an
  // element that never woke up during the walk is only "stuck" if it also
  // fails when the page is parked on it.
  const stubborn = JSON.parse(await evaluate(send, STUCK_REVEALS));
  if (SHOW_ALL) {
    dump = JSON.parse(await evaluate(send, DUMP_CARRIERS));
    unrevealed = JSON.parse(await evaluate(send, UNREVEALED_DETAIL));
  }
  const after = await send('Performance.getMetrics');
  const post = JSON.parse(await evaluate(send, ELEMENT_COUNTERS));

  /* Chromium resets these counters when a navigation commits, so a single
     reading at the end of the document is already "this document's work" —
     subtracting a pre-navigation snapshot would mix two documents (and can go
     negative, which is how this was caught). */
  const metricMap = {};
  for (const m of after.result.metrics) metricMap[m.name] = m.value;
  const value = (key) => Math.round((metricMap[key] || 0) * 1000) / 1000;

  const durations = {
    scriptMs: Math.round(value('ScriptDuration') * 1000),
    layoutMs: Math.round(value('LayoutDuration') * 1000),
    styleMs: Math.round(value('RecalcStyleDuration') * 1000),
    taskMs: Math.round(value('TaskDuration') * 1000),
    layouts: Math.round(value('LayoutCount')),
    styleRecalcs: Math.round(value('RecalcStyleCount')),
    heapMb: Math.round(((metricMap.JSHeapUsedSize || 0) / 1048576) * 10) / 10,
  };

  return {
    target: target.name,
    where: JSON.parse(where),
    tier: counters.tier,
    ready: counters.nodes > 0,
    nodes: counters.nodes,
    animated: counters.animated,
    animatedInfinite: counters.animatedInfinite,
    blurred: counters.blurred,
    backdrop: counters.backdrop,
    blended: counters.blended,
    willChange: counters.willChange,
    fixedFullWidth: counters.fixedFull,
    images: counters.imgs,
    postScrollNodes: post.nodes,
    unrevealed: stubborn.length,
    unrevealedOnWalk: post.unrevealed,
    pageHeight: counters.pageHeight,
    bytesKb: {
      total: Math.round(counters.bytes.total / 1024),
      script: Math.round(counters.bytes.script / 1024),
      css: Math.round(counters.bytes.css / 1024),
      img: Math.round(counters.bytes.img / 1024),
      font: Math.round(counters.bytes.font / 1024),
      other: Math.round(counters.bytes.other / 1024),
    },
    ...durations,
    lcpMs: counters.lcp,
    cls: counters.cls,
    longTasks: counters.longTasks,
    longTaskTotalMs: counters.longTaskTotal,
    frames: framing,
  };
}

/* ------------------------------------------------------------------ */
/* Reporting                                                           */
/* ------------------------------------------------------------------ */

const BUDGET_KEYS = [
  ['nodes', 'count'],
  ['animatedInfinite', 'count'],
  ['animated', 'count'],
  ['blurred', 'count'],
  ['backdrop', 'count'],
  ['blended', 'count'],
  ['willChange', 'count'],
  ['fixedFullWidth', 'count'],
  ['scriptMs', 'duration'],
  ['styleMs', 'duration'],
  ['layoutMs', 'duration'],
  ['taskMs', 'duration'],
  ['styleRecalcs', 'count'],
  ['layouts', 'count'],
  ['unrevealed', 'count'],
  ['pageHeight', 'count'],
];

const BYTE_KEYS = ['total', 'script', 'css', 'img', 'font', 'other'];

function budget(entry) {
  const out = {};
  for (const [key] of BUDGET_KEYS) out[key] = entry[key];
  out.bytesKb = {};
  for (const k of BYTE_KEYS) out.bytesKb[k] = entry.bytesKb[k];
  return out;
}

function compare(name, now, base) {
  const rows = [];
  if (!base) return { rows, regressions: 0 };

  for (const [key, kind] of BUDGET_KEYS) {
    const a = base[key];
    const b = now[key];
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    const rel = a === 0 ? (b > 0 ? Infinity : 0) : (b - a) / a;
    const tol = kind === 'duration' ? TOLERANCE.duration : TOLERANCE.count;
    const verdict = rel > tol ? 'WORSE' : rel < -Math.max(tol, 0.1) ? 'better' : 'same';
    rows.push({ key, before: a, after: b, rel, verdict });
  }
  for (const k of BYTE_KEYS) {
    const a = base.bytesKb?.[k];
    const b = now.bytesKb?.[k];
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    const rel = a === 0 ? 0 : (b - a) / a;
    const verdict = rel > TOLERANCE.bytes ? 'WORSE' : rel < -0.05 ? 'better' : 'same';
    rows.push({ key: `kb.${k}`, before: a, after: b, rel, verdict });
  }

  /* Reported, never failed: these depend on the machine running the audit and
     on how many long tasks happened to land in the sampling window. */
  const noisy = [
    ['lcpMs', base.lcpMs, now.lcpMs],
    ['frames.p95', base.frames?.p95, now.frames?.p95],
    ['frames.p99', base.frames?.p99, now.frames?.p99],
    ['longTasks', base.longTasks, now.longTasks],
    ['longTaskTotalMs', base.longTaskTotalMs, now.longTaskTotalMs],
    ['cls', base.cls, now.cls],
    ['heapMb', base.heapMb, now.heapMb],
  ];
  for (const [key, a, b] of noisy) {
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    const rel = a === 0 ? 0 : (b - a) / a;
    rows.push({
      key,
      before: a,
      after: b,
      rel,
      verdict: rel > TOLERANCE.timing ? 'WORSE' : 'same',
      noisy: true,
    });
  }

  const regressions = rows.filter((r) => r.verdict === 'WORSE' && !r.noisy).length;
  void name;
  return { rows, regressions };
}

function printRun(run) {
  console.log(`\n  ${run.target}  (tier=${run.tier})`);
  if (run.where && (!run.where.href.startsWith(BASE_CLEAN) || run.nodes < 200)) {
    console.log(`    ! landed on ${run.where.href} (${run.where.title}, ${run.where.ready})`);
  }
  console.log(
    `    nodes ${run.nodes} · animated ${run.animated} (${run.animatedInfinite} infinite) · ` +
      `blurred ${run.blurred} · backdrop ${run.backdrop} · blend ${run.blended} · will-change ${run.willChange}`
  );
  console.log(
    `    script ${run.scriptMs}ms · style ${run.styleMs}ms · layout ${run.layoutMs}ms · task ${run.taskMs}ms · ` +
      `recalcs ${run.styleRecalcs} · layouts ${run.layouts}`
  );
  console.log(
    `    LCP ${run.lcpMs}ms · longtasks ${run.longTasks} (${run.longTaskTotalMs}ms) · frames p95 ${run.frames.p95}ms ` +
      `p99 ${run.frames.p99}ms · images ${run.images}`
  );
  console.log(
    `    page ${run.pageHeight}px · reveals still hidden after the walk: ${run.unrevealedOnWalk} ` +
      `(parked on each: ${run.unrevealed})`
  );
  if (run.unrevealed) {
    console.log(`    ! ${run.unrevealed} .reveal element(s) stay hidden with the page parked on them`);
  }
  console.log(
    `    bytes ${run.bytesKb.total}KB = script ${run.bytesKb.script} + css ${run.bytesKb.css} + ` +
      `img ${run.bytesKb.img} + font ${run.bytesKb.font} + other ${run.bytesKb.other}`
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME}. Set CHROME_BIN.`);
    process.exit(2);
  }

  const targets = [];
  for (const tier of TIERS) {
    targets.push(
      tier === 'auto'
        ? { name: '/ (auto tier)', url: '/' }
        : { name: `/?perf=${tier}`, url: `/?perf=${tier}` }
    );
  }

  const port = 9715 + Math.floor(Math.random() * 400);
  const profileDir = `/tmp/perf-audit-${port}`;
  const chrome = launchChrome(port, profileDir);
  const { send, close } = await connect(port);

  await send('Page.enable');
  await send('Runtime.enable');

  // Warm the renderer on the first target's origin: Chrome swaps renderer
  // processes on the first cross-origin navigation, and Performance counters
  // reset with it. After a warm-up the before/after deltas describe one
  // renderer, so they are real rather than mixed across two.
  await send('Page.navigate', { url: `${URL_BASE}${targets[0]?.url || '/'}` });
  await sleep(2500);

  const results = [];
  for (const target of targets) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(send, target));
    // Report the median run by task duration so one slow sample can't skew it.
    runs.sort((a, b) => a.taskMs - b.taskMs);
    results.push(runs[Math.floor(runs.length / 2)]);
  }

  close();
  chrome.kill('SIGKILL');

  for (const run of results) printRun(run);

  if (SHOW_ALL && unrevealed?.length) {
    console.log('\n  .reveal elements still hidden after a full scroll:');
    for (const row of unrevealed) {
      console.log(
        `      ${row.cls || '(no class)'} | in=${row.containedIn || 'none'} | display=${row.display} ` +
          `| h=${row.h} | "${row.text}"`
      );
    }
  }

  if (SHOW_ALL && dump) {
    console.log('\n  paint carriers by class');
    for (const [category, map] of Object.entries(dump)) {
      const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12);
      if (!top.length) continue;
      console.log(`\n    ${category}:`);
      for (const [key, n] of top) console.log(`      ${String(n).padStart(4)}  ${key}`);
    }
  }

  /* Tier smoke test: the lite tier must actually lighten the paint, or it is a
     silent no-op and every low-end claim in the docs is false. */
  const paintCarriers = (r) =>
    r.blurred + r.animatedInfinite + r.willChange + r.backdrop + r.blended + r.fixedFullWidth;
  const full = results.find((r) => r.tier === 'full');
  const lite = results.find((r) => r.tier === 'lite');
  let tierRegression = 0;
  if (full && lite) {
    const f = paintCarriers(full);
    const l = paintCarriers(lite);
    const drop = f === 0 ? 0 : (f - l) / f;
    console.log(
      `\n  tier smoke: paint carriers full ${f} → lite ${l} (${(drop * 100).toFixed(0)}% lighter)`
    );
    if (l >= f || lite.blurred >= full.blurred) {
      console.log('    FAIL — the lite tier is not reducing paint cost');
      tierRegression = 1;
    }
  }

  const snapshot = {
    capturedAt: new Date().toISOString(),
    profile: PROFILE,
    note: 'Median of runs, cache disabled, headless Chrome. Counts are exact; durations are throttled wall-clock.',
    targets: Object.fromEntries(results.map((r) => [r.target, r])),
  };

  if (UPDATE || !existsSync(BASELINE_PATH)) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(
      {
        ...snapshot,
        budget: Object.fromEntries(
          results.map((r) => [r.target, budget(r)])
        ),
      },
      null,
      2
    )}\n`);
    console.log(`\nBaseline written to ${BASELINE_PATH}`);
    process.exit(0);
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  let failures = 0;

  console.log('\n  vs baseline (' + baseline.capturedAt + ')');
  for (const run of results) {
    const base = baseline.budget?.[run.target];
    const { rows, regressions } = compare(run.target, run, base);
    failures += regressions;
    const shown = SHOW_ALL ? rows : rows.filter((r) => r.verdict !== 'same');
    console.log(`\n  ${run.target}`);
    if (!shown.length) console.log('    no change');
    for (const r of shown) {
      const pct = Number.isFinite(r.rel) ? `${(r.rel * 100).toFixed(1)}%` : 'n/a';
      const tag = r.verdict === 'WORSE' ? 'WORSE ' : r.verdict === 'better' ? 'better' : 'same  ';
      console.log(
        `    ${tag} ${r.key.padEnd(18)} ${String(r.before).padStart(8)} → ${String(r.after).padStart(8)}  (${pct})` +
          (r.noisy ? '  [informational]' : '')
      );
    }
    if (regressions) console.log(`    ${regressions} regression(s)`);
  }

  if (failures) {
    console.error(`\n${failures} budget regression(s). Investigate, or --update to accept.`);
    process.exit(1);
  }
  if (tierRegression) {
    console.error('\nThe lite tier regressed — see the tier smoke test above.');
    process.exit(1);
  }
  console.log('\nOK — within budget.');
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
