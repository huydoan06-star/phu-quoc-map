// Phú Quốc Map — v1. Static, no build step. Data: data/spots.json, data/tips.json, i18n/*.json
import { initI18n, t, tx, currentLang, onLangChange, formatDateTime, languages } from './i18n.js';

const CENTER = [10.2, 103.96];
const ISLAND = [[9.94, 103.84], [10.46, 104.09]]; // Phú Quốc main island, used for the initial view
const BOUNDS = [[9.70, 103.55], [10.62, 104.30]];
const CAT_GLYPH = { beach: 'B', sunset: 'S', food: 'F', market: 'M', nature: 'N', viewpoint: 'V', culture: 'C', nightlife: 'L', safety: '!' };

const state = { spots: [], tips: null, filter: 'all', activeId: null, markers: new Map(), lastTrigger: null, map: null };
const $ = (id) => document.getElementById(id);

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function visibleSpots() {
  return state.spots.filter((s) => state.filter === 'all' || s.category === state.filter);
}

function initMap() {
  const isWide = matchMedia('(min-width: 900px)').matches;
  const map = L.map('map', {
    center: CENTER, zoom: isWide ? 11 : 10, minZoom: 9, maxZoom: 18,
    maxBounds: BOUNDS, maxBoundsViscosity: 0.8, zoomControl: true, scrollWheelZoom: isWide ? 'center' : false, tap: true,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.fitBounds(ISLAND, { padding: [12, 12] });
  state.map = map;
}

function pinIcon(spot, active) {
  return L.divIcon({
    className: 'pin' + (active ? ' is-active' : ''),
    html: `<span class="pin__dot"><span>${CAT_GLYPH[spot.category] || '•'}</span></span>`,
    iconSize: [30, 30], iconAnchor: [15, 30],
  });
}

function renderMarkers() {
  state.markers.forEach((m) => m.remove());
  state.markers.clear();
  for (const spot of visibleSpots()) {
    const m = L.marker([spot.lat, spot.lng], {
      icon: pinIcon(spot, spot.id === state.activeId), title: tx(spot.name), alt: tx(spot.name), keyboard: true, riseOnHover: true,
    }).addTo(state.map);
    m.on('click', () => { state.lastTrigger = m.getElement(); openSpot(spot.id); });
    state.markers.set(spot.id, m);
  }
}

function syncActivePin() {
  state.markers.forEach((m, id) => { const el = m.getElement(); if (el) el.classList.toggle('is-active', id === state.activeId); });
}

function renderFilters() {
  const cats = ['all', ...new Set(state.spots.map((s) => s.category))];
  const wrap = $('filters');
  wrap.replaceChildren(...cats.map((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.textContent = c === 'all' ? t('ui.filterAll') : t(`categories.${c}`);
    b.setAttribute('aria-pressed', String(state.filter === c));
    b.addEventListener('click', () => { state.filter = c; renderAll(); });
    return b;
  }));
}

function renderList() {
  const list = $('spot-list');
  const spots = visibleSpots();
  list.replaceChildren(...spots.map((spot, i) => {
    const li = document.createElement('li'); li.className = 'index__item';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'index__btn';
    b.innerHTML = `<span class="index__num">${String(i + 1).padStart(2, '0')}</span><span class="index__name"></span><span class="index__cat"></span>`;
    b.querySelector('.index__name').textContent = tx(spot.name);
    b.querySelector('.index__cat').textContent = t(`categories.${spot.category}`);
    b.addEventListener('click', () => {
      state.lastTrigger = b; openSpot(spot.id, { fly: true });
      $('map').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    });
    li.append(b); return li;
  }));
  $('spot-empty').hidden = spots.length > 0;
}

function openSpot(id, { fly = false } = {}) {
  const spot = state.spots.find((s) => s.id === id);
  if (!spot) return;
  state.activeId = id;
  const photo = (spot.photos || [])[0];
  const img = $('panel-img');
  if (photo) {
    img.src = photo.src; img.width = photo.width || 1600; img.height = photo.height || 1067;
    img.alt = tx(photo.alt) || tx(spot.name);
  } else { img.removeAttribute('src'); img.alt = ''; }
  $('panel-badge').hidden = !(photo && photo.placeholder);
  $('panel-badge').textContent = t('ui.placeholderBadge');
  $('panel-cat').textContent = t(`categories.${spot.category}`);
  $('panel-time').textContent = spot.capturedAt
    ? `${t('ui.captured')}: ${formatDateTime(spot.capturedAt)}`
    : t('ui.captureSoon');
  $('panel-title').textContent = tx(spot.name);
  $('panel-guide').textContent = tx(spot.guide);
  $('panel-tips').textContent = tx(spot.tips);
  $('panel-best').textContent = tx(spot.bestTime);
  $('panel-directions').href = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const video = $('panel-video');
  video.hidden = !spot.youtube; if (spot.youtube) video.href = spot.youtube;
  // Affiliate / partner links — only rendered when present in data (none in v1).
  const links = $('panel-links');
  const items = (spot.links || []).filter((l) => l && l.url);
  links.replaceChildren(...items.map((l) => {
    const li = document.createElement('li'); const a = document.createElement('a');
    a.href = l.url; a.className = 'text-link'; a.target = '_blank'; a.rel = 'sponsored noopener';
    a.textContent = tx(l.label) || l.type; li.append(a); return li;
  }));
  links.hidden = items.length === 0;

  const panel = $('spot-panel');
  panel.hidden = false; panel.scrollTop = 0;
  syncActivePin();
  if (fly) state.map.flyTo([spot.lat, spot.lng], Math.max(state.map.getZoom(), 13), { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.6 });
  history.replaceState(null, '', `${location.pathname}${location.search}#spot=${encodeURIComponent(id)}`);
  $('panel-title').focus({ preventScroll: true });
}

function closeSpot() {
  const panel = $('spot-panel');
  if (panel.hidden) return;
  panel.hidden = true; state.activeId = null; syncActivePin();
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  if (state.lastTrigger && document.contains(state.lastTrigger)) state.lastTrigger.focus({ preventScroll: true });
}

function renderTips() {
  const list = $('tips-list');
  const items = state.tips.order;
  list.replaceChildren(...items.map((item) => {
    const li = document.createElement('li'); li.className = 'tip'; li.id = `tip-${item.id}`;
    const h = document.createElement('h3'); h.textContent = t(`tips.${item.id}.title`);
    li.append(h);
    for (const para of [].concat(t(`tips.${item.id}.body`, { raw: true }) || [])) {
      const p = document.createElement('p'); p.textContent = para; li.append(p);
    }
    if (item.general) { const f = document.createElement('span'); f.className = 'tip__flag'; f.textContent = t('ui.generalAdvice'); li.append(f); }
    if (item.sources && item.sources.length) {
      const src = document.createElement('p'); src.className = 'tip__src';
      const label = document.createElement('span'); label.textContent = `${t('ui.source')}:`; src.append(label);
      item.sources.forEach((u) => {
        const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = new URL(u).hostname.replace(/^www\./, ''); src.append(a);
      });
      li.append(src);
    }
    return li;
  }));
}

function renderAll() {
  renderFilters(); renderList(); renderMarkers(); renderTips();
  if (state.activeId) openSpot(state.activeId);
}

function readHash() {
  const m = location.hash.match(/^#spot=(.+)$/);
  if (m) { const id = decodeURIComponent(m[1]); if (state.spots.some((s) => s.id === id)) openSpot(id, { fly: true }); }
}

async function main() {
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
    return;
  }
  renderAll();
  readHash();
  $('panel-close').addEventListener('click', closeSpot);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSpot(); });
  window.addEventListener('hashchange', readHash);
  onLangChange(renderAll);
}

main();
