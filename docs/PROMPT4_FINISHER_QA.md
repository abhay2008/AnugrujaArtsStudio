# Prompt 4 — implementation & verification

## Repositories and safety

- Public website and its built-in `/admin` console: this checkout.
- Independent admin portal: sibling `AnugrujaArtsStudio-Admin` checkout.
- Both were on `main`, with no tracked changes before work started. Fetch + fast-forward-only merge reported both already up to date with `origin/main`.
- Existing reference screenshots/video were left untouched.
- No commits, pushes, deployments, or live CMS mutations were performed.
- Browser QA used temporary local credentials and disabled GitHub publishing. Browser photo edits were discarded, not published.

## Phase 1 — architectural decisions

1. **AI-first routing:** keyword interception throws away conversational nuance. Valid studio queries now attempt OpenRouter directly; neither lexical FAQ matching nor cached replies can intercept them. Input safety refusals remain pre-provider. The legacy router requires explicit `fallback: true` to classify locally.
2. **Quota and cascading:** the active limiter admits exactly 30 requests per rolling 25 minutes per IP per Node instance. Each IP holds at most 30 timestamps; expired identifiers are pruned and the map is capped at 10,000. Saturation uses local answers, never evicts active quotas. Provider failures cascade with a bounded attempt budget, then answer via the existing SSE protocol. Partial failed responses are replaced rather than appended to.
3. **Fresh context:** same-process content mutations adopt the actual saved payload immediately. The old reset-to-build-snapshot after successful GitHub publication was removed. Valid chat requests await a fresh GitHub content check; concurrent checks coalesce. Local sibling writes are detected from disk. A revision change rebuilds the BM25 retrieval index synchronously on retrieval. Failed refreshes keep the last good snapshot.
4. **Typography/density:** premium course content now uses editorial/decorative headings, system metadata, compact curriculum cards and rail galleries rather than oversized spotlight stages. Colours use theme tokens. Fees and schedules are not invented.
5. **Visual administration and compute:** both editors use thumbnail galleries with cover ordering, dimensions, previews, arrows for touch/keyboard, drag reorder, upload state and studio-image selection. Existing optimization/upload helpers are reused. Phones choose the lite paint tier before hydration; reduced motion is respected. The intro uses an opaque first paint and one opacity-only exit, not a clip-path/filter animation over a moving page.

## Phases 2–5 — shipped changes

### Chat backend

- Four-model default cascade in requested order, with environment overrides preserved.
- 429, 5xx and network/timeout failures have helpful live-CMS fallback replies.
- API key/auth/configuration failures remain explicit service errors, not disguised AI replies.
- Fuzzy local intents cover workshops, classes, paintings, commissions, location and timings; zero seats remains zero, prices remain admin-confirmed only.
- SSE completion is retained on fallback; partial provider text is replaced.
- Abort propagation and bounded upstream/stream timeouts.
- Safer null-payload validation and updated HTTP smoke suite.

### Chat UI/mobile

- Semantic paragraphs, bold, italics, code, ordered/unordered lists, blockquotes and safe links; no raw HTML rendering.
- Native horizontal chip scrolling plus previous/more controls.
- Registered vertical transcript and horizontal suggestions with the shared scroll-lock manager.
- Manual scroll-up detection, pinned streaming and a jump-to-latest control.
- Phone keyboard sizing via visual viewport, 16px input, safe-area padding.
- Opaque amethyst/gold panel, distinct messages, light-theme overrides, lower-power ambient animation.
- Focus containment and focus return for public drawer/chat and built-in review modal.

### Loader/header/landing

- Removed transparent loader entrance, iris exit and moving/blurred exit content.
- One cancellable lifecycle, font settling, bounded escape timers; completion event fires after exit.
- Underlying surface stays laid out but unpainted until handoff; no scroll reset.
- Intro skipped for admin/login and reduced motion unless explicitly replayed.
- Stable compact header (no timed height collapse).
- Drawer has a real `100dvh` scroll area, nonshrinking contents, overscroll containment and 44px controls.
- Fixed 360px hero grid minimum-width overflow affecting CTAs/workshop pill.
- Fixed mobile light-theme wordmark gradient rectangle.

### Classes

- Three compact tracks with age/duration badges, curriculum and course-specific WhatsApp inquiry.
- Student/watercolour rail galleries preserve touch, keyboard and lightbox behavior.
- Measured mobile stage height about 230px at 360×640, within 220–280px target; desktop CSS uses 280–360px clamp.
- No `font-blippo` in the rendered classes page, including shared contact controls.

### Both admin portals

- Visual event photos instead of raw URL textarea.
- Reorder/cover designation, one-click removal, dimension labels, native modal enlargement.
- Drag/drop and multi-file uploads, incremental thumbnails, recoverable errors, duplicate-upload guard.
- Blob previews immediately after upload even while deployment assets are not yet available.
- Existing studio gallery picker, duplicate attachment prevention.
- Save/cancel disabled during an upload batch.
- Independent admin mobile navigation uses bounded native scrolling; expensive phone backdrop/fixed-background work reduced.
- GitHub upload/content failures no longer report misleading success. Built-in review shows local-only vs committed status; independent portal no longer claims a commit means the deployment is already live.
- Independent event removal uses a styled confirmation instead of native `window.confirm`.

## Phase 6 — verification matrix

| Area | Result | Notes |
|---|---|---|
| Public TypeScript | Passed | `npm run typecheck` |
| Admin TypeScript | Passed | sibling `npm run typecheck` |
| Public production build | Passed | 17 routes; home first-load JS ~185 kB |
| Independent admin production build | Passed | 13 routes |
| Existing chatbot unit suite | Passed | compatibility helpers explicitly tested as fallback-only |
| New pipeline suite | Passed | 59 checks; provider fetches mocked, no paid calls |
| Image framing suite | Passed | 8,474 assertions |
| Independent admin verification | Passed | all 3 auth/schema/repository-target suites, test-only credentials |
| CSS compatibility audit | Passed | no new findings; existing baseline findings remain |
| Git diff whitespace check | Passed | both repositories |
| Blink at 360×640 and 390×844 | Checked | no document horizontal overflow; hero CTA/pill fit |
| Public drawer scroll ownership | Checked | 640px viewport / 766px contents; scrollTop can change; background locked; wheel not prevented in drawer |
| Chat suggestion scrolling | Checked | 310px viewport / 1,383px contents; scrollLeft changes; more button advances strip; gesture not blocked |
| Classes dark/light | Checked | screenshots and computed theme ink; rail ~230px on phone |
| Independent admin event editor | Checked | real photo dimensions, touch reorder/cover change and native preview; no publish performed |
| Independent admin mobile navigation | Checked | bounded height / overflow auto; no document horizontal overflow |
| Successful live OpenRouter response | Not verified | local provider call returned a service error; API/model configuration needs operator verification |
| GitHub asset/content publication | Not executed | repository destinations/code paths inspected; no permission to mutate live CMS during QA |
| Physical iOS Safari/Android keyboards | Pending | Chromium viewport simulation does not prove physical touch/keyboard behavior |
| WebKit and Gecko rendering | Pending | only embedded Chromium available for interactive tests |
| Intel/Apple/Adreno/Mali 60fps guarantees | Not claimed | requires representative physical hardware/frame profiling |

## Important operating limits

- The requested in-memory limiter is **per process/serverless instance**, not a globally atomic distributed quota. Horizontal scaling/cold starts require a shared store for global enforcement.
- Cross-instance context visibility is best-effort GitHub read-after-publish, not distributed synchronous memory. GitHub errors/rate limits retain the previous good snapshot; there is no claim of global instant consistency while the network is down.
- Requested free model IDs can be retired/unavailable. Overrides should point to models the studio's OpenRouter account can actually use. Authentication/invalid-model errors are intentionally visible.
- New uploads use existing GitHub Contents commits to `main`; a successful commit still needs the host deployment to serve newly uploaded paths. Draft previews use blob URLs to avoid that wait.
- Both editors remove photos from the event only; they do not delete image assets from GitHub.
- Before a later push, fetch/recheck both branches again. The initial sync cannot prevent somebody publishing new remote commits after this work started.

## Remaining manual release checklist

- Confirm configured OpenRouter key/models and run a small live multilingual conversation.
- Test first/repeat/replayed intro on physical iPhone Safari and midrange Android, including rotation and slow network.
- Swipe drawer and suggested chips; open keyboard; scroll back in a long reply while it streams.
- Exercise lightbox pinch/drag and nested modal focus/scroll restoration.
- Test admin multi-photo upload with one intentional failed file, cancel/retry and publish using an approved nonproduction fixture.
- Confirm uploaded asset URL and live chatbot revision after deploy; clean up fixture via normal admin workflow.
- Profile representative low-power devices rather than claiming universal 60fps from a desktop viewport test.
