// Motion layer: one switch (html[data-motion]) that defaults to the OS reduced-motion setting and can be
// flipped by the visitor. Owns Lenis inertial scrolling, scroll reveals and light parallax.
import { t, onLangChange } from './i18n.js';

const root = document.documentElement;
const KEY = 'pqmap.motion';
const listeners = [];
const osReduce = matchMedia('(prefers-reduced-motion: reduce)');
let lenis = null;

export const motionOn = () => root.dataset.motion !== 'off';
export const onMotionChange = (fn) => listeners.push(fn);
export const getLenis = () => lenis;

function stored() { try { return localStorage.getItem(KEY); } catch { return null; } }

export function setMotion(on, { persist = true } = {}) {
  root.dataset.motion = on ? 'on' : 'off';
  if (persist) { try { localStorage.setItem(KEY, root.dataset.motion); } catch {} }
  syncButton();
  syncLenis();
  listeners.forEach((fn) => fn(on));
}

function syncButton() {
  const b = document.getElementById('motion-toggle');
  if (!b) return;
  b.setAttribute('aria-pressed', String(motionOn()));
  document.getElementById('motion-state').textContent = motionOn() ? t('ui.motionOn') : t('ui.motionOff');
}

function syncLenis() {
  const L = globalThis.Lenis;
  if (motionOn() && L && !lenis) {
    lenis = new L({ autoRaf: true, lerp: 0.11, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', () => onScroll());
    root.classList.add('has-lenis');
  } else if (!motionOn() && lenis) {
    lenis.destroy(); lenis = null; root.classList.remove('has-lenis');
  }
}

export function lockScroll(lock) { if (lenis) lock ? lenis.stop() : lenis.start(); }

// Scroll an element to the top of the viewport (Lenis when motion is on, instant otherwise).
export function scrollToEl(el, { immediate = false, offset = 0 } = {}) {
  if (!el) return Promise.resolve();
  if (lenis && !immediate && motionOn()) {
    const y = el.getBoundingClientRect().top + scrollY + offset; // numeric target: ignore CSS scroll-padding
    return new Promise((resolve) => lenis.scrollTo(y, { duration: 1.2, easing: (x) => 1 - Math.pow(1 - x, 4), onComplete: resolve }));
  }
  const top = el.getBoundingClientRect().top + scrollY + offset;
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  window.scrollTo({ top, behavior: 'instant' });
  return Promise.resolve();
}

/* ---------- Reveal on scroll ---------- */
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 })
  : null;
export function reveal(node, i, instant) {
  node.classList.add('reveal'); node.style.setProperty('--i', String(Math.min(i, 8)));
  if (instant || !io || !motionOn()) node.classList.add('is-in'); else io.observe(node);
}
export function revealAll(scope) { scope.querySelectorAll('.reveal:not(.is-in)').forEach((n) => { n.classList.add('is-in'); io && io.unobserve(n); }); }

/* ---------- Scroll-linked: hero zoom-out-into-map + card parallax + topbar state ---------- */
const parallax = new Set();
const pio = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? parallax.add(e.target) : parallax.delete(e.target))), { rootMargin: '10% 0px' }) : null;
export function watchParallax(node) { pio && pio.observe(node); }

let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const top = document.getElementById('topbar');
    top && top.classList.toggle('is-solid', y > vh * 0.55);
    if (!motionOn()) return;
    const hero = document.getElementById('hero');
    if (hero) {
      const p = Math.min(1, Math.max(0, y / hero.offsetHeight));
      hero.style.setProperty('--hp', p.toFixed(3));
    }
    parallax.forEach((n) => {
      const r = n.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / vh; // -1…1 around the viewport centre
      n.style.setProperty('--py', `${(c * -26).toFixed(1)}px`);
    });
  });
}

export function initMotion() {
  const b = document.getElementById('motion-toggle');
  b.addEventListener('click', () => setMotion(!motionOn()));
  osReduce.addEventListener('change', () => { if (!stored()) setMotion(!osReduce.matches, { persist: false }); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => root.classList.toggle('is-hidden', document.hidden));
  onLangChange(syncButton);
  syncButton(); syncLenis(); onScroll();
}
