// Generates a test JPEG WITH EXIF GPS + DateTimeOriginal, for testing tools/them-anh.mjs only.
// Usage: node tools/make-test-image.mjs anh-moi/test-sao-beach.jpg [lat] [lng]
import sharp from 'sharp';

const out = process.argv[2] || 'anh-moi/test-gps.jpg';
const lat = Number(process.argv[3] ?? 10.05247);
const lng = Number(process.argv[4] ?? 104.03519);

function dms(deg) {
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const mFloat = (a - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60 * 10000);
  return `${d}/1 ${m}/1 ${s}/10000`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c27a"/><stop offset="1" stop-color="#2f7f86"/></linearGradient></defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  <text x="600" y="430" font-size="160" font-family="Arial" font-weight="700" text-anchor="middle" fill="#ffffff">TEST</text>
</svg>`;

await sharp(Buffer.from(svg))
  .jpeg({ quality: 85 })
  .withExif({
    IFD0: { Make: 'TestCam', Model: 'PQ-Map Test', Artist: 'Private Name Should Be Stripped' },
    IFD2: { DateTimeOriginal: '2026:10:17 17:45:00', OffsetTimeOriginal: '+07:00' },
    IFD3: {
      GPSLatitudeRef: lat >= 0 ? 'N' : 'S', GPSLatitude: dms(lat),
      GPSLongitudeRef: lng >= 0 ? 'E' : 'W', GPSLongitude: dms(lng),
    },
  })
  .toFile(out);
console.log(`Wrote ${out} with GPS ${lat}, ${lng}`);
