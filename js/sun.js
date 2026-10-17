// Tiny NOAA solar-position approximation — sunrise/sunset for Phú Quốc without any API.
// Accurate to ~1–2 minutes at this latitude, which is plenty for choosing a day or night map.
export const PQ = { lat: 10.22, lng: 103.96, utcOffsetH: 7 };
const rad = Math.PI / 180;

// Returns { sunrise, sunset } as Date objects for the island-local calendar day containing `now`.
export function sunTimes(now = new Date(), { lat, lng, utcOffsetH } = PQ) {
  const local = new Date(now.getTime() + utcOffsetH * 3600e3); // shift so UTC getters read island-local date
  const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate();
  const doy = Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 864e5);
  const g = (2 * Math.PI / 365) * (doy - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  const ha = Math.acos(Math.min(1, Math.max(-1, cosH))) / rad;
  // minutes after 00:00 UTC of the island-local calendar day (may be negative = previous UTC day)
  const riseMin = 720 - 4 * (lng + ha) - eqt;
  const setMin = 720 - 4 * (lng - ha) - eqt;
  const base = Date.UTC(y, m, d);
  return { sunrise: new Date(base + riseMin * 60e3), sunset: new Date(base + setMin * 60e3) };
}

export function isNight(now = new Date()) {
  const { sunrise, sunset } = sunTimes(now);
  return now < sunrise || now >= sunset;
}
