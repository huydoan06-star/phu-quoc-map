# Phú Quốc Map

A hand-made, English-first travel map of Phú Quốc island (Vietnam): real spots with photo, location and capture time, plus verified travel tips for international visitors. Companion site for an English YouTube channel about Phú Quốc.

Live: https://huydoan06-star.github.io/phu-quoc-map/

- Static site, **no build step, no backend, no paid services**. Hosted on GitHub Pages.
- Map: [Leaflet](https://leafletjs.com) 1.9.4 (vendored in `vendor/leaflet/`) + OpenStreetMap tiles (no API key).
- Fonts self-hosted (`fonts/`, Fraunces + Newsreader, SIL OFL) — no Google Fonts call, so the page also loads where Google is blocked.
- 8 languages: English (default), Tiếng Việt, 한국어, 简体中文, 繁體中文（台灣）, 日本語, हिन्दी, Русский. Choice is based on 2025 arrival data — see `SOURCES.md`.
- Design follows the Hallmark skill (genre editorial · Map/Diagram · Garden theme). Tokens in `tokens.css`, page CSS in `css/site.css`.

## Structure

```
index.html            single page (map, spot list, travel tips)
tokens.css            design tokens (colour, type, spacing, motion) + @font-face
css/site.css          page styles (mobile-first)
js/app.js             map, markers, spot panel, filters, tips rendering, #spot=<id> deep links
js/i18n.js            data-driven i18n with English fallback
data/spots.json       spots (see docs/DATA.md)
data/tips.json        order + source URLs of the travel tips
data/imported.json    hashes of photos already imported (no personal paths)
i18n/languages.json   language list (code, native name, dir)
i18n/<code>.json      UI strings + travel tips text, one file per language
photos/               published images (WebP, metadata stripped) + placeholder SVGs
anh-moi/              inbox for new photos (git-ignored)
tools/them-anh.mjs    photo import script (EXIF GPS + time → WebP + draft entry)
tools/make-test-image.mjs  creates a JPEG with EXIF GPS for testing
them-anh.bat / .ps1   double-click wrappers for the import script
HUONG-DAN.md          owner guide (Vietnamese)
SOURCES.md            every source behind the tips + market data, and TODOs
docs/                 DATA.md, I18N.md, BRIEF.md (research brief)
```

## Run locally

```
npm install          # once — only needed for the photo tool (sharp, exifr)
npm run serve        # python -m http.server 8080  → http://localhost:8080
```
Any static server works (`npx serve .` too). Opening `index.html` via `file://` will not work because data is loaded with `fetch`.

## Adding photos

See `HUONG-DAN.md` (Vietnamese). Short version: drop photos in `anh-moi/`, run `them-anh.bat`, fill in text in `data/spots.json`, set `"status": "published"`, then `them-anh.bat --publish` (or `git push`).

## Translations

All non-English/Vietnamese locale files are **machine-translated and flagged** (`_meta.machineTranslated: true, needsReview: true`); the site shows a small note in the footer for those languages. Please have native speakers review `i18n/ko.json`, `zh-CN.json`, `zh-TW.json`, `ja.json`, `hi.json`, `ru.json` and the matching fields in `data/spots.json`. Adding a language: see `docs/I18N.md`.

## Affiliate slot (later)

No affiliate links in v1. Prepared places:
- per spot: `"links": [{ "type": "tour|hotel", "label": { "en": "…" }, "url": "…" }]` — rendered in the spot card only when present, with `rel="sponsored noopener"`;
- page level: the hidden `<section id="plan">` in `index.html` ("Plan your trip").
When enabling, add a clear affiliate disclosure line.

## Placeholders

The 6 seed spots use original placeholder SVGs marked "PLACEHOLDER" and `capturedAt: null`. Replace them with real photos via the import tool (then delete the seed's placeholder photo entry).

## Licences

Code: yours. Leaflet: BSD-2 (`vendor/leaflet/LICENSE`). Fonts: SIL OFL (`fonts/`). Map data © OpenStreetMap contributors (ODbL).
