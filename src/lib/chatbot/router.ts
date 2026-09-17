import { lookupAndReply } from '@/lib/chatbot/lookup';
import { getSiteContentSync } from '@/lib/serverContent';
import { tokenize } from '@/lib/chatbot/rag/bm25';

/**
 * Smart request router — decides the cheapest layer that can answer well.
 *
 *   preprogrammed  → deterministic CMS reply           (0 OpenRouter requests)
 *   faq            → admin FAQ answer, strong overlap  (0 OpenRouter requests)
 *   llm            → RAG context + OpenRouter          (1 request, fewer tokens)
 *
 * The router replaces the old catch-all matching (bare /tell/, /offer/,
 * /who/, /please/ patterns) with a strict pass: known intents, explicit
 * painting lookups, and genuine greetings are answered deterministically;
 * ambiguous or vague phrasings fall through to the LLM with RAG context —
 * which is exactly where nuanced questions belong.
 */

export type RouteAction =
  | { action: 'preprogrammed'; text: string }
  | { action: 'faq'; text: string }
  | { action: 'llm' };

/** FAQ coverage threshold: fraction of query tokens found in the FAQ question. */
const FAQ_COVERAGE_THRESHOLD = 0.6;
/**
 * Detail-seeking signals: when the query asks for depth beyond the FAQ's
 * one-liner (prices, comparisons, specifics), route to the LLM + RAG even at
 * high coverage — the model can synthesize from the retrieved chunks.
 */
const FAQ_DETAIL_ESCAPE = /(price|cost|fee|how much|compare|difference|exactly|specific|which|why|duration|long|timing|schedule|materials?|medium)/i;

export function routeMessage(validatedText: string): RouteAction {
  const q = (validatedText ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  // ── Tier 1: deterministic preprogrammed replies (strict matching) ────────
  const pre = lookupAndReplyStrict(q);
  if (pre) return { action: 'preprogrammed', text: pre };

  // ── Tier 2: admin FAQ with strong lexical overlap ────────────────────────
  const faq = faqReply(q);
  if (faq) return { action: 'faq', text: faq };

  // ── Tier 3: LLM with RAG context ─────────────────────────────────────────
  return { action: 'llm' };
}

/**
 * Strict version of the deterministic layer.
 *
 * `lookupAndReply` stays public for back-compat and direct callers, but the
 * router applies an additional guard so vague prompts ("tell me", "ok",
 * "sure") are NOT answered by the deterministic layer — they fall to the
 * LLM, which handles open-ended questions far better.
 *
 * Genuine greetings ARE handled here ("hi", "hello", "namaste"): they are
 * the most common chat input and a templated greeting is exactly right for
 * them — sending every "hi" to OpenRouter would waste the free-tier quota.
 */
function lookupAndReplyStrict(q: string): string | undefined {
  const pre = lookupAndReply(q);
  if (!pre.matched) return undefined;

  // Vague short prompts must never be answered by the deterministic layer.
  // Greetings are excluded — they are matched below as an explicit exception.
  const isGreeting = /^(hi|hey|hello|namaste|good\s*(morning|afternoon|evening))[!,.\s]*$/.test(q);
  const isVague =
    q.split(' ').filter(Boolean).length <= 2 &&
    !isGreeting &&
    /^(hi|hey|hello|namaste|thanks|thank you|ok|okay|sure|please|tell me|give me|show me|what|who|when|how|help)$/.test(q);
  if (isVague) return undefined;

  // Guard specific intents against their known false-positive patterns.
  const classesIntent = /\b(class|course|diploma|batch|nata|nid|nift|ceed|uceed|bfa|entrance|exam|coaching|beginner)\b/.test(q);
  const artistIntent = /anuradha|founder|\bartist\b|ma'?am|about the|background|journey|achievement|award|exhibition/.test(q);
  const commissionIntent = /commission|custom|\bportrait\b|\bmural\b|deity/.test(q);
  const shippingIntent = /\bship|delivery|\bcourier\b/.test(q);
  const priceIntent = /how much|price|cost|rate|fees?/.test(q);

  // "Tell me about your painting style" must not become a catalog dump;
  // the artist/LLM path answers stylistic questions better.
  if (/style|technique|inspired|inspiration|process|signature/.test(q) && !priceIntent) return undefined;

  // Extra contextual detail beyond the canned answer's scope → LLM.
  // e.g. "Do you ship paintings? I live in a small town" — the FAQ line
  // can't address the location nuance, but the model (with RAG context) can.
  if (/[?.!?;]\s*\S/.test(q)) return undefined; // multi-clause question
  if (/\b(but|because|since|although|also|and (also|can|do|will)|i (live|want|need|have)|my (town|city|place|home|friend))\b/.test(q)) return undefined;

  // If the query clearly names a different intent than the one that fired,
  // let the LLM arbitrate instead of trusting a greedy catch-all.
  const intents = [classesIntent, artistIntent, commissionIntent, shippingIntent, priceIntent].filter(Boolean).length;
  if (intents > 1) return undefined; // ambiguous — LLM decides

  return pre.text;
}

/**
 * Admin-curated FAQ matching: token overlap between the query and each FAQ
 * question. Conservative threshold — only fires when most of the query is
 * covered, so the LLM still gets genuinely open questions.
 */
function faqReply(q: string): string | undefined {
  const content = getSiteContentSync();
  const faqs = content.chatbot?.faqs ?? [];
  if (faqs.length === 0) return undefined;

  const qTokens = tokenize(q);
  if (qTokens.length < 2) return undefined; // too short to trust overlap
  // Detail-seeking questions need the LLM's synthesis, not the canned line.
  if (FAQ_DETAIL_ESCAPE.test(q)) return undefined;

  let best: { answer: string; coverage: number } | null = null;
  for (const faq of faqs) {
    const faqTokens = new Set(tokenize(faq.question));
    let covered = 0;
    for (const t of qTokens) {
      if (faqTokens.has(t)) covered++;
    }
    const coverage = covered / qTokens.length;
    if (coverage >= FAQ_COVERAGE_THRESHOLD && (!best || coverage > best.coverage)) {
      best = { answer: faq.answer, coverage };
    }
  }

  if (!best) return undefined;
  const phone = content.brand.phoneDisplay;
  return `${best.answer}\n\nFor anything more specific, the studio is one WhatsApp message away: ${phone}.`;
}
