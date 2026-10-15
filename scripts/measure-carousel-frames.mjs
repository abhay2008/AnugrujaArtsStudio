import { execFileSync } from 'node:child_process';

// Frame-timing harness: drives each carousel through button moves and real
// touch swipes, then reports how many animation frames were late. Requires a
// production server (dev-mode timings are not representative).
const binary = process.env.AGENT_BROWSER_BIN || 'agent-browser';
const session = process.env.AGENT_BROWSER_SESSION || 'carousel-perf';
const base = process.env.CAROUSEL_URL || 'http://127.0.0.1:3000';
const FRAME_MS = 1000 / 60;
const LATE_MS = FRAME_MS * 1.5; // a gap over ~25ms is a dropped frame

function browser(...args) {
  const output = JSON.parse(execFileSync(binary, ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 30000 }));
  if (!output.success) throw new Error(output.error || JSON.stringify(output));
  return output.data;
}
const evaluate = (js) => browser('eval', js).result;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let socket;
let id = 0;
const pending = new Map();
async function connectInput() {
  const cdp = browser('get', 'cdp-url').cdpUrl;
  const targets = await (await fetch(`http://${new URL(cdp).host}/json/list`)).json();
  const target = targets.find((t) => t.type === 'page' && t.url.startsWith(base));
  if (!target) throw new Error('Owned browser page not found');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const job = pending.get(message.id);
    pending.delete(message.id);
    if (!job) return;
    if (message.error) job.reject(new Error(message.error.message));
    else job.resolve(message.result);
  };
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const call = ++id;
  pending.set(call, { resolve, reject });
  socket.send(JSON.stringify({ id: call, method, params }));
});

// Installed into the page: records rAF gaps and long tasks until stopped.
function startRecording() {
  evaluate(`(() => {
    window.__perf = { gaps: [], longTasks: 0, last: null, active: true };
    const observer = new PerformanceObserver((list) => { window.__perf.longTasks += list.getEntries().length; });
    try { observer.observe({ entryTypes: ['longtask'] }); } catch (e) {}
    window.__perf.observer = observer;
    const tick = (now) => {
      const p = window.__perf;
      if (!p.active) return;
      if (p.last !== null) p.gaps.push(now - p.last);
      p.last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })()`);
}
function stopRecording() {
  return evaluate(`(() => {
    const p = window.__perf;
    p.active = false;
    p.observer?.disconnect();
    const gaps = p.gaps.slice().sort((a, b) => a - b);
    const q = (f) => gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * f))] * 10) / 10 : null;
    return {
      frames: gaps.length,
      p50: q(0.5),
      p95: q(0.95),
      max: gaps.length ? Math.round(gaps[gaps.length - 1] * 10) / 10 : null,
      late: gaps.filter((g) => g > ${LATE_MS}).length,
      longTasks: p.longTasks,
    };
  })()`);
}

function centreIndex(selector) {
  return Number(evaluate(`document.querySelector(${JSON.stringify(selector)}).dataset.carouselIndex`));
}

// Wait until the control is the element a user would hit (not covered by an
// animating card), so a click never lands on a transient overlay.
async function waitForClickable(buttonSelector) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const hit = evaluate(`(() => {
      const b = document.querySelector(${JSON.stringify(buttonSelector)});
      if (!b) return false;
      b.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = b.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!el && (el === b || b.contains(el));
    })()`);
    if (hit) return true;
    await sleep(100);
  }
  throw new Error(`Control never became clickable: ${buttonSelector}`);
}

async function measureButtons(selector, label) {
  evaluate(`document.querySelector(${JSON.stringify(`${selector} .c3d-stage`)}).scrollIntoView({block:'center',behavior:'instant'})`);
  await sleep(1200);
  const runs = [];
  for (let i = 0; i < 4; i++) {
    const next = `${selector} button[aria-label="Next artwork"]`;
    await waitForClickable(next);
    startRecording();
    browser('click', next);
    await sleep(1400);
    runs.push(stopRecording());
  }
  return { label, input: 'button', runs };
}

async function measureSwipes(selector, label) {
  evaluate(`document.querySelector(${JSON.stringify(`${selector} .c3d-stage`)}).scrollIntoView({block:'center',behavior:'instant'})`);
  await sleep(1200);
  const box = browser('get', 'box', `${selector} .c3d-stage`);
  const x0 = box.x + box.width / 2;
  const y = Math.max(120, Math.min(500, box.y + box.height / 2));
  const runs = [];
  for (let i = 0; i < 3; i++) {
    startRecording();
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0 + 60, y }] });
    for (let s = 1; s <= 10; s++) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + 60 - s * 14, y: y + 1 }] });
      await sleep(16);
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(1200);
    runs.push(stopRecording());
  }
  return { label, input: 'touch swipe', runs };
}

function summarise(results) {
  const worst = results.flatMap((r) => r.runs).reduce((a, r) => (r.late > a.late ? r : a), { late: 0 });
  return { totalLate: results.reduce((n, r) => n + r.runs.reduce((m, x) => m + x.late, 0), 0), worstRun: worst };
}

const device = process.env.CAROUSEL_DEVICE || 'desktop';
const layouts = [
  ['#buy-paintings .c3d-root', 'Spotlight (Buy Paintings)'],
  ['#workshops > .reveal:last-child .c3d-root--deck', 'Deck'],
  ['#three .c3d-root--polaroid', 'Polaroid'],
];

browser('set', 'viewport', '1440', '1000');
browser('open', `${base}/#buy-paintings`);
browser('reload');
browser('wait', '--fn', `!document.documentElement.hasAttribute('data-preloader') && !!document.querySelector('#buy-paintings .c3d-root')`);
await sleep(1500);
if (device === 'mobile') {
  browser('set', 'device', 'iPhone 14');
  browser('open', `${base}/#buy-paintings`);
  browser('reload');
  browser('wait', '--fn', `!document.documentElement.hasAttribute('data-preloader') && !!document.querySelector('#buy-paintings .c3d-root')`);
  await sleep(1500);
}
// A/B switch: CAROUSEL_PERF_AB=noblur disables only the two blur filters so
// their cost can be isolated from everything else.
if (process.env.CAROUSEL_PERF_AB === 'noblur') {
  evaluate(`(() => { const s = document.createElement('style'); s.textContent = '.c3d-ambient-underlay,.c3d-accent-glow{filter:none !important}'; document.head.appendChild(s); })()`);
}
await connectInput();
if (device === 'mobile') await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

const report = [];
for (const [selector, label] of layouts) {
  const buttons = await measureButtons(selector, label);
  const swipes = await measureSwipes(selector, label);
  report.push(buttons, swipes);
  console.log(JSON.stringify({ device, layout: label, buttonRuns: buttons.runs, swipeRuns: swipes.runs }));
}
const overall = summarise(report);
console.log(JSON.stringify({ device, budgetLateFrames: 0, totalLateFrames: overall.totalLate, worstRun: overall.worstRun }, null, 2));
console.log(`MEASURED device=${device} layouts=${layouts.length}`);
socket.close();
