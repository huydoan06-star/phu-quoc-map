// Spot rail: horizontal carousel with native scroll-snap + touch momentum, plus mouse drag with inertia.
// When the visitor settles on a card, the map flies there (onSettle). Click/Enter opens the spot (onOpen).
import { tx, t } from './i18n.js';
import { icon } from './icons.js';
import { pinSrc, sortedPhotos } from './photo.js';
import { motionOn } from './motion.js';

let dragEndedAt = 0;
let track, opts, current = null, userIntent = false, programmatic = 0, settleTimer = null;

export function renderRail(spots) {
  track.replaceChildren(...spots.map((s) => {
    const li = document.createElement('li'); li.className = 'rail__item';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rail__card'; b.dataset.id = s.id; b.dataset.cat = s.category;
    const ph = document.createElement('span'); ph.className = 'rail__photo';
    const img = new Image(); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 92; img.height = 92;
    const p = sortedPhotos(s)[0]; if (p) img.src = pinSrc(p);
    ph.append(img);
    const txt = document.createElement('span'); txt.className = 'rail__text';
    const cat = document.createElement('span'); cat.className = 'rail__cat'; cat.innerHTML = icon(s.category); cat.append(t(`categories.${s.category}`));
    const name = document.createElement('span'); name.className = 'rail__name'; name.textContent = tx(s.name);
    txt.append(name, cat);
    b.append(ph, txt);
    b.addEventListener('click', () => opts.onOpen(s.id, b));
    li.append(b); return li;
  }));
  if (current) markCurrent(current);
}

function markCurrent(id) {
  current = id;
  track.querySelectorAll('.rail__card').forEach((c) => c.classList.toggle('is-current', c.dataset.id === id));
}

// Bring a card into view (e.g. after a pin click) without triggering a map fly-back.
export function setRailCurrent(id, { scroll = true } = {}) {
  markCurrent(id);
  if (!scroll) return;
  const card = track.querySelector(`.rail__card[data-id="${CSS.escape(id)}"]`);
  if (!card) return;
  programmatic = performance.now();
  const pad = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
  track.scrollTo({ left: card.parentElement.offsetLeft - pad, behavior: motionOn() ? 'smooth' : 'instant' });
}

function nearestCard() {
  const pad = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
  const x = track.scrollLeft + pad;
  let best = null, dist = Infinity;
  track.querySelectorAll('.rail__item').forEach((li) => { const d = Math.abs(li.offsetLeft - x); if (d < dist) { dist = d; best = li; } });
  return best && best.firstChild;
}

function settled() {
  if (!userIntent || performance.now() - programmatic < 900) return;
  userIntent = false;
  const c = nearestCard();
  if (c && c.dataset.id !== current) { markCurrent(c.dataset.id); opts.onSettle(c.dataset.id); }
}

function initDrag() {
  let down = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, v = 0, moved = false, raf = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    cancelAnimationFrame(raf);
    down = true; moved = false; startX = lastX = e.clientX; startLeft = track.scrollLeft; lastT = e.timeStamp; v = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
    if (!moved) return;
    track.scrollLeft = startLeft - dx;
    const dt = Math.max(1, e.timeStamp - lastT); v = (e.clientX - lastX) / dt; lastX = e.clientX; lastT = e.timeStamp;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return; down = false;
    if (!moved) return;
    userIntent = true;
    dragEndedAt = performance.now(); // the click that follows a drag is swallowed below
    let vel = -v * 16; // px per frame
    const step = () => {
      if (!motionOn() || Math.abs(vel) < 0.6) { track.classList.remove('is-dragging'); return; } // snap takes over
      track.scrollLeft += vel; vel *= 0.94; raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
}

export function initRail(options) {
  opts = options; track = document.getElementById('rail');
  ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach((ev) => track.addEventListener(ev, () => { userIntent = true; }, { passive: true }));
  // vertical wheel over the rail scrolls it sideways (desktop mice)
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.shiftKey) return;
    const max = track.scrollWidth - track.clientWidth;
    if ((e.deltaY < 0 && track.scrollLeft <= 0) || (e.deltaY > 0 && track.scrollLeft >= max - 1)) return; // at an end: let the page scroll
    track.scrollBy({ left: e.deltaY, behavior: 'instant' }); e.preventDefault();
  }, { passive: false });
  const onEnd = () => { clearTimeout(settleTimer); settleTimer = setTimeout(settled, 60); };
  if ('onscrollend' in window) track.addEventListener('scrollend', onEnd);
  track.addEventListener('scroll', () => { clearTimeout(settleTimer); settleTimer = setTimeout(settled, 220); }, { passive: true });
  track.addEventListener('click', (ev) => { if (performance.now() - dragEndedAt < 80) { ev.stopPropagation(); ev.preventDefault(); } }, { capture: true });
  initDrag();
}
