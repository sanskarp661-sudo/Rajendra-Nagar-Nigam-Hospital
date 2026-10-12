# DESIGN DIRECTION

## Option 2 reference
`option-2-preview.png` is the original comparison image, unchanged. The selected **Option 2 — Spatial & Modern** is the centre panel. It proposes an asymmetric hero, a rounded large visual panel, overlapping appointment/contact card, mixed-size service cards, white space and restrained depth. This is a visual concept, not a screenshot of the live website. Its illustrative photos and claims do not establish hospital facts.

Original direction palette, as supplied in the earlier design brief: deep teal #07566B, primary teal #087F9C, turquoise #19B6D2, magenta #E71878, off-white #F6FAFB and body text #18343E. These are specified design tokens, not sampled exact colours from the generated preview.

## Exact current implementation
The live redesign uses cream, deep green-teal and pale sage. Final CSS variable overrides: background #FAF9F6, ink #123E42, dark #073F43, teal #087B80, muted #677773; original pink token #E71878 remains defined. Additional accents include #B1DCCC (hero headline accent), #D5EBDF (pale buttons), #E9EEE7 (About and featured card background), and #A8D3C5 (hero eyebrow).

Fonts: body `'Segoe UI', Arial, sans-serif`; English hero and section headings `Georgia, serif`. Hindi headings use `'Segoe UI', Arial, sans-serif` for Devanagari fallback. No web fonts or font binaries. The exact preview typography was generated as pixels and does not specify a font family.

Layout: max-width 1320px containers; cream sticky header; dark split hero with consultation image, floating contact card and emergency tag; quick links; filterable service grid with image-led cards; About and facility grid; consultation and gallery placeholders; contact/directions panels; FAQs; closing CTA; footer. A native modal visit guide supports four service types. CSS breakpoints include 1000px and 760px; service grids collapse on phones, with a fixed two-action bottom bar. Shadows are restrained and the English headline has an editorial serif treatment.

This handoff exports the current implementation without redesign or source changes. Demo imagery and profile/gallery placeholders are retained exactly.
