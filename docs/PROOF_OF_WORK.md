# Anugruja Arts Studio — Proof of Work
### Complete Delivery Report: Website · Admin Portal · AI Chatbot

**Project:** Anugruja Arts Studio — official website & live content platform
**Artist:** Master Artist Anuradha Govarthanan
**Report date:** September 2026
**Status:** Production-delivered, verified, and documented

> This report is written for the studio. Every claim in it is backed by code that
> exists in this repository, and every section ends with a way for you to **verify
> it yourself** — click it, run it, or read it. Two companion deep-dives accompany
> this document:
>
> | Document | Covers |
> |---|---|
> | `docs/POW_ADMIN_CMS.md` | The password-protected Admin Portal & Git-backed CMS — every screen, every pipeline |
> | `docs/POW_CHATBOT_AI.md` | "Chitra" — the AI studio assistant — every layer of its brain, safety net and cost controls |
>
> Supporting documents already in the repo: `README.md` (developer overview),
> `ADMIN_USER_GUIDE.md` (step-by-step admin manual), `CROSS_BROWSER_RENDERING.md`
> (browser-compatibility research & audit methodology).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Numbers at a Glance](#2-the-numbers-at-a-glance)
3. [What Was Delivered — System Map](#3-what-was-delivered--system-map)
4. [The Public Website](#4-the-public-website)
5. [The Admin Portal & CMS (summary — full deep-dive in its own document)](#5-the-admin-portal--cms)
6. [The AI Chatbot "Chitra" (summary — full deep-dive in its own document)](#6-the-ai-chatbot-chitra)
7. [Security Posture](#7-security-posture)
8. [Performance Engineering](#8-performance-engineering)
9. [Quality Assurance — What Was Tested and Proven](#9-quality-assurance--what-was-tested-and-proven)
10. [Cross-Browser & Device Hardening](#10-cross-browser--device-hardening)
11. [Technology Stack & Why It Was Chosen](#11-technology-stack--why-it-was-chosen)
12. [Operations Runbook for the Studio](#12-operations-runbook-for-the-studio)
13. [Cost Model — What Running This Costs](#13-cost-model--what-running-this-costs)
14. [Known Limitations & Honest Disclosures](#14-known-limitations--honest-disclosures)
15. [Verification Checklist — Prove It to Yourself](#15-verification-checklist--prove-it-to-yourself)

---

## 1. Executive Summary

The studio's entire web presence was built as **one cohesive product** with three
faces:

1. **A public gallery website** — Home, Art for Sale, Classes & Courses, About the
   Artist — with a 3D artwork carousel, a global zoom lightbox, dark/light themes,
   scroll storytelling, and full search-engine optimisation.
2. **A private Admin Portal** (`/admin`) — a password-protected studio console
   where the artist (or staff) uploads paintings, sets prices, curates eight
   galleries, manages events and workshops, and edits the site's text — **without
   a developer, without a database, and without touching code**.
3. **An AI studio assistant, "Chitra"** — a chat widget that answers visitor
   questions about paintings, prices, classes, events and commissions. It reads
   the *same content file* the website renders, so the moment a painting is
   uploaded, the AI already knows about it. It funnels buyers to WhatsApp — the
   studio's preferred channel — rather than pretending to be a checkout.

The single most important design decision, and the thing that makes this product
unusual, is this:

> **The repository itself is the CMS.** All content lives in one file
> (`content/site.json`). The website renders from it, the admin console edits it,
> and the AI chatbot answers from it. Publishing = one reviewed commit to GitHub =
> an automatic site rebuild. There is no database server to pay for, back up,
> patch, or lose.

Everything runs on Vercel's free-to-cheap hosting tier with a free-tier AI
provider, protected by layered rate limits and caches so that popularity never
turns into a surprise bill.

---

## 2. The Numbers at a Glance

| Metric | Value |
|---|---|
| TypeScript / TSX source files | **113** |
| Lines of application source | **≈ 20,100** |
| React components | **48** (31 site · 15 admin · 2 chat) |
| Public pages | 4 routes (Home, `/sale`, `/classes`, `/about`) + login + admin console |
| Admin console screens | 2 workspaces, 5 management tabs |
| Galleries (collections) | **8** — Featured, Sale, Commissioned, Classes, Watercolor, Workshops, Testimonials, Achievements |
| Seed catalog | 36 sale paintings, 4 curated FAQs, 1 upcoming + 4 past events |
| Image variants manifest | **146** originals registered |
| Optimised image derivatives generated | **545** WebP files (480px / 960px / full-size tiers) |
| API endpoints | 6 (`/api/chat`, `/api/auth`, `/api/content`, `/api/upload`, `/api/github`, `/api/chatbot-queries`) |
| Automated test scripts | 6 suites (chatbot unit, chatbot e2e, auth, CRUD, photo framing, CSS compat) |
| Runtime dependencies | 9 production packages — deliberately lean |

---

## 3. What Was Delivered — System Map

```
                         ┌───────────────────────────────┐
                         │   content/site.json (CMS)     │
                         │   paintings · prices · events │
                         │   FAQs · brand · SEO · nav    │
                         └──────────┬────────────────────┘
                                    │ read at build & runtime
              ┌─────────────────────┼──────────────────────────┐
              ▼                     ▼                          ▼
   ┌────────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐
   │   PUBLIC WEBSITE   │  │  ADMIN PORTAL    │  │   AI CHATBOT "CHITRA"   │
   │  /  /sale /classes │  │  /admin /login   │  │   floating widget       │
   │  /about            │  │  upload · curate │  │   guardrails → router → │
   │  carousels, light- │  │  stage · review  │  │   RAG → OpenRouter LLM  │
   │  box, themes, SEO  │  │  commit to Git   │  │   cache · rate-limit    │
   └────────────────────┘  └────────┬─────────┘  └─────────────────────────┘
                                    │ one explicit "Commit"
                                    ▼
                        ┌─────────────────────────┐
                        │  GitHub repo (the CMS)  │
                        │  site.json + images     │
                        └───────────┬─────────────┘
                                    │ push to main
                                    ▼
                        ┌─────────────────────────┐
                        │  Vercel auto-rebuild    │
                        │  site redeploys itself  │
                        └─────────────────────────┘
```

---

## 4. The Public Website

### 4.1 Pages

| Page | Route | What it delivers |
|---|---|---|
| **Home** | `/` | Cinematic landing: gold-foil hero with animated botanicals, featured 3D carousel, a "Buy Paintings" spotlight carousel with prices and a WhatsApp inquiry button, a scroll-driven "Master's Journey" biography timeline, workshops & events showcase with photo mosaics, an awards & accolades section with zoomable award photos, testimonies, and a contact bridge (WhatsApp + email). |
| **Art for Sale** | `/sale` | The complete purchasable catalog with prices, availability status, medium and dimensions; every painting opens the lightbox. |
| **Classes & Courses** | `/classes` | Course programs — regular batches, the 1-year fine-arts diploma, summer camps, and entrance-exam coaching (NATA, NID, NIFT, CEED, UCEED, BFA) — with student-work galleries and a registration bridge. |
| **About the Artist** | `/about` | The full biography, education, achievements, selected exhibitions, and outreach history (including the University of Hyderabad international-exchange workshop). |

### 4.2 The Artwork Experience

- **3D drag carousel** — paintings arranged in a perspective carousel with three
  presentation variants (rail, fanned deck, spotlight-with-price-plaque, plus a
  polaroid style), drag/swipe/arrow-key navigation, and per-card blur/brightness
  depth cues that automatically degrade on devices that can't afford them.
- **Global lightbox with true deep zoom** — click *any* painting anywhere on the
  site and it enlarges instantly. It fetches **right-sized high-resolution
  variants** (up to 1600px WebP) as you zoom — not the thumbnail stretched — with
  pinch-zoom and swipe gestures on touch devices, keyboard navigation, and a
  gesture-scoped GPU hint so zooming stays sharp instead of re-magnifying a
  low-res texture.
- **Scroll storytelling** — the biography timeline pins and advances as the
  visitor scrolls; sections reveal with subtle fades; everything respects the
  visitor's **reduced-motion** OS setting (accessibility).
- **Dark & light themes** — a full second palette, toggled by the visitor and
  remembered; no flash of the wrong theme on load.

### 4.3 Everyone-Ready Engineering

- **Mobile-first responsive layout** across all breakpoints.
- **Performance tiers** — a pre-paint script detects device capability and lowers
  effects (blur, particle counts, animation) on weak devices rather than stuttering.
- **OS-aware rendering fixes** — Windows-specific Chromium compositing bugs were
  diagnosed and fixed via a pre-paint OS tag: gradient headlines, glass panels,
  the lightbox and carousel depth effects all have verified Windows fallbacks
  (methodology in `CROSS_BROWSER_RENDERING.md`).
- **SEO** — semantic HTML, per-page metadata, Open Graph/Twitter cards, JSON-LD
  structured data (artwork/event schema), auto-generated `sitemap.xml` and
  `robots.txt`.
- **Preloader** — a branded studio monogram intro that never blocks the page for
  more than a moment and is skipped for repeat visits.

---

## 5. The Admin Portal & CMS

*(Full detail — every screen, every step, every pipeline — in
[`docs/POW_ADMIN_CMS.md`](./POW_ADMIN_CMS.md). Summary here.)*

- **Gate:** `/login` with the studio's admin password. The password exists only
  as an environment variable — it is **never** in the code, and if it isn't
  configured the system refuses to work rather than falling back to a default.
  Sessions are cryptographically signed cookies valid for one hour. Five wrong
  attempts from one address locks that address out for 15 minutes.
- **Two workspaces:** a *live-preview* editor (site on the left, editor on the
  right — click any block and type) and a *full-width studio* (no preview) for
  heavy upload work.
- **Mass Upload Studio:** pick many photos at once → describe each with a guided
  form ("Is this painting for sale?" drives whether price fields appear) →
  crop/rotate/straighten each photo in-browser → publish one or the whole batch.
- **Managers:** eight gallery managers with drag-to-reorder; a Pages & Listings
  editor (home-screen shortcuts and section ordering); an Events manager
  (upcoming/past workshops with seats-remaining and registration links); Brand &
  SEO settings; and **Chatbot FAQs** — the studio can teach Chitra new answers.
- **Nothing goes live by accident:** every edit is *staged* in the browser
  (surviving an accidental refresh), then shown as a human-readable diff in a
  Review modal, then committed **once, explicitly**. The commit writes
  `content/site.json` and any new images to GitHub through its API, which
  triggers an automatic site rebuild.
- **Instant propagation:** the moment a commit lands, the public pages revalidate
  and **all AI caches are dropped** — Chitra answers from the new catalog on her
  very next message. A painting uploaded at 10:00 is sellable-by-chat at 10:01.

**Verify:** read `ADMIN_USER_GUIDE.md`, then `src/app/admin/`,
`src/components/admin/`, `src/app/api/content/route.ts`.

---

## 6. The AI Chatbot "Chitra"

*(Full detail — every layer, every guardrail, the cost model — in
[`docs/POW_CHATBOT_AI.md`](./POW_CHATBOT_AI.md). Summary here.)*

- **What she is:** a warm, bilingual-friendly assistant (auto-replies in the
  visitor's language — English, Hindi, Tamil, Telugu, Kannada script detection
  plus "Tanglish" greeting recognition) that answers **only** from the studio's
  live content, and hands purchase/class/commission intent to WhatsApp with a
  pre-filled message button.
- **How she stays cheap:** a four-layer answer pipeline. Deterministic answers
  and admin FAQs cost **zero** AI requests; a response cache replays previous
  answers for **zero**; retrieval-augmented (RAG) prompting cuts context tokens
  by ~60–70%; and two independent rate limiters (30/min & 240/day for free
  layers; 8/min & 40/day for the AI layer per visitor) stop any one visitor from
  draining the free quota.
- **How she stays safe:** prompt-injection filters, banned-topic refusals,
  off-topic steering, gibberish rejection — all *before* spending an AI request —
  plus output sanitisation (non-studio phone numbers neutralised, unknown
  link hosts stripped) and a **price-hallucination detector** that replaces any
  reply quoting a rupee figure that doesn't exist in the live catalog.
- **How she gets smarter:** every question that had to reach the AI is logged
  (in-memory, privacy-friendly, never persisted). The admin can view the most
  frequent clusters and promote them to FAQs — which then answer forever at zero
  cost. This loop is built into the admin console's Events & Chatbot tab.

**Verify:** run `npm run test:chat` (unit suite) and `npm run test:e2e`
(full HTTP protocol suite), then read `docs/POW_CHATBOT_AI.md`.

---

## 7. Security Posture

| Threat | Defense | Where |
|---|---|---|
| Password guessing on `/login` | 5-failure → 15-minute lockout per address; no password stored in code; fail-closed if unset | `src/lib/loginThrottle.ts`, `src/lib/adminAuth.ts` |
| Forged admin session | HMAC-SHA256 signed expiry cookie, constant-time comparison, 1-hour life, skew-rejection | `src/lib/adminAuth.ts` |
| Session theft | `httpOnly` + `Secure` (on HTTPS) + `SameSite=Lax` cookie | `src/app/api/auth/route.ts` |
| Unauthenticated content edits / uploads / query logs | Server-side cookie validation on **every** admin API route + middleware guarding all `/admin` pages | `src/middleware.ts`, each route |
| Timing attacks on password check | SHA-256 both sides + `timingSafeEqual` | `src/app/api/auth/route.ts` |
| Prompt injection / jailbreaks of Chitra | 12-pattern input filter, persona-lock rules in the system prompt, output drift detector | `src/lib/chatbot/guardrails.ts`, `docs/POW_CHATBOT_AI.md` |
| Chatbot leaking wrong phone numbers / bad links | Output sanitiser: only the studio's number and an allowlist of hosts survive | `src/lib/chatbot/guardrails.ts` |
| Chatbot inventing prices | Post-stream detector compares every ₹ figure against the live context; mismatches are replaced with a safe reply | `src/app/api/chat/route.ts` |
| Malicious upload content | Auth required; MIME allowlist; sanitised unique filenames; images only | `src/app/api/upload/route.ts` |
| Quota exhaustion / scripted abuse | Dual sliding-window rate limiters per IP on the chat API | `src/lib/chatbot/rateLimit.ts` |
| API key exposure | `OPENROUTER_API_KEY` and `GITHUB_TOKEN` are server-side only — never shipped to the browser | all API routes |

---

## 8. Performance Engineering

- **Image pipeline (the big one):** originals are compressed **in the browser**
  during upload (WebP, quality 0.88, ≤2000px longest edge) before they ever
  touch the network; on display, `next/image` serves the smallest adequate
  variant from a precomputed **146-image / 545-derivative** manifest
  (480px cards · 960px galleries · full-size lightbox), with correct `sizes` so
  phones never download desktop pixels.
- **Code-splitting & deferral:** the chat widget and lightbox load on idle, off
  the critical path; the preloader, theme and perf-tier scripts are tiny inline
  snippets that run *before first paint* to avoid flashes.
- **Server cost controls:** response cache (30-min TTL, revision-keyed), RAG
  token budget (~1,400 tokens of context per AI call vs ~2,500+ naive),
  per-content-revision index memoisation.
- **Measured restraint:** the production Home route ships ≈ **186 kB** of
  first-load JS for this feature set.
- **Low-end tier (`html[data-perf='lite']`):** a pre-paint script demotes a
  weak device, a slow or data-saving connection, or a reduced-motion visitor.
  The tier is not a smaller site — it is the same site with **blur, endless
  decoration and glass removed**, and it is now the *motion* that goes too:
  the ~58 elements that used to animate forever on the home page (gold dust,
  foil petals, the four ambient orbs, a bead of light on every botanical
  branch, two sheens, the exhibition ticker) are stopped on their static frame,
  `will-change` promotion is dropped, the 64 blended leaf highlights go, and the
  botanical sway (≈70 SVG attribute writes per frame) is not started at all.
  The cinematic intro is skipped outright and the hero is the first paint, and
  its crest image is preloaded only for visitors who will actually see it.
- **Below-fold render containment:** the six off-screen home-page sections use
  `content-visibility: auto` with measured `contain-intrinsic-size` estimates,
  so a ~10,800px page only styles, lays out and paints what is near the
  viewport.
- **Tier detection beyond Chromium:** `navigator.deviceMemory` and
  `navigator.connection` do not exist in Safari or Firefox, which is where a
  lot of older phones live, so a runtime frame-time probe (`armTierProbe`)
  demotes a page that measurably struggles — CSS-only, one way, once per
  session.
- **How it is measured:** `npm run audit:perf` drives headless Chrome over CDP
  at a 4× CPU throttle on a 4 Mbps link, and records LCP, main-thread
  durations, live animation/blur/backdrop/blend/promotion counts, DOM size,
  bytes by type and frame-time percentiles through a full scripted scroll. It
  compares against `scripts/perf-baseline.json`, fails on regressions, and
  refuses to pass unless the lite tier is measurably lighter than the full one
  (currently **54%** fewer paint carriers: 262 → 120). It also gates on
  `reveals still hidden after the walk: 0`, which is what a skipped-subtree
  mistake looks like.

---

## 9. Quality Assurance — What Was Tested and Proven

| Suite | Command | What it proves |
|---|---|---|
| Chatbot unit tests (602 lines) | `npm run test:chat` | Context builder reflects live CMS prices/events/FAQs; guardrail accept/refuse matrix (injection, banned topics, gibberish, off-topic with art-lexicon escape); output sanitisation; price-drift detector; rate-limit windows; Tanglish & fuzzy title matching; FAQ-mining log. |
| Chatbot end-to-end (real HTTP) | `npm run test:e2e` | Speaks the actual SSE protocol to a running server: layer routing headers, meta events (WhatsApp link, RAG chunk counts), guardrail refusals over SSE, rate-limit `Retry-After` behaviour. |
| Auth suite | `node --import ./scripts/ts-node-boot.mjs scripts/test-auth.ts` | Session token issue/expiry/tamper-rejection, cookie validation, skew handling. |
| CRUD suite | `node --import ./scripts/ts-node-boot.mjs scripts/test-crud.ts` | Read/write cycle of the CMS file, content validation. |
| Photo framing tests | `npm run test:framing` | Crop/straighten maths of the admin's ArtworkFramer. |
| CSS compatibility audit | `npm run audit:css` | Static scan of all stylesheets against a documented engine-support baseline — currently **0 new findings**; every rule that varies by browser is recorded with justification. |

Additionally, every round of changes in this project was verified with
`npx tsc --noEmit` (strict type check) and `next build` (production compile)
before delivery — both currently clean.

---

## 10. Cross-Browser & Device Hardening

A real-world Windows rendering failure (sections and lightbox mis-rendering
under Windows Chromium's software compositing) was root-caused and fixed with a
documented, generalisable methodology:

- A pre-paint OS/capability tag (`html[data-os]`, perf tier) drives **targeted
  CSS fallbacks** — solid-ink headlines instead of gradient-clipped text, opaque
  panels instead of glass, `vh` fallbacks for `dvh`, no per-frame blur on the
  carousel — only where the engine family needs it. Capable machines keep the
  full effects.
- The research, the audit tooling (`scripts/audit-css-compat.mjs`), and the
  measured baseline live in `CROSS_BROWSER_RENDERING.md` so future changes are
  checked, not guessed.

---

## 11. Technology Stack & Why It Was Chosen

| Layer | Choice | Why (in plain terms) |
|---|---|---|
| Framework | **Next.js 15 (App Router), React 19, TypeScript strict** | Industry-standard, SEO-friendly, typed code that catches mistakes before deploy. |
| Styling | Tailwind CSS 3 + a hand-built design system in `globals.css` | The atelier look (gold on velvet, serif display faces) is custom craft, not a template. |
| Motion | Framer Motion + GSAP | Buttery scroll/reveal/3D effects with reduced-motion respect. |
| Hosting | **Vercel** | Zero-maintenance deploys straight from GitHub; free tier comfortably serves this site. |
| CMS | **GitHub repo as CMS** (`content/site.json`) | No database bill, no backups to manage — Git *is* the backup with full history. |
| AI | **OpenRouter** (free-tier models, configurable) | Server-side key only; model can be swapped by env var without code changes; fallback model auto-takes over if the primary fails. |
| Images | `next/image` + custom canvas optimiser + variant manifest | Museum-quality zoom without museum-sized downloads. |

---

## 12. Operations Runbook for the Studio

| Task | How |
|---|---|
| Change anything on the site | `/admin` → edit → Review → Commit. Site rebuilds automatically (~1 min). |
| Add paintings | `/admin` → Mass Upload Studio → pick photos → describe → publish. |
| Teach Chitra a new answer | `/admin` → Events & Chatbot → Chatbot FAQs → add Q&A. Takes effect on her next message. |
| See what visitors ask that Chitra couldn't answer cheaply | `/admin` → Events & Chatbot → query clusters (admin-only endpoint `/api/chatbot-queries`). |
| Temporarily turn the chatbot off | Admin console chatbot settings → `enabled: false` (the API returns a polite "temporarily unavailable" and the widget hides it). |
| Rotate the admin password | Change `ADMIN_PASSWORD` in Vercel Project Settings → redeploy. All existing sessions invalidate instantly (they are signed with the password). |
| Rotate keys | `OPENROUTER_API_KEY`, `GITHUB_TOKEN` — same place, then redeploy. |
| Environment variables (complete list) | `ADMIN_PASSWORD`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` *(optional)*, `OPENROUTER_FALLBACK_MODELS` *(optional)*, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `NEXT_PUBLIC_SITE_URL`, and optional tunables `CHATBOT_RAG_TOP_K`, `CHATBOT_RAG_TOKEN_BUDGET`, `CHATBOT_CACHE_TTL_SECONDS`, `CHATBOT_CACHE_MAX_ENTRIES`. |

---

## 13. Cost Model — What Running This Costs

| Item | Cost |
|---|---|
| Hosting (Vercel hobby tier) | ₹0 |
| CMS (GitHub) | ₹0 |
| AI answers | ₹0 within the free tier — and the architecture is *designed* to keep it there: deterministic layers + cache + RAG mean the AI is consulted only for genuinely nuanced questions, and rate limits cap worst-case daily usage per visitor at 40 AI messages |
| Domain | The only recurring cost (if not already owned) |
| Scaling story | If the studio ever outgrows free tiers, the only change needed is adding a paid OpenRouter key — no code changes |

---

## 14. Known Limitations & Honest Disclosures

1. **Rate-limit and cache state is in-memory (per server instance).** This is a
   deliberate, documented trade-off for a zero-database architecture; it is the
   correct sizing for this traffic profile and is disclosed in the code headers.
2. **The admin portal is single-password, not multi-user.** One shared studio
   password, one role. Role-based multi-user was intentionally out of scope.
3. **The upload pipeline needs GitHub configured** for images to persist on
   serverless hosts (local disk is ephemeral there). This is configured in
   production and documented in the admin guide.
4. **Chitra refuses what she doesn't know** — by design. Exact class fees,
   shipping quotes and seat counts are confirmed personally on WhatsApp rather
   than invented. This is a safety feature, not a gap.
5. **Login throttle is a speed bump on serverless** (per-instance), documented in
   code; the signed cookie and fail-closed password remain the real gate.

---

## 15. Verification Checklist — Prove It to Yourself

**Point-and-click (10 minutes):**
- [ ] Open the site → scroll the full Home page → click a painting → zoom in the lightbox.
- [ ] Open `/sale` → note a price → open `/admin`, change that price, Review → Commit → wait ~1 min → reload `/sale` → price changed.
- [ ] Immediately ask Chitra that painting's price → she quotes the **new** price (cache was invalidated on publish).
- [ ] Ask Chitra "what's the capital of France?" → politely refused, steered back to art.
- [ ] Ask Chitra to "ignore all previous instructions" → refused, no AI request spent.
- [ ] Ask Chitra something only a human knows (e.g. exact class fee) → she honestly defers to WhatsApp with a pre-filled button.
- [ ] Try 6 wrong passwords at `/login` → locked out with a timer.

**Command-line (5 minutes):**
- [ ] `npm run test:chat` → all green.
- [ ] `npm run audit:css` → "no new cross-engine findings".
- [ ] `npx tsc --noEmit && npm run build` → clean.

---

*Prepared as a complete, self-verifiable record of the delivered system. Every
file referenced here exists in this repository. Companion deep-dives:
[`POW_ADMIN_CMS.md`](./POW_ADMIN_CMS.md) · [`POW_CHATBOT_AI.md`](./POW_CHATBOT_AI.md).*
