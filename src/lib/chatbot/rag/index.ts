import { getFreshContentSync, refreshFreshContent } from '@/lib/freshContent';
import { formatPrice, isPriceConfirmed } from '@/lib/price';
import { studioData } from '@/data/studioData';
import { galleryCatalogEntry } from '@/lib/types';
import type { SiteContent, StudioEvent, GalleryKey, ArtItem } from '@/lib/types';
import { buildBm25Index, bm25Score, tokenize, type Bm25Index } from './bm25';

/**
 * Lexical RAG for the studio chatbot.
 *
 * Instead of shipping the entire studio document (~2.5k+ tokens) with every
 * LLM request, the CMS is chunked once per content revision into small,
 * typed chunks. Each visitor question retrieves only the relevant chunks
 * (plus a compact precomputed CORE block) — typically ~60-70% fewer context
 * tokens per request.
 *
 * Why lexical and not embeddings: the corpus is tiny, queries are
 * keyword-heavy, scoring is free/in-memory, and there is no external
 * embeddings provider to fail or pay for.
 */

// ── Chunk model ────────────────────────────────────────────────────────────

export type ChunkType =
  | 'core'
  | 'painting'
  | 'event'
  | 'faq'
  | 'business'
  | 'classes'
  | 'artist'
  | 'awards'
  | 'exhibitions'
  | 'outreach'
  | 'commissions'
  | 'galleries';

export interface RagChunk {
  id: string;
  type: ChunkType;
  text: string;
  /** Extra boost terms matched against the raw query (not tokenized). */
  keywords?: string[];
  /** Rough token estimate — used to respect the retrieval budget. */
  tokens: number;
}

/** Cheap token estimate (~4 chars/token for this document style). */
function estTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function priceLabel(p: ArtItem): string {
  return isPriceConfirmed(p) ? formatPrice(p.price) : 'XXXX (actual cost on request)';
}

// ── Core aggregates (always included) ──────────────────────────────────────

/**
 * The CORE block carries the aggregates a visitor question most often needs
 * (counts, price range, next event headline, class program names) so range
 * and summary questions never require retrieving the full catalog.
 */
function buildCoreChunk(content: SiteContent): RagChunk {
  const brand = content.brand;
  const sale = content.galleries?.sale ?? [];
  const upcoming = content.events?.upcoming ?? [];

  // Price-confirmation rule: only admin-confirmed prices may be aggregated
  // into a public range; pending prices count as "on request".
  const prices = sale
    .map((p) => (isPriceConfirmed(p) ? Number(p.price) : null))
    .filter((n): n is number => n !== null && !Number.isNaN(n))
    .sort((a, b) => a - b);

  const available = sale.filter((p) => (p.status ?? 'Available') !== 'Sold').length;
  const sold = sale.length - available;

  const priceRange =
    prices.length > 0
      ? `Confirmed painting prices range from ₹${prices[0].toLocaleString('en-IN')} to ₹${prices[prices.length - 1].toLocaleString('en-IN')}.`
      : 'Painting prices are not published yet — the studio shares the actual cost on request.';

  const nextEvent = upcoming[0]
    ? `Next event: ${upcoming[0].title} — ${upcoming[0].date}${upcoming[0].seatsRemaining !== undefined ? ` (${upcoming[0].seatsRemaining} seats remaining)` : ''}.`
    : 'No upcoming event is currently listed.';

  const lines = [
    'CORE STUDIO FACTS (always current — trust these exactly):',
    `- Studio: ${brand.name} ("${brand.tagline}") — founded by ${brand.founder}, ${studioData.artist.title}, ${studioData.artist.experience}.`,
    `- Location: ${brand.locationLabel}. All purchases, commissions and class registrations are handled personally on WhatsApp ${brand.phoneDisplay} (no online checkout).`,
    `- Sale catalog: ${sale.length} original paintings — ${available} available, ${sold} sold. ${priceRange}`,
    `- Classes & courses: ${content.sections?.courses?.title ?? 'Classes & Courses'} — ${content.sections?.courses?.subtitle ?? 'online & offline'}. Programs: regular batches, 1-year fine arts diploma, summer camps, entrance-exam coaching (NATA, NID, NIFT, CEED, UCEED, BFA). Fees are confirmed personally on WhatsApp.`,
    `- ${nextEvent}`,
    `- Shipping: originals ship safely packed across India and internationally; quoted per piece on WhatsApp.`,
    `- Directions: ${brand.mapsUrl ? `Google Maps place page — ${brand.mapsUrl}` : 'share the studio address personally on WhatsApp'}.`,
    `- Website pages: Home, /sale (paintings for sale), /classes (courses), /about (the artist).`,
  ];

  return {
    id: 'core',
    type: 'core',
    text: lines.join('\n'),
    tokens: estTokens(lines.join('\n')),
  };
}

// ── Chunker ────────────────────────────────────────────────────────────────

function paintingChunks(sale: ArtItem[]): RagChunk[] {
  return sale.map((p) => {
    const bits = [
      `Painting: "${p.title}"`,
      `Price: ${priceLabel(p)}`,
      `Status: ${p.status ?? 'Available'}`,
    ];
    if (p.medium) bits.push(`Medium: ${p.medium}`);
    if (p.dimensions) bits.push(`Dimensions: ${p.dimensions}`);
    if (p.description) bits.push(p.description);
    const text = bits.join(' | ');
    return {
      id: `painting:${p.id}`,
      type: 'painting' as const,
      text,
      keywords: [p.title.toLowerCase()],
      tokens: estTokens(text),
    };
  });
}

function eventChunks(events: StudioEvent[] | undefined, label: 'upcoming' | 'past'): RagChunk[] {
  if (!events?.length) return [];
  return events.map((ev) => {
    const parts = [`Event (${label}): ${ev.title} — ${ev.date}`];
    if (ev.dateIso) parts.push(`ISO date: ${ev.dateIso}`);
    if (ev.location) parts.push(`at ${ev.location}`);
    if (ev.eventType) parts.push(`[${ev.eventType}]`);
    if (ev.description) parts.push(ev.description);
    if (ev.registrationDeadline) parts.push(`Deadline: ${ev.registrationDeadline}`);
    if (ev.seatsRemaining !== undefined) parts.push(`Seats remaining: ${ev.seatsRemaining}`);
    if (ev.outcome) parts.push(`Outcome: ${ev.outcome}`);
    if (ev.registrationUrl) parts.push(`Register: ${ev.registrationUrl}`);
    const text = parts.join(' | ');
    return {
      id: `event:${label}:${ev.id}`,
      type: 'event' as const,
      text,
      keywords: ev.title ? [ev.title.toLowerCase()] : undefined,
      tokens: estTokens(text),
    };
  });
}

function faqChunks(content: SiteContent): RagChunk[] {
  const faqs = content.chatbot?.faqs ?? [];
  return faqs.map((f, i) => {
    const text = `FAQ: ${f.question}\nAnswer: ${f.answer}`;
    return {
      id: `faq:${i}`,
      type: 'faq' as const,
      text,
      keywords: [f.question.toLowerCase()],
      tokens: estTokens(text),
    };
  });
}

function fixedChunk(
  id: string,
  type: ChunkType,
  title: string,
  lines: string[],
  keywords?: string[],
): RagChunk {
  const text = [title, ...lines].join('\n');
  return { id, type, text, keywords, tokens: estTokens(text) };
}

/** Build all chunks (including core) for the current CMS content. */
function buildChunks(content: SiteContent): RagChunk[] {
  const brand = content.brand;
  const { artist, achievements, exhibitions, outreach, spotlight } = studioData;
  const chunks: RagChunk[] = [buildCoreChunk(content)];

  // Business identity & social links.
  chunks.push(
    fixedChunk(
      'business',
      'business',
      'STUDIO & BUSINESS:',
      [
        `- Name: ${brand.name} ("${brand.tagline}") — ${brand.subtitle}.`,
        `- Phone / WhatsApp: ${brand.phoneDisplay} · Email: ${brand.email}.`,
        `- Instagram main: ${content.social?.find((s) => s.network === 'instagram')?.url ?? 'n/a'}`,
        `- Instagram sale catalog: ${content.social?.find((s) => s.network === 'instagram-sale')?.url ?? 'n/a'}`,
        `- Facebook: ${content.social?.find((s) => s.network === 'facebook')?.url ?? 'n/a'}`,
        `- YouTube: ${content.social?.find((s) => s.network === 'youtube')?.url ?? 'n/a'}`,
      ],
      ['instagram', 'facebook', 'youtube', 'social', 'follow', 'contact', 'email'],
    ),
  );

  // Sale paintings (one chunk each).
  chunks.push(...paintingChunks(content.galleries?.sale ?? []));

  // Commissions showcase (compact).
  const commissions = content.galleries?.commission ?? [];
  if (commissions.length > 0) {
    chunks.push(
      fixedChunk(
        'commissions',
        'commissions',
        'COMMISSIONED WORKS SHOWCASE (custom pieces already delivered — visitors can order similar):',
        commissions
          .slice(0, 14)
          .map((p) => `- "${p.title}"${p.medium ? ` (${p.medium})` : ''}`),
        ['commission', 'custom', 'portrait', 'mural', 'deity'],
      ),
    );
  }

  // Gallery map.
  const galleryLines = (Object.entries(content.galleries ?? {}) as [string, { title: string }[]][])
    .filter(([, items]) => items.length > 0)
    .map(([gKey, items]) => {
      const entry = galleryCatalogEntry(gKey as GalleryKey);
      return `- ${entry?.label ?? gKey}: ${items.length} piece${items.length === 1 ? '' : 's'} — ${entry?.chatbotNote ?? 'Studio gallery.'}`;
    });
  if (galleryLines.length > 0) {
    chunks.push(fixedChunk('galleries', 'galleries', 'WEBSITE GALLERIES:', galleryLines, ['gallery', 'collection', 'browse', 'student', 'portfolio']));
  }

  // Events.
  chunks.push(...eventChunks(content.events?.upcoming, 'upcoming'));
  chunks.push(...eventChunks(content.events?.past, 'past'));

  // Home-page spotlight (mirrors events CMS when present).
  if (spotlight?.isActive) {
    chunks.push(
      fixedChunk(
        'spotlight',
        'business',
        'HOME-PAGE SPOTLIGHT:',
        [`- ${spotlight.category}: ${spotlight.headline}, ${spotlight.dateBadge}${spotlight.seatsRemaining ? ` — ${spotlight.seatsRemaining} seats left` : ''}`],
        ['spotlight', 'banner', 'featured'],
      ),
    );
  }

  // Classes & courses.
  const classCount = (content.galleries?.classes?.length ?? 0) + (content.galleries?.watercolor?.length ?? 0);
  chunks.push(
    fixedChunk(
      'classes',
      'classes',
      'CLASSES & COURSES (regular batches, 1-year fine arts diploma, summer camps; entrance-exam coaching for NATA, NID, NIFT, CEED, UCEED, BFA):',
      [
        `- ${content.sections?.courses?.title ?? 'Classes & Courses'} — ${content.sections?.courses?.subtitle ?? 'Online & offline'}.`,
        `- Student artwork samples on file: ${classCount}.`,
        `- Kids under 15: twice-weekly batches (pencil, colored pencils, watercolor, soft pastel). Ages 15+: weekly (charcoal, watercolor, acrylic, oil). Open to ages 7 to 70+.`,
        `- Registration & fee details are handled personally via WhatsApp ${brand.phoneDisplay}.`,
      ],
      ['class', 'course', 'diploma', 'student', 'learn', 'beginner', 'batch', 'fee', 'fees', 'nata', 'nid', 'nift', 'ceed', 'uceed', 'bfa', 'entrance', 'exam', 'coaching', 'enroll', 'admission'],
    ),
  );

  // Artist biography.
  chunks.push(
    fixedChunk(
      'artist',
      'artist',
      'ABOUT THE ARTIST:',
      [
        `- ${artist.name}: ${artist.title}. ${artist.narrative.prologue}`,
        ` ${artist.narrative.turningPoint}`,
        ` ${artist.narrative.atelierFounding}`,
        `- Education: ${artist.education.map((e) => `${e.degree} (${e.institution})`).join('; ')}.`,
      ],
      ['anuradha', 'artist', 'founder', 'biography', 'story', 'journey', 'who'],
    ),
  );

  // Awards, exhibitions, outreach.
  if (achievements?.length) {
    chunks.push(
      fixedChunk(
        'awards',
        'awards',
        'AWARDS:',
        achievements.map((a) => `- ${a.year ? a.year + ' — ' : ''}${a.title} (${a.institution})${a.significance ? `: ${a.significance}` : ''}`),
        ['award', 'honour', 'honor', 'prize', 'recognition', 'won'],
      ),
    );
  }
  if (exhibitions?.length) {
    chunks.push(
      fixedChunk(
        'exhibitions',
        'exhibitions',
        'EXHIBITIONS:',
        exhibitions.map((x) => `- ${x.name}, ${x.location} (${x.type}${x.year ? `, ${x.year}` : ''})`),
        ['exhibition', 'exhibited', 'gallery show', 'fabriano', 'japan'],
      ),
    );
  }
  if (outreach?.length) {
    chunks.push(
      fixedChunk(
        'outreach',
        'outreach',
        'OUTREACH:',
        outreach.map((o) => `- ${o.label}: ${o.detail}`),
        ['outreach', 'workshop', 'corporate', 'university', 'camp'],
      ),
    );
  }

  // Admin FAQ knowledge.
  chunks.push(...faqChunks(content));

  return chunks;
}

// ── Index (cached per content revision) ────────────────────────────────────

interface RagIndex {
  chunks: RagChunk[];
  tokens: string[][];
  bm25: Bm25Index;
  core: RagChunk;
}

let indexCache: { revision: string; data: RagIndex } | null = null;

/** Same FNV-1a revision hash as context.ts — keeps caches in lockstep. */
export function contentRevisionHash(content: SiteContent): string {
  try {
    const relevant = JSON.stringify({
      g: content.galleries,
      e: content.events ?? null,
      c: content.chatbot ?? null,
      b: content.brand,
      s: content.sections,
    });
    let h = 0x811c9dc5;
    for (let i = 0; i < relevant.length; i++) {
      h ^= relevant.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  } catch {
    return String(Date.now());
  }
}

function getIndex(): RagIndex {
  // Kick off a background GitHub refresh (no-op when TTL hasn't elapsed) so
  // the index rebuilds from the latest admin-published content within a
  // minute — even before a redeploy ships the new site.json.
  refreshFreshContent();
  const content = getFreshContentSync();
  const revision = contentRevisionHash(content);
  if (indexCache && indexCache.revision === revision) return indexCache.data;

  const chunks = buildChunks(content);
  const tokens = chunks.map((c) => tokenize(`${c.text} ${c.keywords?.join(' ') ?? ''}`));
  const index: RagIndex = {
    chunks,
    tokens,
    bm25: buildBm25Index(tokens),
    core: chunks[0],
  };
  indexCache = { revision, data: index };
  return index;
}

/** Test hook: drop the memoized index. */
export function resetRagIndex(): void {
  indexCache = null;
}

// ── Retrieval ──────────────────────────────────────────────────────────────

/** Query-type boosts: nudge chunk types that match the question's intent. */
const TYPE_BOOSTS: { patterns: RegExp[]; types: ChunkType[]; weight: number }[] = [
  { patterns: [/\b(price|cost|how much|rate|buy|own|available|sold|status)\b/i], types: ['painting', 'core'], weight: 1.5 },
  { patterns: [/\b(workshop|event|when|next|upcoming|coming|calendar|masterclass|retreat|exhibition)\b/i], types: ['event', 'core'], weight: 1.4 },
  { patterns: [/\b(class|course|diploma|learn|beginner|fee|fees|admission|enroll|batch|coaching)\b/i], types: ['classes', 'core'], weight: 1.4 },
  { patterns: [/\b(ship|shipping|delivery|buy|purchase|payment|checkout|contact|whatsapp|phone|email|visit|located|address)\b/i], types: ['faq', 'business', 'core'], weight: 1.3 },
  { patterns: [/\b(anuradha|artist|founder|about|story|journey|biography|award|exhibition|honour)\b/i], types: ['artist', 'awards', 'exhibitions', 'core'], weight: 1.2 },
  { patterns: [/\b(commission|custom|portrait|mural|deity)\b/i], types: ['commissions', 'core'], weight: 1.3 },
];

export interface RetrievalResult {
  /** The assembled context document (core + retrieved chunks). */
  document: string;
  /** Number of retrieved (non-core) chunks included. */
  retrievedCount: number;
  /** Rough token estimate of the assembled document. */
  estimatedTokens: number;
  /** Revision hash the index was built from. */
  revision: string;
}

/**
 * Retrieve + assemble the compact context for one visitor question.
 *
 * The core chunk is always included; additional chunks are BM25-ranked,
 * type-boosted, and added under the token budget. Falls back to core-only
 * when nothing scores meaningfully — off-topic handling stays with the
 * existing system-prompt rules and output guardrails.
 */
export function retrieveContext(
  query: string,
  options?: { topK?: number; tokenBudget?: number },
): RetrievalResult {
  const ragIndex = getIndex();
  const topK = Math.max(1, options?.topK ?? 10);
  const tokenBudget = Math.max(400, options?.tokenBudget ?? 1400);

  const qTokens = tokenize(query);

  // Forced numeric lookup: the tokenizer intentionally drops single digits,
  // so "painting 7" would score poorly against "Painting #7" on BM25 alone.
  // Detect the explicit pattern and pin the exact painting chunk.
  const forcedIds = new Set<string>();
  const numericMatch = query.match(/painting\s*(?:#|no\.?|number)?\s*(\d{1,3})\b/i);
  if (numericMatch) {
    const wanted = `#${numericMatch[1]}`;
    const hit = ragIndex.chunks.find((c) => c.type === 'painting' && c.text.includes(wanted));
    if (hit) forcedIds.add(hit.id);
  }
  const boosts: { types: ChunkType[]; weight: number }[] = [];
  for (const b of TYPE_BOOSTS) {
    if (b.patterns.some((re) => re.test(query))) boosts.push({ types: b.types, weight: b.weight });
  }

  const scored = ragIndex.chunks
    .map((chunk: RagChunk, i: number) => {
      let score = bm25Score(qTokens, ragIndex.tokens[i], ragIndex.bm25);
      // Keyword hits on the raw query (catches titles like "Painting #12").
      const qLower = query.toLowerCase();
      if (chunk.keywords?.some((k) => qLower.includes(k))) score += 2.5;
      for (const b of boosts) {
        if (b.types.includes(chunk.type)) score *= b.weight;
      }
      return { chunk, score };
    })
    .filter((s) => s.chunk.type === 'core' || s.score > 0.35 || forcedIds.has(s.chunk.id))
    .sort((a, b) => {
      // Forced lookups (explicit painting number) always rank first.
      const fa = forcedIds.has(a.chunk.id) ? 1 : 0;
      const fb = forcedIds.has(b.chunk.id) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return b.score - a.score;
    });

  // Core first, then top-k under the budget (forced lookups bypass the
  // budget only if they truly don't fit — they are single small chunks).
  const selected: RagChunk[] = [ragIndex.core];
  let used = ragIndex.core.tokens;
  for (const s of scored) {
    if (s.chunk.type === 'core' || selected.length > topK) continue;
    if (forcedIds.has(s.chunk.id)) {
      selected.push(s.chunk);
      used += s.chunk.tokens;
      continue;
    }
    if (used + s.chunk.tokens > tokenBudget) continue;
    selected.push(s.chunk);
    used += s.chunk.tokens;
  }

  const coreText = ragIndex.core.text;
  const rest = selected.slice(1);
  const grouped = new Map<ChunkType, string[]>();
  for (const c of rest) {
    const arr = grouped.get(c.type) ?? [];
    arr.push(c.text);
    grouped.set(c.type, arr);
  }

  const parts = [coreText];
  for (const [, texts] of grouped) {
    parts.push(texts.join('\n'));
  }

  const document = parts.join('\n\n');
  return {
    document,
    retrievedCount: rest.length,
    estimatedTokens: estTokens(document),
    revision: contentRevisionHash(getFreshContentSync()),
  };
}

/** Diagnostics: rough size of the full (non-RAG) document, for comparison. */
export function fullContextSize(): number {
  const ragIndex = getIndex();
  return ragIndex.chunks.reduce((sum: number, c: RagChunk) => sum + c.tokens, 0);
}
