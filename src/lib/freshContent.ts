import type { SiteContent } from './types';
import { getSiteContentSync } from './serverContent';
import { getRemoteTextFile, githubConfigured } from './github';

/**
 * Freshness layer between the admin portal's GitHub CMS and the chatbot.
 *
 * Problem this solves: in production (Vercel), `content/site.json` is baked
 * into the deployment at build time. When Anuradha publishes a price change
 * through the admin portal, the commit lands on GitHub immediately — but a
 * redeploy takes minutes. During that window the chatbot (and its RAG index)
 * would keep answering from the stale build-time snapshot.
 *
 * Solution: chatbot-facing code reads through this module instead of the raw
 * file. It serves the build-time content normally, but at most once per TTL
 * it fetches the latest committed `content/site.json` from GitHub and adopts
 * it as soon as it parses and differs. An explicit invalidation (admin
 * publish) drops the memo so the very next chat message reflects the change.
 *
 * Failure modes are deliberately gentle: any fetch/parse error falls back to
 * the previous known content — the chatbot never breaks because GitHub
 * hiccuped.
 */

const TTL_MS = 60_000; // at most one GitHub probe per minute per instance

interface FreshState {
  /** Last known-good content (starts as the build-time snapshot). */
  content: SiteContent;
  /** ContentRevision signature of `content` (see chatbot/context.ts). */
  signature: string;
  lastFetchAt: number;
  inFlight: Promise<void> | null;
}

/**
 * True while our adopted content is NEWER than what GitHub has (admin saved
 * locally but the GitHub commit failed). While set, background refreshes must
 * never adopt an older remote over our newer content.
 */
let pendingRemoteSync = false;

function signatureOf(content: SiteContent): string {
  try {
    return JSON.stringify([
      content.galleries,
      content.events ?? null,
      content.chatbot ?? null,
      content.brand,
      content.sections,
    ]);
  } catch {
    return String(Date.now());
  }
}

const state: FreshState = {
  content: getSiteContentSync(),
  signature: '',
  lastFetchAt: 0,
  inFlight: null,
};

/** Test/dev hook: drop the memo and re-seed from the build-time file. */
export function resetFreshContent(): void {
  state.content = getSiteContentSync();
  state.signature = signatureOf(state.content);
  state.lastFetchAt = 0;
  state.inFlight = null;
  pendingRemoteSync = false;
}

/**
 * Called by the admin publish route with the exact content it just saved.
 * Adopts it immediately (the very next chat message uses it — no fetch, no
 * TTL wait) and, when GitHub publishing is enabled, blocks background
 * refreshes from adopting an OLDER remote until GitHub catches up (e.g. the
 * commit failed, or is still propagating).
 */
export function adoptFreshContent(content: SiteContent): void {
  state.content = content;
  state.signature = signatureOf(content);
  state.lastFetchAt = Date.now();
  state.inFlight = null;
  pendingRemoteSync = githubConfigured();
}

/**
 * Latest known studio content. Synchronous and safe on the request path:
 * returns the freshest content already fetched (or the build-time snapshot
 * before the first fetch completes).
 */
export function getFreshContentSync(): SiteContent {
  if (!state.signature) state.signature = signatureOf(state.content);
  return state.content;
}

/**
 * Kick off a background refresh if the TTL elapsed. Fire-and-forget: the
 * request path never awaits GitHub — it either uses data already fetched or
 * the last known content. Adopted only when the fetched content parses AND
 * differs from what we have.
 */
export function refreshFreshContent(): void {
  if (!githubConfigured()) return;
  const now = Date.now();
  if (now - state.lastFetchAt < TTL_MS) return;
  if (state.inFlight) return;

  state.lastFetchAt = now;
  state.inFlight = (async () => {
    try {
      const remote = await getRemoteTextFile('content/site.json');
      if (!remote) return;
      const parsed = JSON.parse(remote) as SiteContent;
      if (!parsed || !parsed.galleries) return;
      const sig = signatureOf(parsed);
      if (sig === state.signature) {
        // Remote caught up with what we already adopted.
        pendingRemoteSync = false;
        return;
      }
      if (pendingRemoteSync) {
        // We hold newer content than GitHub (local save succeeded, remote
        // commit failed/pending) — never regress to the older remote.
        return;
      }
      state.content = parsed;
      state.signature = sig;
    } catch {
      // Keep last known content — never break the chatbot on GitHub errors.
    } finally {
      state.inFlight = null;
    }
  })();
}

/** True when the local file no longer matches the adopted remote content. */
export function freshContentDiffers(): boolean {
  try {
    return signatureOf(state.content) !== signatureOf(getSiteContentSync());
  } catch {
    return false;
  }
}
