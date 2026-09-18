# Cross-browser rendering: findings, fix list, and how to verify

Reference for the Windows/Edge, WebKit and Gecko rendering work. It records what was
**measured on this machine**, what is **supported by external sources**, and what remains
**unverified** — so nobody re-litigates a claim or repeats a dead end.

It is a research document plus a hand-off fix list. It changes no application CSS, no
component, and no config. The machine-checkable part lives in `npm run audit:css`.

Companion: `AGENT_COLLAB_SYNC.md` (Round 9) for who owns what.

---

## 0. Do these first

1. **`html[data-os='windows'] .gold-sunset-shimmer` paints a gradient slab.** The rule keeps
   `background-image` and switches `background-clip` to `border-box`, so the gradient fills the
   element box behind gold text. Measured; reachable on Home, `/sale`, `/classes`, `/about` and the
   footer. One-line fix: `background: none;` (as the neighbouring `.display-heading` rule already
   does). See §7-A1.
2. **The lightbox zoom asks for ~480 source pixels across ~2 200 device pixels.** Measured at 5×.
   Two independent causes, both fixable: the `sizes` descriptor never changes with zoom, and the
   wrapper's `will-change: transform` suppresses re-rasterisation. See §3.1 and §7-A2/A3.
3. **The Windows gate is the wrong gate for the sticky-glass problem.** Safari 26 tints browser
   chrome from `background-color`/`backdrop-filter` *on the sticky element itself* — a WebKit-wide
   behaviour that `data-os='windows'` cannot reach, and on iOS it is the visible symptom. §4.3, §7-A5.
4. **Stop gating detection on OS.** `deviceMemory` and `navigator.connection` are Chromium-only, so
   Safari and Firefox never take the lite path. §2.6, §7-B1.
5. **Run `npm run audit:css`** before merging anything that touches CSS. It fails on *new*
   cross-engine findings only. §8.
6. **Verify on a real Windows machine with the two-minute bisect in §6.** Nothing in this document
   was observed on Windows; that is the one environment still missing.

---

## 1. Method, and what could not be tested

**Engines actually run here**

| Engine | Version | How | Result |
|---|---|---|---|
| Chrome | 153.0.8010.50 | `--headless --screenshot`, DPR 1 and `--force-device-scale-factor=1.25 --disable-gpu` | rendered, captured |
| Firefox (Gecko) | 156.0 | `--headless --screenshot` | rendered, captured |
| Brave | 153.1.95.104 | installed, launched | CLI screenshot produced no file (see below) |

Installed into `~/Applications` (user-writable, no admin): Firefox, Brave.

**Could not be tested, and why**

- **Safari / WebKit (26.6.2, i.e. the Liquid Glass generation).** WebDriver needs *Develop → Allow
  Remote Automation*. That checkbox is per-user and `safaridriver --enable` did not make it stick
  while Safari was running. **There is no WebKit evidence in this document** — every WebKit claim is
  cited, not observed. Giving me the two clicks in §9.3 lets me run the automated pass.
- **Edge.** Microsoft's advertised macOS link (`fwlink/?linkid=2093438`) serves an **Android APK**
  (`AndroidManifest.xml`, `classes.dex`), and the real Edge for macOS is an admin-install `.pkg`.
  Not installed, deliberately — Edge is Blink + Skia + Chromium's compositor, identical to Chrome for
  everything below; only the Windows graphics stack differs, and that is untestable from macOS
  anyway. Verify Edge on the Windows machine with §6.
- **Brave rendering.** `--headless --screenshot` returns nothing (its log contains only
  `CVDisplayLinkCreateWithCGDisplay failed` noise). Brave is Chromium for rendering, so this costs
  nothing except its Shields behaviour, which is a network-policy question, not a paint one
  (§7-B4).
- **Real Windows, iOS, Android.** Untested. §6 is written for the machine I cannot reach.

**Instruments**

- `sharp` (already a dependency) for mean/standard-deviation statistics on screenshots.
- DOM and computed-style probes through the app's own preview browser.
- Full-page and viewport screenshots per engine.
- `scripts/audit-css-compat.mjs` for the static inventory.

**Capture artefacts I hit — recorded so nobody repeats them**

Three things looked like site bugs and were not. Each cost time to disprove:

1. A **900 px-tall window plus a `#fragment`** produced a uniform `#0a0610` frame in **all three
   engines** (`stdev: 0.0`). Not the page: the DOM at that URL was fully rendered (149 elements in
   view, hit-testing returned `.display-heading` and `.sticky-profile-card`). Capture-method
   artefact.
2. A **10 500 px-tall window** made `min-height: 100vh` on the hero fill the entire frame, so `/`
   looked empty and `/#journey` looked full — the opposite of (1), with the same cause.
3. `.chapter-card` at `opacity: 0` looked like a broken reveal. Measured: the card was 1 097 px
   below the fold, and after `scrollIntoView({block:'center'})` it reported `opacity: 1`. The reveal
   works; `whileInView` was behaving correctly.

**Lesson for anyone re-running this:** headless `--screenshot` fires near the load event, so
viewport-height, fragments and page intros decide what you capture. Verify a suspicious frame against
the DOM before calling it a bug.

---

## 2. What the codebase actually contains

Measured by `npm run audit:css` against the tree at the time of writing (**including** the
in-flight `data-os` work in `src/lib/osTier.ts`, `src/components/OsTagScript.tsx` and the
`html[data-os='windows']` block at the end of `globals.css`):

> 2 stylesheets · 48 findings · **6 missing WebKit prefixes** · **19 fragile combinations** ·
> **23 engine floors**

Those counts are a snapshot and they moved while this was being written (49/6/19/24 by the time the
last `data-os` CSS landed) — the tree is live. Run `npm run audit:css -- --all` for the current list;
the *kinds* of finding and the two sticky surfaces below are what matter, and they are stable.

### 2.1 `backdrop-filter` on sticky surfaces (2)

| Selector | Line | What it sets |
|---|---|---|
| `.gallery-header` | `globals.css:2647` (glass at `2652`) | `position: sticky` + `background` + `backdrop-filter: blur(12px) saturate(1.1)` |
| `.sticky-profile-card` | `globals.css:3679` (glass at `3686`) | `position: sticky` + `background` + `backdrop-filter: blur(14px) saturate(1.08)` + `overflow: hidden` |

These are the only two. Both put background **and** blur on the sticky box itself — the exact shape
Safari 26 samples for toolbar tint (§4.3), and the shape that measurably tints the iOS status bar.

There are **83** `backdrop-filter` declarations in `globals.css` overall; almost all are correct and
cheap. The two above are the ones with a documented cross-engine behaviour attached.

### 2.2 Clipped gradient text (5 rules, 4 live)

All five set `background: <gradient>` + `background-clip: text` + a transparent fill, so the glyphs
have **no fill of their own** — if the clipped background fails to composite, the text is laid out
with no pixels.

| Rule | Line | Usage |
|---|---|---|
| `.gold-shimmer` | `globals.css:1775` | **dead** — no component renders it |
| `.gold-sunset-shimmer` | `globals.css:1791` | live, 6+ routes + footer; also animates `background-position` forever |
| `.display-heading` | `globals.css:3610` | journey + accolades headings; ancestor is a framer-motion element |
| `.profile-name` | `globals.css:3722` | inside the backdrop-filtered sticky card |
| `.atelier-brand-title` | `globals.css:4549` | brand lockup |

Note `.gold-shimmer`/`.gold-sunset-shimmer` rely on `color: transparent` only, while the other three
also set `-webkit-text-fill-color: transparent`. Same effect in current engines; the inconsistency is
worth removing.

### 2.3 `will-change: transform` (19 places)

Important ones: `.painting-lb-zoom` (`globals.css:6040`) and the lightbox zoom wrapper in
`LightboxModal.tsx:481` (`will-change-transform` + `transition-[transform] duration-75`). The rest are
entrances and ambient layers (`.reveal:1938`, `.page-ambient-orb:433`, `.header-drawer:2842`,
`.botanical-branch:3216`, `.lux-sheen:3282`, `.exhibition-ticker-track:4088`, `.foil-petal:4730`,
`.atelier-dust-flake:4823`, `.c3d-card-shell.is-live:5771`, `.glass-btn-*:6845`, …).

Only the zoom path is scale-changing, which is where the behaviour in §4.1 bites.

### 2.4 Blend layers (4)

`.atelier-grain` (`3135`, `[data-theme='light']` `3142`), `.leaf-highlight` (`3228`),
`.procedural-grain-layer` (`4670`, light at `4677`) — the grain overlays use `mix-blend-mode` over a
page that also carries blurred ambient layers and a fixed wash.

### 2.5 Already handled, do not "fix" again

- **No `background-attachment: fixed` anywhere** (only comments explaining its removal). That
  matters: Gecko's worst `backdrop-filter` interaction is exactly this combination (§4.2).
- No `oklch()`, `color-mix()`, `light-dark()` — no modern-colour fallback debt.
- No `@container`, `:has()`, or CSS nesting.
- `mask-image`/`mask` and `backdrop-filter` are consistently prefixed in hand-written CSS (Tailwind
  emits both forms itself).

### 2.6 Tier detection is Chromium-only

`src/lib/perfTier.ts` reads `navigator.deviceMemory` and `navigator.connection`. **Both are
Chromium-only APIs** — Firefox and Safari implement neither, so on those engines the check reduces to
`prefers-reduced-motion` alone and a capable-looking `hardwareConcurrency`. Safari and Firefox users
therefore get `data-perf="full"` (88 px orb blurs, live grain, the heavy paint) unless they have
reduced-motion enabled. `src/lib/osTier.ts` has the mirror-image problem: it gates on the OS rather
than on the capability, so a Linux/ChromeOS Chromium in software compositing, or macOS Chrome with
GPU acceleration switched off, gets none of the fallbacks.

---

## 3. Measured evidence

### 3.1 The lightbox zoom is under-sampled by construction

Probed live in a real browser with the lightbox open on the home page carousel:

| | at 1× | at 5× (8 × zoom-in clicks) |
|---|---|---|
| `currentSrc` | `p36-480.webp` | `p36-480.webp` (unchanged) |
| source width (intrinsic) | 403 | 403 |
| rendered size | 404 CSS px | **2 020 CSS px / 2 213 device px** |
| source pixels ÷ device pixels | 0.91 | **0.18** |
| `will-change` on wrapper | `transform` | `transform` |
| wrapper transition | — | `transform 0.075s` |

Two independent faults:

- **The `sizes` descriptor is fixed at `92vw`**, so the browser selects a derivative for the
  *unzoomed* box and never re-selects when the user zooms. That painting has derivatives up to
  `p36-1417.webp` available and the app never asks for them. Forcing `sizes="1600px"` immediately
  loaded `p36-960.webp` — proof the mechanism works, and that nothing triggers it.
- **`will-change: transform` on the scaling wrapper** suppresses re-rasterisation (§4.1), so the
  layer is magnified as a texture even where source pixels exist. This was measured against HEAD's
  `LightboxModal`. The in-flight Windows work now sets an inline `willChange: 'auto'` on that wrapper
  **when `data-os='windows'`**, which lifts the penalty on Windows only — macOS, WebKit, Linux and
  any Chromium that does not match the UA pattern keep it. The wrapper's permanent
  `transition-[transform] duration-75` also remains on every platform, and a transform transition
  promotes the layer while it runs regardless of `will-change`.

Also measured at the same time: the dialog container carries **`backdrop-filter: blur(40px)` over the
entire viewport** (Tailwind `backdrop-blur-2xl` on the `fixed inset-0` element,
`LightboxModal.tsx:357`), and the zoomed `<img>` is a **descendant of that backdrop root**. The
`<img>` also carries `transition-all duration-500` (`LightboxModal.tsx:529`), so it animates opacity
*and* transform during the reveal.

### 3.2 The lite tier does change rendering (so it is not a no-op)

Full-viewport captures, 1440×900, diffed with `sharp`:

| Comparison | Mean abs diff | Pixels differing > 8 |
|---|---|---|
| Chrome `/` vs `/?perf=lite` | 13.35 | **32.6 %** |
| Firefox `/` vs `/?perf=lite` | 2.38 | 0.9 % |
| Chrome DPR 1 vs DPR 1.25 + `--disable-gpu` | 28.96 | 97.8 % |

The Chrome delta confirms the tier visibly changes the paint. **The Firefox row is not usable**: both
Gecko captures land during the intro sequence (mean luminance and low variance are consistent with
the intro overlay), so 0.9 % says nothing about the tier in Gecko. DPR 1 vs 1.25+software differs
almost everywhere, as expected for a different pixel grid — it does not by itself prove or disprove
any specific composite bug.

### 3.3 The Windows-gated fallbacks, evaluated off Windows

Setting `document.documentElement.dataset.os = 'windows'` in a real browser and reading computed
styles is the fastest way to review that block without a Windows machine. Results:

- `.display-heading`, `.profile-name`, `.atelier-brand-title` → `background-image: none`,
  `background-clip: border-box`, fill `rgb(232, 201, 106)`. **Correct.**
- `.gold-sunset-shimmer` → `background-clip: border-box` **but `background-image` still set** to the
  gradient, fill gold. That paints the gradient across the element box: a slab behind the text.
  **Wrong**, and reachable on six routes (§0.1).

### 3.4 The artist-section reveal works

`.chapter-card` reports `opacity: 1` once genuinely in view (§1). There is no evidence of a
`whileInView` failure on this machine. Anything that looks like an empty journey section should be
diagnosed as a paint/stacking issue (gradient text, backdrop-filter) rather than a JS reveal issue.

---

## 4. External findings, and what each predicts here

### 4.1 Chromium/WebKit: `will-change: transform` disables re-rasterisation on scale

Chrome's own note: *"Starting in Chrome 53, all content is re-rastered when its transform scale
changes, if it does not have the `will-change: transform` CSS property."*
(`developer.chrome.com/blog/re-rastering-composite`)

**Predicts here:** any element that scales *and* declares `will-change: transform` keeps a raster
computed at one scale and is then magnified as a texture. That is exactly `LightboxModal.tsx:481`.
The documented remedy is to hold `will-change` for the duration of the gesture and drop it when the
transform settles, so the final frame re-rasterises at the new scale — the same pattern already used
for `.c3d-card-shell.is-live`.

### 4.2 Gecko: `backdrop-filter` + `background-attachment: fixed` = tiling artefacts

Isolated by webcompat as *"the combination of `background-attachment: fixed` and `backdrop-filter`.
When `background-attachment` is set to scroll, the artifacts disappear"*
(`webcompat/web-bugs#207254`; see also Bugzilla 1741305, "blur produces jarring, high-contrast
artifacts that look like tiles").

**Predicts here:** nothing right now — the fixed background attachment was already removed in favour
of a fixed composited layer. It is a **do-not-reintroduce** entry: any future `background-attachment:
fixed` behind a translucent panel resurrects this, and `npm run audit:css` will flag it (§8).

### 4.3 WebKit/Safari 26: sticky and fixed elements tint browser chrome

Safari 26's Liquid Glass chrome derives its tint from the page. The algorithm scans
`position: fixed`/`sticky` elements near the viewport edges and reads **`background-color` and
`backdrop-filter` on the element itself**. It **ignores** absolute children and pseudo-elements
(`::before`/`::after`), and it **still reads** fixed elements that are merely `opacity: 0` or
`pointer-events: none` unless they are `display: none`. It also ignores the `theme-color` meta tag.
The documented fix is a transparent fixed/sticky parent with the visual glass on a `position:
absolute` child. (`1ar.io/updates/safari-26-liquid-glass-web/`; corroborated by iOS 26 reports of
fixed/sticky layouts drifting, e.g. Stack Overflow 79753701.)

**Predicts here — and this is the important one:** `.gallery-header` (`globals.css:2647`) and
`.sticky-profile-card` (`3679`) put background **and** blur on the sticky element itself, so they
tint Safari's status bar and toolbar with the site's colours. On iOS that is the visible symptom;
on macOS Safari 26 it affects window chrome. `data-os='windows'` cannot reach any of it, so
**the Windows gate leaves the WebKit half of the problem unfixed** even though the same
"transparent parent, absolute child" restructure fixes both cases at once.

### 4.4 Windows display scaling: 125 %/150 % and `backdrop-filter`

Multiple reports of `backdrop-filter` misbehaving specifically at 125 %+ Windows scaling (which is
the laptop default), plus the general DPI-scaling blur reports. Combined with the software-compositing
fallback Chromium takes on driver-blocklisted or acceleration-disabled machines, this is consistent
with the Windows-only reports — but note it is **inference from reports, not a measurement made
here**. §6 exists to convert it into evidence.

---

## 5. Per-engine risk matrix

| Construct in this codebase | Chromium | WebKit | Gecko | Action |
|---|---|---|---|---|
| `backdrop-filter` on a `sticky` header/card (`.gallery-header`, `.sticky-profile-card`) | works; expensive per scroll frame | **tints browser chrome (Safari 26)**; long-standing sticky+backdrop paint quirks | works, least mature implementation | §7-A5 |
| Full-screen `backdrop-filter` on the lightbox (`LightboxModal.tsx:357`) | full-viewport resample every frame; creates a backdrop root around the zoomed image | same | worst case for Gecko | §7-A4 |
| `will-change: transform` on a scaling element (zoom wrapper) | **no re-raster** | **no re-raster** | no re-raster | §7-A2 |
| `background-clip: text` + transparent fill | blanks out on Windows/software compositing | can blank inside transformed/backdrop-filtered ancestors | generally OK, but animating the clipped background flickers more | §7-A6 |
| Fixed `sizes` on a zoomable `<img>` | picks for the unzoomed box, never re-selects | same | same | §7-A3 |
| `mix-blend-mode` grain over blurred layers | fine | fine but compositing-sensitive | fine | §7-A7 |
| `min-height: 100vh` / `max-h-[70vh]` | fine | **wrong under the dynamic toolbar** | fine | §7-A8 |
| `overscroll-behavior-x`, `:focus-visible`, `text-wrap: balance` | fine | Safari 16 / 15.4 / 17.5 | Firefox 59 / 85 / 121 | documented floors, no action |
| Tier detection via `deviceMemory` / `connection` | works | **absent → never lite** | **absent → never lite** | §7-B1 |
| Windows-only gate (`data-os`) | reaches Chrome/Edge/Brave on Windows | **unreachable** | **unreachable** (also misses Linux/ChromeOS and acceleration-off macOS) | §7-B2 |
| `forced-colors: active` (Windows High Contrast) | **no handling** — translucent panels and gradient fills are reduced to system colours | n/a | n/a | §7-B3 |

---

## 6. The two-minute bisect on a real Windows machine

Everything below needs no code change. Do it in Chrome **and** Edge.

1. **Is it the lite tier?** Load `/` then `/?perf=full`. If the full tier fixes it, the fault is our
   tier CSS, not Windows. (Windows "Animation effects: off" and small-core machines both stamp
   `lite`.)
2. **Is it `backdrop-filter`?** DevTools → select `.sticky-profile-card` and `.gallery-header` →
   untick `backdrop-filter` and `-webkit-backdrop-filter`. If the section recovers, it is backdrop
   compositing.
3. **Is it clipped text?** Select `.display-heading` / `.profile-name` → set
   `-webkit-text-fill-color: currentColor`. If the text appears, the clipped fill is failing.
4. **Is it the rasterisation rule?** In the lightbox at 5×, on the scaling wrapper set
   `will-change: auto`, then nudge the zoom one step. If the painting sharpens, §4.1 is confirmed.
5. **Reset the lightbox scrim.** On the dialog, untick `backdrop-filter: blur(40px)`.
6. **Capture the environment:** `chrome://gpu` (is "Compositing" hardware or software?),
   `devicePixelRatio`, `outerWidth - innerWidth` (browser zoom), and Windows display scaling
   (100 % vs 125 % vs 150 %).

Report which toggle changed the pixels. That single answer decides which half of §7 matters.

---

## 7. Fix list

Ordered so that the largest, safest wins come first. "No visual change on a healthy compositor"
means the change is invisible on macOS/Android Chrome and can be made unconditionally.

### Tier A — surgical, no visual change on a healthy compositor

**A1. `.gold-sunset-shimmer` slab.** In the `html[data-os='windows']` block, add `background: none;`
(and `background-size: auto;`) alongside the existing `background-clip: border-box`, matching the
`.display-heading` treatment. *Verified wrong today (§3.3). Reachable on Home, `/sale`, `/classes`,
`/about`, footer.*

**A2. Stop suppressing re-rasterisation on the zoom wrapper — on every engine.** In
`LightboxModal.tsx:481`, drop the permanent `will-change-transform`; set `will-change: transform` on
gesture start and remove it (for one frame) when the gesture settles, so Chromium and WebKit
re-rasterise at the final scale. Mirror the `is-live` pattern from `Carousel3D`. *Measured cause
(§3.1, §4.1).* **Partly done:** the in-flight work sets inline `willChange: 'auto'` when
`data-os='windows'`, which covers Windows only. The remaining work is the gesture-scoped version for
all engines, plus removing the wrapper's permanent `transition-[transform] duration-75`, which
promotes the layer during the transition on Windows too.

**A3. Give the zoom real pixels.** Once `scale > ~1.5`, re-point the `<img>` at the widest available
derivative (`imageUrl(src, 9999)` already returns the largest ≤ original) or raise the `sizes`
descriptor as a function of scale. Without this, 5× magnification is 0.18 source px per device px by
arithmetic, whatever the compositor does. *Measured (§3.1).*

**A4. Make the lightbox scrim opaque.** `LightboxModal.tsx:357` is `bg-[#08040d]/95` **plus**
`backdrop-blur-2xl` — the blur is invisible behind a 95 %-opaque scrim but costs a full-screen
resample per frame and wraps the zoomed image in a backdrop root. Replace with a baked
gradient/opaque scrim. *Measured (§3.1).*

**A5. Move the glass off the sticky boxes.** For `.gallery-header` (`globals.css:2647`) and
`.sticky-profile-card` (`3679`): keep the sticky parent with `background: transparent` and no
`backdrop-filter`; put the glass on an `::after`/absolute child. Safari 26 then stops tinting its
chrome, and the sticky paint path loses both surfaces. Also fixes the one case `data-os` can never
reach (§4.3). *Cited behaviour, high confidence, worth doing before the next iOS test.*

**A6. Give every clipped-text rule a real fill fallback.** Extend the `data-os` treatment (or a
`@supports`-guarded equivalent) to all five rules in §2.2, including the shimmer pair, and add
`-webkit-text-fill-color: transparent` to the two shimmer rules so all five are written the same way.

**A7. Split the reveal from the scale on the lightbox `<img>`.** `LightboxModal.tsx:529` uses
`transition-all duration-500`; scope it to `opacity` so the scaled element is not also
transform-animating. **Partly done, with a mismatch:** the Windows branch removes the transition
class outright, so the image snaps in with no fade there, while the comment above it says the
entrance "keeps only the opacity fade". An opacity-only transition for all engines satisfies both
intents.

**A8. Use `dvh` where the mobile toolbar makes `vh` wrong.** `globals.css:269` (`min-height: 100vh`)
and the lightbox image's `max-h-[70vh]`. The `dvh` pair is already used elsewhere
(`globals.css:4345`, `5019`), so this is consistency, not novelty.

### Tier B — gated, because the substitution is visible

**B1. Detect the capability, not the OS.** Add engine-neutral inputs to `perfTier.ts`: treat
`hardwareConcurrency <= 2` (works in all engines) as before, and add a **runtime** signal — if
frame-time stays above ~30 ms for a couple of seconds, stamp `lite` live. That covers Safari and
Firefox, where `deviceMemory`/`connection` will never exist, and any Chromium that is slow for
reasons the APIs cannot see. Keep `?perf=lite|full` as the manual override.

**B2. Broaden the fallback trigger beyond `Windows NT`.** `osTier.ts` matches a UA string. The same
broken compositing appears on Linux/ChromeOS Chromium and on macOS with acceleration disabled, and
is *not* guaranteed on a capable Windows desktop. Consider probing the renderer string
(`WEBGL_debug_renderer_info` → `SwiftShader`, `Microsoft Basic Render Driver`, `ANGLE … Direct3D9`)
and OR-ing it with the OS check.

**B3. Add a `forced-colors: active` block.** Windows High Contrast strips translucent backgrounds
and gradient fills, so panels that rely on colour alone lose their edges. Provide
`border: 1px solid CanvasText`-style outlines for the main surfaces. No handling exists today.

**B4. Remove the `images.unsplash.com` dependency.** Three `featuredPaintings[].image` entries point
at a third-party host. That is the only reason `next.config.js` needs `remotePatterns`, it is a
Brave-Shields and offline failure mode, and local assets exist.

### Tier C — worth knowing, decide later

- `ui-monospace, SFMono-Regular, Menlo, monospace` (`globals.css:1019`, `1163`, `1245`, `1333`,
  `1395`, `5819`) has no Windows face; Windows lands on Consolas/Courier New with different metrics.
  Add `Consolas, 'Courier New'` before the generic.
- `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility`
  (`globals.css:273-274`) are no-ops on Windows and in Firefox, so Windows text renders heavier than
  the macOS-tuned design assumes. Just be aware; nothing to fix.
- `content-visibility: auto` on below-fold sections remains open (needs the journey's sticky column
  tested on a device first).

---

## 8. The guard: `npm run audit:css`

`scripts/audit-css-compat.mjs` scans hand-written CSS in `src/**/*.css` and reports three kinds of
finding (counts below are the snapshot in §2; re-run `--all` for live numbers):

1. **Missing WebKit prefixes** — a property WebKit only understands prefixed, in a rule that does not
   also declare the `-webkit-` twin. Today: 6 (`transform-style: preserve-3d` × 5 on the carousel
   stages, `user-select: none` on `.painting-lb-img`). **Verify with `CSS.supports()` in a real
   Safari before "fixing"** — engine support moves, and the list in the script is deliberately
   conservative.
2. **Fragile combinations** — sticky/fixed + `backdrop-filter` in one rule, `backdrop-filter` with
   `background-attachment: fixed`, clipped text in a rule that also composites, `will-change:
   transform` on something that scales, `mix-blend-mode` layers. Today: 19.
3. **Engine floors** — `:has()`, `dvh`, `text-wrap: balance`, `overscroll-behavior`,
   `:focus-visible`, etc., with the version each needs. Today: 23. Informational.

```bash
npm run audit:css                # fail on findings that are not in the baseline
npm run audit:css -- --all       # print every finding, grouped by file and line
npm run audit:css -- --update    # accept the current state as the new baseline
```

`scripts/css-compat-baseline.json` records today's findings, keyed as `file|selector|rule` (not by
line, so unrelated edits above them do not invalidate the baseline). The audit is **green now and
fails only on regressions**, which is why it could ship without touching application CSS.

Two stated limitations: it reads CSS files, not Tailwind classes (Tailwind emits both prefixed and
unprefixed forms itself, so that is the right boundary), and it matches risks **within a single rule**
— a clipped-text element inside a composited *ancestor* needs human review, which is what §2.2
enumerates.

---

## 9. Verification recipes

### 9.1 Chromium-family, from the CLI

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# plain
"$CHROME" --headless --no-first-run --user-data-dir=/tmp/p1 --window-size=1440,900 \
  --screenshot=/tmp/shots/home.png "http://127.0.0.1:3131/"
# software compositing at Windows-like scaling
"$CHROME" --headless --disable-gpu --force-device-scale-factor=1.25 \
  --no-first-run --user-data-dir=/tmp/p2 --window-size=1440,900 \
  --screenshot=/tmp/shots/home-sw.png "http://127.0.0.1:3131/"
```

Notes learned the hard way: `--headless=new` was removed in Chromium 132 (this is 153) and silently
falls back — use bare `--headless`; **do not pipe Chromium's stdout** (`| tail` hangs forever because
its helpers hold the pipe open) — redirect to a file and kill the process; `--virtual-time-budget`
does not rescue a capture taken behind an intro sequence.

### 9.2 Gecko

```bash
FF="/Users/abhay/Applications/Firefox.app/Contents/MacOS/firefox"
"$FF" --headless --no-remote -profile /tmp/ff-prof --window-size=1440,900 \
  --screenshot /tmp/shots/ff-home.png "http://127.0.0.1:3131/"
```

Firefox captures at the load event, which here lands during the intro — treat a Gecko screenshot as
suspect unless it shows settled content.

### 9.3 WebKit, the part that needs you

Once, in Safari: **Settings → Advanced → “Show features for web developers”**, then
**Develop → Allow Remote Automation**. After that I can run the full WebDriver pass
(navigate, scroll, open the lightbox, zoom, read computed styles, screenshot). Without it there is no
WebKit evidence from this machine, and I will keep saying so.

Manual check-list while it is unavailable:

1. `.gallery-header` — does Safari's **status bar / toolbar tint** pick up the header colour on iOS
   26 or macOS Safari 26?
2. Journey section: is the `Anuradha Govarthanan` name and the headings visible, or laid out with no
   glyphs (§2.2)?
3. Carousel: is `preserve-3d` actually honoured (`CSS.supports('transform-style','preserve-3d')` and
   the computed value on `.c3d-stage--spotlight`), given the unprefixed declaration?
4. Lightbox at 5×: soft, or acceptable?
5. `?perf=lite` vs `/`: does anything change? (On Safari, `data-perf` should read `full` in both —
   see §2.6 — unless you force the URL parameter.)

---

## 10. Status

**Measured here:** the zoom-sampling arithmetic and `will-change` state (§3.1); the full-screen
lightbox blur (§3.1); the sticky glass surfaces (§2.1); the shimmer slab regression (§3.3); the lite
tier's visible effect in Chrome (§3.2); the reveal working (§3.4); the whole static inventory (§2).

**Cited, not observed:** the Chromium re-raster rule, the Gecko `backdrop-filter` +
`background-attachment: fixed` artefacts, the Safari 26 tint algorithm, iOS 26 fixed/sticky
behaviour, Windows 125 % scaling reports.

**Unverified:** real Windows, Edge, iOS, Android; all WebKit rendering; Gecko tier comparison; Brave
Shields behaviour.

**Fixed by the time you read this?** Nothing in §7 has been applied by this document's author — the
fixes are the Windows thread's to land. `npm run audit:css` will tell you, per finding, whether an
entry is still open.
