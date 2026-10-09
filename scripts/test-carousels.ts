import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { buyShowcaseItems, saleGallery, selectBuyShowcaseItems } from '@/data/artData';
import { artworkAvailability } from '@/lib/artworkAvailability';
import { createWheelNavigator, gestureDirection } from '@/lib/carouselInput';
import { circularOffset, wrapIndex } from '@/lib/carouselPosition';

assert.equal(buyShowcaseItems.length, saleGallery.length, 'Every painting is included, not just 14');
assert.deepEqual(buyShowcaseItems, saleGallery, 'Home and sale carousels share the same ascending catalogue order');
assert.deepEqual(buyShowcaseItems.slice(0, 5).map(item => item.id), ['p1', 'p2', 'p3', 'p4', 'p5']);
assert.notEqual(selectBuyShowcaseItems(saleGallery), saleGallery, 'Selection must not mutate the source catalogue');
for (let i = 1; i < saleGallery.length - 1; i++) {
  assert.equal(circularOffset(i + 1, i, saleGallery.length), 1, 'Next painting starts on the right');
  assert.equal(circularOffset(i, i + 1, saleGallery.length), -1, 'Current painting moves left when advancing');
}
assert.equal(new Set(buyShowcaseItems.map((item) => item.id)).size, saleGallery.length);
for (const painting of saleGallery) {
  assert.ok(existsSync(`public${painting.src}`), `Painting asset exists: ${painting.src}`);
}
const mixed = saleGallery.slice(0, 5).map((item, i) => ({ ...item, price: i < 3 ? 100 : undefined }));
assert.equal(selectBuyShowcaseItems(mixed).length, mixed.length, 'Pending prices do not exclude paintings');
assert.deepEqual(selectBuyShowcaseItems([]), []);
for (const status of ['Available', 'Reserved', 'Sold'] as const) {
  assert.equal(artworkAvailability({ status }), status);
}
assert.equal(artworkAvailability({}), 'Confirm availability');

let positions = 0;
for (const count of [0, 1, 2, 3, 14, 36]) {
  if (count === 0) {
    assert.equal(wrapIndex(12, 0), 0);
    assert.equal(circularOffset(12, 5, 0), 0);
    continue;
  }
  for (let tick = -count * 32; tick <= count * 32; tick++) {
    const position = tick / 4 + 0.031; // Avoid ties exactly between two cards.
    const selected = wrapIndex(position, count);
    const offsets = Array.from({ length: count }, (_, i) => Math.abs(circularOffset(i, position, count)));
    assert.equal(offsets[selected], Math.min(...offsets), 'The selected caption belongs to the closest image');
    assert.ok(selected >= 0 && selected < count);
    positions++;
  }
}

assert.equal(gestureDirection(3, 4), 'pending');
assert.equal(gestureDirection(7, 40), 'vertical');
assert.equal(gestureDirection(50, 40), 'vertical', 'Diagonal scroll does not start a swipe');
assert.equal(gestureDirection(40, 7), 'horizontal');
assert.equal(gestureDirection(-40, 7), 'horizontal');

let wheel = createWheelNavigator();
assert.equal(wheel(4, 120, 0, 0, 600).horizontal, false);
assert.equal(wheel(160, 0, 0, 50, 600).step, 0, 'Momentum cannot change a vertical gesture to horizontal');
assert.equal(wheel(60, 0, 0, 300, 600).step, 1, 'A new deliberate gesture advances');
for (let time = 320; time < 1800; time += 20) {
  assert.equal(wheel(140, 0, 0, time, 600).step, 0, 'Momentum tail advances no additional slides');
}
assert.equal(wheel(-60, 0, 0, 2200, 600).step, -1);
wheel = createWheelNavigator();
assert.equal(wheel(25, 0, 0, 0, 600).step, 0);
assert.equal(wheel(35, 0, 0, 30, 600).step, 1);
wheel = createWheelNavigator();
assert.equal(wheel(4, 0, 1, 0, 600).step, 1, 'Line-mode wheels are normalized');
wheel = createWheelNavigator();
assert.equal(wheel(-1, 0, 2, 0, 600).step, -1, 'Page-mode wheels are normalized');
wheel = createWheelNavigator();
assert.equal(wheel(0, 0, 0, 0, 600).horizontal, false);
assert.equal(wheel(0.1, 10, 0, 30, 600).horizontal, false);
assert.equal(wheel(0.3, 0, 0, 80, 600).step, 0, 'Residual horizontal noise stays with vertical intent');
console.log(`Carousel regression checks passed: ${saleGallery.length} artwork assets, ${positions} circular positions, availability and gesture gating.`);
