# 🎨 Anugruja Arts Studio — Official Website & Live Content Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

The production website for **Anugruja Arts Studio** — the studio of Master Artist and Curator **Anuradha Govarthanan** (20+ years of practice across watercolours, acrylics, oils, Tanjore, Mysore, and Kerala mural styles).

This is a full **Next.js App Router** application: a public gallery site, a built-in password-protected admin console, a Git-backed CMS pipeline (content is committed to this repo through the GitHub API), and an AI studio assistant ("Chitra") that answers visitor questions from the same content file. No database, no server to babysit — the repo *is* the CMS.

---

## ✨ What's Inside

| Area | What it does |
|---|---|
| **Public site** (`src/app/(site)/`) | Home, Art for Sale, Classes & exam coaching (NATA/NID/NIFT/BFA…), About the artist, events, commission & inquiry bridges (WhatsApp / email) |
| **Artwork experience** | 3D drag carousels, a global lightbox (click any painting to enlarge — optimized variants, so it opens instantly), scroll reveals, reduced-motion support |
| **Admin console** (`/admin`) | Password-gated studio console: photo-first upload wizard (pick photos → describe one at a time → crop/rotate/straighten → publish one or the batch), gallery managers, home-shortcut & events editors, brand/SEO settings, live preview editor — every edit is *staged* and reviewed before one explicit **Commit** |
| **Chat assistant "Chitra"** | Floating chat widget backed by OpenRouter (server-side key only). Its knowledge is generated from the same `site.json` the site renders — new paintings are in the bot's context automatically |
| **Image pipeline** | `next/image` + a custom optimizer: on upload, originals are compressed client-side; on display, right-sized variants (640/1080/1920) are served and cached |

---

## 🏛️ How the Content Pipeline Works

Everything the site shows — sections, artworks, prices, statuses, events, chatbot knowledge, quick-nav — lives in **one file**:

```
content/site.json        ← the single source of truth
```

```
┌────────────────────────┐   1. Stage edits in the admin console
│   Admin console /admin │      (in-memory / localStorage, nothing live yet)
└───────────┬────────────┘
            │ 2. One explicit "Commit Changes"
            ▼
┌────────────────────────┐   3. POST /api/content →
│  GitHub Contents API   │      commits content/site.json (and any uploaded
│  (via /api/github)     │      images in public/images) to this repository
└───────────┬────────────┘
            │ 4. Push to main triggers
            ▼
┌────────────────────────┐   5. Vercel rebuilds; site reads site.json
│   Live website (Vercel)│      at build/request time; the chatbot context
└────────────────────────┘      is regenerated from the same file
```

Consequences of this design:

- **Nothing goes live until you commit.** Admin edits are staged and fully discardable.
- **Content is versioned.** Every change is a Git commit — full history, easy revert.
- **The chatbot never drifts.** `src/lib/chatbot/context.ts` builds its knowledge from the committed `site.json`, so uploaded/edited paintings update the bot automatically.

### Galleries & artwork statuses

Artworks live in typed collections (`GalleryKey` in `src/lib/types.ts`, described by `GALLERY_CATALOG`). One of them — **Art for Sale** — is the commerce collection and the only place the public pages render a price; the rest are showcase galleries (Featured, Commissions, Classes, Watercolour, Workshops, Testimonials, Awards) that never show sales metadata.

Whether a painting is *for sale* is therefore an explicit per-artwork decision, asked as the first question of the upload flow:

- **Just show it** (default) — the photo goes to a showcase gallery. **No price is asked, none is stored**, and no availability badge is published.
- **Sell it** — it goes to Art for Sale and the form asks for **Price (₹)** and **Availability** (`Available / Reserved / Sold`).

Filenames still auto-suggest a collection (`krishna-sale-2.jpg` → Art for Sale, `student-boat.jpg` → Classes & Courses) and a photo with no hint lands in a showcase gallery — never in the sale catalogue by accident. Flipping the switch is non-destructive: it remembers the showcase gallery you had chosen and restores it.

### Uploading artwork, and framing it

The wizard is photo-first, exactly like a phone album:

1. **Pick** one photo or many (file picker or drag & drop). Canvas pre-compression starts in the background immediately.
2. **Describe them one at a time** — the painting fills one side while its own form sits beside it, with a filmstrip to jump between photos and a green tick on finished ones.
3. **Frame each photo** — *Crop, rotate & straighten* opens a phone-style editor: pinch or scroll to zoom, drag to move, **Turn 90°** for sideways shots, a **Straighten** slider (±15°), and shape presets (*Whole photo · Square · Portrait · Landscape*). Straightening pulls the crop inward to real paint, so no grey wedges can reach the gallery. The geometry lives in `src/lib/photoFraming.ts` and is shared by the on-screen preview and the exported file, so what you frame is exactly what uploads.
4. **Publish** — nothing needs ticking: the whole queue is included, `Publish this photo to …` sends just the one on screen, or `Publish all N photos` opens a review sheet listing every painting with its gallery, price and for-sale status before one commit.

### Committing: everything staged is one commit

Editing anywhere in the console stages the change immediately — there is no per-item "mark for commit" step. `getPendingChanges()` in `src/context/SiteContext.tsx` diffs the working content against the last published baseline (studio details, SEO, every page section, social links, chatbot settings, every gallery and artwork, the events calendar) and the review sheet lists all of it; the console's bar reads **All synced** only when that diff is genuinely empty. It also runs a safety-net pass over every top-level content key, so a field added later cannot go missing from the list and leave the commit button disabled.

Destructive actions confirm through the console's own dialog (`src/components/admin/ConfirmDialog.tsx`) rather than `window.confirm`, which blocks the page's main thread, cannot be styled, and is silently suppressed by browsers after repeated use.

---

## 🔐 Admin Access

- The console at `/admin` (and `/login`) asks for the studio password **before** anything renders.
- The password is **never in this repository** — it lives in the host's environment variables (`ADMIN_PASSWORD` on Vercel, `.env.local` locally).
- Sessions are **HMAC-SHA256-signed cookies** (`src/lib/adminAuth.ts`), **1-hour** expiry; sign-in is rate-limited with a lockout (`src/lib/loginThrottle.ts`).
- Lost the password? Set a new value in the host's env vars and redeploy — no code change involved. Note that the signing secret is derived from the password, so changing it invalidates every existing session at once (visitors to `/admin` will see the "session expired" notice and simply sign in again).

---

## 🚀 Local Development

```bash
git clone https://github.com/abhay2008/AnugrujaArtsStudio.git
cd AnugrujaArtsStudio
npm install

# create .env.local from the template and fill in what you need
cp .env.example .env.local

npm run dev            # → http://localhost:3000
```

Without any env vars the public site works fully from the committed `site.json`; the admin gate needs `ADMIN_PASSWORD`, and committing/uploading through the GitHub API needs a `GITHUB_TOKEN`.

Useful scripts:

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (default `http://localhost:3000`) |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | `tsc --noEmit` — the check to run before every commit |
| `npm run lint` | Next.js ESLint |
| `npm run test:framing` | 8 400+ assertions over the crop/rotate/straighten geometry (`scripts/test-photo-framing.ts`) |
| `npm run test:chat` | Chat pipeline unit checks (fuzzy lookups, guardrails, pricing replies) |
| `npm run test:e2e` | End-to-end chat conversation against the local pipeline |
| `npm run images:optimize` | Rebuild the `public/images/opt/*` derivatives |
| `npm run audit:css` | Cross-engine CSS compatibility audit |

---

## 🔑 Environment Variables

Create `.env.local` (gitignored — **never commit real values**). Templates: [.env.example](./.env.example).

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | for `/admin` | Studio password checked server-side at sign-in |
| `GITHUB_TOKEN` | for commits/uploads | GitHub fine-grained PAT (Contents: read/write on this repo) — held server-side only |
| `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` | optional | Override commit target (defaults to this repo's `main`) |
| `OPENROUTER_API_KEY` | for chatbot | Server-side key for the Chitra assistant |
| `OPENROUTER_MODEL` / `OPENROUTER_FALLBACK_MODELS` | optional | Chat model + fallback chain (free-tier models rotate — check that the configured ones are still available) |
| `NEXT_PUBLIC_SITE_URL` | optional | Public URL used for chatbot attribution headers |
| `CHATBOT_RAG_TOP_K` / `CHATBOT_RAG_TOKEN_BUDGET` | optional | How much of the catalogue the assistant retrieves per question |
| `CHATBOT_CACHE_TTL_SECONDS` / `CHATBOT_CACHE_MAX_ENTRIES` | optional | Response cache — repeat questions are answered with zero API calls, and entries expire when content changes |
| `NEXT_DIST_DIR` | optional | Point a dev server at its own build directory, so two servers can run from one checkout without sharing a `.next` cache |

**Security rules this project follows:**

- Secrets live only in `.env.local` (gitignored) and the host's (Vercel) environment settings.
- Never paste real tokens or passwords into code, docs, issues, or commit messages.
- If a secret ever touches Git history, treat it as compromised: rotate it and scrub history — do not just delete the file.

---

## ☁️ Deployment

The site deploys on **Vercel**: push to `main` → automatic build → live. The same environment variables must be configured in the Vercel project settings (they are *not* read from the repo). Uploaded images commit to `public/images/` in this repo, so they deploy with the next build and are served optimized via `next/image`.

---

## 📂 Project Structure

```
AnugrujaArtsStudio/
├── content/
│   └── site.json              # ← Single source of truth for ALL site content
├── public/
│   └── images/                # 140+ artwork photos, portraits, certificates
├── src/
│   ├── app/
│   │   ├── (site)/            # Public pages: home, sale, classes, about, …
│   │   ├── admin/             # Admin console (password-gated) + preview editor
│   │   ├── login/             # Admin sign-in gate
│   │   └── api/
│   │       ├── auth/          # Password check → signed session cookie
│   │       ├── content/       # GET/POST site content (commit pipeline)
│   │       ├── upload/        # Image upload → public/images + GitHub commit
│   │       ├── github/        # GitHub Contents API helpers (commit status, etc.)
│   │       └── chat/          # Chitra: OpenRouter proxy, guardrails, rate limit
│   ├── components/            # Carousels, lightbox, chat widget
│   │   └── admin/             # Console: MassUploadStudio (wizard), ArtworkFramer
│   │                          # (crop/rotate/straighten), GalleryManager,
│   │                          # EventsManager, QuickNavManager, SectionEditor,
│   │                          # AdminShell (commit flow), ConfirmDialog
│   ├── context/
│   │   └── SiteContext.tsx    # Live content store shared by site + admin;
│   │                          # getPendingChanges() drives the review sheet
│   └── lib/
│       ├── serverContent.ts   # Reads site.json (+ GitHub fallback)
│       ├── github.ts          # GitHub Contents API client
│       ├── adminAuth.ts       # HMAC-SHA256 session cookies (1 h)
│       ├── loginThrottle.ts   # Brute-force lockout for the admin gate
│       ├── imageOptimize.ts   # Client-side compression + canvas encoding
│       ├── photoFraming.ts    # Crop / rotate / straighten geometry (pure math)
│       ├── types.ts           # Data model + GALLERY_CATALOG
│       └── chatbot/           # context.ts, lookup.ts, guardrails.ts, rateLimit.ts
├── scripts/
│   ├── test-photo-framing.ts  # Geometry assertions (npm run test:framing)
│   ├── test-chatbot.ts        # Chat pipeline checks
│   ├── e2e-chat.ts            # End-to-end chat run
│   ├── optimize-images.mjs    # Image derivative builder
│   └── audit-css-compat.mjs   # Cross-engine CSS audit
└── .env.example               # Template only — real values live in .env.local / Vercel
```

---

## 👨‍💻 Developer

**Abhay Kashyap**
*Undergraduate, Computer Science & Business Systems @ BMSCE Bangalore*
[GitHub Profile](https://github.com/abhay2008)

*Historical note: the studio's first website (2024, static HTML/jQuery) was handcrafted before modern AI tooling; this repo is its full production successor.*
