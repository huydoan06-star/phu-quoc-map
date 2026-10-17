// Hero: rotating Ken Burns slideshow (crossfade 1.6s) of real photos. Day and night sets follow the map theme.
// Motion off = one still photo, no auto-advance.
import { creditHTML, sortedPhotos, isOwner, srcset } from './photo.js';
import { motionOn, onMotionChange } from './motion.js';
import { onLangChange } from './i18n.js';

const SLIDE_MS = 8000;
const DAY = [['kiss-bridge', 0], ['sao-beach', 0], ['khem-beach', 1], ['an-thoi-harbour', 0], ['hon-thom-cable-car', 1]];
const NIGHT = [['kiss-of-the-sea', 0], ['grand-world', 0], ['kiss-of-the-sea', 2], ['duong-dong-night-market', 0]];
const ORIGINS = [['30%', '60%'], ['70%', '40%'], ['50%', '30%'], ['40%', '70%'], ['60%', '50%']];

let slides = [], idx = 0, timer = null, visible = true, spotsRef = [];

function pickSet() {
  const night = document.documentElement.dataset.theme === 'night';
  const owner = spotsRef.flatMap((s) => sortedPhotos(s).filter(isOwner)).slice(0, 3);
  const curated = (night ? NIGHT : DAY).map(([id, i]) => {
    const s = spotsRef.find((x) => x.id === id);
    return s && (s.photos || [])[i];
  }).filter(Boolean);
  return [...owner, ...curated];
}

function build() {
  const wrap = document.getElementById('hero-slides');
  const dots = document.getElementById('hero-dots');
  slides = pickSet(); idx = 0;
  wrap.replaceChildren(...slides.map((p, i) => {
    const d = document.createElement('div'); d.className = 'hero__slide';
    const [ox, oy] = ORIGINS[i % ORIGINS.length];
    d.style.setProperty('--ox', ox); d.style.setProperty('--oy', oy);
    return d;
  }));
  dots.replaceChildren(...slides.map(() => document.createElement('span')));
  dots.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);
  show(0, true);
}

function ensureImg(i) {
  const d = document.getElementById('hero-slides').children[i];
  if (!d || d.firstChild) return d;
  const p = slides[i]; const img = new Image();
  const ss = srcset(p); if (ss) { img.srcset = ss; img.sizes = '100vw'; }
  img.src = p.src; img.alt = ''; img.decoding = 'async';
  if (i === 0) img.fetchPriority = 'high';
  img.width = p.width || 1600; img.height = p.height || 1000;
  d.append(img);
  return d;
}

function show(i, first = false) {
  const wrap = document.getElementById('hero-slides');
  if (!slides.length) return;
  const prev = wrap.querySelector('.hero__slide.is-on');
  const next = ensureImg(i);
  const go = () => {
    if (prev && prev !== next) { prev.classList.remove('is-on'); prev.classList.add('is-leaving'); setTimeout(() => prev.classList.remove('is-leaving'), 1700); }
    // restart Ken Burns on the incoming slide
    const img = next.firstChild; img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    next.classList.add('is-on');
    idx = i;
    document.getElementById('hero-credit').innerHTML = creditHTML(slides[i], { short: true });
    [...document.getElementById('hero-dots').children].forEach((s, k) => s.classList.toggle('is-on', k === i && motionOn()));
    ensureImg((i + 1) % slides.length); // preload the next slide
  };
  const img = next.firstChild;
  if (first || img.complete) go(); else { img.addEventListener('load', go, { once: true }); img.addEventListener('error', go, { once: true }); }
  schedule();
}

function schedule() {
  clearTimeout(timer);
  if (!motionOn() || !visible || document.hidden || slides.length < 2) return;
  timer = setTimeout(() => show((idx + 1) % slides.length), SLIDE_MS);
}

export function initHero(spots) {
  spotsRef = spots;
  build();
  const hero = document.getElementById('hero');
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; schedule(); }, { threshold: 0.05 }).observe(hero);
  document.addEventListener('visibilitychange', schedule);
  onMotionChange(() => show(idx));
  onLangChange(() => { document.getElementById('hero-credit').innerHTML = creditHTML(slides[idx], { short: true }); });
}
export const rebuildHero = () => spotsRef.length && build();
