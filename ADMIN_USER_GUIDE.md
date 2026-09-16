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
* Drag & drop multiple painting photos from phone/desktop.
* Background HTML5 canvas optimization compresses images without quality loss.
* Set artwork titles, medium categories, and sale prices.
* Select target destination gallery:
  * Featured Gallery (Home)
  * Art for Sale
  * Commissioned Works
  * Classes & Courses
  * Watercolor Courses
  * Workshops & Exhibitions
  * Testimonials & Student Success
  * Achievements & Awards

### 2. Gallery Manager (`/admin` -> Manage Galleries & Artworks)
* Switch between 8 galleries with live artwork counts and badges.
* **Filter & Search Bar**: Search artworks across the selected collection by title, medium, or price in real-time.
* **Card Editor**: In-place inline title, category, price, medium, and description editing. Every painting's name and description are displayed on the public carousel — edit them here to update the live site.
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
