import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Use an installed agent-browser binary; no browser test library is required.
const binary = process.env.AGENT_BROWSER_BIN || 'agent-browser';
const session = process.env.AGENT_BROWSER_SESSION || 'carousel-regression';
const base = process.env.CAROUSEL_URL || 'http://127.0.0.1:3000';
const galleries = JSON.parse(readFileSync('content/site.json', 'utf8')).galleries;
const catalogue = galleries.sale;
const results = [];
function browser(...args) {
  const output = JSON.parse(execFileSync(binary, ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 30000 }));
  if (!output.success) throw new Error(output.error || JSON.stringify(output));
  return output.data;
}
const evaluate = (js) => browser('eval', js).result;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const home = '#buy-paintings .c3d-root';
const touchOnly = process.env.CAROUSEL_TOUCH_ONLY === '1';
const rootIndex = (selector) => Number(evaluate(`document.querySelector(${JSON.stringify(selector)}).dataset.carouselIndex`));
function record(name, detail) { results.push({ name, detail }); console.log(`PASS ${name}: ${JSON.stringify(detail)}`); }
function startMonitor(selector) {
  evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    window.__carouselCheck = { active: true, frames: 0, failures: [] };
    const monitor = () => {
      const check = window.__carouselCheck;
      if (!check.active) return;
      check.frames++;
      const cards = [...root.querySelectorAll('[data-c3d-card]')].filter(c => c.style.visibility === 'visible');
      const closest = cards.sort((a,b) => Number(b.style.opacity)-Number(a.style.opacity))[0];
      const centre = root.querySelector('[data-c3d-centre="true"]');
      const image = centre?.querySelector('img');
      const plaque = root.querySelector('[data-c3d-caption-id]');
      const title = centre?.querySelector('.c3d-card-name')?.textContent;
      const caption = root.querySelector('.c3d-spot-name, .c3d-story-title, [data-c3d-caption-id] p, p[data-c3d-caption-id]')?.textContent;
      if (!centre || !image || closest !== centre || (caption && caption !== title) || image.alt !== title || centre.style.visibility !== 'visible') {
        check.failures.push({ index: root.dataset.carouselIndex, title, caption, image: image?.alt, closest: closest?.dataset.c3dCard });
      }
      requestAnimationFrame(monitor);
    };
    monitor();
  })()`);
}
function stopMonitor(name) {
  const check = evaluate('window.__carouselCheck.active = false; window.__carouselCheck');
  assert.deepEqual(check.failures, [], name);
  record(name, { frames: check.frames, mismatches: check.failures.length });
}

browser('set', 'viewport', '1440', '1000');
browser('open', `${base}/#buy-paintings`);
browser('reload');
browser('wait', '--fn', `!document.documentElement.hasAttribute('data-preloader') && document.querySelector('${home}')?.dataset.carouselCount === '${catalogue.length}'`);
browser('click', `${home} button[aria-label="Next artwork"]`); // Retire autoplay.
await sleep(1000);
if (!touchOnly) {
startMonitor(home);
const seen = new Set();
const firstIndex = rootIndex(home);
for (let i = 0; i < catalogue.length; i++) {
  const expectedIndex = (firstIndex + i) % catalogue.length;
  let painting;
  for (let attempt = 0; attempt < 60; attempt++) {
    painting = evaluate(`(() => {const r=document.querySelector('${home}');const c=r.querySelector('[data-c3d-centre="true"]');const img=c?.querySelector('img');return {index:Number(r.dataset.carouselIndex),opacity:Number(c?.style.opacity),loaded:img?.complete && img.naturalWidth > 0,title:img?.alt,source:img?.getAttribute('src'),status:c?.querySelector('.c3d-status')?.textContent,caption:r.querySelector('.c3d-spot-name').textContent}})()`);
    if (painting.index === expectedIndex && painting.loaded && painting.opacity >= .998) break;
    await sleep(100);
  }
  assert.equal(painting.index, expectedIndex, 'Navigation reaches the expected catalogue index');
  assert.equal(painting.title, catalogue[expectedIndex].title);
  assert.ok(painting.loaded && painting.opacity >= .998, 'Painting is loaded and settled before the next click');
  assert.equal(painting.title, painting.caption);
  const expected = catalogue.find((item) => item.title === painting.title);
  assert.ok(expected);
  assert.ok(painting.source.includes(encodeURIComponent(expected.src)) || painting.source === expected.src);
  assert.equal(painting.status, expected.status ?? 'Confirm availability');
  seen.add(expected.id);
  browser('click', `${home} button[aria-label="Next artwork"]`);
}
assert.equal(seen.size, catalogue.length);
record('All catalogue images match captions, assets and status strips', { paintings: seen.size });
stopMonitor('Frame-by-frame catalogue synchronization');
await sleep(1000);
startMonitor(home);
for (let i = 0; i < 8; i++) browser('click', `${home} button[aria-label="Next artwork"]`);
await sleep(1300);
stopMonitor('Rapid consecutive next-button navigation');
}

// Connect only to the browser already owned by this named agent-browser session.
let socket;
let id = 0;
const pending = new Map();
async function connectInput() {
  const cdp = browser('get', 'cdp-url').cdpUrl;
  const targets = await (await fetch(`http://${new URL(cdp).host}/json/list`)).json();
  const target = targets.find(t => t.type === 'page' && t.url.startsWith(base));
  assert.ok(target, 'Owned browser page exists');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const job = pending.get(message.id);
    pending.delete(message.id);
    if (!job) return;
    clearTimeout(job.timer);
    if (message.error) job.reject(new Error(message.error.message));
    else job.resolve(message.result);
  };
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const call = ++id;
  const timer = setTimeout(() => { pending.delete(call); reject(new Error(`CDP input timed out: ${method}`)); }, 5000);
  pending.set(call, { resolve, reject, timer });
  socket.send(JSON.stringify({ id: call, method, params }));
});
await connectInput();
async function wheelTest(selector, name) {
  evaluate(`document.querySelector(${JSON.stringify(`${selector} .c3d-stage`)}).scrollIntoView({block:'center',behavior:'instant'})`);
  browser('wait', '--fn', `(() => { const root=document.querySelector(${JSON.stringify(selector)}); const img=root.querySelector('[data-c3d-centre="true"] img'); return img?.complete && img.naturalWidth > 0 })()`);
  await sleep(1500); // Finish navigation, image layout and smooth scrolling before a wheel gesture.
  const box = browser('get', 'box', `${selector} .c3d-stage`);
  const x = box.x + box.width / 2;
  const y = Math.max(100, Math.min(600, box.y + box.height / 2));
  await send('Page.bringToFront');
  const initial = rootIndex(selector);
  const scrollBefore = evaluate('window.scrollY');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 5, deltaY: 140 });
  await sleep(600);
  assert.equal(rootIndex(selector), initial, 'Native vertical wheel must not advance the carousel');
  assert.ok(evaluate('window.scrollY') > scrollBefore, 'Vertical wheel scrolls the page');
  await sleep(300);
  // Explicit DOM events exercise diagonal momentum without CDP coalescing two
  // queued wheel samples into a single, horizontally dominant native event.
  const accepted = evaluate(`(() => { const stage=document.querySelector(${JSON.stringify(`${selector} .c3d-stage`)}); return [
    stage.dispatchEvent(new WheelEvent('wheel',{deltaX:5,deltaY:140,bubbles:true,cancelable:true})),
    stage.dispatchEvent(new WheelEvent('wheel',{deltaX:100,deltaY:0,bubbles:true,cancelable:true}))
  ]})()`);
  assert.deepEqual(accepted, [true, true], 'Vertical gesture and its horizontal noise remain unconsumed');
  await sleep(600);
  assert.equal(rootIndex(selector), initial, 'Diagonal momentum tail must not advance');
  evaluate(`document.querySelector(${JSON.stringify(`${selector} .c3d-stage`)}).scrollIntoView({block:'center',behavior:'instant'})`);
  await sleep(900);
  const nextBox = browser('get', 'box', `${selector} .c3d-stage`);
  const burst = [];
  for(let i=0;i<15;i++) {
    // Queue a real continuous gesture at 60Hz instead of letting CDP's reply
    // latency introduce idle gaps that represent separate gestures.
    burst.push(send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: nextBox.x+nextBox.width/2, y: nextBox.y+nextBox.height/2, deltaX: 120, deltaY: 0 }));
    await sleep(16);
  }
  await Promise.all(burst);
  await sleep(1100);
  const count = evaluate(`Number(document.querySelector(${JSON.stringify(selector)}).dataset.carouselCount)`);
  assert.equal(rootIndex(selector), (initial+1)%count, 'One horizontal burst advances exactly once');
  record(name, { verticalScroll: 'page only', horizontalMomentum: 'one slide' });
}
if (!touchOnly) {
await wheelTest(home, 'Spotlight wheel direction and momentum');
for (const [selector, name] of [['#workshops > .reveal:last-child .c3d-root--deck','Deck'], ['#three .c3d-root--polaroid','Polaroid']]) {
  await wheelTest(selector, `${name} wheel direction and momentum`);
  startMonitor(selector);
  browser('click', `${selector} [aria-label="Next artwork"]`);
  await sleep(1100);
  stopMonitor(`${name} image and caption synchronization`);
}

browser('open', `${base}/classes`);
browser('wait', '--fn', "!!document.querySelector('.c3d-root--rail')");
socket.close();
await connectInput();
await wheelTest('.c3d-root--rail', 'Rail wheel direction and momentum');
browser('focus', '.c3d-root--rail .c3d-stage');
const railBefore=rootIndex('.c3d-root--rail');
browser('press', 'ArrowRight');await sleep(1100);
assert.equal(rootIndex('.c3d-root--rail'),railBefore+1);
record('Rail keyboard navigation', 'one right-arrow advances one artwork');

browser('open', `${base}/sale`);
browser('wait', '--fn', "!!document.querySelector('.c3d-root--spotlight')");
socket.close();
await connectInput();
browser('click', '.c3d-root--spotlight [aria-label="Next artwork"]');
await sleep(1000);
const saleRoot='.c3d-root--spotlight';
assert.equal(evaluate("document.querySelector('.c3d-root--spotlight').dataset.carouselCount"), String(catalogue.length));
const side = evaluate(`(() => {const c=[...document.querySelectorAll('${saleRoot} [data-c3d-card]')].find(c=>c.dataset.c3dCentre==='false'&&c.style.pointerEvents==='auto');return c.dataset.c3dCard})()`);
browser('click', `${saleRoot} [data-c3d-card="${side}"] .c3d-card-media`);
await sleep(1000);
assert.equal(rootIndex(saleRoot),Number(side));
assert.equal(evaluate("[...document.querySelectorAll('[role=dialog]')].filter(el => getComputedStyle(el).visibility !== 'hidden').length"),0);
browser('click', `${saleRoot} [data-c3d-centre="true"] .c3d-card-media`);
browser('wait','--fn',"[...document.querySelectorAll('[role=dialog]')].some(el => getComputedStyle(el).visibility !== 'hidden')");
const lightbox=evaluate("[...document.querySelectorAll('[role=dialog]')].find(el => getComputedStyle(el).visibility !== 'hidden').textContent");
assert.ok(lightbox.includes(catalogue[Number(side)].title));
browser('press','Escape');
browser('wait','--fn',"![...document.querySelectorAll('[role=dialog]')].some(el => getComputedStyle(el).visibility !== 'hidden')");
record('Side image focus and centre image enlargement', catalogue[Number(side)].title);
}

browser('set','device','iPhone 14');
browser('open',`${base}/#buy-paintings`);
browser('reload');
browser('wait','--fn',`!!document.querySelector('${home}') && !document.documentElement.hasAttribute('data-preloader')`);
evaluate(`document.querySelector('${home} .c3d-stage').focus({preventScroll:true})`);
browser('press','ArrowRight');
await sleep(900);
evaluate(`document.querySelector('${home} .c3d-stage').scrollIntoView({block:'center',behavior:'instant'})`);
await sleep(900);
// Device emulation can replace the active page target; reconnect to its current target.
socket.close();
await connectInput();
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const box=browser('get','box',`${home} .c3d-stage`);
const x=box.x+box.width/2;
const y=box.y+box.height/2;
const mobileBefore=rootIndex(home);
const scrollBefore=evaluate('window.scrollY');
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
for(let i=1;i<=8;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i,y:y-i*15}]});await sleep(20)}
await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await sleep(350);
assert.equal(rootIndex(home),mobileBefore,'Vertical touch scroll must not move the carousel');
assert.ok(evaluate('window.scrollY')>scrollBefore,'Vertical touch scroll moves the page');
evaluate(`document.querySelector('${home} .c3d-stage').scrollIntoView({block:'center',behavior:'instant'})`);await sleep(900);
const swipeBox=browser('get','box',`${home} .c3d-stage`);
const sy=swipeBox.y+swipeBox.height/2;
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:sy}]});
for(let i=1;i<=8;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:300-i*18,y:sy+1}]});await sleep(20)}
await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await sleep(1000);
assert.equal(rootIndex(home),(mobileBefore+1)%catalogue.length,'Horizontal touch swipe advances exactly one slide');
assert.equal(evaluate("[...document.querySelectorAll('[role=dialog]')].filter(el => getComputedStyle(el).visibility !== 'hidden').length"),0,'Swipe does not accidentally open lightbox');
record('Mobile touch direction and swipe', { vertical:'page only',horizontal:'one slide',lightbox:'closed' });
assert.ok(evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'No mobile horizontal page overflow');
record('Mobile overflow', 'none');
// Verify both swipe directions against the actual published order for every
// shared layout, not just an index change on the Buy Paintings carousel.
async function touchOrderTest(selector, items, name) {
  evaluate(`document.querySelector(${JSON.stringify(`${selector} .c3d-stage`)}).scrollIntoView({block:'center',behavior:'instant'})`);
  await sleep(900);
  const initial = rootIndex(selector);
  for (const direction of [-1, 1]) {
    const before = rootIndex(selector);
    const box = browser('get', 'box', `${selector} .c3d-stage`);
    const x = box.x + box.width / 2;
    const y = Math.max(100, Math.min(450, box.y + box.height / 2));
    const currentSelector = `${selector} [data-c3d-card="${before}"]`;
    const startX = evaluate(`document.querySelector(${JSON.stringify(currentSelector)}).getBoundingClientRect().x`);
    const nextIndex = (before + (direction < 0 ? 1 : -1) + items.length) % items.length;
    const incomingSelector = `${selector} [data-c3d-card="${nextIndex}"]`;
    const incomingX = evaluate(`document.querySelector(${JSON.stringify(incomingSelector)}).getBoundingClientRect().x`);
    assert.ok(direction < 0 ? incomingX > startX : incomingX < startX, 'The next/previous artwork starts on the appropriate side');
    await send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x,y}]});
    for (let i=1;i<=6;i++) {
      await send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x+direction*i*13,y:y+1}]});
      await sleep(25);
    }
    const movedX = evaluate(`document.querySelector(${JSON.stringify(currentSelector)}).getBoundingClientRect().x`);
    assert.ok(direction < 0 ? movedX < startX : movedX > startX, 'Images follow the swipe direction');
    await send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    await sleep(1000);
    assert.equal(rootIndex(selector), nextIndex, 'Left swipe advances by one; right swipe goes back by one');
    const title = evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('[data-c3d-centre="true"] img').alt`);
    assert.equal(title, items[nextIndex].title, 'The incoming painting follows the published catalogue order');
    assert.equal(evaluate("[...document.querySelectorAll('[role=dialog]')].filter(el => getComputedStyle(el).visibility !== 'hidden').length"), 0, 'Swipe must not open a lightbox');
  }
  assert.equal(rootIndex(selector), initial, 'Swiping back returns to the original painting');
  record(`${name} left/right swipe order`, 'images move with the finger; left = next, right = previous');
}
await touchOrderTest(home, galleries.sale, 'Spotlight');
await touchOrderTest('#workshops > .reveal:last-child .c3d-root--deck', galleries.workshop, 'Deck');
await touchOrderTest('#three .c3d-root--polaroid', galleries.testimonial, 'Polaroid');
browser('open', `${base}/classes`);
browser('wait', '--fn', "!!document.querySelector('.c3d-root--rail')");
socket.close();
await connectInput();
await touchOrderTest('.c3d-root--rail', galleries.classes, 'Rail');
socket.close();
console.log(`Completed ${results.length} browser regression checks.`);
