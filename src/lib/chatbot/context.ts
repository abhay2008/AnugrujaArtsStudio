import { getFreshContentSync, refreshFreshContent } from '@/lib/freshContent';
import { formatPrice, isPriceConfirmed } from '@/lib/price';
import { studioData } from '@/data/studioData';
import { galleryCatalogEntry } from '@/lib/types';
import type { SiteContent, StudioEvent, GalleryKey } from '@/lib/types';

/**
 * Live studio context for the AI chat assistant.
 *
 * The document is derived from the same git-backed CMS (`content/site.json`)
 * that powers the public site and the admin portal, so the moment Anuradha
 * commits a new painting / price / event, the bot knows about it. The derived
 * document is cached and keyed to a cheap revision hash of the content; the
 * /api/content commit route revalidates the cache tag to drop it eagerly.
 */

export const CHATBOT_CONTEXT_TAG = 'chatbot-studio-context';

interface ContextEntry {
  revision: string;
  document: string;
}

let cacheEntry: ContextEntry | null = null;

/** Cheap, order-stable signature of the CMS content the bot cares about. */
function contentRevision(content: SiteContent): string {
  try {
    const relevant = JSON.stringify({
      g: content.galleries,
      e: content.events ?? null,
      c: content.chatbot ?? null,
      b: content.brand,
      s: content.sections,
    });
    // FNV-1a — fast, no deps, plenty for cache invalidation.
    let h = 0x811c9dc5;
    for (let i = 0; i < relevant.length; i++) {
      h ^= relevant.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  } catch {
    // If serialization ever fails, disable caching to stay correct.
    return String(Date.now());
  }
}

function eventLines(events: StudioEvent[] | undefined, label: string): string[] {
  if (!events || events.length === 0) return [];
  const lines = events.map((ev) => {
    const parts = [`- ${ev.title} — ${ev.date}`];
    if (ev.dateIso) parts.push(`(ISO: ${ev.dateIso})`);
    if (ev.location) parts.push(`at ${ev.location}`);
    if (ev.eventType) parts.push(`[${ev.eventType}]`);
    if (ev.description) parts.push(`: ${ev.description}`);
    if (ev.registrationDeadline) parts.push(` Deadline: ${ev.registrationDeadline}`);
    if (ev.seatsRemaining !== undefined) parts.push(` Seats remaining: ${ev.seatsRemaining}`);
    if (ev.outcome) parts.push(` Outcome: ${ev.outcome}`);
    if (ev.registrationUrl) parts.push(` Register: ${ev.registrationUrl}`);
    return parts.join(' ');
  });
  return [`${label}:`, ...lines];
}

/**
 * Builds the compact, token-efficient studio knowledge document.
 * Kept well under ~3k tokens so free-tier models stay fast.
 */
export function buildStudioContext(): string {
  // Background-refresh from the GitHub CMS so admin publishes reach the bot
  // within a minute; the sync getter returns the freshest already-fetched
  // content (or the build-time snapshot before the first fetch completes).
  refreshFreshContent();
  const content = getFreshContentSync();
  const revision = contentRevision(content);

  if (cacheEntry && cacheEntry.revision === revision) {
    return cacheEntry.document;
  }

  const brand = content.brand;
  const { artist, spotlight, achievements, exhibitions, outreach, journey } = studioData;

  const sections: string[] = [];

  // ── Identity & business ────────────────────────────────────────────────
  sections.push(
    [
      'STUDIO & BUSINESS',
      `- Name: ${brand.name} ("${brand.tagline}")`,
      `- Founder & lead artist: ${brand.founder} — ${artist.title}, ${artist.experience}, originally ${artist.origin}`,
      `- Location: ${brand.locationLabel}`,
      `- Phone / WhatsApp: ${brand.phoneDisplay} (all purchases & commissions are handled personally on WhatsApp)`,
      `- Email: ${brand.email}`,
      `- Website sections: Home, Sale (paintings for sale), Classes, About`,
      `- Instagram main: ${content.social?.find((s) => s.network === 'instagram')?.url ?? ''}`,
      `- Instagram sale catalog: ${content.social?.find((s) => s.network === 'instagram-sale')?.url ?? ''}`,
      `- Facebook: ${content.social?.find((s) => s.network === 'facebook')?.url ?? ''}`,
      `- YouTube: ${content.social?.find((s) => s.network === 'youtube')?.url ?? ''}`,
    ].join('\n')
  );

  // ── Sale catalog: prices & acquisition status ──────────────────────────
  const sale = content.galleries?.sale ?? [];
  if (sale.length > 0) {
    const available = sale.filter((p) => (p.status ?? 'Available') !== 'Sold');
    const sold = sale.filter((p) => (p.status ?? 'Available') === 'Sold');
    const lines = sale.map((p) => {
      const status = p.status ?? 'Available';
      // Price-confirmation rule: an admin-saved price is quoted exactly;
      // anything else is masked — the bot must never leak a pending figure.
      const price = isPriceConfirmed(p) ? formatPrice(p.price) : 'XXXX (cost on request)';
      const bits = [`- "${p.title}" — ${price} — ${status}`];
      if (p.medium) bits.push(`Medium: ${p.medium}`);
      if (p.dimensions) bits.push(`Dimensions: ${p.dimensions}`);
      if (p.description) bits.push(p.description);
      return bits.join(' | ');
    });
    sections.push(['PAINTINGS FOR SALE (live catalog — trust statuses & prices exactly):', ...lines].join('\n'));
    sections.push(
      `CATALOG SUMMARY: ${available.length} painting${available.length === 1 ? '' : 's'} currently available, ${sold.length} sold. When asked what is available, recommend only pieces whose status is Available or has no price (price on request).`
    );
  }

  // ── Newest additions across every gallery ──────────────────────────────
  // The admin can drop new work into any collection; the bot should know the
  // freshest pieces wherever they live. Items carry dateAdded from upload.
  const recentAll: { title: string; gallery: string; dateAdded?: string }[] = [];
  for (const [gKey, items] of Object.entries(content.galleries ?? {})) {
    for (const item of items.slice(0, 5)) {
      recentAll.push({ title: item.title, gallery: gKey, dateAdded: item.dateAdded });
    }
  }
  recentAll.sort((a, b) => (b.dateAdded ?? '').localeCompare(a.dateAdded ?? ''));
  if (recentAll.length > 0) {
    const lines = recentAll
      .slice(0, 8)
      .map((r) => `- "${r.title}" (${r.gallery})`);
    sections.push(
      ['RECENT ADDITIONS (latest uploads across the site — mention these when asked about new work):', ...lines].join('\n')
    );
  }

  // ── Commission gallery (sold/custom showcase) ──────────────────────────
  const commissions = content.galleries?.commission ?? [];
  if (commissions.length > 0) {
    const lines = commissions
      .slice(0, 12)
      .map((p) => `- "${p.title}"${p.medium ? ` (${p.medium})` : ''}`);
    sections.push(
      ['COMMISSIONED WORKS SHOWCASE (custom pieces already delivered — ask for a similar custom order):', ...lines].join('\n')
    );
  }

  // ── Site catalog overview: what each gallery is for ────────────────────
  // So the bot can tell visitors where things live without guessing.
  const catalogLines = (Object.entries(content.galleries ?? {}) as [string, { title: string }[]][])
    .filter(([, items]) => items.length > 0)
    .map(([gKey, items]) => {
      const entry = galleryCatalogEntry(gKey as GalleryKey);
      const label = entry ? entry.label : gKey;
      const note = entry ? entry.chatbotNote : 'Studio gallery.';
      return `- ${label}: ${items.length} piece${items.length === 1 ? '' : 's'} — ${note}`;
    });
  if (catalogLines.length > 0) {
    sections.push(['WEBSITE GALLERIES (what is on the site and where):', ...catalogLines].join('\n'));
  }

  // ── Events: upcoming & past ────────────────────────────────────────────
  const eventSections = [
    ...eventLines(content.events?.upcoming, 'UPCOMING EVENTS & WORKSHOPS'),
    ...eventLines(content.events?.past, 'PAST EVENTS & EXHIBITIONS'),
  ];
  if (eventSections.length > 0) {
    sections.push(eventSections.join('\n'));
  }

  // Hero spotlight mirrors events CMS when present, but keep the studioData
  // fallback so the bot never contradicts the home page.
  if (spotlight?.isActive) {
    sections.push(
      [
        'HOME-PAGE SPOTLIGHT (featured on the banner):',
        `- ${spotlight.category}: ${spotlight.headline}, ${spotlight.dateBadge}${spotlight.seatsRemaining ? ` — ${spotlight.seatsRemaining} seats left` : ''}`,
      ].join('\n')
    );
  }

  // ── Classes & courses ──────────────────────────────────────────────────
  const classes = content.galleries?.classes ?? [];
  const watercolor = content.galleries?.watercolor ?? [];
  sections.push(
    [
      'CLASSES & COURSES (regular batches, 1-year fine arts diploma, summer camps; entrance-exam coaching for NATA, NID, NIFT, CEED, UCEED, BFA):',
      `- ${content.sections?.courses?.title ?? 'Classes & Courses'} — ${content.sections?.courses?.subtitle ?? 'Online & offline'}`,
      `- Student artwork samples on file: ${classes.length + watercolor.length}`,
      `- Registration & fee details: handled personally via WhatsApp ${brand.phoneDisplay}`,
    ].join('\n')
  );

  // ── Artist biography, achievements, exhibitions, outreach ─────────────
  sections.push(
    [
      'ABOUT THE ARTIST',
      `- ${artist.name}: ${artist.title}. ${artist.narrative.prologue}`,
      ` ${artist.narrative.turningPoint}`,
      ` ${artist.narrative.atelierFounding}`,
      `- Education: ${artist.education.map((e) => `${e.degree} (${e.institution})`).join('; ')}`,
    ].join('\n')
  );

  if (journey?.metrics?.length) {
    sections.push(`STUDIO METRICS: ${journey.metrics.map((m) => `${m.label}: ${m.value}`).join(' · ')}`);
  }

  if (achievements?.length) {
    sections.push(
      [
        'AWARDS:',
        ...achievements.map((a) => `- ${a.year ? a.year + ' — ' : ''}${a.title} (${a.institution})${a.significance ? `: ${a.significance}` : ''}`),
      ].join('\n')
    );
  }

  if (exhibitions?.length) {
    sections.push(
      ['EXHIBITIONS:', ...exhibitions.map((x) => `- ${x.name}, ${x.location} (${x.type}${x.year ? `, ${x.year}` : ''})`)].join('\n')
    );
  }

  if (outreach?.length) {
    sections.push(['OUTREACH:', ...outreach.map((o) => `- ${o.label}: ${o.detail}`)].join('\n'));
  }

  // ── Admin-managed FAQ knowledge ────────────────────────────────────────
  const chatbot = content.chatbot;
  if (chatbot?.faqs?.length) {
    sections.push(
      ['STUDIO FAQ (admin-curated answers — may be quoted nearly verbatim):', ...chatbot.faqs.map((f) => `- Q: ${f.question}\n  A: ${f.answer}`)].join('\n')
    );
  }

  const document = sections.join('\n\n');
  cacheEntry = { revision, document };
  return document;
}

/** Test/diagnostic hook: drop the memoized context document. */
export function resetStudioContextCache(): void {
  cacheEntry = null;
}
