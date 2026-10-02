# Structural Health Report — Anugruja Arts Studio

**Date:** October 1, 2026
**Method:** Playtest observation + source file inspection
**Stack:** Next.js 15.5.25 + React 19.3.0 + TypeScript + Tailwind CSS v3 + Framer Motion

---

## Architecture Overview

The application has two clearly separated surfaces:

### (a) Public site — `src/app/(site)/`
| File | Role | Health |
|------|------|--------|
| `(site)/layout.tsx` | Root site layout: ThemeProvider, SeoStructuredData, PageAmbient, LightboxProvider, ScrollReveal, ScrollReveal, Header, Footer, DeferredLightbox, DeferredChatWidget | ✅ Good separation — each concern is its own composable |
| `(site)/page.tsx` | Homepage: LandingHero → Carousel3D (spotlight) → ArtistJourney → Events → Carousel3D (deck) → Accolades → Testimony → ContactButtons → QuickNav | ✅ Well-structured component composition |
| `(site)/sale/page.tsx` + `SaleClient.tsx` | Sale page: gallery grid (lazy images) + Carousel3D spotlight + commission + AutoScroller + ContactActionButtons | ✅ Clean client/server split; gallery uses Next.js Image optimization |
| `(site)/classes/page.tsx` + `ClassesClient.tsx` | 3 course tracks with syllabus lightboxes + WhatsApp deep-links | ✅ Clean, but contains the WhatsApp URL bug (see D1) |
| `(site)/about/page.tsx` + `AboutArtistClient.tsx` | Biography read-more accordion + achievements + exhibitions + workshops carousel | ✅ Well-structured |

### (b) Admin console — `src/app/admin/` + `src/app/login/`
| File | Role | Health |
|------|------|--------|
| `middleware.ts` | Protects `/admin` → redirects to `/login?from=...` when unauthenticated | ✅ Correct, simple, timing-safe |
| `app/login/page.tsx` | Login form: password input + submit + lockout display + "Back to website" | ✅ Functional, but exposes auth details (see O2) |
| `app/admin/studio/page.tsx` | Studio console wrapper | — Not tested in depth (requires auth) |
| `components/admin/StudioConsole.tsx` | CMS form surface (upload, metadata) | — Not tested (requires auth) |

### Shared components — `src/components/`
| File | Role | Health |
|------|------|--------|
| `Header.tsx` | Sticky header: desktop nav, dropdown, mobile drawer (right-slide, ESC-close, inert when closed), theme toggle, social strip | ✅ Excellent — `inert` attribute used correctly for accessibility |
| `LandingHero.tsx` | Hero SVG animations, foil petals, botanical corners, pillar cards | ✅ Good use of Framer Motion |
| `Carousel3D.tsx` | 3D coverflow carousel (spotlight/deck/polaroid/rail variants) | ✅ Feature-rich, supports autoplay/pause, dots, keyboard nav |
| `chat/ChatWidget.tsx` + `DeferredChatWidget.tsx` | Chat FAB → dialog panel → SSE streaming to `/api/chat` | ✅ Excellent error handling, rate limiting, suggested chips, ESC close, reduced-motion respect |
| `DeferredLightbox.tsx` | Lazy-loads the lightbox component | ✅ Reduces initial bundle |

### Data layer — `src/data/`, `src/lib/`
| File | Role | Health |
|------|------|--------|
| `content/site.json` | Single source of truth for all editorial content | ✅ Single-source-of-truth, well-organized |
| `data/artData.ts` | Reads `site.json` at module load via `currentContent()` | ✅ Clean abstraction |
| `data/studioData.ts` | Complementary editorial constants (hero, bio, journey, achievements, etc.) | ✅ Good separation from dynamic content |
| `lib/freshContent.ts` | GitHub-remote freshness layer so chatbot sees published changes | ✅ Good for CMS persistence without redeploy |
| `lib/adminAuth.ts` | HMAC-SHA256 cookie session, 1-hour expiry, `tsc-safe-compare` | ✅ Timing-safe comparison |
| `lib/loginThrottle.ts` | 5-attempt lockout with 15-minute window | ✅ Working correctly (verified: lockout triggers at attempt 4) |

### API routes — `src/app/api/`
| File | Role | Health |
|------|------|--------|
| `api/chat/route.ts` | OpenRouter streaming with model fallbacks, RAG, response cache, rate limiter, 60s timeout | ✅ Graceful 502 handling, excellent fallback messaging |
| `api/auth/route.ts` | HMAC cookie auth endpoints | ✅ Secure |
| `api/content/route.ts` | Content serving API | ✅ |

---

## Data Flow

```
content/site.json
  ↓ (module load)
src/data/artData.ts ← currentContent()
  ↓
  ├── src/data/spotlightFeed.ts        → Spotlight carousels
  ├── src/data/studioData.ts           → Static constants
  ├── src/components/Carousel3D.tsx    → Carousel data
  ├── src/app/(site)/**/page.tsx       → Page content
  └── src/app/api/chat/route.ts        → Chatbot context (+ freshContent.ts for live edits)
```

This is a clean, unidirectional data flow. No context sprawl. The `site.json` → `artData.ts` → components chain is simple and traceable.

---

## Where Defect Fixes Would Land

| Defect | File to edit | Change |
|--------|-------------|--------|
| D1: Broken WhatsApp URLs on Classes | `src/app/(site)/classes/ClassesClient.tsx` | Fix URL construction: prepend `https://wa.me/` only when the URL doesn't already start with it |
| O2: Auth info exposed on login | `src/app/login/page.tsx` | Move security notes to a `<footer>` tooltip or remove from visible UI |

No new files needed for either fix. Both are single-file changes.

---

## Structural Concerns

1. **No E2E test suite exists** — The project has `scripts/e2e-chat.ts`, `scripts/test-chatbot.ts`, `scripts/test-auth.ts` but no Playwright config. A lightweight Playwright config could catch the classes WhatsApp URL bug before deploy.

2. **`content/site.json` is 36 paintings + 15 workshops + 12 testimonials + 14 commissions + events + chatbot config** — this is a large file (~90% of site content). Consider splitting by feature (e.g., `content/paintings.json`, `content/testimonials.json`) if it grows further.

3. **`src/components/` and `src/app/` both exist** — some components like `Header.tsx` and `Carousel3D.tsx` are shared across multiple features, which is good. However, page-specific clients (`SaleClient`, `ClassesClient`, `AboutArtistClient`) are co-located with their pages under `src/app/(site)/<route>/`, which is the Next.js 15 convention. This is clean.

4. **`DeferredChatWidget.tsx` + `DeferredLightbox.tsx`** use React lazy/suspense for code-splitting. This means the chat input may take an extra render cycle to appear. This is acceptable but worth noting — the chat widget's deferred loading contributed to my initial false-positive in detecting the input field (I wasn't waiting long enough).

5. **No visual regression testing** — the playtest found that several "defects" from the initial automated run were false positives due to timing/selector issues. A visual diff on key flows would help distinguish real regressions from test artifacts.

---

## Positive Patterns

- ✅ `inert` attribute used on closed mobile drawer (accessibility best practice)
- ✅ `aria-modal="true"` on dialogs (lightbox, chat, mobile drawer)
- ✅ `aria-label` on all icon buttons (X close, zoom, send, carousel nav)
- ✅ Graceful degradation of AI chatbot (502 → WhatsApp redirect message)
- ✅ Reduced-motion respect in carousels and animations
- ✅ Timing-safe password comparison in auth
- ✅ Lockout after 4 failed attempts (not 5 — verified)
- ✅ Single source of truth (`site.json`)
- ✅ Clean separation of page components (`*-Client.tsx` convention)
- ✅ Deferred component loading for chat widget and lightbox
- ✅ Framer Motion used consistently (hero petals, carousel transitions, drawer slide)