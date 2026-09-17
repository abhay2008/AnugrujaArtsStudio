/**
 * In-memory log of questions that fell through to the LLM.
 *
 * Purpose: FAQ mining — frequent LLM-bound questions are candidates for
 * admin-curated FAQs, and every promoted FAQ answers that question at zero
 * OpenRouter cost forever. Read the clusters via /api/chatbot-queries
 * (admin-only) and add the winners to Chatbot FAQs in the admin portal.
 *
 * Deliberately in-memory only (resets on deploy/restart): privacy-friendly,
 * no visitor text is persisted anywhere, and stats are operational tooling.
 */
const MAX_LOG = 500;
/** Greetings and one-worders can never become FAQs — skip them. */
const MIN_QUERY_LEN = 8;
const SKIPPED_RE = /^(hi|hey|hello|namaste|thanks|thank you|ok|okay|yes|no|vanakkam|nandri)\b/;

export interface LlmQueryEntry {
  q: string;
  at: number;
  /** Language hint emitted for the request ('' → English). */
  lang?: string;
  /** Primary model the request was queued for. */
  model?: string;
}

const log: LlmQueryEntry[] = [];

export function logLlmQuery(entry: Omit<LlmQueryEntry, 'at'>): void {
  const q = (entry.q ?? '').trim();
  if (q.length < MIN_QUERY_LEN || SKIPPED_RE.test(q.toLowerCase())) return;
  log.push({ ...entry, q, at: Date.now() });
  if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
}

export interface QueryCluster {
  /** First-seen phrasing of the question. */
  question: string;
  count: number;
  lastAt: number;
}

export function getLlmQueryStats(windowHours = 24): {
  windowHours: number;
  total: number;
  clusters: QueryCluster[];
  recent: LlmQueryEntry[];
} {
  const cutoff = Date.now() - windowHours * 3_600_000;
  const recent = log.filter((e) => e.at >= cutoff);

  const groups = new Map<string, QueryCluster>();
  for (const e of recent) {
    // Normalize: lowercase, strip punctuation, keep Tamil script (visitors
    // may ask in Tamil — those clusters matter for bilingual FAQs).
    const key = e.q
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!key) continue;
    const g = groups.get(key);
    if (g) {
      g.count++;
      g.lastAt = Math.max(g.lastAt, e.at);
    } else {
      groups.set(key, { question: e.q, count: 1, lastAt: e.at });
    }
  }

  const clusters = Array.from(groups.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return { windowHours, total: recent.length, clusters, recent: recent.slice(-50).reverse() };
}

/** Test hook: clear the log. */
export function clearLlmQueryLog(): void {
  log.length = 0;
}
