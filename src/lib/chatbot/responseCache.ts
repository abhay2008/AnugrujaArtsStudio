import { createHash } from 'crypto';

/**
 * In-memory response cache for the studio chatbot.
 *
 * This is the request-count lever: repeat questions (the vast majority of
 * chat traffic) are answered with zero OpenRouter calls. Entries are keyed
 * by the CMS revision, so the moment Anuradha publishes new content every
 * cached answer is instantly invalid — correctness is never traded for
 * savings.
 */

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_MAX_ENTRIES = 60;

interface CacheEntry {
  reply: string;
  layer: string;
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();

function ttlMs(): number {
  const n = Number(process.env.CHATBOT_CACHE_TTL_SECONDS);
  return Number.isFinite(n) && n > 0 ? n * 1000 : DEFAULT_TTL_MS;
}

function maxEntries(): number {
  const n = Number(process.env.CHATBOT_CACHE_MAX_ENTRIES);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_ENTRIES;
}

function normalize(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

function cacheKey(query: string, revision: string, model: string, langHint: string): string {
  const hash = createHash('sha1').update(`${normalize(query)}|${revision}|${model}|${langHint}`).digest('hex');
  return hash;
}

export interface CacheLookup {
  hit: boolean;
  reply?: string;
  layer?: string;
}

export function lookupCachedReply(
  query: string,
  revision: string,
  model: string,
  langHint: string,
): CacheLookup {
  const key = cacheKey(query, revision, model, langHint);
  const entry = cache.get(key);
  if (!entry) return { hit: false };
  if (Date.now() - entry.createdAt > ttlMs()) {
    cache.delete(key);
    return { hit: false };
  }
  // Refresh recency for simple LRU-ish behavior.
  cache.delete(key);
  cache.set(key, entry);
  return { hit: true, reply: entry.reply, layer: entry.layer };
}

export function storeCachedReply(
  query: string,
  revision: string,
  model: string,
  langHint: string,
  reply: string,
  layer: string,
): void {
  const key = cacheKey(query, revision, model, langHint);
  cache.set(key, { reply, layer, createdAt: Date.now() });
  // Evict oldest entries when over capacity.
  while (cache.size > maxEntries()) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Test hook. */
export function clearResponseCache(): void {
  cache.clear();
}

/**
 * Production invalidation hook.
 *
 * Response entries are revision-keyed, so they self-invalidate whenever the
 * CMS changes — this explicit clear is defense in depth so an admin commit
 * can never serve a stale answer even if hashing were to fail.
 * Called from /api/content after every admin publish.
 */
export function invalidateResponseCache(): void {
  cache.clear();
}
