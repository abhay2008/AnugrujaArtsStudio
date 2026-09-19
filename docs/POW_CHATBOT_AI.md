# Proof of Work — "Chitra" (చిత్ర), the AI Studio Assistant
### Deep-Dive Companion to `PROOF_OF_WORK.md`

**Scope:** the visitor-facing chat widget and the complete server pipeline
behind it: the four-layer answer architecture, retrieval (RAG), guardrails,
caching, rate limiting, cost engineering, observability, and the test suites
that prove all of it.

**Verify-as-you-read:** every section names its source files; §12 lists the
commands that re-prove the claims.

---

## Table of Contents

1. [What Chitra Is — and Deliberately Isn't](#1-what-chitra-is--and-deliberately-isnt)
2. [The Visitor Experience](#2-the-visitor-experience)
3. [The Four-Layer Answer Pipeline](#3-the-four-layer-answer-pipeline)
4. [Layer 1 — Preprogrammed Answers](#4-layer-1--preprogrammed-answers)
5. [Layer 2 — Admin FAQs](#5-layer-2--admin-faqs)
6. [Layer 3 — The Response Cache](#6-layer-3--the-response-cache)
7. [Layer 4 — RAG + the LLM](#7-layer-4--rag--the-llm)
8. [Guardrails — Before and After the AI](#8-guardrails--before-and-after-the-ai)
9. [Rate Limiting & Abuse Defence](#9-rate-limiting--abuse-defence)
10. [Languages](#10-languages)
11. [Observability & the FAQ Learning Loop](#11-observability--the-faq-learning-loop)
12. [Cost Engineering — the Full Picture](#12-cost-engineering--the-full-picture)
13. [Test Suites](#13-test-suites)
14. [File Inventory](#14-file-inventory)

---

## 1. What Chitra Is — and Deliberately Isn't

**Files:** `src/app/api/chat/route.ts` (the 10-rule system prompt)

Chitra is the studio's AI assistant. Her contract with the studio, encoded in
her system prompt and enforced in code:

| She IS | She is NOT |
|---|---|
| A warm guide to paintings, prices, availability, classes, events, commissions | A checkout — every buying/commission/registration intent is handed to **WhatsApp** with a pre-filled message |
| Strictly grounded in the **live site content** (`content/site.json`) | Free to invent prices, dates, artworks or availability |
| Multilingual (English, Hindi, Tamil, Telugu, Kannada, "Tanglish") | A general assistant — politics, coding, medical/legal/financial advice are refused |
| Honest about gaps — unknown fees are "confirmed personally on WhatsApp" | Pretending to be human — asked directly, she says she's the AI assistant |
| Cheap to run (see §12) | Allowed to discuss or compare rival artists' prices |

She is also **instantly up to date**: her knowledge is derived from the same
CMS file the site renders, and every admin publish drops her caches, so a
painting uploaded at 10:00 is in her answers at 10:01.

---

## 2. The Visitor Experience

**Files:** `src/components/chat/ChatWidget.tsx` (≈530 lines),
`DeferredChatWidget.tsx`, `sse.ts`

- A floating launcher button, **loaded lazily on idle** (or 2.5 s) so it never
  delays first paint; the panel opens into a compact chat with the studio's
  gold-on-velvet styling.
- Replies **stream in word-by-word** over Server-Sent Events — no spinner-then-wall-of-text.
- The server ships **structured metadata** the widget renders as UI, not text:
  a WhatsApp button with a pre-filled message when intent is detected
  (`[WA:…]` tag → `meta.wa`), a painting thumbnail when relevant (`[IMG:…]`),
  and a Google Maps link for directions questions (`[MAPS:…]`).
- The conversation is capped at 20 messages per session context (server trims
  gracefully rather than dead-ending older cached widgets).
- The widget speaks **one protocol** (the SSE event stream) whether the reply
  came from the AI, a guardrail refusal, or a cached answer — so behaviour is
  identical everywhere.

---

## 3. The Four-Layer Answer Pipeline

**File:** `src/app/api/chat/route.ts` (the `POST` handler, step-commented)

```
visitor message
   │
   ▼
[0] config gate — chatbot enabled? API key present? (else polite 503)
[1] body validation — shape, roles, 1000-char caps; history trimmed, not rejected
[2] INPUT GUARDRAILS — injection / banned / off-topic / gibberish filters (zero cost)
[3] ROUTER ──► Layer 1 preprogrammed  (0 AI requests)
            ──► Layer 2 admin FAQ     (0 AI requests)
            ──► Layer 4 LLM path:
[4] tight quota check (8/min, 40/day) → response cache lookup (fresh sessions)
[5] RAG retrieval — core facts + only relevant chunks (~1,400-token budget)
[6] OpenRouter call — primary model, automatic fallback model(s)
[7] stream relay + OUTPUT GUARDRAILS — sanitise, price-hallucination check,
    off-topic drift check → REPLACE the stream with a safe reply if violated
    → cache the sanitized success
```

The routing rule of thumb: **the cheapest layer that can answer well wins.**
Layers 1–3 answer the majority of real traffic; the AI is reserved for
questions that genuinely need synthesis.

---

## 4. Layer 1 — Preprogrammed Answers

**Files:** `src/lib/chatbot/lookup.ts` (≈714 lines), `src/lib/chatbot/router.ts`

Deterministic, CMS-derived answers for well-understood intents: greetings
(including **Tanglish** — *vanakkam*, *vaanga* — and fuzzy-typo tolerance via a
capped Levenshtein matcher), painting lookups **by name or by number**
("painting 12" — and the number matcher explicitly recognises common
**mistypings** of the word itself: *pantings*, *paintngs*, *paitings*,
*paintigs*…, so a clumsy visitor still lands on the right painting), price and
status questions, shipping, classes, commissions, artist background.

The router applies a **strictness layer** on top so canned answers never fire
wrongly:
- vague 1–2-word prompts ("tell me", "ok") fall through to the LLM;
- style/technique questions are never answered with a catalog dump;
- **multi-clause questions** ("Do you ship? I live in a small town") go to the
  LLM, which can address the nuance;
- ambiguous intent (a classes query that also mentions prices) goes to the LLM
  to arbitrate.

Lead-capture actions carry a `[WA:…]` tag that the route layer converts into
the widget's WhatsApp button.

---

## 5. Layer 2 — Admin FAQs

**File:** `src/lib/chatbot/router.ts` (`faqReply`)

The studio's curated Q&As (`content.chatbot.faqs`, edited in the admin
console) are matched by **token-overlap coverage ≥ 60 %** between the visitor's
question and the FAQ question, using the same tokenizer as the RAG index.
A **detail-escape hatch** sends price/comparison/schedule wording to the LLM
instead — the canned one-liner must never short-change a "how much, exactly"
question. Matched FAQs get a standard WhatsApp sign-off appended, and they are
*also* in the RAG corpus for related phrasings.

Every FAQ therefore works twice: as a zero-cost direct answer, and as retrieval
knowledge.

---

## 6. Layer 3 — The Response Cache

**File:** `src/lib/chatbot/responseCache.ts`

- Repeat questions (most chat traffic) replay stored replies: **zero** AI
  requests, zero latency variance.
- Keys are `normalize(question) | contentRevision | model | language-hint`,
  hashed; entries are LRU-ish with a 30-min TTL, 60-entry cap (both tunable by
  env var).
- **Correctness is never traded for savings:** entries are keyed to the CMS
  revision hash, so the moment content changes every cached answer is
  instantly invalid — plus a belt-and-braces explicit `invalidateResponseCache()`
  on every publish, so even a hypothetical hashing failure cannot serve a stale
  answer.
- Cache hits only apply to **fresh sessions** (≤2 messages): a repeat question
  deep inside a conversation may depend on earlier turns and is re-answered.

---

## 7. Layer 4 — RAG + the LLM

**Files:** `src/lib/chatbot/rag/index.ts`, `src/lib/chatbot/rag/bm25.ts`,
`src/lib/chatbot/context.ts`

**Why lexical RAG instead of vector embeddings:** the corpus is tiny
(~100–200 chunks from one JSON file), studio queries are keyword-heavy
("painting 12 price", "class fees"), scoring is sub-millisecond and in-memory,
and there is no embeddings provider to fail or pay for. This is the correct
engineering choice at this scale, not a compromise.

**Chunking:** the CMS is chunked once **per content revision** (FNV-1a hash
memoisation) into typed chunks — one per painting (title, price, status,
medium, dimensions, description), one per event, one per FAQ, plus fixed
chunks for classes, artist bio, awards, exhibitions, outreach, commissions,
business/social, and a hand-built **CORE chunk** that always travels: catalog
counts, price range, available/sold split, next event headline, class program
names, contact and shipping facts. Range questions ("what's the cheapest
painting?") are answered by the CORE chunk alone.

**Retrieval:** BM25 scoring (k1=1.5, b=0.75) over an inverted index, with:
- **type boosts** matched to query intent (price words boost painting+core
  ×1.5; class words boost classes ×1.4; etc.);
- **keyword hits** on raw query text (+2.5, catching exact titles);
- **forced numeric lookup** — "painting 7" pins the exact chunk regardless of
  BM25, because the tokenizer deliberately drops single digits;
- a **~1,400-token budget** (tunable) with core-always-first assembly, grouped
  by type. Failure of retrieval falls back to the full context builder —
  retrieval must never break the chat.

**Net effect:** each AI request carries roughly **60–70 % fewer context
tokens** than the naive full-document prompt, directly stretching the free
quota.

**The LLM call:** OpenRouter chat-completions, `stream: true`,
temperature 0.4, max 900 output tokens; the **primary model and fallback
model(s) are env-configured** and tried in order (free-tier model IDs ship as
defaults; swapping models needs zero code changes). History is trimmed to the
last 6 messages, each capped at 400 chars. If every model fails, the visitor
gets an honest, friendly retry message plus the WhatsApp escape hatch — never
a dead end.

---

## 8. Guardrails — Before and After the AI

**File:** `src/lib/chatbot/guardrails.ts`

### Input filters (run *before* any AI call — zero cost)
- **Prompt-injection filter:** 12 heuristics — "ignore all previous
  instructions", "reveal your system prompt", persona overrides ("you are now
  a…"), DAN/jailbreak, developer/admin/god mode, "respond only in JSON",
  repeat-everything-above exfiltration.
- **Banned-topic hard refusals:** sexual content, hacking/malware, weapons &
  drug manufacturing, self-harm, financial-crime requests (fake IDs, money
  laundering).
- **Off-topic gate (low-noise design):** fires only when a message matches a
  known non-studio topic (weather, cricket, movies, recipes, stocks, coding,
  general knowledge…) **and** contains no art/studio vocabulary — so "You are
  such a great studio! What are your timings?" passes, while "who will win the
  election?" is refused. Genuine art questions always get through.
- **Gibberish rejection:** keyboard mashes, `aaaaaaa`, emoji-only input are
  refused locally. Deliberately conservative: one real word anywhere passes;
  non-Latin scripts always pass; vowel-less real words (rhythm, gym) are
  whitelisted; elongated real expressions (hmmmm, okkk) are allowed.
- Every refusal is a **warm, branded message** that steers back to paintings,
  classes, events and WhatsApp.

### Output filters (run *after* the model replies)
- **Phone-number sanitiser:** any phone-like number that isn't the studio's own
  is replaced with "[contact via WhatsApp]" — injected numbers cannot leak
  into replies.
- **URL allowlist:** only studio-approved hosts (wa.me, Google Maps, the
  studio's own pages and social profiles) survive; all other links are stripped.
- **Price-hallucination detector:** every `₹` figure in the reply is checked
  against the live context (both raw and `en-IN` formatted); a single unknown
  price triggers a **full replacement** of the streamed reply with a safe
  response — the visitor never sees the hallucinated text.
- **Drift detector:** "as an AI language model…", financial/medical/legal
  disclaimers, stock/crypto talk → replaced.
- Because streaming already showed partial text, violations emit an SSE
  **`replace`** event — the widget swaps the whole bubble, so a bad reply is
  retracted, not appended to.

---

## 9. Rate Limiting & Abuse Defence

**File:** `src/lib/chatbot/rateLimit.ts`

Two independent sliding-window limiters per client IP (first `x-forwarded-for`
hop), with memory pruning:

| Limiter | Limits | Applies to | Rationale |
|---|---|---|---|
| Free-layer cap | **30/min · 240/day** | all chat traffic | Deterministic answers cost nothing — good-faith visitors get headroom; scrapers get a soft stop. |
| AI cap | **8/min · 40/day** | only when the router escalates to the LLM | Protects the OpenRouter quota; FAQ/cache/preprogrammed answers never consume it. |

Blocked requests return HTTP 429 with `Retry-After` and a friendly message
pointing at WhatsApp. Combined with the free layers, a single visitor cannot
drain the daily AI budget alone.

---

## 10. Languages

**Files:** `src/app/api/chat/route.ts` (`languageHint`),
`src/lib/chatbot/lookup.ts` (`detectTanglish`)

- **Script detection** (Devanagari, Tamil, Telugu, Kannada Unicode ranges)
  appends an explicit instruction to the system prompt: *reply in the
  visitor's language*.
- **"Tanglish"** (Tamil written in Latin letters — *vanakkam*, *nandri*,
  *theriyuma*) is detected by whole-word matching in the deterministic layer,
  which greets visitors in kind.
- Rule 7 of the system prompt: reply in the language the visitor wrote in.
- The language hint is part of the cache key, so a Hindi question and an
  English question never collide.

---

## 11. Observability & the FAQ Learning Loop

**Files:** `src/lib/chatbot/queryLog.ts`, `src/app/api/chatbot-queries/route.ts`

- Every question that falls through to the LLM is logged **in memory only**
  (cap 500, resets on deploy; greetings/one-worders excluded) — no visitor text
  is persisted anywhere, which is a privacy feature.
- `GET /api/chatbot-queries` (admin-session required) clusters the log by
  normalised text over a configurable window (1–168 h) and returns the top 50
  clusters with counts.
- **The loop:** admin reads clusters → writes FAQs for the frequent ones in
  the admin console → those questions now answer at Layer 2 forever, at zero
  AI cost. The system demonstrably gets cheaper and better with use.

---

## 12. Cost Engineering — the Full Picture

Chitra runs on **free-tier AI models** via OpenRouter, and the architecture is
engineered to keep it that way:

1. **Deterministic layers first** — greetings, known intents, admin FAQs and
   cached answers carry zero AI cost. Real traffic is majority-covered here.
2. **Response cache** — repeat questions are free; revision-keyed so freshness
   is never sacrificed.
3. **RAG token discipline** — ~1,400 context tokens per call instead of the
   full ~2,500+ token document; smaller prompts are cheaper and faster on free
   models with small context windows.
4. **Hard per-visitor caps** — 40 AI messages/day max, 8/min burst.
5. **Model fallbacks** — if the primary free model is down or rate-limited
   upstream, the fallback takes over automatically instead of erroring.

Escalation path if the studio ever outgrows free tiers: set a paid model in
`OPENROUTER_MODEL`. No code changes. Every knob (`CHATBOT_RAG_TOP_K`,
`CHATBOT_RAG_TOKEN_BUDGET`, `CHATBOT_CACHE_TTL_SECONDS`,
`CHATBOT_CACHE_MAX_ENTRIES`, fallback list) is an environment variable.

---

## 13. Test Suites

**Files:** `scripts/test-chatbot.ts` (602 lines, unit),
`scripts/e2e-chat.ts` (230 lines, real HTTP), `scripts/ask-chat.ts` (manual CLI)

### `npm run test:chat` — unit suite (no server needed)
- **Context builder:** live CMS reflection (paintings, ₹-formatted prices,
  sold/available statuses, upcoming + past events, FAQs, artist bio, exam
  coaching) and compactness (<14 k chars); memoisation per revision.
- **Input guardrails:** whitespace normalisation; empty/too-long rejection;
  classic injection and persona-override capture; benign "you are…" phrasing
  passes; banned topics; off-topic refused *unless* art lexicon present;
  gibberish matrix (mash, `aaaaaaa`, emoji-only refused; `hmmmm`, Tamil,
  digit-IDs pass).
- **Output guardrails:** foreign phone numbers neutralised, studio's kept;
  non-allowlisted URLs stripped; empty-markdown-link cleanup; price-drift
  detection (known prices pass, invented ₹ figures trip it); drift phrases.
- **Router:** greeting/vague/painting-lookup/FAQ-coverage/detail-escape
  routing decisions.
- **Rate limiter:** minute and day windows, `Retry-After` maths, pruning.
- **Lookup extras:** Tanglish detection, fuzzy title matching, WhatsApp tag
  building; **query log:** clustering, windowing, skip-rules.

### `npm run test:e2e` — end-to-end (against a running server)
Speaks the real protocol as a browser would: SSE event sequences
(`start/meta/delta/done`), `X-ChatLayer` header routing (guardrail /
preprogrammed / faq / cached / llm), meta payloads (WhatsApp link, RAG chunk
counts), refusals-over-SSE, 429 + `Retry-After` behaviour, history-trimming
tolerance. The LLM-path cases require `OPENROUTER_API_KEY` in the server env;
every other layer is verified without it.

---

## 14. File Inventory

```
src/app/api/chat/route.ts          The pipeline: validation → guardrails → router
                                   → cache → RAG → OpenRouter → output filters → SSE
src/app/api/chatbot-queries/       Admin-only FAQ-mining endpoint
src/components/chat/ChatWidget.tsx Visitor UI: streaming, buttons, history
src/components/chat/DeferredChatWidget.tsx  Idle-time lazy loading
src/components/chat/sse.ts         Minimal SSE parser
src/lib/chatbot/router.ts          Layer decision (preprogrammed | faq | llm)
src/lib/chatbot/lookup.ts          Deterministic intents, fuzzy/tanglish/number matching
src/lib/chatbot/guardrails.ts      Input + output filters, refusal copy
src/lib/chatbot/responseCache.ts   Revision-keyed reply cache
src/lib/chatbot/rateLimit.ts       Dual sliding-window limiters
src/lib/chatbot/queryLog.ts        In-memory LLM-question log + clustering
src/lib/chatbot/context.ts         Full-context builder (fallback path) + revision hash
src/lib/chatbot/rag/index.ts       Chunker, type boosts, budget assembly
src/lib/chatbot/rag/bm25.ts        Dependency-free BM25 + tokenizer/stemmer
scripts/test-chatbot.ts            Unit suite (602 lines)
scripts/e2e-chat.ts                HTTP/SSE end-to-end suite
scripts/ask-chat.ts                Manual question CLI for spot checks
```

*Companion documents: `../PROOF_OF_WORK.md` (master report) ·
`POW_ADMIN_CMS.md` (admin portal & CMS deep-dive).*
