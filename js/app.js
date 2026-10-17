// Phú Quốc Map — v3. Static ES modules, no build step. Data: data/spots.json, data/tips.json, i18n/*.json
// Motion: transform/opacity only, exits faster than entrances, everything interruptible. One visible
// "Motion" switch (defaults to the OS reduced-motion setting) turns off Lenis, Ken Burns, ambient FX,
// fly animations, view transitions and parallax together.
import { initI18n, t, tx, onLangChange, formatDateTime } from './i18n.js';
import { icon } from './icons.js';
import { initMotion, motionOn, onMotionChange, reveal, revealAll, watchParallax, scrollToEl } from './motion.js';
import { createMap, initTheme, resolveTheme, onThemeChange } from './mapfx.js';
import { initHero, rebuildHero } from './hero.js';
import { initRail, renderRail, setRailCurrent } from './rail.js';
import { initLightbox, openLightbox } from './lightbox.js';
import { sortedPhotos, cardSrc, pinSrc, srcset, creditHTML, creditText, isOwner } from './photo.js';

const MAX_BOUNDS = [[9.70, 103.55], [10.62, 104.30]];
const EXIT_MS = 200;
const TOP_UI = 136; // top bar + filter chips
const LIVELY = new Set(['nightlife', 'market']);

const state = { spots: [], tips: null, filter: 'all', activeId: null, markers: new Map(), cluster: null, map: null, lastTrigger: null, filterToken: 0, parkTimer: 0 };
const $ = (id) => document.getElementById(id);
const wide = () => matchMedia('(min-width: 900px)').matches;
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const root = document.documentElement;

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
const visibleSpots = () => state.spots.filter((s) => state.filter === 'all' || s.category === state.filter);
const spotById = (id) => state.spots.find((s) => s.id === id);

/* ---------- Map ---------- */
function railHeight() { const r = $('rail-wrap'); return r && r.offsetParent ? r.offsetHeight : 0; }
function fitPadding() {
  const panelW = wide() && state.activeId ? $('spot-panel').offsetWidth + 40 : 0;
  return { paddingTopLeft: [wide() ? 40 : 16, TOP_UI + 10], paddingBottomRight: [(wide() ? 40 : 16) + panelW, railHeight() + 16] };
}
// Default view: the busy south-west corridor (Dương Đông → An Thới) — close enough to read the imagery.
const HOME = [[9.995, 103.935], [10.235, 104.06]];
const spotBounds = (spots) => L.latLngBounds(spots.map((s) => [s.lat, s.lng]));

// Place the spot in the centre of the part of the map that the panel / sheet / rail does not cover.
function flyToSpot(spot, zoom = 16.75) {
  const map = state.map; const size = map.getSize(); const panel = $('spot-panel');
  const open = panel.dataset.state === 'open';
  let cx = size.x / 2, cy;
  if (wide()) {
    if (open) cx = (panel.offsetLeft) / 2;
    cy = (TOP_UI + size.y - railHeight()) / 2;
  } else {
    const bottom = open ? innerHeight - panel.offsetHeight : size.y - railHeight();
    cy = (TOP_UI + Math.min(size.y, bottom)) / 2;
  }
  const off = L.point(size.x / 2 - cx, size.y / 2 - cy);
  const z = Math.max(map.getZoom(), zoom);
  const target = map.unproject(map.project([spot.lat, spot.lng], z).add(off), z);
  if (!motionOn()) { map.setView(target, z, { animate: false }); return; }
  map.flyTo(target, z, { duration: 1.6, easeLinearity: 0.18 });
}

function flyToFilter() {
  const spots = visibleSpots();
  if (!spots.length) return;
  const opts = { ...fitPadding(), maxZoom: 14 };
  if (!motionOn()) state.map.fitBounds(spotBounds(spots), opts);
  else state.map.flyToBounds(spotBounds(spots), { ...opts, duration: 1.0, easeLinearity: 0.2 });
}

function pinIcon(spot, i) {
  const p = sortedPhotos(spot)[0];
  const lively = LIVELY.has(spot.category) || /night|sunset-town|kiss-of-the-sea/.test(spot.id);
  return L.divIcon({
    className: `ppin${lively ? ' ppin--lively' : ''}`,
    html: `<span class="ppin__body" data-cat="${spot.category}" style="--i:${i}"><span class="ppin__glow"></span><span class="ppin__ring"><img src="${p ? pinSrc(p) : ''}" alt="" width="50" height="50" decoding="async"></span></span>`,
    iconSize: [56, 64], iconAnchor: [28, 62],
  });
}

function clusterIcon(cluster) {
  const kids = cluster.getAllChildMarkers().slice(0, 3);
  const imgs = kids.map((m) => { const s = spotById(m.options.spotId); const p = s && sortedPhotos(s)[0]; return p ? `<img src="${pinSrc(p)}" alt="" width="50" height="50">` : ''; }).join('');
  return L.divIcon({ className: 'pcluster', html: `<span class="pcluster__stack">${imgs}</span><span class="pcluster__count">${cluster.getChildCount()}</span>`, iconSize: [66, 62], iconAnchor: [33, 31] });
}

function initPins() {
  state.cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 52, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 16,
    animate: motionOn(), animateAddingMarkers: false, iconCreateFunction: clusterIcon, chunkedLoading: true,
  });
  state.spots.forEach((spot, i) => {
    const m = L.marker([spot.lat, spot.lng], { icon: pinIcon(spot, i), title: tx(spot.name), alt: tx(spot.name), keyboard: true, riseOnHover: true, spotId: spot.id });
    m.on('click', (e) => { L.DomEvent.stopPropagation(e); state.lastTrigger = m.getElement(); openSpot(spot.id, { from: m.getElement()?.querySelector('img') }); });
    m.on('add', () => syncActivePin());
    state.markers.set(spot.id, m);
  });
  state.cluster.addLayers(visibleSpots().map((s) => state.markers.get(s.id)));
  state.cluster.on('animationend', syncActivePin);
  state.map.addLayer(state.cluster);
  onMotionChange((on) => { state.cluster.options.animate = on; });
}

function syncMarkers() {
  const want = new Set(visibleSpots().map((s) => s.id));
  const remove = [], add = [];
  state.markers.forEach((m, id) => { const has = state.cluster.hasLayer(m); if (want.has(id) && !has) add.push(m); if (!want.has(id) && has) remove.push(m); });
  if (remove.length) state.cluster.removeLayers(remove);
  if (add.length) state.cluster.addLayers(add);
  syncActivePin();
}

function relabelMarkers() {
  state.markers.forEach((m, id) => {
    const s = spotById(id); const node = m.getElement();
    m.options.title = m.options.alt = tx(s.name);
    if (node) { node.title = tx(s.name); node.setAttribute('aria-label', tx(s.name)); }
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
  renderRail(visibleSpots());
  flyToFilter();
  const token = ++state.filterToken;
  const cards = document.querySelectorAll('#spot-list > li');
  if (!motionOn() || !cards.length) { renderList(); return; }
  cards.forEach((n) => n.classList.add('is-out'));
  setTimeout(() => { if (token === state.filterToken) renderList(); }, EXIT_MS);
}

/* ---------- All-spots grid (large photos, parallax) ---------- */
function setMedia(wrap, img, photo, alt, sizes) {
  wrap.classList.add('media');
  let blur = wrap.querySelector('.media__blur');
  if (!blur) { blur = el('span', 'media__blur'); blur.setAttribute('aria-hidden', 'true'); wrap.prepend(blur); }
  img.classList.remove('is-loaded'); img.onload = null;
  if (!photo) { img.removeAttribute('src'); img.removeAttribute('srcset'); img.alt = ''; blur.style.backgroundImage = ''; return; }
  blur.style.backgroundImage = `url("${pinSrc(photo)}")`;
  img.width = photo.width || 1600; img.height = photo.height || 1067; img.alt = alt;
  const done = () => requestAnimationFrame(() => img.classList.add('is-loaded'));
  img.onload = done;
  const ss = srcset(photo);
  if (ss) { img.sizes = sizes; img.srcset = ss; } else img.removeAttribute('srcset');
  img.src = cardSrc(photo);
  if (img.complete && img.naturalWidth) done();
}

function renderList({ instant = false } = {}) {
  const spots = visibleSpots();
  $('spot-list').replaceChildren(...spots.map((spot, i) => {
    const li = el('li', 'spot-card');
    const b = el('button', 'spot-card__btn'); b.type = 'button';
    const media = el('span', 'spot-card__media'); const img = el('img'); img.loading = 'lazy'; img.decoding = 'async';
    media.append(img);
    const photo = sortedPhotos(spot)[0];
    setMedia(media, img, photo, '', '(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw');
    const body = el('span', 'spot-card__body');
    const pill = el('span', 'cat-pill'); pill.dataset.cat = spot.category; pill.innerHTML = icon(spot.category); pill.append(el('span', null, t(`categories.${spot.category}`)));
    const name = el('span', 'spot-card__name', tx(spot.name));
    const best = el('span', 'spot-card__best'); best.innerHTML = icon('clock'); best.append(el('span', null, tx(spot.bestTime)));
    body.append(pill, name, best);
    b.append(media, body);
    if (photo) b.append(el('span', 'spot-card__credit', creditText(photo)));
    b.addEventListener('click', () => { state.lastTrigger = b; openSpot(spot.id, { from: img, scroll: true }); });
    li.append(b); reveal(li, i % 3, instant); watchParallax(media);
    return li;
  }));
  $('spot-empty').hidden = spots.length > 0;
}

/* ---------- Spot panel ---------- */
let panelPhotos = [];
function fillPanel(spot) {
  panelPhotos = sortedPhotos(spot);
  const photo = panelPhotos[0];
  const img = $('panel-img');
  setMedia($('panel-figure'), img, photo, photo ? (tx(photo.alt) || tx(spot.name)) : '', '(min-width: 900px) 440px, 100vw');
  $('panel-zoom').disabled = !photo;
  $('panel-credit').innerHTML = creditHTML(photo);
  $('panel-badge').hidden = !(photo && isOwner(photo));
  $('panel-badge').textContent = t('ui.ownerPhoto');
  const thumbs = $('panel-thumbs');
  thumbs.replaceChildren(...panelPhotos.map((p, k) => {
    const li = el('li'); const b = el('button'); b.type = 'button';
    b.setAttribute('aria-label', `${t('ui.gallery')} ${k + 1} / ${panelPhotos.length}`);
    const im = el('img'); im.src = pinSrc(p); im.alt = ''; im.loading = 'lazy'; im.width = 64; im.height = 48;
    b.append(im); b.addEventListener('click', () => openLightbox(panelPhotos, k, tx(spot.name), b));
    li.append(b); return li;
  }));
  thumbs.hidden = panelPhotos.length < 2;
  const cat = $('panel-cat'); cat.dataset.cat = spot.category; cat.innerHTML = icon(spot.category); cat.append(el('span', null, t(`categories.${spot.category}`)));
  const time = $('panel-time');
  const when = photo && (photo.credit ? photo.credit.takenAt : spot.capturedAt);
  time.replaceChildren(); time.hidden = !when;
  if (when) { time.innerHTML = icon('clock'); time.append(el('span', null, `${t('ui.captured')}: ${formatDateTime(when)}`)); }
  $('panel-title').textContent = tx(spot.name);
  $('panel-guide').textContent = tx(spot.guide);
  $('panel-tips').textContent = tx(spot.tips);
  $('panel-best').textContent = tx(spot.bestTime);
  $('panel-directions').href = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const video = $('panel-video'); video.hidden = !spot.youtube; if (spot.youtube) video.href = spot.youtube;
  // Affiliate / partner links — only rendered when present in data (none yet).
  const links = $('panel-links');
  const items = (spot.links || []).filter((l) => l && l.url);
  links.replaceChildren(...items.map((l) => {
    const li = el('li'); const a = el('a', 'text-link', tx(l.label) || l.type);
    a.href = l.url; a.target = '_blank'; a.rel = 'sponsored noopener'; li.append(a); return li;
  }));
  links.hidden = items.length === 0;
}

function showPanel(spot) {
  const panel = $('spot-panel');
  const wasOpen = panel.dataset.state === 'open';
  state.activeId = spot.id;
  fillPanel(spot);
  if (wasOpen) panel.querySelectorAll('.panel__body > *').forEach((n) => { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; });
  $('panel-scroll').scrollTop = 0;
  panel.style.removeProperty('--drag');
  clearTimeout(state.parkTimer);
  panel.classList.remove('is-parked'); panel.removeAttribute('inert');
  panel.dataset.state = 'open';
  document.body.classList.add('has-spot');
  syncActivePin();
  setRailCurrent(spot.id);
  history.replaceState(null, '', `${location.pathname}${location.search}#spot=${encodeURIComponent(spot.id)}`);
}

const decodeSoon = (img) => Promise.race([img.decode ? img.decode().catch(() => {}) : Promise.resolve(), new Promise((r) => setTimeout(r, 350))]);

// Open a spot. With motion on, the tapped photo morphs into the panel photo (View Transitions shared element).
async function openSpot(id, { from = null, scroll = false } = {}) {
  const spot = spotById(id);
  if (!spot) return;
  const atlas = $('atlas');
  const panel = $('spot-panel'); const pimg = $('panel-img');
  const update = async () => {
    if (scroll) await scrollToEl(atlas, { immediate: true });
    showPanel(spot);
    await decodeSoon(pimg);
    pimg.classList.add('is-loaded');
  };
  const canVT = motionOn() && document.startViewTransition && from && from.complete && from.naturalWidth && document.contains(from);
  if (!canVT) {
    if (scroll) await scrollToEl(atlas);
    showPanel(spot);
  } else {
    from.style.viewTransitionName = 'spot-photo';
    root.dataset.vt = 'spot';
    panel.classList.add('is-snapping');
    const vt = document.startViewTransition(async () => {
      from.style.viewTransitionName = '';
      await update();
      pimg.style.viewTransitionName = 'spot-photo';
    });
    vt.ready.catch(() => {});
    vt.finished.catch(() => {}).finally(() => { pimg.style.viewTransitionName = ''; delete root.dataset.vt; panel.classList.remove('is-snapping'); });
    await vt.updateCallbackDone.catch(() => {});
  }
  flyToSpot(spot);
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
    if (e.target.closest('a') || (e.target.closest('button') && e.currentTarget !== $('panel-figure'))) return;
    start = e.clientY; prevY = e.clientY; prevT = e.timeStamp; vel = 0; dy = 0;
  };
  const move = (e) => {
    if (start == null) return;
    const raw = e.clientY - start;
    if (Math.abs(raw) > 6 && !panel.classList.contains('is-dragging')) { panel.classList.add('is-dragging'); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    dy = raw > 0 ? raw : raw * 0.15;
    const dt = Math.max(1, e.timeStamp - prevT); vel = (e.clientY - prevY) / dt; prevY = e.clientY; prevT = e.timeStamp;
    if (panel.classList.contains('is-dragging')) panel.style.setProperty('--drag', `${dy}px`);
  };
  const up = () => {
    if (start == null) return;
    start = null;
    if (!panel.classList.contains('is-dragging')) return;
    const dismiss = dy > Math.min(140, panel.offsetHeight * 0.25) || vel > 0.55;
    panel.classList.remove('is-dragging');
    $('panel-zoom').dataset.dragged = '1'; setTimeout(() => delete $('panel-zoom').dataset.dragged, 60);
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
    reveal(li, i % 2, instant);
    return li;
  }));
}

/* ---------- Section navigation: Lenis glide to the map, View Transition page-turn to tips ---------- */
async function navigate(id) {
  const target = $(id);
  if (!target) return;
  const finish = () => target.focus({ preventScroll: true });
  if (!motionOn()) { await scrollToEl(target, { immediate: true }); finish(); return; }
  if (id === 'tips' && document.startViewTransition) {
    revealAll(target);
    const vt = document.startViewTransition(() => scrollToEl(target, { immediate: true }));
    vt.ready.catch(() => {});
    vt.finished.catch(() => {}).finally(finish);
    return;
  }
  await scrollToEl(target); finish();
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
  if (m) { const id = decodeURIComponent(m[1]); if (spotById(id)) { openSpot(id, { scroll: true }); } }
}

function intro() {
  return new Promise((resolve) => requestAnimationFrame(() => {
    document.body.classList.remove('is-loading'); document.body.classList.add('is-ready');
    setTimeout(resolve, motionOn() ? 260 : 0);
  }));
}

async function main() {
  const failSafe = setTimeout(() => document.body.classList.replace('is-loading', 'is-ready'), 4000);
  await initI18n();
  resolveTheme();
  initMotion();
  try {
    const [spots, tips] = await Promise.all([loadJSON('data/spots.json'), loadJSON('data/tips.json')]);
    // Only published spots with coordinates are shown. Spots with the owner's own photos come first.
    const list = (spots.spots || spots).filter((s) => s.status === 'published' && Number.isFinite(s.lat) && Number.isFinite(s.lng));
    state.spots = [...list.filter((s) => (s.photos || []).some(isOwner)), ...list.filter((s) => !(s.photos || []).some(isOwner))];
    state.tips = tips;
  } catch (err) {
    console.error(err);
    $('spot-empty').hidden = false; $('spot-empty').textContent = t('ui.loadError');
  }
  clearTimeout(failSafe);
  initHero(state.spots);
  renderFilters();
  initRail({
    onOpen: (id, card) => { state.lastTrigger = card; openSpot(id, { from: card.querySelector('img') }); },
    onSettle: (id) => { const s = spotById(id); if (!s) return; if ($('spot-panel').dataset.state === 'open') return; state.activeId = null; flyToSpot(s, 15); highlight(id); },
  });
  renderRail(visibleSpots());
  state.map = createMap('map', {
    bounds: { b: L.latLngBounds(HOME), pad: fitPadding() },
    maxBounds: MAX_BOUNDS, interactiveWheel: wide(), animate: motionOn(),
  });
  state.map.on('click', () => closeSpot());
  onThemeChange(() => rebuildHero());
  initTheme();
  $('panel-directions').insertAdjacentHTML('afterbegin', icon('directions'));
  renderList();
  if (state.tips) renderTips();
  initLightbox();
  await intro();
  initPins();
  readHash();
  $('panel-close').addEventListener('click', () => closeSpot());
  $('panel-zoom').addEventListener('click', (e) => { if (e.currentTarget.dataset.dragged) return; const s = spotById(state.activeId); if (s) openLightbox(panelPhotos, 0, tx(s.name), e.currentTarget); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSpot(); });
  window.addEventListener('hashchange', readHash);
  initDrag();
  initNav();
  onLangChange(() => {
    renderFilters(); renderRail(visibleSpots()); renderList({ instant: true });
    if (state.tips) renderTips({ instant: true });
    relabelMarkers();
    const s = spotById(state.activeId); if (s) fillPanel(s);
  });
}

// Brief pulse on a pin the rail settled on (without opening the panel).
function highlight(id) {
  state.markers.forEach((m, k) => { const n = m.getElement(); if (n) n.classList.toggle('is-active', k === id); });
  const m = state.markers.get(id);
  if (m) { m.setZIndexOffset(1000); state.map.once('moveend', () => { const n = m.getElement(); if (n) n.classList.add('is-active'); }); }
}

main();
