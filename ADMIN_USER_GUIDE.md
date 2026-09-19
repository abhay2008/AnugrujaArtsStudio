# 🎨 Anugruja Arts Studio — Admin Portal & CMS User Guide

Welcome to the **Anugruja Arts Studio Admin Console & CMS**. This portal is patterned directly after the Jeeva Art School Admin architecture, modernized with Next.js 15 App Router, TypeScript, and Git-backed persistence.

---

## 📐 Architecture & Persistence

* **Git-Backed Headless CMS**: All text, brand details, and 8 artwork galleries reside in `content/site.json`.
* **Zero-Lag Visual Feedback**: As you select images or rearrange galleries, canvas-first image optimization and client state update immediately.
* **Direct GitHub Commits**: Clicking **"Review & Commit to GitHub"** pushes binary assets to `public/images/` and updates `content/site.json` through the GitHub REST Contents API.
* **Automated Rebuilds**: Pushes to `main` trigger instant edge builds on Vercel or cloud hosts.

---

## 🔐 Authentication & Session Security

* **URL**: `/login` (or navigate to `/admin` to be automatically redirected).
* **Admin Password**: Configured via the `ADMIN_PASSWORD` environment variable (set in Vercel Project Settings; required — there is no built-in default).
* **Session Lifespan**: Signed with HMAC-SHA256 cookie (`anugruja_admin_session`), lasting 1 hour with automatic expiration.

---

## 🛠️ Management Modules

### 1. Mass Upload Studio (`/admin` -> Mass Upload Studio)
* **Step 1 — Pick photos:** press *Choose photos* (opens your gallery/camera roll) or drag & drop. Pick one photo or many at once.
* **Step 2 — Describe them one at a time:** each photo fills the left side while its own form sits on the right. *Save details & next photo* walks the queue; *Previous / Next*, the progress bar, and the filmstrip let you jump around, and a green tick marks described photos.
* **Is this painting for sale?** This is the first question, and it decides everything else:
  * **Just show it** (default) — the painting goes to a showcase gallery as a portfolio piece. **No price is asked for it**, and none is stored. Pick which gallery it belongs in from *Which gallery should it appear in?*.
  * **Sell it** — the painting goes to **Art for Sale** so buyers can buy it, and only then does the form ask for **Price (₹)** and **Availability** (*Available / Reserved / Sold*).
  * Flipping the switch is safe: switching back returns the photo to the gallery you had chosen. Filenames still auto-match (`krishna-sale-2.jpg` → *Art for Sale*, `student-boat.jpg` → *Classes & Courses*), and a photo with no hint lands in a showcase gallery rather than being treated as stock for sale.
* **Frame each photo — crop, rotate & straighten:** press *Crop, rotate & straighten* under the photo. It works like a phone's photo editor: **pinch with two fingers (or scroll) to zoom in**, **drag to move the painting**, tap **Turn 90°** for a photo that came out sideways, and nudge **Straighten** to level a slight tilt. Pick a shape — *Whole photo, Square, Portrait, Landscape* — and press **Done**. Straightening automatically pulls the crop in to real paint, so no grey wedges ever reach the gallery. *Adjust framing* reopens it, *Use the original* puts the untouched photo back.
* **Step 3 — Publish:** nothing needs ticking — **every photo in the queue is included**. *Publish this photo to <gallery>* uploads and commits just the painting on screen; *Publish all N photos* commits the whole queue together after a review screen showing each painting with its gallery, price and for-sale status. To leave a photo out, remove it from the queue.
* The queue survives switching tabs, so you can check the galleries or the events mid-queue without losing your photos.
* Gallery auto-matching: filenames like `krishna-sale-2.jpg` or `student-boat.jpg` pick the right collection for you (shown as “✓ auto-matched from the filename”) — change the dropdown any time.
* Background HTML5 canvas optimization compresses images without quality loss while you type.
* Set artwork titles, section labels, medium and size; a price is asked for only when the piece is for sale.
* Where an upload can appear — **showcase galleries** (no price):
  * Featured Portfolio (home-page carousel)
  * Commissioned Works
  * Classes & Courses
  * Watercolor Courses
  * Workshops & Exhibitions
  * Testimonials & Reviews
  * Achievements & Awards
* …or the **commerce collection**, *Art for Sale* — the only gallery that shows prices, so it is the only one that asks for one. A painting that is already published can be moved between showcase and sale later in *Gallery Manager* ("Showcase piece — no price needed. Move it to Art for Sale below to sell it").

**Prices stay private until you set them.** No real price has been published yet, so every price on the public site appears as **XXXX** followed by a small *"Contact the studio for the actual cost"* note — on the Art for Sale grid, the home-page carousel, the zoom view, in what the AI assistant says, and in the WhatsApp message a buyer sends. The number only becomes real for visitors when you type a price and publish it (in the upload wizard or *Gallery Manager*) — then the XXXX disappears everywhere at once. While *you* are editing, the portal always shows true figures; the mask is for visitors only, and a price you change later updates everywhere on the next commit.

**Nothing to tick to commit.** Every edit anywhere in the console is staged automatically — a price in *Gallery Manager*, an event in *Events & Chatbot*, a listing in *Pages & Listings*, the studio details in *Brand & SEO* (press *Apply Settings* to send that form up) — and they all publish together in one commit from the *Review & Commit* button. The bar reads **All synced** only when there is genuinely nothing left to publish, and the review screen lists every pending change, so you can always see exactly what one commit will push.

**How prices appear to visitors (XXXX mask).** The public website never shows a price until *you* have saved one: every painting without an admin-set price displays **XXXX** with a small *“Contact the studio for the actual cost”* note — on the sale page tiles, the buy-paintings carousel, the enlarged artwork view, and the WhatsApp/Chitra assistant. The moment you save a price in the upload wizard or *Gallery Manager* and commit it, the real price (₹ with Indian formatting) replaces the mask everywhere automatically. Nothing else to toggle — saving a price *is* the switch.

### 2. Gallery Manager (`/admin` -> Manage Galleries & Artworks)
* Switch between 8 galleries with live artwork counts and badges.
* **Filter & Search Bar**: Search artworks across the selected collection by title, medium, or price in real-time.
* **Card Editor**: In-place inline title, category, price, medium, and description editing. Every painting's name and description are displayed on the public carousel — edit them here to update the live site. **Saving a price here confirms it**: that painting's XXXX mask on the public site is replaced by the real price after the next commit.
* **Jump to Position**: Direct numeric slot input to move an artwork to any position (e.g. move #24 to #1).
* **Steppers**: Move artwork to First, Left, Right, or Last positions with single clicks.
* **Quick Arrange (Table / List Mode)**: Lightweight compact view for rapidly reordering large collections.
* **Delete Modal**: Safe confirmation dialog with alert styling before removal.

### 3. Pages & Listings (`/admin` -> Pages & Listings)
* Manage the home-page scroll shortcut chips (Buy Paintings, Gallery, Workshops, etc.).
* Add, edit, reorder, or remove shortcuts that visitors see while scrolling.
* Each shortcut has a label, icon, link target, title, and subtitle.

### 4. Brand & SEO Settings (`/admin` -> Brand & SEO)
* Update founder name, tagline, contact number, WhatsApp link, and social handles.
* Update SEO browser titles and meta descriptions with live diff detection.
* Apply and commit changes directly to the repository.

### 5. Events & Chatbot (`/admin` -> Events & Chatbot)
* Maintain the studio's event calendar: **Upcoming** workshops/masterclasses and **Past** events & exhibitions.
* Every event has a title, display date, optional ISO date, location, description, registration link and (for past events) an outcome note.
* The next upcoming event automatically drives the home-page banner spotlight.
* **Meet Chitra 🤖** — the website now has an AI assistant visible on every page (bottom-right sparkle button). Chitra answers visitor questions using the live website data: paintings for sale with prices, sold/available status, classes, events and studio info.
  * **Zero maintenance:** Chitra re-reads the website content after every commit. Upload a new painting or change a price, and she knows immediately — no extra work.
  * **Safety:** Chitra only discusses the studio and art, never invents prices or dates, and hands purchase questions to WhatsApp. Rate limits protect the free AI quota.
  * Suggested prompt chips and the welcome message come from `chatbot` settings in `content/site.json` (advanced: edit via Brand & SEO commit or ask the developer).

---

## 🚀 Committing Changes to GitHub

Whenever you add artworks or make adjustments, a glowing floating indicator appears:
1. Click **"Review & Commit to GitHub"**.
2. A modal displays all detected modifications (new artworks, deleted artworks, edited titles/prices, brand/SEO updates, and reorderings).
3. Click **"Confirm & Commit to GitHub"** to commit directly to your GitHub repository.
