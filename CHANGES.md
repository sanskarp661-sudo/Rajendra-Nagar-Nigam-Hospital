# Version 7: full multi-page website

**From one page to 39 pages per language (78 in total, plus a 404 page).** Every page exists in English and Hindi.

- **Find a doctor:** 14 doctors, with search and filters by department, day ("available today") and gender, plus each doctor's next available slot.
- **Doctor profiles:** qualifications, languages, fee, a weekly OPD table with today highlighted, and a book button.
- **Departments:** 14 department pages covering conditions, services, timings, what to bring, doctors and related departments.
- **Booking:** a 5-step flow for a consultation, check-up package or lab tests.
  - Slots come from each doctor's schedule in Indian Standard Time. Past slots are disabled, and some are shown as already requested.
  - Patient details are validated (10-digit Indian mobile, age).
  - It ends with a reference number (RNH-YYMMDD-XXXX), a ready-to-send WhatsApp message, a calendar file (with a 2-hour reminder) and print.
  - Links from a doctor, package or lab list skip straight to the right step.
- **My appointments:** requests saved on the device. You can resend them on WhatsApp, add them to a calendar, cancel (which notifies the hospital on WhatsApp) or book again.
- **Health check-ups:** 6 packages with prices, included tests and preparation.
- **Lab tests:** 35 tests and scans with search, categories, fasting and report times. A test list with a running total carries into booking.
- **Other pages:**
  - Patients & visitors: timings, what to bring, admission and discharge, insurance & TPA, visiting rules, patient rights.
  - Emergency.
  - Contact: a Google Map that loads on request, and an enquiry form that opens in WhatsApp.
  - About.
- **Site search** (press /): doctors, departments, packages, tests and pages. It understands Hindi and common words such as "sugar" → diabetes tests and "child" → paediatrics.

**Data and content**
- All content lives in `data/*.json` (bilingual) and `templates/` (Jinja2). `build.py` generates every page and stops if any text is missing a translation.
- Doctors, timings, prices, packages, insurers and figures are **sample data**. They're marked "Sample" throughout, with a preview notice at the top of every page, and are controlled by `sample_mode` in `data/site.json`.
- No made-up reviews, accreditations or awards.
- New schema.org data: a Physician entry on each doctor page and breadcrumbs on all sub-pages.

**Quality**
- Tested in Chromium:
  - all 78 pages at widths from 320px to 1440px: no horizontal overflow;
  - 3,869 internal links: none broken;
  - axe-core on 13 page types × 2 languages × 2 screen sizes: 0 violations;
  - the booking, lab basket, package and My appointments flows end to end in both languages.
- Lighthouse, mobile:

| Page | Speed |
|---|---|
| Home | 94 |
| Doctors | 96 |
| Lab tests | 96 |
| Contact | 98 |
| Hindi home | 86 |
| Hindi booking | 85 |

  Accessibility, best practices and SEO are 100 on all of them, and layout shift is 0.

---

# Version 6: motion and live elements

**What moves, and why**
- **Hero slideshow:** the consultation and laboratory images crossfade every 7 seconds with a slow zoom, so diagnostics show up front. Labelled progress bars ("Consultations", "Diagnostics") let you jump between images, and a pause/play button meets WCAG 2.2.2 for auto-moving content. The slideshow also pauses when the tab is hidden.
- **Live status:** "Emergency open now · 9:13 pm in Ranchi", in Ranchi time, updated every 30 seconds, in English and Hindi. It's always true because emergency care is 24×7. Without JavaScript it reads "Emergency open 24×7".
- **Count-ups:** 24×7 and ₹500 count up when they come into view.
- **Services band:** a slow scrolling strip of all services that pauses on hover.
- **Scroll reveals:** sections and cards rise into place as you reach them, with a slight stagger.
- **Visit timeline:** the four step circles and their connectors fill in teal one after another.
- **Map:** the pin drops in, pulses, and a dotted route runs toward it.
- **Interaction:**
  - task tiles have a soft spotlight that follows the pointer, and their icons lift;
  - service images ease in when you switch;
  - FAQs open and close smoothly;
  - the footer number gets an underline sweep on hover.
- **Header:** a magenta-to-aqua reading-progress line and a shadow appear once you scroll; there's also a gentle parallax on the hero image.

**Accessibility and fallbacks**
- With "reduce motion" switched on, the slideshow doesn't auto-play and nothing animates on scroll. Everything is shown straight away.
- Without JavaScript all content is visible (about 5,100 characters, all 7 services).
- Animations only use transform and opacity, so nothing shifts the layout (CLS 0–0.002).

**Results**

| Page | Speed | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| English, mobile | 95 | 100 | 100 | 100 |
| English, desktop | 100 | 100 | 100 | 100 |
| Hindi, mobile | 80 | 100 | 100 | 100 |
| Hindi, desktop | 98 | 100 | 100 | 100 |

- axe-core: 0 violations.
- No horizontal overflow at any width from 320px to 1920px; no console errors.

`build.py` now also translates `data-play-*` and `data-pause-*` (the slideshow button labels).

---

# Version 5: redesign based on leading hospital websites

**Research.** I studied 10 hospital websites:
- Atlantic Health, UNC Health and Children's Nebraska, winners at the 2025 eHealthcare Leadership Awards;
- Mayo Clinic, Cleveland Clinic, Mount Sinai, Johns Hopkins and Mass General, frequently cited as best-practice references;
- Bumrungrad and Apollo/Narayana, the Asian and Indian benchmarks.

| What the best sites do | What this site now does |
|---|---|
| Open with tasks, not just a slogan (Atlantic, Bumrungrad, Cleveland) | Full-width photo hero, with a bar of four tasks: **Emergency 24×7** (magenta, with the number), **Book a consultation (₹500)**, **Tests & scans** (jumps to the diagnostics filter), **Get directions** |
| Emergency number always visible (Narayana, Bumrungrad, Apollo) | "Emergency open 24×7" top bar, the emergency task tile, and a giant phone number in the footer |
| "Not sure where to go?" helper (Cleveland) | The visit guide is offered right under the task bar |
| Services you can explore (Cleveland, Bumrungrad) | Service explorer: choose a service to see its description, what to ask the hospital, and a call button. Category filters still work. It uses keyboard-accessible tabs (arrow keys, Home, End). |
| Proof up front (Mayo, Apollo) | A band of large figures using only facts we have: 24×7, ₹500, ICU with NICU, one number |
| Plan-your-visit section with a map (Bumrungrad, UCLA) | A 4-step "Your visit, step by step" timeline and a large location panel with an address card |
| Dark, information-rich footer (Cleveland, Mayo) | A dark footer with a call-to-action, the phone number in large type, and link columns |

**Unchanged:**
- the build system (`src/index.html` → `python3 build.py`);
- English and Hindi pages;
- every preserved fact and link;
- the AI-image disclosure and the "coming soon" placeholders.

New text (the "ask the hospital about" points, the visit steps, the task labels) only rephrases existing guidance. It makes no new claims about the hospital, and every line has a Hindi version.

**Tested** in Chromium at widths from 320px to 1920px in both languages:

| Page | Speed | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| English, mobile | 98 | 100 | 100 | 100 |
| English, desktop | 100 | 100 | 100 | 100 |
| Hindi, mobile | 83 | 100 | 100 | 100 |
| Hindi, desktop | 99 | 100 | 100 | 100 |

- axe-core accessibility scan: 0 violations.
- Without JavaScript the page shows about 4,800 characters and all 7 services.
- No horizontal overflow and no console errors.

---

# Version 4: technical fixes from the audit

**Content is in the HTML, and Hindi has its own page.** All text used to be written in by JavaScript; without it, the page showed about 100 characters. `build.py` now generates complete pages from `src/index.html`:
- `/` (English) and `/hi/` (Hindi). Each page has proper `lang`, title and description, and a canonical link and hreflang tags pointing to the other language.
- Without JavaScript the page shows about 3,500 characters and 23 headings, and the navigation stays usable. Controls that need a script (filters, visit guide, mobile menu) are hidden in that case.
- The EN/हिंदी switch now goes to the other page and keeps your place on it. It still remembers the choice (same `hospital-language` key), so returning Hindi visitors land on `/hi/`.

**Search and sharing**
- schema.org `Hospital` data: name, phone, address, map link, Instagram, prices from ₹500. No opening hours or other unconfirmed facts.
- Open Graph and Twitter tags with absolute URLs and a new 1200×630 `og-image.jpg`, so WhatsApp and Facebook links show a preview.
- `sitemap.xml` (listing both languages), `robots.txt`, and a `_headers` file for hosts that read it.

**Speed**
- Phone-sized copies of the photos (`hero-640/800/960/1280`, `lab-640`) are served via `srcset`. The logo is resized for each use.
- Tiny ₹-only font files (2 KB each): English pages no longer download about 400 KB of Hindi fonts just to draw the ₹ sign.
- Hindi pages reuse one font file for both medium and bold, which saves 105 KB.

**Accessibility**
- Footer headings are now in the correct order.
- The language switch's screen-reader name now includes its visible text.
- The top bar and the mobile action bar are now inside page landmarks.
- Filter results are announced to screen readers ("Showing 3 services").

**Results** (Lighthouse on a local test server; axe-core scans in both languages):

| Page | Speed | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| English, mobile | 99 (was 76) | 100 (was 98) | 100 | 100 |
| English, desktop | 100 | 100 | 100 | 100 |
| Hindi, mobile | 84 | 100 | 100 | 100 |
| Hindi, desktop | 99 | 100 | 100 | 100 |

- axe-core: 0 violations in either language.
- No horizontal overflow at any width from 320px to 1920px; no console errors.

Hindi mobile is lower because Devanagari fonts are large (about 200 KB). The host's compression and caching settings, which can't be set from these files, would improve both languages further.

---

# Version 3 — redesign (Option 2, "Spatial & Modern")

Still a buildless static site: serve `dist/` (`python3 -m http.server 8000 --directory dist`). Everything is in `dist/index.html`; assets in `dist/assets/`.

## Design
- **Palette back to the logo.** Deep teal `#07566B`/`#053F4F`, action teal `#0A7189`, aqua `#19B6D2`, magenta `#D3176F` (used only for emergency), cool off-white `#F7FAFB`. Replaces the cream/sage drift of v2.
- **Typography.** Tiro Devanagari Hindi for headings, Mukta for body. Both fonts have matching Latin and Devanagari, so English and Hindi now look like one family. They are self-hosted in `assets/fonts/` (no third-party requests).
- **Hero (Option 2).** Asymmetric layout with a large curved image panel. A magenta + aqua arc traces the curve, echoing the two halves of the logo's heart. An overlapping visit card holds the phone, "Consultation starts at ₹500" and the visit-guide launcher.
- **Services.** Mixed-size grid: a featured Emergency card with a direct Call button, plus an image-led Laboratory card. Each card shows its category. The non-sequential 01–07 numbering is gone. A "Not sure which service?" tile resizes to fill the last row for every filter.
- **Elsewhere.** Line icons (inline SVG) replace Unicode symbols. Sentence-case labels replace tracked all-caps labels. Placeholders for doctor profiles and real photos are shown as dashed "Coming soon" cards. The map panel now has a logo pin. The footer has proper link columns.
- **Motion.** One short load reveal on the hero only; turned off under reduced-motion settings.

## Fixes to v2 defects
- ₹500 price block overlapped its icon and wrapped badly (desktop and mobile).
- The mobile top bar was blank because a CSS selector hid its text.
- Letter-spacing on uppercase labels broke the Devanagari headline bar (shirorekha) in Hindi.
- Hero caption was missing a space ("Support.A clear next step").
- The 1.3 MB logo loaded on every page. A 13 KB `logo-160.webp` (plus a PNG favicon) is now used. The original `logo.png` is kept.
- Hindi headings now get extra line-height and no negative tracking.

## Functionality (all preserved, some improved)
- **English/Hindi.** Same `data-en`/`data-hi` system and the same `hospital-language` storage key. The toggle now shows the active language. The page title, meta description, image alt text and ARIA labels all switch. Open FAQs stay open when the language changes.
- **Service filters.** All / Hospital care / Diagnostics / Support services, with `aria-pressed`.
- **FAQs.** Native `details` elements; any number can be open at once.
- **Visit guide.** Same four options and the same bilingual advice. The dropdown is now four large radio choices; the original `#visit-service` select is kept, hidden and in sync. The guide can be opened from three places. It closes with ×, Escape, or a click outside.
- **Mobile.** The menu closes on link tap or Escape. Filters scroll sideways. The fixed bottom bar keeps Call and Get directions.
- **Content.** Unchanged: ₹500 consultation, +91 8757731665, Ratu Road Chowk, Ranchi, Instagram and Google listing links, and the AI-image disclosure. A few short new UI strings were added, each with a Hindi version.

## Tested
Served locally and checked in Chromium at widths from 320px to 1920px, in both languages:
- no horizontal overflow and no console errors;
- every filter shows the right cards;
- several FAQs can be open at once;
- switching language keeps state and is remembered after reload;
- the visit guide opens, changes advice, and closes all three ways;
- the mobile menu works.

Note: `DESIGN.md` and `FUNCTIONALITY.md` describe v2. This file supersedes them where they differ.
