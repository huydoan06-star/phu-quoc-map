// Satellite atlas: Sentinel-2 cloudless imagery by day; at night the same imagery is darkened and
// NASA's VIIRS Black Marble city lights are screened on top, plus warm flickering halos over towns.
// Day/night follows real sunrise/sunset on Phú Quốc (js/sun.js) unless the visitor picks one.
import { isNight } from './sun.js';
import { t, onLangChange } from './i18n.js';

// One-line switch: when the site starts earning (affiliate links), use the CC BY 4.0 2016 layer instead
// of the CC BY-NC-SA 2024 layer — see SOURCES.md.
export const IMAGERY = {
  layer: 's2cloudless-2024_3857',
  year: 2024,
  license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
};
// export const IMAGERY = { layer: 's2cloudless_3857', year: 2016, license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' };

const EOX_URL = `https://tiles.maps.eox.at/wmts/1.0.0/${IMAGERY.layer}/default/g/{z}/{y}/{x}.jpg`;
const GIBS_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
const ATTR_DAY = `<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless – s2maps.eu</a> by <a href="https://eox.at" target="_blank" rel="noopener">EOX IT Services GmbH</a> (contains modified Copernicus Sentinel data ${IMAGERY.year}), <a href="${IMAGERY.licenseUrl}" target="_blank" rel="noopener">${IMAGERY.license}</a>`;
const ATTR_NIGHT = 'Night lights: <a href="https://earthobservatory.nasa.gov/features/NightLights" target="_blank" rel="noopener">NASA Earth Observatory</a> / <a href="https://www.earthdata.nasa.gov/gibs" target="_blank" rel="noopener">GIBS</a> (VIIRS Black Marble)';
const DETAIL_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR_DETAIL = 'Close-up map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const ATTR_OSM = 'Places © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

const PLACES = [
  ['Dương Đông', 10.236, 103.972, 'town'], ['An Thới', 10.006, 103.998, 'town'], ['Hàm Ninh', 10.17, 104.062, 'town'],
  ['Gành Dầu', 10.3708, 103.8447, 'town'], ['Cửa Cạn', 10.2776, 103.9236, 'village'], ['Bãi Thơm', 10.412, 104.0315, 'village'],
  ['Dương Tơ', 10.1676, 103.9734, 'village'], ['PQC ✈', 10.1727, 103.9922, 'village'], ['Hòn Thơm', 9.9543, 104.0176, 'minor'],
  ['Núi Chúa ▲', 10.3777, 104.0388, 'minor'], ['Vườn quốc gia Phú Quốc', 10.33, 104.02, 'minor'],
];
const HALOS = [ // [lat, lng, size px at z11, flicker delay]
  [10.215, 103.965, 190, '0s'], [10.025, 104.008, 150, '-1.3s'], [10.325, 103.857, 140, '-2.1s'],
  [10.1727, 103.9922, 90, '-0.7s'], [10.14, 103.975, 110, '-2.8s'], [10.182, 104.048, 60, '-1.9s'],
];
const THEME_KEY = 'pqmap.theme';
const root = document.documentElement;
let map, lights = null, fxEl, autoTimer = null;
const themeListeners = [];
export const onThemeChange = (fn) => themeListeners.push(fn);
export const theme = () => root.dataset.theme || 'day';

export function createMap(el, { bounds, maxBounds, interactiveWheel, animate }) {
  map = L.map(el, {
    zoomControl: false, zoomSnap: 0.25, zoomDelta: 0.5, minZoom: 9, maxZoom: 19,
    maxBounds, maxBoundsViscosity: 0.85, scrollWheelZoom: false, wheelPxPerZoomLevel: 90,
    fadeAnimation: animate, zoomAnimation: animate, markerZoomAnimation: animate,
  });
  if (interactiveWheel) {
    const c = map.getContainer();
    const on = () => map.scrollWheelZoom.enable();
    map.on('click focus zoomstart', on); c.addEventListener('pointerdown', on);
    c.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
  }
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  L.control.zoom({ position: 'topright' }).addTo(map);

  for (const [name, z] of [['detail', 215], ['fx', 230], ['lights', 260], ['glow', 380], ['labels', 390]]) {
    const p = map.createPane(name); p.style.zIndex = String(z); p.style.pointerEvents = 'none';
  }
  const base = L.tileLayer(EOX_URL, { maxNativeZoom: 15, maxZoom: 19, className: 'tiles-base', attribution: ATTR_DAY, keepBuffer: 3 }).addTo(map);
  // Fallback: if the imagery host is unreachable, show OpenStreetMap instead of an empty sea.
  let ok = 0, bad = 0;
  base.on('tileload', () => { ok++; });
  base.on('tileerror', () => {
    if (++bad === 6 && ok === 0) {
      map.removeLayer(base);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'tiles-base', attribution: '© OpenStreetMap contributors' }).addTo(map);
    }
  });
  map.attributionControl.addAttribution(ATTR_OSM);

  // Close-zoom detail: Sentinel-2 is 10 m/pixel, so from z15.5 to z17 we crossfade into OpenStreetMap's
  // standard map, which stays sharp to z19. Tiles are only requested from z15.5 up (tile usage policy:
  // browser referer, no prefetch, small keepBuffer, no requests while zooming).
  const detail = L.tileLayer(DETAIL_URL, {
    pane: 'detail', minZoom: 16, maxZoom: 19, maxNativeZoom: 19, className: 'tiles-detail', attribution: ATTR_DETAIL,
    keepBuffer: 1, updateWhenZooming: false, updateWhenIdle: true, crossOrigin: false,
  }).addTo(map);
  detail.on('tileerror', () => {});

  // Ambient FX layer lives in its own pane (above imagery, below pins) and is pinned to the viewport.
  fxEl = document.getElementById('fx');
  map.getPane('fx').append(fxEl);
  const syncFx = () => {
    const s = map.getSize();
    L.DomUtil.setPosition(fxEl, map.containerPointToLayerPoint([0, 0]));
    fxEl.style.width = `${s.x}px`; fxEl.style.height = `${s.y}px`;
  };
  map.on('move resize zoomend viewreset', syncFx);

  PLACES.forEach(([name, lat, lng, kind]) => L.marker([lat, lng], {
    pane: 'labels', interactive: false, keyboard: false,
    icon: L.divIcon({ className: `place place--${kind}`, html: `<span>${name}</span>`, iconSize: [0, 0] }),
  }).addTo(map));
  HALOS.forEach(([lat, lng, s, d]) => L.marker([lat, lng], {
    pane: 'glow', interactive: false, keyboard: false,
    icon: L.divIcon({ className: 'halo', html: `<span style="--s:${s}px;--d:${d}"></span>`, iconSize: [0, 0] }),
  }).addTo(map));
  const syncZoom = () => {
    const z = map.getZoom();
    // Halos grow with zoom but are capped, and fade when zoomed in close so streets stay readable.
    const c = map.getContainer();
    c.style.setProperty('--gz', Math.min(1.8, Math.pow(2, (z - 11) * 0.5)).toFixed(3));
    c.style.setProperty('--go', z >= 14 ? '0.18' : z >= 12.5 ? '0.45' : '0.9');
    // NASA lights are only ~500 m/pixel: fade them as we zoom past their native detail
    c.style.setProperty('--lo', z >= 14 ? '0' : z >= 13 ? '0.3' : z >= 12 ? '0.6' : '0.95');
    // satellite → street-detail crossfade between z15.5 and z17
    c.style.setProperty('--dz', Math.min(1, Math.max(0, (z - 15.5) / 1.5)).toFixed(3));
    c.classList.toggle('zoom-ge16', z >= 16);
    map.getContainer().classList.toggle('zoom-lt11', z < 11);
  };
  map.on('zoom zoomend', syncZoom);
  map.fitBounds(bounds.b, bounds.pad);
  syncZoom(); syncFx();
  if (theme() === 'night') ensureLights();
  if (new URLSearchParams(location.search).has('debug')) window.__pqmap = map; // test hook only
  return map;
}

function ensureLights() {
  if (lights || !map) return;
  lights = L.tileLayer(GIBS_URL, { pane: 'lights', maxNativeZoom: 8, maxZoom: 17, className: 'tiles-lights', attribution: ATTR_NIGHT, bounds: [[9.5, 103.4], [10.8, 104.5]] }).addTo(map);
}

function applyTheme(next) {
  if (next === 'night') ensureLights();
  if (theme() === next && root.dataset.theme) return syncThemeButton();
  root.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]').content = next === 'night' ? '#0b1026' : '#fbf7ee';
  syncThemeButton();
  themeListeners.forEach((fn) => fn(next));
}

function syncThemeButton() {
  const b = document.getElementById('theme-toggle');
  b.setAttribute('aria-pressed', String(theme() === 'night'));
  document.getElementById('theme-label').textContent = theme() === 'night' ? t('ui.night') : t('ui.day');
}

function manual() { try { return sessionStorage.getItem(THEME_KEY); } catch { return null; } }

// Decide day/night before anything renders (hero photo set, map tint).
export function resolveTheme() {
  themeFromQuery();
  applyTheme(manual() || (isNight() ? 'night' : 'day'));
}

export function initTheme() {
  // Auto mode re-checks every minute so the map turns to night at sunset while the page is open.
  autoTimer = setInterval(() => { if (!manual()) applyTheme(isNight() ? 'night' : 'day'); }, 60e3);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = theme() === 'night' ? 'day' : 'night';
    try { sessionStorage.setItem(THEME_KEY, next); } catch {}
    applyTheme(next);
  });
  onLangChange(syncThemeButton);
}
// For tests / deep links: ?theme=night|day
export function themeFromQuery() {
  const q = new URLSearchParams(location.search).get('theme');
  if (q === 'night' || q === 'day') { try { sessionStorage.setItem(THEME_KEY, q); } catch {} }
}
