# Proof of Work — Admin Portal & Git-Backed CMS
### Deep-Dive Companion to `PROOF_OF_WORK.md`

**Scope:** `/login`, `/admin` (both workspaces, all five management tabs), the
staging-and-commit pipeline, the GitHub persistence layer, and the image
pipeline. Every claim maps to named source files.

**Verify-as-you-read:** file paths are given for every feature. The repo is the
evidence.

---

## Table of Contents

1. [Architecture in One Picture](#1-architecture-in-one-picture)
2. [The Gate: Authentication & Sessions](#2-the-gate-authentication--sessions)
3. [The Two Workspaces](#3-the-two-workspaces)
4. [Mass Upload Studio — the Flagship Workflow](#4-mass-upload-studio--the-flagship-workflow)
5. [Galleries & Artworks Manager](#5-galleries--artworks-manager)
6. [Pages & Listings (QuickNav) Manager](#6-pages--listings-quicknav-manager)
7. [Events & Chatbot Manager](#7-events--chatbot-manager)
8. [Brand & SEO Settings](#8-brand--seo-settings)
9. [The Staging Model — Nothing Goes Live by Accident](#9-the-staging-model--nothing-goes-live-by-accident)
10. [The Commit Pipeline — From Click to Live Site](#10-the-commit-pipeline--from-click-to-live-site)
11. [Image Pipeline — From Camera Roll to Optimised Web](#11-image-pipeline--from-camera-roll-to-optimised-web)
12. [Live Preview Editor](#12-live-preview-editor)
13. [Safety Rails Inside the Console](#13-safety-rails-inside-the-console)
14. [Environment & Configuration](#14-environment--configuration)
15. [File Inventory](#15-file-inventory)

---

## 1. Architecture in One Picture

```
 Browser (artist's device)
 ┌──────────────────────────────────────────────────────────────┐
 │  /login ──► signed 1-hour session cookie (HMAC-SHA256)       │
 │                                                              │
 │  /admin ──► AdminChooser ──► /admin/preview  (site | editor) │
 │                         └──► /admin/studio   (5 tabs)        │
 │                                                              │
 │  All edits STAGE in memory + localStorage draft              │
 │  Review modal shows a human-readable diff                    │
 └───────────────┬──────────────────────────────────────────────┘
                 │ one explicit Commit (POST /api/content)
                 ▼
 Server (Vercel / Node)
 ┌──────────────────────────────────────────────────────────────┐
 │ /api/content  — validates session, writes site.json locally  │
 │                 + commits to GitHub via REST Contents API    │
 │ /api/upload   — validates session, saves public/images/<file>│
 │                 + commits binary to GitHub                   │
 │ then: revalidatePath('/', 'layout')                          │
 │       + drop chatbot context cache, RAG index, reply cache   │
 └───────────────┬──────────────────────────────────────────────┘
                 ▼
 GitHub  ──push──►  Vercel auto-rebuild  ──►  live site (≈1 min)
```

---

## 2. The Gate: Authentication & Sessions

**Files:** `src/app/login/page.tsx`, `src/app/login/LoginClient.tsx`,
`src/app/api/auth/route.ts`, `src/lib/adminAuth.ts`, `src/lib/loginThrottle.ts`,
`src/middleware.ts`

| Property | Implementation |
|---|---|
| Password source | `ADMIN_PASSWORD` env var **only**. `adminPassword()` **throws** when unset — fail-closed, so no default password can ever ship. |
| Password check | SHA-256 of submitted vs expected, compared with `crypto.timingSafeEqual` — no timing side-channel. |
| Session token | `"<expiryEpochMs>.<HMAC-SHA256('anugruja-v1:'+expiry)>"` — the signature key is the admin password itself, so rotating the password kills every existing session instantly. |
| Session life | 60 minutes. |
| Cookie | `anugruja_admin_session` — `httpOnly` (invisible to JavaScript), `Secure` on HTTPS, `SameSite=Lax`, path `/`. |
| Tamper resistance | Signature compared in constant time; forged or expired tokens rejected; future timestamps beyond a 2-minute clock-skew allowance rejected. |
| Brute-force defence | Sliding 15-minute failure window per client IP: 5 failures → 15-minute lockout with `Retry-After`; success clears the counter. Nothing about the password is ever logged or stored. |
| Page protection | Next.js **middleware** guards every `/admin/*` route server-side, redirecting signed-out visitors to `/login?from=…` (with `reason=expired` when appropriate) and setting `Cache-Control: no-store` so admin pages are never cached by proxies. |
| Signed-out UX | `/login` shows a friendly password screen with remaining-attempt feedback and lockout countdown. |

**Where to verify:** read the files above; run
`node --import ./scripts/ts-node-boot.mjs scripts/test-auth.ts`; try 6 wrong
passwords and watch the lockout.

---

## 3. The Two Workspaces

**Files:** `src/app/admin/page.tsx`, `src/app/admin/studio/page.tsx`,
`src/app/admin/preview/page.tsx`, `src/components/admin/AdminShell.tsx`

Landing at `/admin` presents a deliberate two-card choice (ported from the
Jeeva Art School admin architecture):

| Workspace | Route | Best for |
|---|---|---|
| **"Show preview while editing"** | `/admin/preview` | Text and section editing. The site renders on the left from the *same in-memory CMS state* the editor writes to; clicking any block focuses its editor on the right. Every keystroke is visible instantly — nothing committed. |
| **"Do not show the preview"** | `/admin/studio` | Heavy lifting: mass uploads, gallery curation, events, brand settings at full width with no site rendering competing for attention. |

Both share: a top bar with workspace switcher and live status, a floating
**Save pill** showing pending-change count, the **Review & Commit** modal, and a
dashboard of stat cards (total artworks, galleries, for-sale count, pending
commits).

Console tabs in the studio workspace:

1. **Mass Upload Studio** — the photo-first wizard (§4)
2. **Galleries & Artworks** — per-gallery curation (§5)
3. **Pages & Listings** — home shortcuts & section ordering (§6)
4. **Events & Chatbot** — events manager + FAQ teaching + query mining (§7)
5. **Brand & SEO** — studio identity and metadata (§8)

---

## 4. Mass Upload Studio — the Flagship Workflow

**Files:** `src/components/admin/MassUploadStudio.tsx` (≈1,100 lines),
`src/lib/imageOptimize.ts`, `src/components/admin/ArtworkFramer.tsx` (≈520
lines), `src/lib/photoFraming.ts` (≈340 lines, unit-tested)

The workflow is **photo-first**: pictures lead, paperwork follows.

### Step 1 — Pick photos
*Choose photos* (gallery/camera roll) or drag-and-drop; one or fifty at once.
Each becomes a card in a filmstrip queue with per-item status.

### Step 2 — Describe them one at a time
The photo fills the left half; its own form sits on the right. Navigation aids:
*Save details & next photo*, *Previous/Next*, a progress bar, filmstrip jumping,
green ticks on completed items, and validation before advancing.

The first question decides everything else:

> **"Is this painting for sale?"**
> - **Just show it** (default) → goes to a showcase gallery, **no price is
>   asked or stored** — the form simply doesn't offer it.
> - **Yes, it's for sale** → price, category, and inquiry-related fields appear.

Other fields: title, medium, dimensions, description, target gallery.

### Step 3 — Frame each photo
A full in-browser crop/rotate/straighten editor (the **ArtworkFramer**):
aspect-ratio presets, rotation, fine straighten slider, zoom/pan with
touch support — maths in `photoFraming.ts`, covered by its own test suite
(`npm run test:framing`).

### Step 4 — Publish
Two exits, both explicit: publish a single finished piece immediately, or
publish the whole batch. Each publish:
1. Optimises the image **in the browser** (WebP q0.88, ≤2000px edge — see §11),
2. Uploads it via `/api/upload` (server stores + commits to GitHub),
3. Stages the new artwork entry into the CMS state.

The queue survives tab switches (it stays mounted — a deliberate engineering
choice so switching tabs never throws away real `File` objects mid-queue).

---

## 5. Galleries & Artworks Manager

**Files:** `src/components/admin/GalleryManager.tsx`, `DeleteArtworkModal.tsx`,
`ConfirmDialog.tsx`, `src/lib/types.ts` (`GALLERY_DEFINITIONS`)

Eight curated collections, each a named manager view:

| Gallery | Purpose |
|---|---|
| Featured (Home) | Spotlight gallery #1 on the landing page |
| Art for Sale | The purchasable catalog (prices, status) |
| Commissioned Works | Custom portraits, deities & murals |
| Classes & Courses | Student work & teaching milestones |
| Watercolor Courses | Masterclass & watercolor studies |
| Workshops & Exhibitions | Spotlight #2: corporate & gallery events |
| Testimonials & Student Success | Spotlight #3: proud-student works |
| Achievements & Awards | Kalakaar Foundation, State Gallery & other honours |

Capabilities: add/edit/delete artworks, edit title/price/status/medium/
dimensions/description per item, **drag-to-reorder** (order is what the public
carousel shows), per-item delete guarded by an in-page confirmation dialog
(no browser popups), and immediate visual feedback — every change staged per §9.

---

## 6. Pages & Listings (QuickNav) Manager

**Files:** `src/components/admin/QuickNavManager.tsx`, `SectionEditor.tsx`

Controls the **home-page shortcut chips and section ordering** — the quick-nav
pills visitors use to jump to Sale / Classes / About / Events. The studio can
relabel, re-order, show/hide entries and edit section titles/lead copy; the
public nav updates on next commit. Section content (titles, subtitles, body
blocks) is edited in the same staging model.

---

## 7. Events & Chatbot Manager

**Files:** `src/components/admin/EventsManager.tsx`, `src/app/api/chatbot-queries/route.ts`

### Events manager
Full CRUD for **upcoming** and **past** events: title, date (+ ISO date for
machine use), location, event type, description, **registration deadline**,
**seats remaining** (feeds the seats chip on the public event card and the
chatbot's availability answers), registration URL, and — for past events — an
**outcome** line. The first upcoming event automatically becomes the "next
event" in the AI's core facts.

### Chatbot FAQs — teaching the AI
A Q&A editor backed by `content.chatbot.faqs` in the CMS. Each FAQ is matched
against visitor questions by token overlap (≥60% coverage, with a
detail-escape hatch — see the chatbot deep-dive). **A promoted FAQ answers
forever at zero AI cost**, and it also enters the RAG corpus for related
questions.

### Query mining — seeing what visitors ask
`/api/chatbot-queries` (admin-only) returns the clustered log of questions that
fell through to the AI layer, with counts over a configurable window (1–168 h).
The admin reads the top clusters and writes FAQs for the frequent ones — a
closed improvement loop that makes the bot cheaper and better over time.
Privacy note: this log is in-memory only, capped at 500 entries, never
persisted, and greetings/one-worders are filtered out.

---

## 8. Brand & SEO Settings

**Files:** `src/components/admin/GeneralSettings.tsx`

Edits `content.brand` and `content.sections`: studio name, tagline, subtitle,
founder, **WhatsApp number / display number / raw digits** (drives the wa.me
deep links site-wide, including the chatbot's buttons), email, location label,
Google Maps URL, social links (Instagram main & sale catalog, Facebook,
YouTube), and SEO fields. The chatbot's knowledge of "how to reach us" is
derived from these exact fields — change the WhatsApp number here and every
contact path across the site *and* the AI updates together.

---

## 9. The Staging Model — Nothing Goes Live by Accident

**Files:** `src/context/SiteContext.tsx` (≈700 lines)

The admin console never writes to the live site as you type. Instead:

1. **Baseline** — the committed CMS content (`site.json` fetched via
   `GET /api/content`, which prefers the latest GitHub-committed version when
   GitHub is configured).
2. **Working state** — your edits live in React state, mirrored to a
   **localStorage draft** so an accidental refresh loses nothing.
3. **Diff report** — `getPendingChanges()` produces a human-readable list
   ("Brand: phone changed", "Sale gallery: 2 artworks added", …) via
   field-by-field comparison, with a generic safety net for anything unreported.
4. **Review modal** (`ReviewChangesModal.tsx`) shows the list; **only** the
   explicit Commit button in it touches the network.
5. **After commit** — the server's response becomes the new baseline, the
   localStorage draft is cleared, and dirty flags reset. Discarding changes
   symmetrically restores the baseline and clears the draft.

Consequence: you can wander the admin console for an hour, change twenty
things, and the public site has changed **nothing** until you reviewed and
committed.

---

## 10. The Commit Pipeline — From Click to Live Site

**Files:** `src/app/api/content/route.ts`, `src/app/api/upload/route.ts`,
`src/lib/github.ts`, `src/lib/serverContent.ts`

```
POST /api/content          (session-checked)
  ├─ validate payload has galleries (basic shape check)
  ├─ write content/site.json locally (best-effort; skipped on read-only FS)
  ├─ if GitHub configured:
  │    commitTextFile('content/site.json', …)   ← GitHub REST Contents API
  │    · fetch existing file SHA (for update)
  │    · PUT new blob with commit message
  │    · returns commit SHA + URL (shown in the console after commit)
  ├─ revalidatePath('/', 'layout')     ← public pages refresh instantly
  └─ revalidateTag('chatbot-studio-context') + reset context cache
     + resetRagIndex() + invalidateResponseCache()
         ← the AI's knowledge resets THIS INSTANT
```

`POST /api/upload` is the binary twin: session-checked, MIME allowlist
(jpg/png/webp/gif/svg/avif), sanitised unique filenames
(`<timestamp>-<safe-name>.<ext>`), local save + GitHub commit of the raw asset,
returns the public URL for the staged artwork entry.

Resilience details worth noting:
- If GitHub is not configured, local-disk mode still works (dev/self-host).
- If the GitHub commit fails but the local write succeeded, the change is not
  lost — the API reports the failure honestly instead of pretending.
- `GET /api/content` prefers the GitHub-committed `site.json` so the console
  always edits the *latest published truth*, not a stale server-local copy.
- `GET /api/github` exposes configuration status and the latest commit — the
  console's connection indicator is real, not cosmetic.

---

## 11. Image Pipeline — From Camera Roll to Optimised Web

**Files:** `src/lib/imageOptimize.ts`, `src/lib/imageSrc.ts`,
`src/lib/imageVariants.json`, `scripts/optimize-images.mjs`, `next.config.js`

**On upload (client-side, before the network):**
- The crop canvas re-encodes to **WebP** (JPEG fallback) at quality 0.88,
  longest edge capped at 2000px — a 6 MB phone photo arrives as a ~200–500 KB
  optimised asset. API payloads stay small; uploads stay fast even on mobile
  data.

**On publish (build-time):**
- `npm run images:optimize` (`scripts/optimize-images.mjs`, sharp-based)
  generates derivative sizes for every original and writes the manifest
  `src/lib/imageVariants.json` — currently **146 originals → 545 WebP
  derivatives** (480px card tier · 960px gallery tier · full-size).

**On display (runtime):**
- `next/image` picks the smallest adequate variant using the manifest and
  correct `sizes` per slot (e.g. lightbox = `min(92vw, 1080px)`), so a phone
  never downloads desktop pixels and the lightbox zooms into real resolution
  (480/960/1600-class derivatives), not stretched thumbnails.

---

## 12. Live Preview Editor

**Files:** `src/app/admin/preview/page.tsx`, `LiveSitePreview.tsx`,
`PreviewEditorPane.tsx`, `EditableSection.tsx`, `SectionEditor.tsx`

The left pane renders the real site components (the very same React tree the
public pages use) **from the staging state**, inside an isolated container —
so what you see is genuinely what will publish, not an approximation. The
right pane is a section-focused editor; clicking a block in the preview focuses
its fields. Narrow screens stack the panes vertically. Nothing here commits —
it feeds the same staging model as §9, ending at the same Review modal.

---

## 13. Safety Rails Inside the Console

- **Destructive actions are confirmed in-page** (`ConfirmDialog`) — no native
  `window.confirm`, no accidental deletes; replaceable text, explicit intent.
- **Session expiry is graceful** — API routes return 401, the console surfaces
  "Sign in required", and `/admin` redirects preserve the intended destination
  (`?from=`) plus an `?reason=expired` hint for a clear message.
- **Status honesty** — the save pill and status line report real outcomes
  ("Committed & pushed to GitHub!" with the commit URL, or the actual error),
  verified against the server response rather than assumed.
- **Draft survival** — refresh, close the tab, come back: the localStorage
  draft restores, pending-change count intact.
- **No plaintext secrets in the console** — the password and API tokens are
  never displayed or stored client-side; only the signed cookie exists in the
  browser, `httpOnly`.

---

## 14. Environment & Configuration

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | Admin login. Fail-closed if missing — the app refuses to authenticate rather than allow a default. |
| `GITHUB_TOKEN` | for production CMS | REST token used to commit `site.json` and images. Scoped to the repo. |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` | optional | Default `abhay2008` / `AnugrujaArtsStudio` / `main`. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical URL used in SEO metadata, sitemap, OpenRouter referer. |

*(Chatbot-specific env vars are catalogued in the chatbot deep-dive.)*

Local development: put these in `.env.local` (git-ignored). Production: Vercel
Project Settings → Environment Variables. Changing `ADMIN_PASSWORD` invalidates
all existing sessions on the next deploy by design.

---

## 15. File Inventory

```
src/app/login/                     Login page + client form
src/app/admin/                     Chooser, preview workspace, studio workspace
src/app/api/auth/                  POST sign-in · GET session check · DELETE sign-out
src/app/api/content/               GET latest CMS · POST commit (site.json)
src/app/api/upload/                POST image upload (binary → repo)
src/app/api/github/                GET config status + latest commit
src/middleware.ts                  /admin guard, /login redirect logic
src/lib/adminAuth.ts               HMAC session issue/validation (fail-closed)
src/lib/loginThrottle.ts           5-failure lockout, sliding window
src/lib/github.ts                  GitHub Contents API: text + binary commits
src/lib/serverContent.ts           site.json read/write with bundled fallback
src/lib/imageOptimize.ts           Client-side WebP/JPEG encode + downscale
src/lib/imageSrc.ts                Variant-picker + sizes for next/image
src/lib/imageVariants.json         146 images → 545 derivative manifest
src/lib/photoFraming.ts            Crop/rotate/straighten maths (unit-tested)
src/context/SiteContext.tsx        Staging state machine + commit + diff report
src/components/admin/              15 components (see §3–§12 for each)
scripts/test-auth.ts               Auth unit tests
scripts/test-crud.ts               CMS read/write tests
scripts/test-photo-framing.ts      Framing maths tests
scripts/optimize-images.mjs        Derivative generator (sharp)
```

*Companion documents: `../PROOF_OF_WORK.md` (master report) ·
`POW_CHATBOT_AI.md` (AI assistant deep-dive) · `../ADMIN_USER_GUIDE.md`
(step-by-step operating manual for the studio).*
