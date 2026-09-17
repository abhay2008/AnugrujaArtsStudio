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
  | { ok: false; reason: 'empty' | 'too_long' | 'injection' | 'banned_topic' | 'off_topic' | 'gibberish' };

export const MAX_MESSAGE_CHARS = 1000;
export const MAX_SESSION_MESSAGES = 20;

/** Prompt-injection / jailbreak heuristics. Intentionally broad but low-noise. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?|messages?)/i,
  /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?|rules?)/i,
  /(reveal|show|print|repeat|output|give)\s+(me\s+)?(your|the)\s+(system|initial|original|hidden)?\s*(prompt|instructions?|message|rules?)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+(a|an|no longer)/i,
  /you\s+(are|will\s+be)\s+no\s+longer\s+(an?|the)\b/i,
  /(new|updated|override)\s+(system\s+)?(instructions?|rules?|persona)\s*:/i,
  /\bDAN\s+mode\b|\bjailbreak\b/i,
  /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|uncensored|different)/i,
  /(developer|debug|admin|god)\s+mode/i,
  /respond\s+(only\s+)?in\s+(raw\s+)?(json|html|code)\s+(only|from\s+now)/i,
  /repeat\s+(everything|all|the\s+text)\s+(above|before|so\s+far)/i,
];

/**
 * Input-side topicality gate.
 *
 * Chitra answers ONLY studio/art questions. With a free-tier OpenRouter
 * budget, every off-topic prompt is a wasted request — so borderline topics
 * are refused locally, before the LLM. This is a deliberately LOW-noise net:
 * it only fires when a prompt BOTH (a) matches a known non-studio topic and
 * (b) carries NO art/studio lexicon. Genuine art questions always pass —
 * the greenest phrasing still mentions art, painting, class, or the studio.
 */
const ART_LEXICON: RegExp[] = [
  /paint|draw|sketch|art|artwork|canvas|watercolou?r|acrylic|oil|gouache|charcoal|pastel/i,
  /class|course|diploma|workshop|batch|student|learn|teach|curriculum|syllabus|fee/i,
  /sale|price|pric(e|ing)|cost|buy|purchase|commission|order|shipping|delivery/i,
  /anugruja|anuradha|chitra|govarthanan|studio|gallery|exhibit|artist|painter/i,
  /nata|nid|nift|ceed|uceed|bfa|entrance|portfolio|portrait|mural|deity/i,
  /event|exhibition|award|frame|framing|original|craft|kalakaar|fabriano/i,
];

/** Non-studio topics that would otherwise burn an OpenRouter request. */
const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(weather|cricket|match|score|ipl|election|politic|government|minister)/i,
  /\b(movie|netflix|series|song|lyrics|actor|actress|bollywood|kollywood)/i,
  /\b(recipe|cook|bake|calorie|diet|workout|gym|medicine|symptom|disease|doctor)/i,
  /\b(stock|share market|crypto|bitcoin|loan|tax|insurance|salary|income)/i,
  /\b(code|program|javascript|python|java\b|react|sql|website traffic|seo)/i,
  /\b(joke|riddle|love|date|girlfriend|boyfriend|marry|horoscope|lottery)/i,
  /\b(capital of|population of|distance between|time zone|translate)/i,
  /\b(other|another)\s+(shop|store|business|website)s?\b/i,
];

function isOffTopicInput(text: string): boolean {
  if (OFF_TOPIC_PATTERNS.some((re) => re.test(text))) {
    return !ART_LEXICON.some((re) => re.test(text));
  }
  return false;
}

/**
 * Gibberish / keyboard-mash detector — refuses nonsense BEFORE the LLM so it
 * cannot burn a free-tier request. Deliberately conservative: a message is
 * gibberish only when it contains NO recognizable token at all ("asdfghjkl",
 * "aaaaaaa", "!!!???", emoji-only). One real word anywhere lets the message
 * through, so genuine questions are never refused. Non-Latin scripts (Tamil,
 * Hindi, emoji-adjacent writing systems) always pass — we don't classify
 * scripts we can't tokenize.
 */
const VOWEL_RE = /[aeiou]/;
/** Elongated real expressions: "hmmmm", "okkk", "shhh", "ohhh". */
const GIBBERISH_ALLOW_RE = /^(hm+|hmm+|mhm|shh+|ok+|oh+|ah+|uh+|um+|ya+|yo+)$/;
/** Real English words with no aeiou vowels — never flag them. */
const VOWELLESS_WORDS_RE = /^(rhythm|myth|hymn|gym|sync|psst|tsk)$/;
/** Canonical keyboard-row mashes, with or without vowels. */
const KEYBOARD_MASH_RE = /^(qwert|qwerty|qwertyu|qwertyuiop|asdfg|asdfgh|asdfghjkl|zxcvb|zxcvbn|zxcvbnm|poiuy|lkjhgf|mnbvcx)$/;

function isRecognizableToken(tok: string): boolean {
  if (/\P{ASCII}/u.test(tok)) return true; // Tamil/Hindi/accented scripts: never classified
  if (/^\d+$/.test(tok)) return tok.length <= 4; // "12" = painting number; long digit runs = spam
  if (!/^\p{L}+$/u.test(tok)) return true; // mixed tokens like "p1" or "3d"
  if (tok.length <= 3) return true; // short tokens are low-signal ("gm", "ok", "u")
  if (GIBBERISH_ALLOW_RE.test(tok)) return true;
  if (VOWELLESS_WORDS_RE.test(tok)) return true;
  if (/(.)\1{3,}/.test(tok)) return false; // "aaaaaa" — same char 4+ times
  if (KEYBOARD_MASH_RE.test(tok)) return false;
  const vowels = (tok.match(/[aeiou]/g) ?? []).length;
  return vowels / tok.length >= 0.2; // real words rarely dip below ~20% vowels
}

function isGibberishInput(text: string): boolean {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length === 0) return true; // "!!!???" or emoji-only
  return !tokens.some(isRecognizableToken);
}

/**
 * Topics the studio assistant must never engage with. Kept narrow — the
 * system prompt handles soft off-topic steering; these are hard refusals.
 */
const BANNED_TOPIC_PATTERNS: RegExp[] = [
  /\b(porn|pornographic|nsfw|nude|nudes|sexual)\b/i,
  /\b(hack(er|ing)?|ddos|botnet|malware|ransomware|phishing)\b/i,
  /\bmake\s+(a\s+)?(bomb|explosive|weapon|drug|meth|cocaine)\b/i,
  /\b(kill|murder|suicide)\s+(myself|someone|him|her|them)\b/i,
  /\b(credit\s+card|ssn|aadhaar|passport)\s+numbers?\b.*\b(generate|fake|stolen)\b|\b(generate|make|fake|stolen)\b.*\b(credit\s+card|ssn|aadhaar|passport)\b/i,
  /\b(launder|laundering)\s+money\b/i,
];

export function validateInput(raw: string): InputVerdict {
  const text = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_MESSAGE_CHARS + 50);

  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > MAX_MESSAGE_CHARS) return { ok: false, reason: 'too_long' };
  if (INJECTION_PATTERNS.some((re) => re.test(text))) return { ok: false, reason: 'injection' };
  if (BANNED_TOPIC_PATTERNS.some((re) => re.test(text))) return { ok: false, reason: 'banned_topic' };
  if (isOffTopicInput(text)) return { ok: false, reason: 'off_topic' };
  if (isGibberishInput(text)) return { ok: false, reason: 'gibberish' };

  return { ok: true, text: text.slice(0, MAX_MESSAGE_CHARS) };
}

export function refusalFor(reason: 'injection' | 'banned_topic' | 'too_long' | 'empty' | 'off_topic' | 'gibberish'): string {
  switch (reason) {
    case 'injection':
      return "I'm Chitra, the studio's art assistant — I can only chat about paintings, classes, events and the studio. How can I help you with art today? 🎨";
    case 'banned_topic':
      return "I'm not able to help with that. I'm here for anything about the studio — paintings, prices, classes, workshops or commissions! You can also reach us directly on WhatsApp. 🎨";
    case 'off_topic':
      return "That's a little outside my palette! I'm best with paintings, prices, classes, workshops and commissions — ask me any of those, or reach the studio directly on WhatsApp. 🎨";
    case 'gibberish':
      return "I didn't quite catch that! Could you type your question in words? I'm best with paintings, prices, classes, workshops and commissions. 🎨";
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
    'maps.google.com',
    'www.google.com',
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
    /(i am|i'm) an ai (language )?model/.test(t) ||
    /i cannot provide (financial|legal|medical) advice/.test(t) ||
    /(stock market|crypto|bitcoin) (tip|advice|price)/.test(t)
  );
}
