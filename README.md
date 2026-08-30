# 🎨 Anugruja Arts Studio — Production Web Platform & Art Gallery

[![Website](https://img.shields.io/badge/Website-Live_Art_Studio-F2D770?style=for-the-badge&logo=google-chrome&logoColor=black)](https://abhay2008.github.io/AnugrujaArtsStudio/)
[![HTML5](https://img.shields.io/badge/HTML5-Semantic_Markup-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Responsive_Design-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A commercial client website and digital fine arts portfolio engineered for **Anugruja Arts Studio** (founded by Master Artist and Curator **Anuradha Govarthanan**). Handcrafted in **10th Grade (2024)** prior to the emergence of modern generative AI web tools, showcasing custom responsive layouts, interactive art carousels, course catalogs, and commercial commission workflows.

---

## 🌟 Studio Overview & Features

- **Digital Art Showcase (`index.html` & `sale.html`):** Categorized collections of over 100+ handmade paintings across watercolors, acrylics, oil, Tanjore, Mysore, Kerala murals, and pastels.
- **Course & Exam Coaching Catalog (`classes.html`):** Complete syllabus and registration details for regular batches, 1-year fine arts diplomas, summer camps, and entrance exam coaching (**NATA, NID, NIFT, CEED, UCEED, BFA**).
- **Artist Biography & Achievements (`about.html`):** Comprehensive chronicle of 20+ years of artistic mentorship, government awards, MNC workshops, and international art festival exhibitions.
- **Direct Commission & Inquiry Bridge:** Integrated direct-action bridges for customer commissions, portrait requests, and WhatsApp/Email business inquiries.

---

## 📐 Architecture & Layout Highlights

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT BROWSER / VIEWPORT                          │
│                                                                                   │
│   ┌───────────────────────────────────────────────────────────────────────────┐   │
│   │                 Responsive Header Navigation Bar (#header)                │   │
│   │    [Social Links] <======> [Artist Title / Logo] <======> [Dropdown Menu] │   │
│   └───────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                         │
│                      ┌──────────────────┴──────────────────┐                      │
│                      ▼                                     ▼                      │
│        ┌───────────────────────────┐         ┌───────────────────────────┐        │
│        │   Interactive Gallery     │         │ Direct Contact Action Bar │        │
│        │   Scroller (.scroller)    │         │ • Direct Gmail Compose    │        │
│        │   • Auto-scrolling timers │         │ • Direct WhatsApp Chat    │        │
│        │   • Gold border highlights│         │ • Accessible Touch Points │        │
│        │   • Smooth touch physics  │         │                           │        │
│        └───────────────────────────┘         └───────────────────────────┘        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

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
│   │   ├── main.css            # Base structural theme (Landed HTML5 UP)
│   │   └── noscript.css        # Fallback styles for non-JS environments
│   ├── js/
│   │   ├── main.js             # Navigation and page wrapper handlers
│   │   ├── jquery.min.js       # jQuery core library
│   │   ├── jquery.scrolly.min.js # Smooth scroll navigation
│   │   └── util.js             # Utility helpers
│   └── webfonts/               # FontAwesome icon packages
└── images/                     # 130+ Studio artwork catalogs, portraits, and certificates
```

---

## 🚀 Local Preview

```bash
# Clone the repository
git clone https://github.com/abhay2008/AnugrujaArtsStudio.git
cd AnugrujaArtsStudio

# Serve locally
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
