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

/** Known internal destinations, keyed by href. */
const PAGE_LINKS: Record<string, ChatPageLink> = {
  '/': { href: '/', label: 'Home page', hint: 'Studio overview' },
  '/sale': GALLERY_LOCATIONS.sale,
  '/sale#commission': GALLERY_LOCATIONS.commission,
  '/classes': { href: '/classes', label: 'Classes page', hint: 'Courses & batches' },
  '/classes#online': { href: '/classes#online', label: 'Online classes', hint: 'Classes page' },
  '/classes#water': GALLERY_LOCATIONS.watercolor,
  '/classes#short': { href: '/classes#short', label: 'Short courses', hint: 'Classes page' },
  '/about': { href: '/about', label: 'About the artist', hint: 'Story & awards' },
  '/#buy-paintings': { href: '/#buy-paintings', label: 'Buy paintings', hint: 'Home spotlight' },
  '/#workshops': { href: '/#workshops', label: 'Workshops & events', hint: 'Home page' },
  '/#three': { href: '/#three', label: 'Student work', hint: 'Testimonials' },
  '/#achievements': { href: '/#achievements', label: 'Awards & accolades', hint: 'Home page' },
  '/#journey': { href: '/#journey', label: "The artist's journey", hint: 'Home page' },
};

/** Plain-language mentions → destination. Order matters (specific first). */
const PHRASES: [RegExp, string][] = [
  [/\bcommission(?:ed)?\s+(?:artworks?|works?|gallery|section|showcase|pieces?)\b/i, '/sale#commission'],
  [/\b(?:art\s+for\s+)?sale\s+(?:page|gallery|section|catalog(?:ue)?)\b/i, '/sale'],
  [/\bwatercolou?r\s+(?:courses?|masterclass(?:es)?)\s+(?:section|page)\b/i, '/classes#water'],
  [/\bshort\s+courses?\s+(?:section|page)\b/i, '/classes#short'],
  [/\bonline\s+classes?\s+(?:section|page)\b/i, '/classes#online'],
  [/\b(?:classes|courses)(?:\s+(?:&|and)\s+courses)?\s+(?:page|section)\b/i, '/classes'],
  [/\babout(?:\s+(?:the\s+artist|us))?\s+page\b/i, '/about'],
  [/\b(?:awards?|accolades|achievements)\s+section\b/i, '/#achievements'],
  [/\b(?:artist'?s|master'?s)\s+journey\b|\bjourney\s+section\b/i, '/#journey'],
  [/\b(?:workshops?|events?)\s+section\b|\bupcoming\s+(?:events|workshops)\b/i, '/#workshops'],
  [/\btestimonials?\s+section\b|\bstudent\s+work\s+section\b/i, '/#three'],
  [/\bhome\s?page\b/i, '/'],
];

/** Explicit internal paths written in the reply: "/sale", "/classes#water", "/#journey". */
const PATH_RE = /(?:^|[\s(\[{"'“‘])(\/(?:sale|classes|about)?\/?(?:#[a-z][\w-]*)?)(?=$|[\s).,;:!?\]}"'”’])/gi;

const MAX_PAINTINGS = 12;
const MAX_LINKS = 3;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalise "**bold**" etc. so titles match through markdown. */
function plain(text: string): string {
  return text.replace(/[*_`]/g, '').replace(/\s+/g, ' ');
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

  // 1. The server-attached thumbnail (lookup replies) always leads.
  if (metaImage) {
    const norm = (s: string) => s.replace(/^https?:\/\/[^/]+/, '').replace(/^\/?/, '/');
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

  // 3. Numbered paintings / artworks: "painting 7", "Painting #7", "artwork #2", "pieces #3, #5 and #12".
  const sale = all.filter((a) => a.gallery === 'sale');
  const numRe = /\b(?:paintings?|artworks?|pieces?)\s*(?:no\.?|number)?\s*#?\s*(\d{1,3}(?:\s*(?:,|&|and|or)\s*#?\s*\d{1,3})*)\b/gi;
  let nm: RegExpExecArray | null;
  while ((nm = numRe.exec(body))) {
    const start = nm.index;
    const end = start + nm[0].length;
    if (taken.some(([s, e]) => start < e && end > s)) continue;
    taken.push([start, end]);
    const nums = nm[1].match(/\d{1,3}/g) ?? [];
    nums.forEach((n, i) => {
      const num = parseInt(n, 10);
      const art =
        sale.find((a) => {
          const t = a.title.match(/#\s*(\d+)/);
          return t && parseInt(t[1], 10) === num;
        }) ??
        all.find((a) => {
          const t = a.title.match(/#\s*(\d+)/);
          return t && parseInt(t[1], 10) === num;
        });
      if (art) add(nm!.index + i, art);
    });
  }

  // 4. Bullet list items: "- #7:", "• #3 —"
  const listNumRe = /(?:^|[\n•\-*]|\b(?:item|no\.?))\s*#\s*(\d{1,3})\b/gi;
  let lm: RegExpExecArray | null;
  while ((lm = listNumRe.exec(body))) {
    const start = lm.index;
    const end = start + lm[0].length;
    if (taken.some(([s, e]) => start < e && end > s)) continue;
    taken.push([start, end]);
    const num = parseInt(lm[1], 10);
    const art =
      sale.find((a) => {
        const t = a.title.match(/#\s*(\d+)/);
        return t && parseInt(t[1], 10) === num;
      }) ??
      all.find((a) => {
        const t = a.title.match(/#\s*(\d+)/);
        return t && parseInt(t[1], 10) === num;
      });
    if (art) add(lm.index, art);
  }

  return hits.sort((a, b) => a.at - b.at).slice(0, MAX_PAINTINGS).map((h) => h.art);
}

/** Pages / sections a reply points the visitor to. */
export function findPageLinks(text: string): ChatPageLink[] {
  const body = plain(text);
  const found: { at: number; href: string }[] = [];
  const push = (at: number, href: string) => {
    const norm = href.replace(/\/+$/, '') || '/';
    if (!PAGE_LINKS[norm] || found.some((f) => f.href === norm)) return;
    found.push({ at, href: norm });
  };

  // Markdown links the model may still emit: [text](/sale)
  for (const m of text.matchAll(/\]\((\/[^\s)]*)\)/g)) push(m.index ?? 0, m[1].toLowerCase());
  for (const m of body.matchAll(PATH_RE)) {
    const href = m[1].toLowerCase();
    if (href === '/') continue; // a lone slash is almost never a page reference
    push(m.index ?? 0, href);
  }
  for (const [re, href] of PHRASES) {
    const m = body.match(re);
    if (m) push(m.index ?? 0, href);
  }

  // A section link makes its bare page link redundant ("/sale" + "/sale#commission" both stay;
  // they are different places), but drop exact duplicates by label.
  return found
    .sort((a, b) => a.at - b.at)
    .map((f) => PAGE_LINKS[f.href])
    .filter((l, i, arr) => arr.findIndex((x) => x.label === l.label) === i)
    .slice(0, MAX_LINKS);
}
