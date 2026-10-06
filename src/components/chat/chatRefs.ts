import type { ArtItem } from '@/lib/types';

/**
 * Reply-reference detection for the chat widget.
 *
 * Chitra answers in plain text ("our Sale page (/sale)", "**Original Fine Art
 * Painting #7** — ₹…"). This module scans a finished assistant reply for
 *   1. artworks it names (by exact CMS title, or "painting 7 / #7" numbers), and
 *   2. site pages / sections it points to,
 * so the widget can render a painting carousel and "go there" buttons under
 * the bubble. Everything is resolved against the studio's own CMS data — the
 * model can never inject an image URL or an arbitrary link.
 */

export type ChatGalleries = Partial<Record<string, ArtItem[]>>;

export interface ChatPainting extends ArtItem {
  /** Gallery key the artwork lives in (sale, commission, classes…). */
  gallery: string;
}

export interface ChatPageLink {
  href: string;
  label: string;
  /** Short hint shown under the label (e.g. "Commissioned artwork"). */
  hint?: string;
}

/** Where each gallery is shown on the public site. */
export const GALLERY_LOCATIONS: Record<string, ChatPageLink> = {
  sale: { href: '/sale', label: 'Sale page', hint: 'Paintings for sale' },
  commission: { href: '/sale#commission', label: 'Commissions', hint: 'Custom artwork' },
  featured: { href: '/#buy-paintings', label: 'Home gallery', hint: 'Featured works' },
  workshop: { href: '/#workshops', label: 'Workshops', hint: 'Events & exhibitions' },
  testimonial: { href: '/#three', label: 'Student work', hint: 'Testimonials' },
  achievement: { href: '/about', label: 'About the artist', hint: 'Awards' },
  classes: { href: '/classes#online', label: 'Classes', hint: 'Courses & batches' },
  watercolor: { href: '/classes#water', label: 'Watercolor course', hint: 'Masterclass' },
};

/** Known internal destinations, keyed by normalized href. */
export const PAGE_LINKS: Record<string, ChatPageLink> = {
  '/': { href: '/', label: 'Home page', hint: 'Studio overview' },
  '/sale': GALLERY_LOCATIONS.sale,
  '/sale#commission': GALLERY_LOCATIONS.commission,
  '/classes': { href: '/classes', label: 'Classes page', hint: 'Courses & batches' },
  '/classes#online': { href: '/classes#online', label: 'Online classes', hint: 'Ongoing classes' },
  '/classes#water': GALLERY_LOCATIONS.watercolor,
  '/classes#short': { href: '/classes#short', label: 'Short courses', hint: 'Art fundamentals' },
  '/about': { href: '/about', label: 'About the artist', hint: 'Story & awards' },
  '/#buy-paintings': { href: '/#buy-paintings', label: 'Buy paintings', hint: 'Home spotlight' },
  '/#workshops': { href: '/#workshops', label: 'Workshops & events', hint: 'Home page' },
  '/#three': { href: '/#three', label: 'Student work', hint: 'Testimonials' },
  '/#achievements': { href: '/#achievements', label: 'Awards & accolades', hint: 'Home page' },
  '/#journey': { href: '/#journey', label: "The artist's journey", hint: 'Home page' },
};

/** Plain-language mentions → destination. Order matters (specific first). */
const PHRASES: [RegExp, string][] = [
  [/\b(?:custom\s+)?commission(?:s|ed)?(?:\s+(?:artworks?|works?|gallery|section|showcase|pieces?|portraits?))?\b/i, '/sale#commission'],
  [/\b(?:art\s+for\s+)?sale\s+(?:page|gallery|section|catalog(?:ue)?)\b/i, '/sale'],
  [/\bwatercolou?r\s+(?:courses?|masterclass(?:es)?)\s*(?:section|page)?\b/i, '/classes#water'],
  [/\bshort\s+courses?\s*(?:section|page)?\b|\bart\s+fundamentals\b/i, '/classes#short'],
  [/\bonline\s+classes?\s*(?:section|page)?\b|\bongoing\s+classes\b/i, '/classes#online'],
  [/\b(?:classes|courses)(?:\s+(?:&|and)\s+courses)?\s+(?:page|section)\b/i, '/classes'],
  [/\babout(?:\s+(?:the\s+artist|us))?\s+page\b|\bartist(?:'s)?\s+biography\b/i, '/about'],
  [/\b(?:awards?|accolades|achievements)\s+(?:section|page)\b/i, '/#achievements'],
  [/\b(?:artist'?s|master'?s)\s+journey\b|\bjourney\s+section\b/i, '/#journey'],
  [/\b(?:workshops?|events?)\s+section\b|\bupcoming\s+(?:events|workshops)\b/i, '/#workshops'],
  [/\btestimonials?\s+section\b|\bstudent\s+work(?:\s+section)?\b/i, '/#three'],
  [/\b(?:featured\s+works?|featured\s+paintings?|collector'?s\s+edit|buy\s+paintings\s+section)\b/i, '/#buy-paintings'],
  [/\bhome\s?page\b/i, '/'],
];

/** Matches internal paths or full studio URLs in replies. */
const PATH_RE = /(?:^|[\s(\[{"'“‘])((?:https?:\/\/[^\s/]+)?\/(?:sale|classes|about)?\/?(?:#[a-z][\w-]*)?)(?=$|[\s).,;:!?\]}"'”’])/gi;

const MAX_PAINTINGS = 12;
const MAX_LINKS = 3;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalise "**bold**" etc. so titles match through markdown. */
function plain(text: string): string {
  return text.replace(/[*_`]/g, '').replace(/\s+/g, ' ');
}

/**
 * Normalises paths and URLs:
 * - strips origin (e.g. https://anugrujaarts.com/sale -> /sale)
 * - strips trailing slashes on pathnames
 * - normalises slashes before hash (e.g. /sale/#commission -> /sale#commission)
 * - preserves root hash (e.g. /#buy-paintings)
 */
export function normalizeHref(raw: string): string {
  if (!raw) return '/';
  let href = raw.trim().replace(/^https?:\/\/[^/]+/i, '');
  if (!href.startsWith('/')) href = `/${href}`;

  const hashIdx = href.indexOf('#');
  let pathname = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';

  pathname = pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/' && hash) return `/#${hash.slice(1)}`;
  return `${pathname}${hash}`;
}

/** Artworks referenced by a reply, in the order they are mentioned. */
export function findPaintings(text: string, galleries: ChatGalleries, metaImage?: string): ChatPainting[] {
  const body = plain(text);
  const hits: { at: number; art: ChatPainting }[] = [];
  const seen = new Set<string>();
  const all: ChatPainting[] = [];
  for (const [gallery, items] of Object.entries(galleries ?? {})) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item && typeof item.src === 'string' && typeof item.title === 'string') all.push({ ...item, gallery });
    }
  }
  const keyOf = (a: ChatPainting) => `${a.gallery}:${a.id}`;
  const add = (at: number, art: ChatPainting) => {
    const key = keyOf(art);
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ at, art });
  };

  // Helper to locate an artwork by number with preferred gallery affinity
  const findArtByNumber = (num: number, preferredGallery?: string): ChatPainting | undefined => {
    const numMatch = (art: ChatPainting) => {
      const m = art.title.match(/#\s*(\d+)/i) || art.title.match(/\b(\d+)\b$/);
      return m && parseInt(m[1], 10) === num;
    };

    if (preferredGallery) {
      const gMatch = all.filter((a) => a.gallery === preferredGallery).find(numMatch);
      if (gMatch) return gMatch;
    }

    // Default lookup priority: sale > featured > all
    const saleMatch = all.filter((a) => a.gallery === 'sale').find(numMatch);
    if (saleMatch) return saleMatch;

    return all.find(numMatch);
  };

  // Helper to detect gallery affinity from text surrounding a match
  const detectAffinity = (pos: number): string | undefined => {
    const windowText = body.slice(Math.max(0, pos - 50), Math.min(body.length, pos + 50)).toLowerCase();
    if (/\b(?:commission(?:ed)?|custom)\b/.test(windowText)) return 'commission';
    if (/\b(?:student|testimonial)\b/.test(windowText)) return 'testimonial';
    if (/\b(?:class(?:es)?|course)\b/.test(windowText)) return 'classes';
    if (/\b(?:featured|spotlight)\b/.test(windowText)) return 'featured';
    if (/\b(?:workshop|exhibit)\b/.test(windowText)) return 'workshop';
    if (/\b(?:watercolor|masterclass)\b/.test(windowText)) return 'watercolor';
    return undefined;
  };

  // 1. The server-attached thumbnail (lookup replies) always leads.
  if (metaImage) {
    const norm = (s: string) => s.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?/, '/');
    const match = all.find((a) => norm(a.src) === norm(metaImage));
    add(-1, match ?? { id: `img:${metaImage}`, src: metaImage, title: 'Painting', gallery: 'sale' });
  }

  // 2. Exact CMS titles. Longest first, so "Painting #12" wins over "Painting #1".
  const byLength = [...all].filter((a) => a.title.trim().length >= 5).sort((a, b) => b.title.length - a.title.length);
  const taken: [number, number][] = [];
  for (const art of byLength) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(art.title.trim())}(?![\\p{L}\\p{N}])`, 'giu');
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      const start = m.index + m[1].length;
      const end = start + art.title.trim().length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      add(start, art);
      break;
    }
  }

  // 3. Numbered paintings / artworks / commissions / student pieces:
  // "painting 7", "Painting #7", "artwork #2", "commission #1", "pieces #3, #5 and #12", "paintings 1 to 3", "paintings 1-3"
  const numRe = /\b(?:paintings?|artworks?|pieces?|commissions?|portraits?|student\s+works?|student\s+pieces?)\s*(?:no\.?|number)?\s*#?\s*(\d{1,3}(?:\s*(?:,|&|and|or|to|-)\s*#?\s*\d{1,3})*)\b/gi;
  let nm: RegExpExecArray | null;
  while ((nm = numRe.exec(body))) {
    const start = nm.index;
    const end = start + nm[0].length;
    if (taken.some(([s, e]) => start < e && end > s)) continue;
    taken.push([start, end]);

    const affinity = detectAffinity(start);
    const rawMatch = nm[1];

    // Detect numeric range: "1 to 3" or "1-3"
    const rangeMatch = rawMatch.match(/^(\d{1,3})\s*(?:to|-)\s*#?(\d{1,3})$/i);
    let nums: number[] = [];
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to = parseInt(rangeMatch[2], 10);
      if (from <= to && to - from <= 8) {
        for (let n = from; n <= to; n++) nums.push(n);
      } else {
        nums = [from, to];
      }
    } else {
      nums = (rawMatch.match(/\d{1,3}/g) ?? []).map((n) => parseInt(n, 10));
    }

    nums.forEach((num, i) => {
      const art = findArtByNumber(num, affinity);
      if (art) add(nm!.index + i, art);
    });
  }

  // 4. Bullet & numbered list items: "- #7:", "• #3 —", "1. #7", "2) #12"
  const listNumRe = /(?:^|[\n•\-*]|\d+[.)]|\b(?:item|no\.?))\s*#\s*(\d{1,3})\b/gi;
  let lm: RegExpExecArray | null;
  while ((lm = listNumRe.exec(body))) {
    const start = lm.index;
    const end = start + lm[0].length;
    if (taken.some(([s, e]) => start < e && end > s)) continue;
    taken.push([start, end]);
    const num = parseInt(lm[1], 10);
    const affinity = detectAffinity(start);
    const art = findArtByNumber(num, affinity);
    if (art) add(lm.index, art);
  }

  return hits.sort((a, b) => a.at - b.at).slice(0, MAX_PAINTINGS).map((h) => h.art);
}

/** Pages / sections a reply points the visitor to. */
export function findPageLinks(text: string): ChatPageLink[] {
  const body = plain(text);
  const found: { at: number; href: string }[] = [];
  const push = (at: number, rawHref: string) => {
    const norm = normalizeHref(rawHref);
    if (!PAGE_LINKS[norm] || found.some((f) => f.href === norm)) return;
    found.push({ at, href: norm });
  };

  // Markdown links: [text](/sale) or [text](https://.../sale)
  for (const m of text.matchAll(/\]\(((?:https?:\/\/[^\s/]+)?\/[^\s)]*)\)/g)) {
    push(m.index ?? 0, m[1]);
  }

  // Explicit paths written in the reply
  for (const m of body.matchAll(PATH_RE)) {
    const href = m[1];
    if (href === '/' || href.endsWith('://') || href.endsWith('/')) {
      const norm = normalizeHref(href);
      if (norm === '/') continue; // bare root slash is usually prose punctuation
    }
    push(m.index ?? 0, href);
  }

  // Common descriptive phrases
  for (const [re, href] of PHRASES) {
    const m = body.match(re);
    if (m) push(m.index ?? 0, href);
  }

  return found
    .sort((a, b) => a.at - b.at)
    .map((f) => PAGE_LINKS[f.href])
    .filter((l, i, arr) => arr.findIndex((x) => x.label === l.label) === i)
    .slice(0, MAX_LINKS);
}

