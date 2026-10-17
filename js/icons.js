// Small inline SVG icon set (24×24, stroke-based, Lucide-style). Decorative: always aria-hidden.
const P = {
  // categories
  beach: '<path d="M12 12 4.6 4.6a10.5 10.5 0 0 1 14.8 0Z"/><path d="M12 12v9"/><path d="M3 21h18"/>',
  sunset: '<path d="M12 10V3"/><path d="m5.6 9.6 1.4 1.4"/><path d="M2 17h2"/><path d="M20 17h2"/><path d="m17 11 1.4-1.4"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M2 21h20"/>',
  food: '<path d="M4 3v7a3 3 0 0 0 3 3v8"/><path d="M10 3v7a3 3 0 0 1-3 3"/><path d="M7 3v6"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  market: '<path d="M4 9h16l-1.5 11a1 1 0 0 1-1 .9h-11a1 1 0 0 1-1-.9Z"/><path d="m8 9 3-6"/><path d="m16 9-3-6"/><path d="M9 13v4"/><path d="M15 13v4"/>',
  nature: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.8-6.2 2.9-.6 5-2.3 6.2-4.8"/>',
  viewpoint: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  culture: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M9 21v-6h6v6"/><path d="M2 10h20L12 3Z"/>',
  nightlife: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/>',
  safety: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  // tips
  visa: '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="10" r="3.5"/><path d="M8.5 10h7"/><path d="M12 6.5c1.2 1 1.2 6 0 7"/><path d="M8 17h8"/>',
  weather: '<path d="M12 2v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="M20 12h2"/><path d="m19.1 4.9-1.4 1.4"/><path d="M15.9 13.1A4 4 0 1 0 9 9.3"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  jellyfish: '<path d="M4 12a8 8 0 0 1 16 0Z"/><path d="M7 12c0 3-1 4-1 7"/><path d="M10.3 12c0 3 .7 5 .7 9"/><path d="M13.7 12c0 3-.7 5-.7 9"/><path d="M17 12c0 3 1 4 1 7"/>',
  sea: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  transport: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 10 16 6.6A2 2 0 0 0 14.4 6H9.6a2 2 0 0 0-1.6.8L5.6 10l-2.1.5C2.7 10.8 2 11.6 2 12.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
  money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
  emergency: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  power: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  rules: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  language: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  zone: '<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  // ui
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  directions: '<path d="M3 11 22 2l-9 19-2-8Z"/>',
  play: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3Z"/>',
};

export function icon(name, cls = 'icon') {
  const body = P[name] || P.zone;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
