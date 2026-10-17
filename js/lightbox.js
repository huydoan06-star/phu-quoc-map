// Gallery lightbox: swipe/drag, arrow keys, Esc, counter, per-photo credit. Focus is kept inside while open.
import { creditHTML, srcset } from './photo.js';
import { lockScroll, motionOn } from './motion.js';
import { onLangChange } from './i18n.js';

let photos = [], i = 0, opener = null, altBase = '';
const $ = (id) => document.getElementById(id);

function render() {
  const strip = $('lb-strip');
  strip.replaceChildren(...photos.map((p, k) => {
    const s = document.createElement('div'); s.className = 'lightbox__slide';
    s.setAttribute('role', 'group'); s.setAttribute('aria-roledescription', 'slide'); s.setAttribute('aria-label', `${k + 1} / ${photos.length}`);
    return s;
  }));
  go(i, true);
}

function load(k) {
  const s = $('lb-strip').children[k]; const p = photos[k];
  if (!s || !p || s.firstChild) return;
  const img = new Image(); img.decoding = 'async'; img.alt = `${altBase} — ${k + 1}/${photos.length}`;
  const ss = srcset(p); if (ss) { img.srcset = ss; img.sizes = '100vw'; }
  img.src = p.src; img.draggable = false; s.append(img);
}

function go(k, instant = false) {
  i = Math.max(0, Math.min(photos.length - 1, k));
  const strip = $('lb-strip');
  if (instant) strip.classList.add('is-dragging');
  strip.style.setProperty('--lb-i', i); strip.style.setProperty('--lb-dx', '0px');
  if (instant) { void strip.offsetWidth; strip.classList.remove('is-dragging'); }
  [i - 1, i, i + 1].forEach(load);
  [...strip.children].forEach((s, k2) => s.setAttribute('aria-hidden', String(k2 !== i)));
  $('lb-count').textContent = `${i + 1} / ${photos.length}`;
  $('lb-credit').innerHTML = creditHTML(photos[i]);
  $('lb-prev').disabled = i === 0; $('lb-next').disabled = i === photos.length - 1;
}

export function openLightbox(list, start, name, trigger) {
  photos = list; i = start || 0; opener = trigger || document.activeElement; altBase = name || '';
  const lb = $('lightbox');
  lb.hidden = false; render();
  requestAnimationFrame(() => lb.classList.add('is-open'));
  lockScroll(true);
  $('lb-close').focus();
}

export function closeLightbox() {
  const lb = $('lightbox');
  if (lb.hidden) return;
  lb.classList.remove('is-open');
  const done = () => { lb.hidden = true; $('lb-strip').replaceChildren(); };
  if (motionOn()) setTimeout(done, 280); else done();
  lockScroll(false);
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
}

export const lightboxOpen = () => !$('lightbox').hidden;

export function initLightbox() {
  const lb = $('lightbox'), stage = $('lb-stage'), strip = $('lb-strip');
  $('lb-close').addEventListener('click', closeLightbox);
  $('lb-prev').addEventListener('click', () => go(i - 1));
  $('lb-next').addEventListener('click', () => go(i + 1));
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeLightbox(); }
    else if (e.key === 'ArrowLeft') go(i - 1);
    else if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'Tab') { // simple focus trap over the enabled buttons
      const f = [...lb.querySelectorAll('button:not([disabled]), a[href]')].filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
  let x0 = null, dx = 0, t0 = 0, onImg = false;
  stage.addEventListener('pointerdown', (e) => { if (e.button > 0) return; x0 = e.clientX; dx = 0; t0 = e.timeStamp; onImg = e.target.tagName === 'IMG'; try { stage.setPointerCapture(e.pointerId); } catch {} strip.classList.add('is-dragging'); });
  stage.addEventListener('pointermove', (e) => {
    if (x0 == null) return;
    dx = e.clientX - x0;
    const edge = (i === 0 && dx > 0) || (i === photos.length - 1 && dx < 0);
    strip.style.setProperty('--lb-dx', `${edge ? dx * 0.3 : dx}px`);
  });
  const up = (e) => {
    if (x0 == null) return;
    x0 = null; strip.classList.remove('is-dragging');
    const fast = Math.abs(dx) / Math.max(1, e.timeStamp - t0) > 0.5;
    if (dx < -60 || (fast && dx < -20)) go(i + 1);
    else if (dx > 60 || (fast && dx > 20)) go(i - 1);
    else if (Math.abs(dx) < 6 && !onImg) closeLightbox(); // tap on the backdrop
    else go(i);
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  onLangChange(() => { if (!lb.hidden) $('lb-credit').innerHTML = creditHTML(photos[i]); });
}
