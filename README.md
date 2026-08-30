# 🎨 Anugruja Arts Studio — Production Web Platform & Art Gallery

[![Website](https://img.shields.io/badge/Website-Live_Art_Studio-F2D770?style=for-the-badge&logo=google-chrome&logoColor=black)](https://abhay2008.github.io/AnugrujaArtsStudio/)
[![HTML5](https://img.shields.io/badge/HTML5-Semantic_Markup-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Custom_Responsive_System-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A commercial web platform and digital portfolio engineered for **Anugruja Arts Studio** (founded by Master Artist and Curator **Anuradha Govarthanan**). Handcrafted in **10th Grade (2024)** prior to the emergence of modern generative AI web builders, showcasing custom responsive layouts, interactive art carousels, course catalogs, and commercial commission workflows.

---

## 🌟 Studio Overview & Features

- **Digital Art Showcase (`index.html` & `sale.html`):** Categorized collections of handmade paintings across watercolors, acrylics, oil, Tanjore, Mysore, Kerala murals, and pastels.
- **Course & Exam Coaching Catalog (`classes.html`):** Complete syllabus and registration details for regular batches, 1-year fine arts diplomas, summer camps, and entrance exam coaching (**NATA, NID, NIFT, CEED, UCEED, BFA**).
- **Artist Biography & Achievements (`about.html`):** Comprehensive chronicle of 20+ years of artistic mentorship, government awards, MNC workshops, and international art festival exhibitions.
- **Direct Commission & Inquiry Bridge:** Integrated direct-action bridges for customer commissions, portrait requests, and WhatsApp/Email business inquiries.

---

## 📐 Architecture & Refactored Engineering Highlights

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT BROWSER / VIEWPORT                          │
│                                                                                   │
│   ┌───────────────────────────────────────────────────────────────────────────┐   │
│   │                 Responsive Fixed Navigation Bar (#header)                 │   │
│   │    [Social Links] <======> [Artist Title / Logo] <======> [Dropdown Menu] │   │
│   └───────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                         │
│                      ┌──────────────────┴──────────────────┐                      │
│                      ▼                                     ▼                      │
│        ┌───────────────────────────┐         ┌───────────────────────────┐        │
│        │   Touch-Optimized Gallery │         │ Interactive Dual-Action   │        │
│        │   Scroller (.art-scroller)│         │ Contact Bar (.contact-bar)│        │
│        │   • CSS Scroll-Snap       │         │ • Direct Gmail Compose    │        │
│        │   • Hover Zoom & Shadow   │         │ • Direct WhatsApp Chat    │        │
│        │   • Pause-on-Touch Timer  │         │ • Accessible Touch Area   │        │
│        └───────────────────────────┘         └───────────────────────────┘        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Improvements & Bug Fixes:
1. **Responsive Flexbox Header (`assets/css/custom.css`):** Replaced hardcoded absolute positioning with fluid Flexbox and `clamp()` typography, preventing collisions between social media badges and the navigation dropdown on mobile devices.
2. **Unified Gallery & Slideshow Engine (`assets/js/gallery-controller.js`):** Consolidated disjointed inline script timers into a single, encapsulated controller with automatic pause-on-hover, touch swiping, and clean timer recycling.
3. **Smooth Scroll-Snap Scrollers:** Added `-webkit-overflow-scrolling: touch`, `scroll-snap-type: x mandatory`, and gold custom scrollbars to prevent awkward image clipping.
4. **Accessible Contact Action Card:** Resolved invalid nested button-link elements into a clean, mobile-responsive dual-action card.
5. **Zero Content Drift:** Preserved 100% of all original paintings, client testimonials, course descriptions, phone numbers, and artist history.

---

## 📂 Project Structure

```
AnugrujaArtsStudio/
├── index.html                  # Landing page, studio introduction, and featured works
├── about.html                  # Artist biography, awards, exhibitions, and achievements
├── classes.html                # Fine arts courses, diploma syllabus, and summer camps
├── sale.html                   # Painting catalog for sale and custom commission requests
├── assets/
│   ├── css/
│   │   ├── custom.css          # Refactored responsive alignment and theme stylesheet
│   │   ├── main.css            # Base structural theme
│   │   └── noscript.css        # Fallback styles for non-JS environments
│   ├── js/
│   │   ├── gallery-controller.js # Encapsulated gallery scroller and slideshow manager
│   │   ├── main.js             # Navigation and page wrapper handlers
│   │   └── util.js             # Utility helpers
│   └── webfonts/               # FontAwesome icon packages
└── images/                     # Studio artwork catalog, portraits, and certificates
```

---

## 🚀 Local Preview

```bash
# Clone the repository
git clone https://github.com/abhay2008/AnugrujaArtsStudio.git
cd AnugrujaArtsStudio

# Open in browser or serve locally
npx serve .
# or
python3 -m http.server 8000
```

Visit `http://localhost:8000` to browse the studio.

---

## 👨‍💻 Developer

**Abhay Kashyap**  
*Undergraduate in Computer Science & Business Systems @ BMSCE Bangalore*  
*Full-Stack Developer & Hardware-Software Integration Specialist*  
[GitHub Profile](https://github.com/abhay2008) • [LinkedIn](https://linkedin.com/in/)
