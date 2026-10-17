#!/usr/bin/env node
// them-anh — đọc ảnh trong anh-moi/, lấy GPS + thời gian chụp, xuất WebP (đã xoá EXIF), thêm bản nháp vào data/spots.json.
// Usage: node tools/them-anh.mjs [--dry-run] [--publish] [--help]
import { readdir, readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import exifr from 'exifr';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(ROOT, 'anh-moi');
const DONE = path.join(INBOX, 'da-xu-ly');
const PHOTOS = path.join(ROOT, 'photos');
const SPOTS = path.join(ROOT, 'data', 'spots.json');
const IMPORTED = path.join(ROOT, 'data', 'imported.json');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff']);
const MAX = 1600, THUMB = 640, QUALITY = 80;
const DEFAULT_OFFSET = '+07:00'; // Asia/Ho_Chi_Minh

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const PUBLISH = args.has('--publish');

if (args.has('--help') || args.has('-h')) {
  console.log(`them-anh — thêm ảnh mới vào bản đồ

  node tools/them-anh.mjs            xử lý ảnh trong anh-moi/ (tạo bản nháp)
  node tools/them-anh.mjs --dry-run  chỉ xem trước, không ghi gì
  node tools/them-anh.mjs --publish  xử lý xong thì git add + commit + push
  node tools/them-anh.mjs --help     hướng dẫn này

Xem HUONG-DAN.md để biết chi tiết.`);
  process.exit(0);
}

const exists = (p) => access(p).then(() => true, () => false);
const readJSON = async (p, fallback) => (await exists(p)) ? JSON.parse(await readFile(p, 'utf8')) : fallback;

function toIso(raw, offset) {
  // raw: "YYYY:MM:DD HH:MM:SS" (EXIF) → "YYYY-MM-DDTHH:MM:SS+07:00"
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const off = /^[+-]\d{2}:\d{2}$/.test(offset || '') ? offset : DEFAULT_OFFSET;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${off}`;
}

async function readMeta(file) {
  let gps = null, raw = {};
  try { gps = await exifr.gps(file); } catch {}
  try {
    raw = (await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate', 'OffsetTimeOriginal', 'OffsetTime'], reviveValues: false })) || {};
  } catch {}
  const lat = gps && Number.isFinite(gps.latitude) ? Number(gps.latitude.toFixed(6)) : null;
  const lng = gps && Number.isFinite(gps.longitude) ? Number(gps.longitude.toFixed(6)) : null;
  const capturedAt = toIso(raw.DateTimeOriginal || raw.CreateDate, raw.OffsetTimeOriginal || raw.OffsetTime);
  return { lat, lng, capturedAt };
}

async function assertClean(file) {
  // Published images must carry no GPS / EXIF. sharp strips metadata by default (we never call keepMetadata/withMetadata).
  let gps = null, any = null;
  try { gps = await exifr.gps(file); } catch {}
  try { any = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: true, iptc: true }); } catch {}
  if (gps || (any && Object.keys(any).length)) throw new Error(`Ảnh xuất ra vẫn còn metadata: ${file}`);
}

function git(...a) { return execFileSync('git', a, { cwd: ROOT, stdio: 'inherit' }); }

async function main() {
  await mkdir(INBOX, { recursive: true });
  const files = (await readdir(INBOX, { withFileTypes: true }))
    .filter((d) => d.isFile() && EXT.has(path.extname(d.name).toLowerCase()))
    .map((d) => path.join(INBOX, d.name))
    .sort();
  if (!files.length) { console.log('Không có ảnh mới trong anh-moi/.'); return; }

  const data = await readJSON(SPOTS, { spots: [] });
  const list = Array.isArray(data) ? data : data.spots;
  const imported = await readJSON(IMPORTED, { hashes: [] });
  const seen = new Set(imported.hashes);
  const added = [], noGps = [], skipped = [], failed = [];

  for (const file of files) {
    const name = path.basename(file);
    try {
      const buf = await readFile(file);
      const hash = createHash('sha256').update(buf).digest('hex').slice(0, 12);
      if (seen.has(hash)) { skipped.push(name); if (!DRY) await moveDone(file); continue; }
      const meta = await readMeta(file);
      const day = (meta.capturedAt || new Date().toISOString()).slice(0, 10);
      const id = `${day}-${hash.slice(0, 4)}`;
      const big = path.join(PHOTOS, `${id}-1.webp`);
      const small = path.join(PHOTOS, `${id}-1-sm.webp`);
      let width = null, height = null;
      if (!DRY) {
        await mkdir(PHOTOS, { recursive: true });
        const info = await sharp(buf).rotate().resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(big);
        await sharp(buf).rotate().resize({ width: THUMB, height: THUMB, fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toFile(small);
        await assertClean(big); await assertClean(small);
        width = info.width; height = info.height;
      }
      const entry = {
        id, status: 'draft', category: 'viewpoint',
        lat: meta.lat, lng: meta.lng, capturedAt: meta.capturedAt,
        ...(meta.lat === null ? { needsLocation: true } : {}),
        photos: [{ src: `photos/${id}-1.webp`, thumb: `photos/${id}-1-sm.webp`, width, height, placeholder: false, alt: { en: 'TODO describe the photo' } }],
        name: { en: 'TODO name' }, guide: { en: 'TODO guide' }, tips: { en: 'TODO tips' }, bestTime: { en: 'TODO best time' },
        links: [], youtube: null, source: 'them-anh',
      };
      list.push(entry); seen.add(hash); added.push({ id, name, ...meta });
      if (meta.lat === null) noGps.push(name);
      if (!DRY) await moveDone(file);
    } catch (err) {
      failed.push(`${name}: ${err.message}`);
    }
  }

  if (!DRY && added.length) {
    await writeFile(SPOTS, JSON.stringify(Array.isArray(data) ? list : { ...data, spots: list }, null, 2) + '\n', 'utf8');
    await writeFile(IMPORTED, JSON.stringify({ hashes: [...seen] }, null, 2) + '\n', 'utf8');
  }

  console.log(`\n=== Kết quả${DRY ? ' (chạy thử, chưa ghi gì)' : ''} ===`);
  console.log(`Ảnh mới thêm: ${added.length} · Bỏ qua (đã có): ${skipped.length} · Lỗi: ${failed.length}`);
  for (const a of added) console.log(`  + ${a.name} → id ${a.id} · ${a.lat !== null ? `${a.lat}, ${a.lng}` : 'THIẾU GPS'} · ${a.capturedAt || 'không rõ giờ chụp'}`);
  if (noGps.length) {
    console.log(`\n⚠ ${noGps.length} ảnh KHÔNG có GPS: ${noGps.join(', ')}`);
    console.log('  → Mở Google Maps, nhấn giữ đúng chỗ, chép 2 số toạ độ vào "lat" và "lng", rồi xoá dòng "needsLocation".');
  }
  for (const f of failed) console.log(`  ✗ ${f}`);
  if (added.length) {
    console.log('\nViệc tiếp theo: mở data/spots.json, tìm các id ở trên, điền name / guide / tips / bestTime (ít nhất tiếng Anh "en"),');
    console.log('chọn category, rồi đổi "status": "draft" thành "published". Ảnh gốc đã chuyển vào anh-moi/da-xu-ly/.');
  }

  if (PUBLISH && !DRY) {
    if (failed.length) { console.log('\nCó lỗi nên KHÔNG đăng. Sửa lỗi rồi chạy lại.'); process.exitCode = 1; return; }
    console.log('\nĐang đăng lên GitHub…');
    git('add', 'data', 'photos');
    try { git('commit', '-m', 'Thêm ảnh mới'); } catch { console.log('(Không có thay đổi mới để commit.)'); }
    git('push');
  }
}

async function moveDone(file) {
  await mkdir(DONE, { recursive: true });
  let target = path.join(DONE, path.basename(file));
  if (await exists(target)) target = path.join(DONE, `${Date.now()}-${path.basename(file)}`);
  await rename(file, target);
}

main().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });
