/**
 * Layered guardrails for the studio chatbot.
 *
 * Input filters run BEFORE any LLM call (they cost zero free-tier requests);
 * output filters run AFTER the model replies. Everything is plain string
 * matching — deterministic, testable, and instant.
 */

/** Results of validating a visitor message before it reaches the model. */
export type InputVerdict =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'too_long' | 'injection' | 'banned_topic' };

export const MAX_MESSAGE_CHARS = 1000;
export const MAX_SESSION_MESSAGES = 20;

/** Prompt-injection / jailbreak heuristics. Intentionally broad but low-noise. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?|messages?)/i,
  /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?|rules?)/i,
  /(reveal|show|print|repeat|output|give)\s+(me\s+)?(your|the)\s+(system|initial|original|hidden)\s+(prompt|instructions?|message|rules?)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+(a|an|no longer)/i,
  /(new|updated|override)\s+(system\s+)?(instructions?|rules?|persona)\s*:/i,
  /\bDAN\s+mode\b|\bjailbreak\b/i,
  /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|uncensored|different)/i,
  /(developer|debug|admin|god)\s+mode/i,
  /respond\s+(only\s+)?in\s+(raw\s+)?(json|html|code)\s+(only|from\s+now)/i,
  /repeat\s+(everything|all|the\s+text)\s+(above|before|so\s+far)/i,
];

/**
 * Topics the studio assistant must never engage with. Kept narrow — the
 * system prompt handles soft off-topic steering; these are hard refusals.
 */
const BANNED_TOPIC_PATTERNS: RegExp[] = [
  /\b(porn|pornographic|nsfw|nude|nudes|sexual)\b/i,
  /\b(hack(er|ing)?|ddos|botnet|malware|ransomware|phishing)\b/i,
  /\bmake\s+(a\s+)?(bomb|explosive|weapon|drug|meth|cocaine)\b/i,
  /\b(kill|murder|suicide)\s+(myself|someone|him|her|them)\b/i,
  /\b(credit\s+card|ssn|aadhaar|passport)\s+numbers?\b.*\b(generate|fake|stolen)\b/i,
  /\b(launder|laundering)\s+money\b/i,
];

export function validateInput(raw: string): InputVerdict {
  const text = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_MESSAGE_CHARS + 50);

  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > MAX_MESSAGE_CHARS) return { ok: false, reason: 'too_long' };
  if (INJECTION_PATTERNS.some((re) => re.test(text))) return { ok: false, reason: 'injection' };
  if (BANNED_TOPIC_PATTERNS.some((re) => re.test(text))) return { ok: false, reason: 'banned_topic' };

  return { ok: true, text: text.slice(0, MAX_MESSAGE_CHARS) };
}

export function refusalFor(reason: 'injection' | 'banned_topic' | 'too_long' | 'empty'): string {
  switch (reason) {
    case 'injection':
      return "I'm Chitra, the studio's art assistant — I can only chat about paintings, classes, events and the studio. How can I help you with art today? 🎨";
    case 'banned_topic':
      return "I'm not able to help with that. I'm here for anything about the studio — paintings, prices, classes, workshops or commissions! You can also reach us directly on WhatsApp. 🎨";
    case 'too_long':
      return `That's a very long message! Could you split it into a shorter question (under ${MAX_MESSAGE_CHARS} characters)? I answer best one question at a time.`;
    case 'empty':
    default:
      return 'It looks like your message came through empty. What would you like to know about the studio?';
  }
}

// ── Output guardrails ─────────────────────────────────────────────────────

/** The only phone digits allowed to appear in a bot reply (studio number). */
const STUDIO_PHONE_DIGITS = '919611255949';

/**
 * Strips phone numbers that aren't the studio's (guards against prompt
 * artifacts echoing injected numbers) and drops non-allowlisted URLs.
 */
export function sanitizeOutput(reply: string): string {
  let out = reply;

  // Replace any phone-like digit cluster that is NOT the studio's own.
  out = out.replace(/(\+?\d[\d\s\-()]{7,}\d)/g, (match) => {
    const digits = match.replace(/\D/g, '');
    if (!digits) return match;
    if (digits === STUDIO_PHONE_DIGITS || digits === '9611255949') return match;
    // 10-digit local numbers that don't match the studio's get neutralized.
    if (digits.length >= 8 && digits.length <= 14) return '[contact via WhatsApp]';
    return match;
  });

  // Drop links outside the allowlist.
  const allowedHosts = [
    'wa.me',
    'anugruja.com',
    'abhay2008.github.io',
    'posts.gle',
    'instagram.com',
    'www.instagram.com',
    'facebook.com',
    'www.facebook.com',
    'youtube.com',
    'www.youtube.com',
  ];
  out = out.replace(/https?:\/\/[^\s<>")\]]+/gi, (url) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (allowedHosts.includes(host)) return url;
    } catch {
      /* not a real URL — leave as-is */
    }
    return '';
  });

  // Collapse empty markdown links the model may emit, e.g. "[Sale page]()".
  out = out.replace(/\[([^\]]+)\]\(\s*\)/g, '$1');

  // Tidy whitespace left by removed links.
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

/**
 * Heuristic drift detector: if the model's reply mentions a rupee price that
 * does not exist in the live context, treat it as a hallucination.
 */
export function mentionsUnknownPrice(reply: string, liveContext: string): boolean {
  const prices = reply.match(/₹\s?[\d,]+(?:\.\d{1,2})?/g) ?? [];
  if (prices.length === 0) return false;
  return prices.some((p) => {
    const normalized = p.replace(/₹\s?/, '').replace(/,/g, '');
    const alt = Number(normalized).toLocaleString('en-IN');
    return !liveContext.includes(normalized) && !liveContext.includes(`₹${alt}`);
  });
}

/** Off-topic guard: reply is fine, this only scores topical drift. */
export function looksOffTopic(reply: string): boolean {
  const t = reply.toLowerCase();
  return (
    /as an ai (language )?model/.test(t) ||
    /i cannot provide (financial|legal|medical) advice/.test(t) ||
    /(stock market|crypto|bitcoin) (tip|advice|price)/.test(t)
  );
}
