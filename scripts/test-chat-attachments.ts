/**
 * Verification suite for chat attachments:
 *   1. Painting detection & resolving against CMS data (findPaintings)
 *   2. Page & section link detection (findPageLinks)
 *   3. Touch/mobile & desktop edge cases
 *
 * Run: node --import ./scripts/ts-node-boot.mjs --no-warnings scripts/test-chat-attachments.ts
 */
import initialSiteData from '../content/site.json';
import {
  findPaintings,
  findPageLinks,
  GALLERY_LOCATIONS,
  type ChatGalleries,
} from '../src/components/chat/chatRefs';

let failures = 0;

function assert(cond: boolean | undefined, label: string) {
  if (cond) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}`);
    failures++;
  }
}

function section(name: string) {
  console.log(`\n--- ${name} ---`);
}

const galleries = initialSiteData.galleries as unknown as ChatGalleries;

// ── 1. Painting Detection (findPaintings) ──────────────────────────────────
section('Painting Detection (findPaintings)');

// Exact title
const hitExact = findPaintings('We have Original Fine Art Painting #7 available.', galleries);
assert(hitExact.length === 1, 'matches exact title');
assert(hitExact[0]?.id === 'p7', 'identifies correct painting id p7');
assert(hitExact[0]?.gallery === 'sale', 'identifies correct gallery "sale"');

// Numbered references in various formats
const hitNum1 = findPaintings('Painting #7 is an original watercolour.', galleries);
assert(hitNum1.length === 1 && hitNum1[0]?.id === 'p7', 'matches "Painting #7"');

const hitNum2 = findPaintings('How about painting 7 or painting 3?', galleries);
assert(hitNum2.length === 2, 'matches multiple "painting X"');
assert(hitNum2[0]?.id === 'p7' && hitNum2[1]?.id === 'p3', 'preserves mention order');

const hitNumList = findPaintings('I recommend paintings #1, #3 and #5 for your collection.', galleries);
assert(hitNumList.length === 3, 'matches comma/and numbered list "paintings #1, #3 and #5"');
assert(
  hitNumList.map((p) => p.id).join(',') === 'p1,p3,p5',
  'correct IDs for list: p1, p3, p5',
);

// Artwork / Piece phrases
const hitArtwork = findPaintings('You might love artwork #2 from our featured collection.', galleries);
assert(hitArtwork.length === 1 && hitArtwork[0]?.id === 'g2', 'matches "artwork #2" from featured collection');

const hitPieces = findPaintings('We have pieces #2 and #4 available in the studio.', galleries);
assert(hitPieces.length === 2, 'matches "pieces #2 and #4"');

// Bulleted list mentions
const hitBullet = findPaintings(
  'Here are top options:\n- #7: Vibrant landscape\n- #12: Serene florals',
  galleries,
);
assert(hitBullet.length === 2, 'matches bulleted list "#7" and "#12"');
assert(hitBullet[0]?.id === 'p7' && hitBullet[1]?.id === 'p12', 'correct bullet IDs');

// Deduplication: mention both exact title and number for the same painting
const hitDedup = findPaintings(
  'Painting #7 (Original Fine Art Painting #7) is an exquisite piece.',
  galleries,
);
assert(hitDedup.length === 1, 'deduplicates repeated mentions of the same painting');

// MetaImage attached from server
const hitMetaRel = findPaintings(
  'Here is the artwork you requested.',
  galleries,
  '/images/p7.jpeg',
);
assert(hitMetaRel.length === 1, 'matches server-attached relative metaImage');
assert(hitMetaRel[0]?.id === 'p7', 'resolves CMS painting from metaImage');

const hitMetaAbs = findPaintings(
  'Here is the artwork you requested.',
  galleries,
  'https://anugrujaarts.com/images/p7.jpeg',
);
assert(hitMetaAbs.length === 1, 'matches server-attached absolute metaImage');
assert(hitMetaAbs[0]?.id === 'p7', 'normalizes absolute URL for metaImage');

// MetaImage leading over text mentions
const hitMetaOrder = findPaintings(
  'We also have painting #3 available.',
  galleries,
  '/images/p7.jpeg',
);
assert(hitMetaOrder.length === 2, 'contains both metaImage and text mention');
assert(hitMetaOrder[0]?.id === 'p7', 'metaImage painting leads at index 0');
assert(hitMetaOrder[1]?.id === 'p3', 'text mention follows at index 1');

// Safe bounds & empty inputs
assert(findPaintings('', galleries).length === 0, 'empty string returns empty array');
assert(findPaintings('Hello, how are you today?', galleries).length === 0, 'generic chat returns empty array');
assert(findPaintings('Painting #7', {}).length === 0, 'empty galleries object handled gracefully');
assert(findPaintings('Painting #7', null as unknown as ChatGalleries).length === 0, 'null galleries handled gracefully');

// ── 2. Page & Section Link Detection (findPageLinks) ──────────────────────
section('Page & Section Link Detection (findPageLinks)');

// Explicit paths
const linkSale = findPageLinks('Browse our collection on the /sale page.');
assert(linkSale.length === 1 && linkSale[0]?.href === '/sale', 'detects /sale path');

const linkHash = findPageLinks('You can request a custom commission at /sale#commission.');
assert(linkHash.length === 1 && linkHash[0]?.href === '/sale#commission', 'detects /sale#commission section');

const linkClasses = findPageLinks('Learn more at /classes#water and /classes#online.');
assert(linkClasses.length === 2, 'detects multiple section anchors');
assert(linkClasses[0]?.href === '/classes#water', 'first section correct');
assert(linkClasses[1]?.href === '/classes#online', 'second section correct');

// Trailing slashes
const linkTrailing = findPageLinks('Visit /sale/ or /about/ today.');
assert(linkTrailing.some((l) => l.href === '/sale'), 'normalizes /sale/ trailing slash');
assert(linkTrailing.some((l) => l.href === '/about'), 'normalizes /about/ trailing slash');

// Markdown links
const linkMd = findPageLinks('Explore our [Paintings for Sale](/sale) collection.');
assert(linkMd.length === 1 && linkMd[0]?.href === '/sale', 'detects markdown link [text](/sale)');

// Plain phrases
const phraseComm = findPageLinks('You can order commissioned artworks anytime.');
assert(phraseComm.length === 1 && phraseComm[0]?.href === '/sale#commission', 'detects "commissioned artworks" phrase');

const phraseWork = findPageLinks('Check out our upcoming workshops section for dates.');
assert(phraseWork.length === 1 && phraseWork[0]?.href === '/#workshops', 'detects "workshops section" phrase');

const phraseJourn = findPageLinks("Read about the artist's journey on our site.");
assert(phraseJourn.length === 1 && phraseJourn[0]?.href === '/#journey', 'detects "artist journey" phrase');

const phraseAccol = findPageLinks('See our awards section for honours.');
assert(phraseAccol.length === 1 && phraseAccol[0]?.href === '/#achievements', 'detects "awards section" phrase');

// Deduplication
const linkDup = findPageLinks('Visit our /sale page, check out /sale, and browse /sale.');
assert(linkDup.length === 1, 'deduplicates repeated links to the same destination');

// Cap limit (max 3 links)
const linkMany = findPageLinks('/sale /classes /about /#workshops /#journey');
assert(linkMany.length <= 3, 'enforces MAX_LINKS cap of 3');

// ── 3. Gallery Locations Sanity ───────────────────────────────────────────
section('Gallery Locations Sanity');
for (const [key, loc] of Object.entries(GALLERY_LOCATIONS)) {
  assert(typeof loc.href === 'string' && loc.href.startsWith('/'), `gallery ${key} has valid href ${loc.href}`);
  assert(typeof loc.label === 'string' && loc.label.length > 0, `gallery ${key} has non-empty label "${loc.label}"`);
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n============================================`);
if (failures === 0) {
  console.log('✅ ALL CHAT ATTACHMENT TESTS PASSED\n');
  process.exit(0);
} else {
  console.error(`❌ ${failures} TEST(S) FAILED\n`);
  process.exit(1);
}
