# FUNCTIONALITY

## Architecture and local use
This is a buildless static website. `dist/index.html` contains the complete HTML, two inline CSS blocks (original rules plus redesign overrides in the same style element), translations, content arrays and inline JavaScript. Images are in `dist/assets/`. There are no src/, components/, package.json, npm dependencies, separately loaded CSS or JS, or font files. No build is required.

Serve the dist folder: `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000. Existing README.md is preserved from the source commit; this handoff documentation supplements it. `.openai/hosting.json` is the tracked hosting configuration. `dist/.openai/hosting.json` is also included exactly as it appeared in the deployed archive. The archive contains no credentials, tokens or Git history.

## Language switching
State variable `lang` defaults to English. A stored value of `hi` in localStorage under `hospital-language` selects Hindi. Storage access is wrapped in try/catch. The #language button flips en/hi, saves the selection, and calls render(). The document lang attribute and title update; meta description remains English.

Static translations live in data-en / data-hi attributes. render() writes the selected value to innerHTML, preserving line breaks and emphasis. Dynamic translations live in inline arrays: services, facilities, faqs and the advice object. Hero image alt translations use data-alt-en / data-alt-hi. Navigation labels, filters and dialog close labels update too. render() rebuilds service cards, facilities and FAQ details; switching language resets expanded FAQs. Modal guidance updates to the selected language. Inline arrays and HTML attributes are authoritative; CONTENT.md is a handoff inventory, not a translation source consumed by the site.

## Service filtering
Buttons have data-filter values all, care, diagnostics and support. State variable active starts at all. Each services array row begins with its category. A click sets active, updates aria-pressed for all buttons and calls render(). Only matching cards render. Card number labels use the visible subset. The emergency card is featured; laboratory card gets lab.webp, and emergency card reuses hero.webp. No network requests.

## FAQs
FAQs are native HTML details/summary elements generated from faqs. Each can expand independently; multiple can remain open. CSS shows + when closed and − when open. Language changes recreate details, collapsing them.

## Visit guide
#open-guide calls updateGuide() and native dialog.showModal(). #visit-service defaults to consult. Values are consult, test, physio and emergency. onchange selects the corresponding bilingual advice entry, displayed in #guide-text with aria-live=polite. Telephone CTA opens tel:+918757731665. Close button, Escape and clicks outside the dialog close it. The guide does not diagnose, save information or book appointments. No personal data is collected.

## Navigation and links
Header is sticky. Anchor links navigate to #home, #about, #services, #facilities and #visit. The skip link targets #services. Mobile menu toggles nav.open and aria-expanded; clicking a navigation link closes it. Mobile bottom bar offers Call and Directions. External Instagram and Google links use target=_blank and rel=noopener. Directions open the supplied Google share listing; no map iframe or guessed coordinates.

## Forms, backend and third-party integrations
No form element, submission endpoint, booking backend, analytics, tracking script, third-party script, payment flow, authentication code, WhatsApp integration, map embed or external font request exists in the website source. The select inside the guide is client-side only. The website host currently controls private access separately from these source files. Local hosting of dist does not reproduce the platform access gate. This exported source does not grant access to the hosted site.

## Accessibility and motion
Semantic sections, native FAQ and dialog controls, keyboard focus outlines, translated labels, mobile navigation and a skip link are implemented. CSS respects prefers-reduced-motion. Browser-level visual and accessibility audits were not performed. Completed implementation checks covered paired translations, unique anchors, assets, JavaScript syntax, bilingual render logic, filtering and visit guide open/change/close logic using a simulated DOM.
