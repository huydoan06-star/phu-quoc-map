// Phú Quốc Map — v2. Static ES modules, no build step. Data: data/spots.json, data/tips.json, i18n/*.json
// Motion rules: transform/opacity only, exit faster than enter, every transition interruptible,
// prefers-reduced-motion = instant state changes (no flyTo, no view transitions, no stagger).
import { initI18n, t, tx, onLangChange, formatDateTime } from './i18n.js';
import { icon } from './icons.js';

const CENTER = [10.2, 103.96];
const ISLAND = [[9.94, 103.84], [10.46, 104.09]]; // Phú Quốc main island, initial view
const BOUNDS = [[9.70, 103.55], [10.62, 104.30]];
const EXIT_MS = 200;

const state = { spots: [], tips: null, filter: 'all', activeId: null, markers: new Map(), leaving: new Map(), lastTrigger: null, map: null, filterToken: 0 };
const $ = (id) => document.getElementById(id);
const mq = (q) => matchMedia(q).matches;
const reduced = () => mq('(prefers-reduced-motion: reduce)');
const wide = () => mq('(min-width: 900px)');
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
const visibleSpots = () => state.spots.filter((s) => state.filter === 'all' || s.category === state.filter);

/* ---------- Reveal on scroll (IntersectionObserver, one stagger per batch) ---------- */
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  : null;
function reveal(node, i, instant) {
  node.classList.add('reveal'); node.style.setProperty('--i', String(Math.min(i, 10)));
  if (instant || !io) node.classList.add('is-in'); else io.observe(node);
}

/* ---------- Media with blur-up ---------- */
function setMedia(wrap, img, photo, altText) {
  wrap.classList.add('media');
  let blur = wrap.querySelector('.media__blur');
  if (!blur) { blur = el('span', 'media__blur'); blur.setAttribute('aria-hidden', 'true'); wrap.prepend(blur); }
  img.classList.remove('is-loaded');
  img.onload = null;
  if (!photo) { img.removeAttribute('src'); img.alt = ''; blur.style.backgroundImage = ''; return; }
  blur.style.backgroundImage = `url("${photo.thumb || photo.src}")`;
  img.width = photo.width || 1600; img.height = photo.height || 1067;
  img.alt = altText;
  const done = () => requestAnimationFrame(() => img.classList.add('is-loaded'));
  img.onload = done;
  img.src = photo.src;
  if (img.complete && img.naturalWidth) done();
}

/* ---------- Map ---------- */
function fitPadding() {
  const card = $('hero-card');
  const top = 150;
  if (wide()) return { paddingTopLeft: [card.offsetLeft + card.offsetWidth + 24, top], paddingBottomRight: [48, 32] };
  return { paddingTopLeft: [16, top], paddingBottomRight: [16, card.offsetHeight + 28] };
}

function initMap() {
  const map = L.map('map', {
    center: CENTER, zoom: 10, minZoom: 9, maxZoom: 18, zoomControl: false, zoomSnap: 0.25,
    maxBounds: BOUNDS, maxBoundsViscosity: 0.8, scrollWheelZoom: wide() ? 'center' : false, tap: true,
    fadeAnimation: !reduced(), zoomAnimation: !reduced(), markerZoomAnimation: !reduced(),
  });
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.fitBounds(ISLAND, fitPadding());
  map.on('click', () => closeSpot());
  state.map = map;
}

// Fly so the spot lands in the part of the map the panel/sheet does not cover.
function flyToSpot(spot) {
  const map = state.map;
  const z = Math.max(map.getZoom(), 14);
  const panel = $('spot-panel');
  // Put the pin at the centre of the uncovered area (right of nothing / left of the panel on desktop; above the sheet on mobile).
  const size = map.getSize(); const TOP = 150;
  const off = wide()
    ? [size.x / 2 - panel.offsetLeft / 2, size.y / 2 - (TOP + size.y) / 2]
    : [0, size.y / 2 - (TOP + Math.min(size.y, innerHeight - panel.offsetHeight)) / 2];
  const target = map.unproject(map.project([spot.lat, spot.lng], z).add(off), z);
  if (reduced()) { map.setView(target, z, { animate: false }); return; }
  map.flyTo(target, z, { duration: 1.15, easeLinearity: 0.2 });
}

function flyToFilter() {
  const map = state.map;
  const spots = visibleSpots();
  const opts = { ...fitPadding(), maxZoom: 13, animate: !reduced(), duration: 0.9, easeLinearity: 0.2 };
  if (state.filter === 'all' || !spots.length) {
    if (reduced()) map.fitBounds(ISLAND, fitPadding()); else map.flyToBounds(ISLAND, opts);
    return;
  }
  const b = L.latLngBounds(spots.map((s) => [s.lat, s.lng]));
  if (reduced()) map.fitBounds(b, { ...fitPadding(), maxZoom: 13 }); else map.flyToBounds(b, opts);
}

function pinIcon(spot, i) {
  return L.divIcon({
    className: 'pin',
    html: `<span class="pin__body" data-cat="${spot.category}" style="--i:${i}"><span class="pin__head">${icon(spot.category)}</span></span>`,
    iconSize: [40, 48], iconAnchor: [20, 46],
  });
}

// Diff markers against the current filter: leaving pins animate out, then are removed; new pins drop in staggered.
function syncMarkers() {
  const want = new Set(visibleSpots().map((s) => s.id));
  state.markers.forEach((m, id) => {
    if (want.has(id) || state.leaving.has(id)) return;
    const node = m.getElement();
    if (reduced() || !node) { m.remove(); state.markers.delete(id); return; }
    node.classList.add('is-leaving');
    state.leaving.set(id, setTimeout(() => { m.remove(); state.markers.delete(id); state.leaving.delete(id); }, EXIT_MS));
  });
  let i = 0;
  for (const spot of visibleSpots()) {
    if (state.leaving.has(spot.id)) { // re-shown mid-exit: cancel the exit
      clearTimeout(state.leaving.get(spot.id)); state.leaving.delete(spot.id);
      state.markers.get(spot.id).getElement()?.classList.remove('is-leaving');
      continue;
    }
    if (state.markers.has(spot.id)) continue;
    const m = L.marker([spot.lat, spot.lng], { icon: pinIcon(spot, i++), title: tx(spot.name), alt: tx(spot.name), keyboard: true, riseOnHover: true }).addTo(state.map);
    m.on('click', (e) => { L.DomEvent.stopPropagation(e); state.lastTrigger = m.getElement(); openSpot(spot.id); });
    state.markers.set(spot.id, m);
  }
  syncActivePin();
}

function relabelMarkers() {
  state.markers.forEach((m, id) => {
    const s = state.spots.find((x) => x.id === id); const node = m.getElement();
    if (s && node) { node.title = tx(s.name); node.setAttribute('alt', tx(s.name)); node.setAttribute('aria-label', tx(s.name)); }
  });
}

function syncActivePin() {
  state.markers.forEach((m, id) => {
    const node = m.getElement(); if (!node) return;
    node.classList.toggle('is-active', id === state.activeId);
    m.setZIndexOffset(id === state.activeId ? 1000 : 0);
  });
}

/* ---------- Filters ---------- */
function renderFilters() {
  const cats = ['all', ...new Set(state.spots.map((s) => s.category))];
  $('filters').replaceChildren(...cats.map((c) => {
    const b = el('button', 'chip'); b.type = 'button'; b.dataset.filter = c;
    if (c !== 'all') b.dataset.cat = c;
    b.innerHTML = icon(c === 'all' ? 'compass' : c);
    b.append(el('span', null, c === 'all' ? t('ui.filterAll') : t(`categories.${c}`)));
    b.setAttribute('aria-pressed', String(state.filter === c));
    b.addEventListener('click', () => setFilter(c));
    return b;
  }));
}

function setFilter(c) {
  if (state.filter === c) return;
  state.filter = c;
  document.querySelectorAll('#filters .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === c)));
  if (state.activeId && !visibleSpots().some((s) => s.id === state.activeId)) closeSpot({ restoreFocus: false });
  syncMarkers();
  flyToFilter();
  // List: current cards exit quickly, new set enters staggered. A newer click cancels a pending swap.
  const token = ++state.filterToken;
  const cards = document.querySelectorAll('#spot-list > li');
  if (reduced() || !cards.length) { renderList(); return; }
  cards.forEach((n) => n.classList.add('is-out'));
  setTimeout(() => { if (token === state.filterToken) renderList(); }, EXIT_MS);
}

/* ---------- Spot grid ---------- */
function renderList({ instant = false } = {}) {
  const spots = visibleSpots();
  $('spot-list').replaceChildren(...spots.map((spot, i) => {
    const li = el('li', 'spot-card');
    const b = el('button', 'spot-card__btn'); b.type = 'button';
    const media = el('span', 'spot-card__media'); const img = el('img'); img.loading = 'lazy'; img.decoding = 'async';
    media.append(img);
    const photo = (spot.photos || [])[0];
    setMedia(media, img, photo, '');
    const body = el('span', 'spot-card__body');
    const pill = el('span', 'cat-pill'); pill.dataset.cat = spot.category; pill.innerHTML = icon(spot.category); pill.append(el('span', null, t(`categories.${spot.category}`)));
    const name = el('span', 'spot-card__name', tx(spot.name));
    const best = el('span', 'spot-card__best'); best.innerHTML = icon('clock'); best.append(el('span', null, tx(spot.bestTime)));
    body.append(pill, name, best);
    b.append(media, body);
    b.addEventListener('click', () => {
      state.lastTrigger = b;
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      openSpot(spot.id);
    });
    li.append(b); reveal(li, i, instant); return li;
  }));
  $('spot-empty').hidden = spots.length > 0;
}

/* ---------- Spot panel ---------- */
function fillPanel(spot) {
  const photo = (spot.photos || [])[0];
  setMedia($('panel-figure'), $('panel-img'), photo, photo ? (tx(photo.alt) || tx(spot.name)) : '');
  $('panel-badge').hidden = !(photo && photo.placeholder);
  $('panel-badge').textContent = t('ui.placeholderBadge');
  const cat = $('panel-cat'); cat.dataset.cat = spot.category; cat.innerHTML = icon(spot.category); cat.append(el('span', null, t(`categories.${spot.category}`)));
  const time = $('panel-time'); time.innerHTML = icon('clock');
  time.append(el('span', null, spot.capturedAt ? `${t('ui.captured')}: ${formatDateTime(spot.capturedAt)}` : t('ui.captureSoon')));
  $('panel-title').textContent = tx(spot.name);
  $('panel-guide').textContent = tx(spot.guide);
  $('panel-tips').textContent = tx(spot.tips);
  $('panel-best').textContent = tx(spot.bestTime);
  $('panel-directions').href = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const video = $('panel-video');
  video.hidden = !spot.youtube; if (spot.youtube) video.href = spot.youtube;
  // Affiliate / partner links — only rendered when present in data (none yet).
  const links = $('panel-links');
  const items = (spot.links || []).filter((l) => l && l.url);
  links.replaceChildren(...items.map((l) => {
    const li = el('li'); const a = el('a', 'text-link', tx(l.label) || l.type);
    a.href = l.url; a.target = '_blank'; a.rel = 'sponsored noopener'; li.append(a); return li;
  }));
  links.hidden = items.length === 0;
}

function openSpot(id) {
  const spot = state.spots.find((s) => s.id === id);
  if (!spot) return;
  const panel = $('spot-panel');
  const wasOpen = panel.dataset.state === 'open';
  state.activeId = id;
  fillPanel(spot);
  if (wasOpen) { // swap content without re-running the sheet entrance; restart the content stagger
    const body = panel.querySelector('.panel__body');
    body.querySelectorAll(':scope > *').forEach((n) => { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; });
  }
  $('panel-scroll').scrollTop = 0;
  panel.style.removeProperty('--drag');
  clearTimeout(state.parkTimer);
  panel.classList.remove('is-parked');
  panel.removeAttribute('inert');
  panel.dataset.state = 'open';
  document.body.classList.add('has-spot');
  syncActivePin();
  flyToSpot(spot);
  history.replaceState(null, '', `${location.pathname}${location.search}#spot=${encodeURIComponent(id)}`);
  $('panel-title').focus({ preventScroll: true });
}

function closeSpot({ restoreFocus = true } = {}) {
  const panel = $('spot-panel');
  if (panel.dataset.state !== 'open') return;
  panel.classList.remove('is-dragging');
  panel.dataset.state = 'closed';
  panel.setAttribute('inert', '');
  document.body.classList.remove('has-spot');
  state.activeId = null; syncActivePin();
  setTimeout(() => panel.style.removeProperty('--drag'), 0);
  state.parkTimer = setTimeout(() => { if (panel.dataset.state !== 'open') panel.classList.add('is-parked'); }, EXIT_MS + 60);
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  if (restoreFocus && state.lastTrigger && document.contains(state.lastTrigger)) state.lastTrigger.focus({ preventScroll: true });
}

// Drag-to-dismiss for the mobile sheet (grip + photo). The close button is the single-pointer alternative.
function initDrag() {
  const panel = $('spot-panel');
  let start = null, prevY = 0, prevT = 0, vel = 0, dy = 0;
  const down = (e) => {
    if (wide() || panel.dataset.state !== 'open' || $('panel-scroll').scrollTop > 0 || e.button > 0) return;
    if (e.target.closest('button, a')) return;
    start = e.clientY; prevY = e.clientY; prevT = e.timeStamp; vel = 0; dy = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (start == null) return;
    const raw = e.clientY - start;
    dy = raw > 0 ? raw : raw * 0.15; // light resistance upward
    const dt = Math.max(1, e.timeStamp - prevT); vel = (e.clientY - prevY) / dt; prevY = e.clientY; prevT = e.timeStamp;
    if (Math.abs(raw) > 4) panel.classList.add('is-dragging');
    panel.style.setProperty('--drag', `${dy}px`);
  };
  const up = () => {
    if (start == null) return;
    start = null;
    const dismiss = dy > Math.min(140, panel.offsetHeight * 0.25) || vel > 0.55;
    panel.classList.remove('is-dragging');
    if (dismiss) closeSpot(); else panel.style.setProperty('--drag', '0px');
  };
  for (const zone of [$('panel-grip'), $('panel-figure')]) {
    zone.addEventListener('pointerdown', down);
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
  }
}

/* ---------- Tips ---------- */
function renderTips({ instant = false } = {}) {
  $('tips-list').replaceChildren(...state.tips.order.map((item, i) => {
    const li = el('li', 'tip'); li.id = `tip-${item.id}`;
    const h = el('h3'); h.innerHTML = icon(item.id); h.append(el('span', null, t(`tips.${item.id}.title`)));
    li.append(h);
    for (const para of [].concat(t(`tips.${item.id}.body`, { raw: true }) || [])) li.append(el('p', null, para));
    if (item.general) li.append(el('span', 'tip__flag', t('ui.generalAdvice')));
    if (item.sources && item.sources.length) {
      const src = el('p', 'tip__src'); src.append(el('span', null, `${t('ui.source')}:`));
      item.sources.forEach((u) => { const a = el('a', null, new URL(u).hostname.replace(/^www\./, '')); a.href = u; a.target = '_blank'; a.rel = 'noopener'; src.append(a); });
      li.append(src);
    }
    reveal(li, i % 2 + Math.floor(i / 2), instant);
    return li;
  }));
}

/* ---------- Section navigation with View Transitions ---------- */
function navigate(id) {
  const target = $(id);
  if (!target) return;
  const finish = () => target.focus({ preventScroll: true });
  if (reduced()) { target.scrollIntoView({ behavior: 'auto' }); finish(); return; }
  if (!document.startViewTransition) { target.scrollIntoView({ behavior: 'smooth' }); finish(); return; }
  // Reveal everything in the destination first so the new snapshot is complete.
  target.querySelectorAll('.reveal:not(.is-in)').forEach((n) => { n.classList.add('is-in'); io && io.unobserve(n); });
  const vt = document.startViewTransition(() => { target.scrollIntoView({ behavior: 'instant', block: 'start' }); });
  vt.finished.finally(finish);
}

function initNav() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (a.dataset.nav !== 'atlas') closeSpot({ restoreFocus: false });
    navigate(a.dataset.nav);
  });
}

/* ---------- Boot ---------- */
function readHash() {
  const m = location.hash.match(/^#spot=(.+)$/);
  if (m) { const id = decodeURIComponent(m[1]); if (state.spots.some((s) => s.id === id)) openSpot(id); }
}

function intro() {
  return new Promise((resolve) => requestAnimationFrame(() => {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    setTimeout(resolve, reduced() ? 0 : 260);
  }));
}

async function main() {
  const failSafe = setTimeout(() => document.body.classList.replace('is-loading', 'is-ready'), 4000);
  await initI18n();
  initMap();
  try {
    const [spots, tips] = await Promise.all([loadJSON('data/spots.json'), loadJSON('data/tips.json')]);
    // Only published spots with coordinates are shown; drafts / photos without GPS stay hidden.
    state.spots = (spots.spots || spots).filter((s) => s.status === 'published' && Number.isFinite(s.lat) && Number.isFinite(s.lng));
    state.tips = tips;
  } catch (err) {
    console.error(err);
    $('spot-empty').hidden = false; $('spot-empty').textContent = t('ui.loadError');
  }
  clearTimeout(failSafe);
  $('panel-directions').insertAdjacentHTML('afterbegin', icon('directions'));
  renderFilters();
  renderList();
  if (state.tips) renderTips();
  await intro();
  syncMarkers();
  readHash();
  $('panel-close').addEventListener('click', () => closeSpot());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSpot(); });
  window.addEventListener('hashchange', readHash);
  initDrag();
  initNav();
  onLangChange(() => {
    renderFilters();
    renderList({ instant: true });
    if (state.tips) renderTips({ instant: true });
    relabelMarkers();
    const s = state.spots.find((x) => x.id === state.activeId);
    if (s) fillPanel(s);
  });
}

main();
