// Photo helpers shared by hero, cards, panel and lightbox. Owner photos (from them-anh, no `credit`) always win.
import { t } from './i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isOwner = (p) => p && !p.credit;
export const cardSrc = (p) => p && (p.card || p.src);
export const pinSrc = (p) => p && (p.pin || p.thumb || p.card || p.src);
export const srcset = (p) => (p && p.card && p.src && p.card !== p.src ? `${p.card} 800w, ${p.src} 1600w` : '');

// Owner photos first, then licensed ones, keeping the original order inside each group.
export function sortedPhotos(spot) {
  const list = (spot.photos || []).filter((p) => p && p.src);
  return [...list.filter(isOwner), ...list.filter((p) => !isOwner(p))];
}

// "Photo: Author · CC BY-SA 4.0" with links to the Commons file page and the licence deed.
export function creditHTML(p, { short = false } = {}) {
  if (!p) return '';
  if (isOwner(p)) return esc(t('ui.ownerPhoto'));
  const c = p.credit;
  const who = c.source ? `<a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.author)}</a>` : esc(c.author);
  const lic = c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener license">${esc(c.license)}</a>` : esc(c.license);
  return short ? `${esc(t('ui.photoBy'))}: ${who} · ${lic}` : `${esc(t('ui.photoBy'))}: ${who} · ${lic} · Wikimedia Commons`;
}
export function creditText(p) {
  if (!p) return '';
  return isOwner(p) ? t('ui.ownerPhoto') : `${t('ui.photoBy')}: ${p.credit.author} · ${p.credit.license}`;
}
