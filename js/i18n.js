// Data-driven i18n. Add a language = add i18n/<code>.json + one entry in i18n/languages.json.
// Lookup order for every key: active language → English → key itself.
const STORE_KEY = 'pqmap.lang';
const dicts = {};
let lang = 'en';
let langs = [];
const listeners = [];

export const languages = () => langs;
export const currentLang = () => lang;
export const onLangChange = (fn) => listeners.push(fn);

async function loadDict(code) {
  if (dicts[code]) return dicts[code];
  const res = await fetch(`i18n/${code}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`i18n ${code}: ${res.status}`);
  dicts[code] = await res.json();
  return dicts[code];
}

function dig(obj, path) {
  return path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
}

export function t(key, { raw = false } = {}) {
  let v = dig(dicts[lang], key);
  if (v === undefined || v === '') v = dig(dicts.en, key);
  if (v === undefined) return raw ? undefined : key;
  return v;
}

// Translate a per-language content object: {en, vi, ko, ...} → active, then en, then vi, then first value.
export function tx(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.vi || Object.values(obj).find(Boolean) || '';
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(d) + ' (UTC+7)';
  } catch { return iso; }
}

function applyStatic() {
  const meta = langs.find((l) => l.code === lang) || {};
  document.documentElement.lang = lang;
  document.documentElement.dir = meta.dir || 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  const m = dicts[lang] && dicts[lang]._meta;
  const note = document.getElementById('mt-note');
  if (note) note.hidden = !(m && m.machineTranslated);
}

export async function setLang(code) {
  if (!langs.some((l) => l.code === code)) code = 'en';
  try { await loadDict(code); } catch { code = 'en'; }
  lang = code;
  try { localStorage.setItem(STORE_KEY, code); } catch {}
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = code;
  applyStatic();
  listeners.forEach((fn) => fn(code));
}

// Language switch without a jarring reflow: fetch the dictionary first, then swap every string
// inside one View Transition (a short cross-fade). Falls back to an instant swap; reduced motion = instant.
export async function switchLang(code) {
  try { await loadDict(code); } catch {}
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) return setLang(code);
  const root = document.documentElement;
  root.dataset.vt = 'lang';
  const vt = document.startViewTransition(() => setLang(code));
  vt.finished.finally(() => { delete root.dataset.vt; });
  return vt.updateCallbackDone;
}

function pickInitial() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q && langs.some((l) => l.code === q)) return q;
  try { const s = localStorage.getItem(STORE_KEY); if (s && langs.some((l) => l.code === s)) return s; } catch {}
  return 'en'; // English is the default for every first-time visitor
}

export async function initI18n() {
  langs = await (await fetch('i18n/languages.json', { cache: 'no-cache' })).json();
  await loadDict('en');
  const sel = document.getElementById('lang-select');
  sel.replaceChildren(...langs.map((l) => { const o = document.createElement('option'); o.value = l.code; o.textContent = l.nativeName; o.lang = l.code; return o; }));
  sel.addEventListener('change', () => switchLang(sel.value));
  const first = pickInitial();
  lang = first;
  if (first !== 'en') { try { await loadDict(first); } catch { lang = 'en'; } }
  sel.value = lang;
  applyStatic();
}
