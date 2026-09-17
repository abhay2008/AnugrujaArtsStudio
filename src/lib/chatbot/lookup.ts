import type { SiteContent } from '@/lib/types';
import { getSiteContentSync } from '@/lib/serverContent';
import { formatPrice } from '@/lib/price';

export type PreprogrammedReply =
  | { matched: true; text: string; action?: { type: 'whatsapp'; message: string } }
  | { matched: false; text?: undefined; action?: undefined };

/**
 * Best available WhatsApp deep link for the studio.
 *
 * `brand.whatsapp` may be a shortlink (e.g. https://wa.link/…), which cannot
 * carry a prefilled message — so digits are preferred from phoneRaw, then
 * phoneDisplay. A shortlink is the last-resort link (button works, but the
 * message can't be prefilled); returns undefined when nothing is usable.
 */
export function whatsappLink(brand: { whatsapp?: string | undefined; phoneRaw?: string | undefined; phoneDisplay: string }, message?: string): string | undefined {
  for (const candidate of [brand.phoneRaw, brand.phoneDisplay]) {
    if (!candidate || /^https?:\/\//i.test(candidate)) continue;
    const digits = candidate.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    }
  }
  if (brand.whatsapp && /^https?:\/\//i.test(brand.whatsapp)) return brand.whatsapp;
  return undefined;
}

/** Build a wa.me deep link carrying a prefilled message for the visitor. */
export function whatsappTag(brand: { whatsapp?: string | undefined; phoneRaw?: string | undefined; phoneDisplay: string }, message: string): string {
  return whatsappLink(brand, message) ?? 'https://wa.me/919611255949';
}

/**
 * Detect Tamil-written-in-Latin ("Tanglish") greetings/phrases so the
 * deterministic layer can greet visitors in their own language. Fires only
 * on whole common words — never on Tamil-script text (that is handled by the
 * script hint in the LLM path).
 */
const TANGLISH_WORDS = /\b(vanakkam|vaanga|kandippa|romba|nandri|eppadi|irukkinga|theriyuma|venum|vellai|ollu)\b/i;
export function detectTanglish(q: string): boolean {
  return TANGLISH_WORDS.test(q);
}

/** Levenshtein edit distance, capped for short tokens. Zero deps. */
function editDistance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > cap) return cap + 1; // early exit — cannot beat the cap
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** Fuzzy-match tolerance grows with token length: 1 typo for 4-6 chars, 2 for 7+. */
function fuzzyTokenMatch(queryToken: string, targetToken: string): boolean {
  const qt = queryToken.replace(/[^a-z0-9]/g, '');
  const tt = targetToken.replace(/[^a-z0-9]/g, '');
  if (!qt || !tt) return false;
  const cap = qt.length >= 7 ? 2 : qt.length >= 4 ? 1 : 0;
  if (cap === 0) return qt === tt;
  return editDistance(qt, tt, cap) <= cap;
}

/**
 * Deterministic replies for the most common studio questions.
 *
 * These run BEFORE the LLM path so repetitive queries are instant, cheap, and
 * rate-limit-proof. The replies are derived from live CMS data where possible
 * (prices, statuses, upcoming event, FAQ answers), so they stay accurate as
 * the studio updates the site.
 */
export function lookupAndReply(raw: string): PreprogrammedReply {
  const q = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return { matched: false };

  const content = getSiteContentSync();
  const sale = content.galleries?.sale ?? [];
  const events = content.events?.upcoming ?? [];
  const chatbot = content.chatbot;
  const faqs = chatbot?.faqs ?? [];
  const brand = content.brand;
  const tanglish = detectTanglish(q);

  // ── Direct painting lookup ─────────────────────────────────────────────
  // Exact or fuzzy match by number, then by title keywords. "panting 7
  // price" and "how much is paintng 12" land here instead of the LLM.
  const painting = findPainting(sale, q);
  if (painting) {
    return {
      matched: true,
      text: paintingLookupReply(painting, brand),
      action: { type: 'whatsapp', message: `Hi! I'm interested in "${painting.title}". Is it still available?` },
    };
  }

  // ── Sale / catalog questions ────────────────────────────────────────────
  if (matchesAny(q, [
    /paint(?:ings|ing)?\s+(are|for|on)\s+sale/i,
    /available\s+(paint(?:ings|ing)?|originals?)/i,
    /what.*paint(?:ings|ing)?.*sale/i,
    /tell\s+me\s+about\s+your\s+paint(?:ings|ing)/i,
    /gallery/i,
    /catalog/i,
    // "painting N" without # also lands here via the numeric lookup above;
    // keep the generic title-word match but require a sale-signal word so a
    // bare "painting" question falls to the LLM instead of a catalog dump.
    /(?:painting|art ?work)s?\s+(?:catalog|list|collection)/i,
  ])) {
    return {
      matched: true,
      text: saleCatalogReply(sale, brand),
    };
  }

  // ── Classes / courses (specific — before generic price intent) ──────────
  // Bare /class/, /student/, /learn/, /offer/, /watercolor/ were removed:
  // they hijacked nuanced LLM-bound questions ("is watercolor hard for a
  // student to learn?", "what does a class cost compared to a workshop?").
  // Now requires a real program noun or an explicit classes question.
  if (matchesAny(q, [
    /classes?\b/i,
    /courses?\b/i,
    /diploma/i,
    /students?\s+(do|get|learn|use|make|work)/i,
    /do\s+you\s+(teach|run|hold)/i,
    /(art|painting|drawing)\s+(lessons?|training|programs?)\b/i,
    /(online|offline|weekend|kids|children|adults?)\s+(classes?|courses?|batches?)/i,
    /beginners?\s+(class|course|batch|program)/i,
    /batch\b/i,
    /nata|nid|nift|ceed|uceed|bfa/i,
    /entrance[- ]?exam/i,
    /(fine\s*arts?)\s+(diploma|course|program)/i,
    /curriculum/i,
    /syllabus/i,
    /summer\s+camp/i,
    /watercolou?r\s+(course|class|masterclass|diploma)/i,
  ])) {
    return {
      matched: true,
      text: classesAndCoursesReply(content, brand),
    };
  }

  // ── Specific purchase intents before generic price questions ────────────
  // Requires a commission noun or an explicit custom-order verb phrase.
  // Bare /portrait/ and /for me/ were removed: "who painted that portrait?"
  // belongs to the LLM, not a commission pitch.
  if (matchesAny(q, [
    /commission/i,
    /custom\s+(painting|art ?work|piece|portrait|mural|order)/i,
    /(?:get|order|request)\s+(?:a\s+)?(?:custom|commission|made)/i,
    /made\s+to\s+order/i,
    /murals?\b/i,
    /deit(y|ies)\s+(painting|art|mural)/i,
    /make\s+(me|us)\s+(a|an)/i,
    /paint\s+(my|our|a\s+custom)/i,
  ])) {
    return {
      matched: true,
      text: commissionReply(brand),
    };
  }

  if (matchesAny(q, [
    /ship(?:ping|ped|s)?\b/i,
    /delivery/i,
    /courier/i,
    /(do|can)\s+you\s+(ship|deliver|post)/i,
    /how\s+(do|would)\s+(you|it)\s+(ship|travel|arrive)/i,
    /(safe|safely)\s+(packed|packaged|shipped)/i,
  ])) {
    return {
      matched: true,
      text: shippingReply(faqs, brand),
    };
  }

  // ── Price questions (general) ───────────────────────────────────────────
  if (matchesAny(q, [
    /how\s+much/i,
    /price/i,
    /cost/i,
    /prices/i,
    /rate/i,
    /fees/i,
  ])) {
    if (matchesAny(q, [
      /class/i,
      /course/i,
      /diploma/i,
      /camp/i,
      /coaching/i,
      /nata/i,
      /nid/i,
      /nift/i,
      /ceed/i,
      /ueed/i,
      /bfa/i,
      /entrance/i,
      /exam/i,
      /workshop/i,
      /batch/i,
      /tuition/i,
    ])) {
      return {
        matched: true,
        text: classesAndWorkshopPricingReply(brand),
      };
    }

    if (matchesAny(q, [
      /buy/i,
      /purchase/i,
      /order/i,
      /own/i,
      /get\s+(a|an)/i,
      /have\s+one/i,
      /take\s+home/i,
      /book/i,
      /register/i,
      /sign\s*up/i,
      /join/i,
      /enroll/i,
      /signup/i,
      /how\s+do/i,
      /process/i,
      /checkout/i,
      /payment/i,
    ])) {
      return {
        matched: true,
        text: purchasingReply(brand),
      };
    }

    return {
      matched: true,
      text: salePriceRangeReply(sale, brand),
    };
  }

  // ── Status questions: sold/available ────────────────────────────────────
  if (matchesAny(q, [
    /sold/i,
    /available/i,
    /reserved/i,
    /which.*sold/i,
    /status/i,
    /how many/i,
  ])) {
    return {
      matched: true,
      text: saleStatusReply(sale, brand),
    };
  }

  // ── Events / workshops / next session ───────────────────────────────────
  // Requires an event noun or a temporal signal. Bare /when/i and
  // /exhibition/i were removed: they hijacked past-exhibition and history
  // questions ("what medium did you use in your 2019 exhibition piece?")
  // and answered them with the upcoming event.
  if (matchesAny(q, [
    /workshop/i,
    /\bevents?\b/i,
    /next\s+(up|event|workshop|session|batch|class)/i,
    /when\s+(is|are|does|do)\s+(the\s+)?(next|upcoming)/i,
    /coming\s+up/i,
    /upcoming/i,
    /calendar/i,
    /masterclass/i,
    /weekend\s+(batch|class|session|workshop)/i,
    /retreat/i,
    /exhibitions?\s+(schedule|calendar|upcoming|next|list)/i,
    /summer\s+camp/i,
    /art\s+camp/i,
  ])) {
    if (events.length > 0) {
      return {
        matched: true,
        text: upcomingEventReply(events[0], brand, chatbot ?? {}),
      };
    }
    return {
      matched: true,
      text: noUpcomingEventReply(brand),
    };
  }

  // ── Buying / contact / location ─────────────────────────────────────────
  if (matchesAny(q, [
    /buy/i,
    /purchase/i,
    /order/i,
    /own/i,
    /get\s+(a|an)/i,
    /have\s+one/i,
    /take\s+home/i,
    /book/i,
    /register/i,
    /sign\s*up/i,
    /join/i,
    /enroll/i,
    /signup/i,
    /how\s+do/i,
    /process/i,
    /checkout/i,
    /payment/i,
    /whatsapp/i,
    /contact/i,
    /reach/i,
    /phone/i,
    /call/i,
    /message/i,
    /mail/i,
    /email/i,
    /location/i,
    /where/i,
    /studio\s+located/i,
    /address/i,
    /bangalore/i,
    /chennai/i,
    /bengaluru/i,
  ])) {
    if (matchesAny(q, [/where/i, /location/i, /address/i, /studio\s+located/i, /bangalore/i, /chennai/i, /bengaluru/i])) {
      return {
        matched: true,
        text: locationReply(brand),
      };
    }
    return {
      matched: true,
      text: purchasingReply(brand),
    };
  }

  // ── Artist / about ──────────────────────────────────────────────────────
  // Bare /artist/ and /background/ removed: "how long has the artist been
  // painting?" style nuance now reaches the LLM (which has the bio chunk
  // via RAG). Kept: name, founder, awards, and explicit about-phrases.
  if (matchesAny(q, [
    /anuradha/i,
    /founder/i,
    /who\s+(is|was)\s+(the\s+)?(artist|painter|founder|she)/i,
    /tell\s+me\s+about\s+(the\s+)?(artist|founder|anuradha|her)/i,
    /about\s+(the\s+)?(artist|studio|founder|painter|her)\b/i,
    /achievement/i,
    /award/i,
    /honou?r/i,
    /(her|their|his)\s+(journey|story|background)/i,
  ])) {
    return {
      matched: true,
      text: artistAndAboutReply(content, brand),
    };
  }

  // ── General welcome / fallback for greetings & vague prompts ───────────
  // Kept to genuine greetings/thanks/capability questions. Bare verbs like
  // "tell", "show", "give", "please" were removed: they swallowed follow-up
  // questions ("tell me about your Kashmir series") that belong to the LLM.
  if (matchesAny(q, [
    /^hello\b/i,
    /^hi\b/i,
    /^hey\b/i,
    /namaste/i,
    /vanakkam/i,
    /nandri/i,
    /good\s+(morning|afternoon|evening)/i,
    /thanks/i,
    /thank\s+you/i,
    /what\s+can\s+you\s+(do|help)/i,
    /who\s+are\s+you/i,
    /help\s+me\s+with/i,
  ])) {
    return {
      matched: true,
      text: greetingReply(brand, tanglish),
    };
  }

  return { matched: false };
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface PaintingRef { id: string; title: string; price?: number | string; status?: string | undefined; src?: string | undefined; description?: string | undefined }

/**
 * Find a sale painting from a query — exact first, then fuzzy.
 *
 * 1. A number after any of several mistyped/abbreviated "painting" words
 *    ("painting 7", "panting 7 price", "paintng no 12") resolves by number.
 * 2. Otherwise, title tokens are matched exactly, then fuzzily.
 */
function findPainting(sale: PaintingRef[], q: string): PaintingRef | undefined {
  // Painting-number regex: an explicit list of common mistypings of
  // "painting" plus the usual "no / number / #" forms — deterministic, no
  // clever fuzzy word regex that could match unrelated words ("picking 7").
  const m = q.match(/(?:paintings?|pantings?|paintngs?|paitings?|paintigs?|painings?|piantings?|no|number|#)\s*(?:no\.?|number)?\s*#?\s*(\d{1,3})/);
  if (m) {
    const num = parseInt(m[1], 10);
    const byNumber = sale.find((p) => {
      const tm = p.title.match(/#\s*(\d+)/i);
      return tm && parseInt(tm[1], 10) === num;
    });
    if (byNumber) return byNumber;
  }

  // Exact title-token match first (unchanged behavior)…
  const exact = matchByTitleTokens(sale, q, false);
  if (exact) return exact;

  // …then a single fuzzy title-token pass (tolerates one typo per word).
  return matchByTitleTokens(sale, q, true);
}

export function matchByTitleTokens(sale: PaintingRef[], q: string, fuzzy: boolean): PaintingRef | undefined {
  // If the query mentions a painting number already handled above, skip.
  if (/#\s*\d+/.test(q)) return undefined;

  // Tokenize query and match significant title tokens. Generic catalog words
  // are excluded so "original fine art painting 12" matches via the number,
  // not via words every title shares.
  const GENERIC_TITLE_WORDS = new Set(['original', 'fine', 'art', 'painting', 'the', 'a', 'an', 'for', 'sale', 'your', 'studio']);
  const qTokens = Array.from(
    new Set(
      q
        .replace(/[^a-z0-9#\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2 && !GENERIC_TITLE_WORDS.has(t)),
    ),
  );

  let best: PaintingRef | undefined = undefined;
  let bestScore = 0;

  for (const p of sale) {
    const title = p.title.toLowerCase();
    const pTokens = Array.from(
      new Set(
        title
          .replace(/[^a-z0-9#\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length >= 2),
      ),
    );

    let hits = 0;
    for (const t of qTokens) {
      if (pTokens.includes(t)) hits += 1;
      else if (fuzzy && pTokens.some((pt) => fuzzyTokenMatch(t, pt))) hits += 1;
    }

    // Prefer matches on the more unique numeric/token tail of the title.
    const numericToken = title.match(/#\s*(\d+)/i);
    if (numericToken && qTokens.includes(numericToken[1])) hits += 2;

    if (hits > bestScore && hits >= 2) {
      bestScore = hits;
      best = p;
    }
  }

  return best;
}

function matchesAny(q: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(q));
}

// ── Reply builders ─────────────────────────────────────────────────────────

function paintingLookupReply(
  painting: { title: string; price?: number | string; status?: string | undefined; description?: string | undefined; src?: string | undefined },
  brand: { phoneDisplay: string },
): string {
  const title = painting.title;
  const price = painting.price !== undefined && painting.price !== '' ? formatPrice(painting.price) : 'price on request';
  const status = painting.status ?? 'Available';
  const desc = painting.description ? ` ${painting.description}` : '';
  // The widget renders this tag as a thumbnail card; the image is always the
  // studio's own CMS asset (never a model-generated URL).
  const img = painting.src ? `\n[IMG:${painting.src}]` : '';
  return `**${title}** — ${price} — ${status}.${desc}${img}\n\nIf you’d like to own it, confirm availability and next steps on WhatsApp: ${brand.phoneDisplay}.`;
}

function saleCatalogReply(sale: { id: string; title: string; price?: number | string; status?: string | undefined }[], brand: { phoneDisplay: string }): string {
  if (sale.length === 0) {
    return "We don’t have a public sale catalog loaded right now. The studio can share current pieces and prices on WhatsApp — reach us at " + brand.phoneDisplay + ".";
  }

  const prices = sale
    .map((p) => (typeof p.price === 'number' || typeof p.price === 'string' ? Number(p.price) : null))
    .filter((p): p is number => p !== null && !Number.isNaN(p))
    .sort((a, b) => a - b);

  const range = prices.length > 0
    ? `Prices range from **${formatPrice(prices[0])}** to **${formatPrice(prices[prices.length - 1])}**.`
    : "Prices are available on request.";

  const available = sale.filter((p) => (p.status ?? 'Available') === 'Available').length;
  const sold = sale.filter((p) => (p.status ?? 'Available') === 'Sold').length;

  const head = [
    `We have **${sale.length}** originals in the sale catalog — each one-of-a-kind, signed by the artist.`,
    range,
    `Right now **${available}** are available and **${sold}** have been sold.`,
    "Here are a few pieces to start with:",
  ].join('\n');

  const highlights = sale
    .filter((p) => (p.status ?? 'Available') === 'Available')
    .slice(0, 4)
    .map((p) => `**${p.title}** — ${typeof p.price === 'number' || typeof p.price === 'string' ? formatPrice(p.price) : 'price on request'}`)
    .join('\n');

  return [
    head,
    highlights,
    "\nBrowse the full gallery with photos on our Sale page (/sale), or ask me about a specific painting by name or number.",
    `[WA:Hi! I'd like to know more about your paintings for sale.]`,
  ].join('\n');
}

function salePriceRangeReply(sale: { id: string; title: string; price?: number | string; status?: string | undefined }[], brand: { phoneDisplay: string }): string {
  if (sale.length === 0) {
    return "The studio will confirm current prices personally — reach us on WhatsApp at " + brand.phoneDisplay + ".";
  }

  const prices = sale
    .map((p) => (typeof p.price === 'number' || typeof p.price === 'string' ? Number(p.price) : null))
    .filter((p): p is number => p !== null && !Number.isNaN(p))
    .sort((a, b) => a - b);

  const range = prices.length > 0
    ? `Our originals range from **${formatPrice(prices[0])}** to **${formatPrice(prices[prices.length - 1])}**, depending on size, medium and complexity.`
    : "Prices depend on the piece — the studio will confirm personally.";

  return [
    range,
    "If you have a particular painting in mind, ask me by name or number and I can share its exact price and status.",
    "For ownership, framing, shipping or payment, the studio handles everything personally on WhatsApp: " + brand.phoneDisplay + ".",
    `[WA:Hi! I'd like to know the price of a painting.]`,
  ].join('\n');
}

function saleStatusReply(sale: { id: string; title: string; price?: number | string; status?: string | undefined }[], brand: { phoneDisplay: string }): string {
  if (sale.length === 0) {
    return "The studio can confirm current availability personally — reach us on WhatsApp at " + brand.phoneDisplay + ".";
  }

  const available = sale.filter((p) => (p.status ?? 'Available') === 'Available');
  const sold = sale.filter((p) => (p.status ?? 'Available') === 'Sold');
  const reserved = sale.filter((p) => (p.status ?? 'Available') === 'Reserved');

  const parts = [
    `In the sale catalog, **${available.length}** are available, **${sold.length}** are sold, and **${reserved.length}** are reserved.`,
  ];

  if (sold.length > 0) {
    const soldList = sold
      .slice(0, 6)
      .map((p) => `**${p.title}**`)
      .join(', ');
    parts.push(`Sold pieces include: ${soldList}${sold.length > 6 ? ` and ${sold.length - 6} more.` : '.'}`);
  }

  parts.push(
    "\nIf you want a specific piece or one like a sold piece, we can often create a similar original — ask me about commissions.",
    "For anything you’d like to buy now, the studio confirms availability and next steps on WhatsApp: " + brand.phoneDisplay + ".",
    `[WA:Hi! I'd like to buy a painting from the sale collection.]`,
  );

  return parts.join('\n');
}

function classesAndCoursesReply(content: SiteContent, brand: { phoneDisplay: string }): string {
  const courses = content.sections?.courses;
  const title = courses?.title ?? 'Classes & Courses';
  const subtitle = courses?.subtitle ?? 'Online & offline';

  return [
    `Yes — Anugruja Arts Studio offers **${title}**: ${subtitle}.`,
    "Programs include regular batches, a 1-year fine arts diploma, summer camps, and entrance-exam coaching for NATA, NID, NIFT, CEED, UCEED and BFA.",
    "Details like current batch timings, fees and seat availability are confirmed personally on WhatsApp: " + brand.phoneDisplay + ".",
    "If you tell me your goal — hobby, professional training, or exam prep — I can point you to the right path.",
  ].join('\n');
}

function classesAndWorkshopPricingReply(brand: { phoneDisplay: string }): string {
  return [
    "Class, course and workshop fees depend on the program, batch and duration, so the studio confirms them personally.",
    "Reach us on WhatsApp at " + brand.phoneDisplay + " and we’ll share current fees, seats and the best batch for you.",
  ].join('\n');
}

function purchasingReply(brand: { phoneDisplay: string }): string {
  return [
    "All purchases, commissions and class registrations happen personally on WhatsApp.",
    "Reach the studio at " + brand.phoneDisplay + " — we’ll help you choose, confirm availability, frames, shipping and payment.",
    "There’s no online checkout; everything is handled with a human touch.",
    `[WA:Hi! I'd like to buy a painting / join a class.]`,
  ].join('\n');
}

function commissionReply(brand: { phoneDisplay: string }): string {
  return [
    "Custom commissions are a studio specialty — portraits, deities, murals and custom watercolors.",
    "Share your idea, size, medium and timeline on WhatsApp: " + brand.phoneDisplay + ".",
    "We’ll send a quote and work with you personally until it’s done.",
    `[WA:Hi! I'd like to commission a custom painting.]`,
  ].join('\n');
}

function shippingReply(faqs: { question: string; answer: string }[], brand: { phoneDisplay: string }): string {
  const faq = faqs.find((f) => /ship/i.test(f.question));
  if (faq) {
    return faq.answer + " For a shipping quote, reach us on WhatsApp: " + brand.phoneDisplay + ".";
  }
  return "Originals are shipped safely packed across India and internationally. The studio will quote shipping on WhatsApp depending on size and destination: " + brand.phoneDisplay + ".";
}

function locationReply(brand: { locationLabel: string; phoneDisplay: string; email: string }): string {
  return [
    "The studio operates from " + brand.locationLabel + ".",
    "For visits, classes or commissions, reach us on WhatsApp: " + brand.phoneDisplay + " or email " + brand.email + ".",
  ].join('\n');
}

function upcomingEventReply(event: { title: string; date: string; dateIso?: string | undefined; location?: string | undefined; description?: string | undefined; registrationUrl?: string | undefined; registrationDeadline?: string | undefined; eventType?: string | undefined; seatsRemaining?: number | undefined }, brand: { phoneDisplay: string }, chatbot: { faqs?: { question: string; answer: string }[] | undefined }): string {
  const lines = [
    `Our next event is **${event.title}** — ${event.date}.`,
  ];

  if (event.location) lines.push(`Venue: ${event.location}.`);
  if (event.eventType) lines.push(`Type: ${event.eventType}.`);
  if (event.description) lines.push(event.description);
  if (event.seatsRemaining !== undefined) lines.push(`Seats remaining: ${event.seatsRemaining}.`);

  if (event.registrationDeadline) {
    lines.push(`Registration: ${event.registrationDeadline}.`);
  }

  lines.push(
    "To book a seat or ask questions, reach us on WhatsApp: " + brand.phoneDisplay + ".",
  );

  return lines.join('\n');
}

function noUpcomingEventReply(brand: { phoneDisplay: string }): string {
  return "We don’t have an upcoming event loaded right now. For the latest workshops and dates, ask me again later or reach the studio on WhatsApp: " + brand.phoneDisplay + ".";
}

function artistAndAboutReply(content: SiteContent, brand: { phoneDisplay: string }): string {
  const brandName = content.brand.name;
  const founder = content.brand.founder;
  const location = content.brand.locationLabel;

  return [
    `${brandName} is founded and led by **${founder}**, a professional fine artist working in realistic watercolour and original art.`,
    `The studio is based in ${location}, with online classes available worldwide.`,
    "If you want the full artist story, achievements and exhibitions, I can share that too — or you can visit our About page (/about).",
    "For classes, commissions or purchases, reach us on WhatsApp: " + brand.phoneDisplay + ".",
  ].join('\n');
}

function greetingReply(brand: { phoneDisplay: string }, tanglish: boolean): string {
  if (tanglish) {
    return [
      "வணக்கம்! 🙏 Namaste! I'm Chitra, the studio's assistant.",
      "Paintings, prices, classes, workshops, commissions — edhu patti-yum kekkalaam. Ask me anything about the studio!",
      "If you're ready to buy or book, the studio handles everything personally on WhatsApp: " + brand.phoneDisplay + ".",
    ].join('\n');
  }
  return [
    "Namaste! I'm Chitra, the studio's assistant.",
    "Ask me about paintings for sale, prices, classes, workshops, commissions or the artist.",
    "If you're ready to buy, book or commission, the studio handles everything personally on WhatsApp: " + brand.phoneDisplay + ".",
  ].join('\n');
}
