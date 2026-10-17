# Phú Quốc Map

A hand-made, English-first travel map of Phú Quốc island (Vietnam): real spots with photo, location and capture time, plus verified travel tips for international visitors. Companion site for an English YouTube channel about Phú Quốc.

Live: https://huydoan06-star.github.io/phu-quoc-map/

- Static site, **no build step, no backend, no paid services**. Hosted on GitHub Pages.
- Map: [Leaflet](https://leafletjs.com) 1.9.4 + Leaflet.markercluster 1.5.3 (vendored) on Sentinel-2 cloudless satellite imagery by EOX (day) + NASA GIBS VIIRS Black Marble (night lights). No API keys. Terms: `SOURCES.md`.
- Smooth scrolling: Lenis 1.3.27 (vendored, only when Motion is on).
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
photos/               owner photos from them-anh (WebP, metadata stripped)
photos/commons/       licensed Wikimedia Commons photos (1600/800/pin WebP) — credits in CREDITS.md
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

## Photos

All 18 published spots carry real Wikimedia Commons photos (CC BY / CC BY-SA), each with author + licence link on the card and in `CREDITS.md`.
The owner's own photos always win: a photo without a `credit` field (what `them-anh` writes) is shown first, in the hero first, and spots that have one are listed first. To add your photo to an existing spot, put its entry first in that spot's `photos` array.

## Licences

Code: yours. Leaflet: BSD-2, Leaflet.markercluster: MIT, Lenis: MIT (`vendor/*/LICENSE*`). Photos: see `CREDITS.md`. Satellite imagery: EOX Sentinel-2 cloudless 2024, CC BY-NC-SA 4.0 (switch to the CC BY 2016 layer before commercial use — `js/mapfx.js`). Fonts: SIL OFL (`fonts/`). Map data © OpenStreetMap contributors (ODbL).


## Design & motion (v2)

- Full-bleed live map hero (OSM standard tiles, toned with a CSS filter — no keyed tile service), glass hero card, glass category chips, category-coloured SVG pins (`js/icons.js`).
- Spot card: side panel on desktop, bottom sheet on mobile (drag the handle/photo down to dismiss; the × button does the same). Spring in, faster ease-in out. `#spot=<id>` deep links still work.
- Motion is transform/opacity only; tokens live in `tokens.css` (`--ease-spring`, `--dur-*`, `--stagger`). `prefers-reduced-motion: reduce` turns every animation, flyTo and View Transition into an instant change.
- View Transitions API for "Travel tips" / "All spots" / "Back to the map" links and for switching language (fallback: smooth scroll / instant swap).
- Fonts are self-hosted (no Google Fonts/CDN, works in mainland China): Fraunces (display) + Be Vietnam Pro (body). Korean, Chinese, Japanese, Hindi and Russian use native system fonts via `:lang()` fallbacks in `tokens.css`.
- Design sources: Hallmark skill (redesign, stamp in `css/site.css` + `.hallmark/log.json`) and UI UX Pro Max (palette "Travel/Tourism Agency", typography "Vietnamese Friendly", glassmorphism, motion/UX rules).

## Design & motion (v3)

- Photo-led: full-screen hero slideshow (Ken Burns + 1.6 s crossfade) of licensed photos; the photo pushes in as you scroll into the map. Night set at night.
- Satellite atlas: Sentinel-2 imagery, photo pins (round thumbnail + category ring), clusters that split with animation, custom place labels, momentum card rail at the bottom — settle on a card and the map flies there.
- Day / Night: automatic from the real sunrise/sunset on Phú Quốc (`js/sun.js`), sun/moon button overrides it for the session; 800 ms crossfade. Night = darkened imagery + NASA city lights + flickering town halos, twinkling stars and lantern-pulse pins. Day = drifting cloud shadows and a soft sea sheen. Ambient effects pause when the tab is hidden or the map is off-screen.
- Spot panel: the tapped photo morphs into the panel photo (View Transitions), gallery strip → swipeable lightbox (arrows, Esc, counter, credit).
- Motion switch in the top bar ("Motion: on/off"), default = the OS reduced-motion setting, remembered per browser. Off = no Lenis, Ken Burns, ambient FX, parallax, fly animations or view transitions.
- Files: `js/app.js` (wiring), `js/mapfx.js` (imagery, day/night, halos, labels), `js/hero.js`, `js/rail.js`, `js/lightbox.js`, `js/motion.js`, `js/photo.js`, `js/sun.js`.
- Design sources: Hallmark (stamp in `css/site.css`, entry in `.hallmark/log.json`) + UI UX Pro Max (Scroll-Triggered Storytelling, Liquid Glass controls, dark-mode OLED night, motion-sensitivity rules).
