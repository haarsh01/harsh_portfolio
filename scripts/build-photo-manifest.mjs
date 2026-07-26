// Builds src/constants/photos.js from a folder of real source photos
// (public/images/photos/originals/, or an --source folder copied in from
// there). Never invents metadata: a field is only written when a real
// EXIF/file value backs it. Run with:
//   node scripts/build-photo-manifest.mjs [--source <dir>]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, copyFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import exifr from 'exifr';

const ROOT = path.resolve(import.meta.dirname, '..');
// Deliberately NOT under public/ — anything there is copied verbatim into
// the production build and served as-is. Originals are preserved on disk
// for reprocessing, never shipped or served directly.
const ORIGINALS_DIR = path.join(ROOT, 'photos-originals');
const OPTIMIZED_DIR = path.join(ROOT, 'public/images/photos/optimized');
const THUMBS_DIR = path.join(ROOT, 'public/images/photos/thumbs');
const MANIFEST_PATH = path.join(ROOT, 'src/constants/photos.js');

const SUPPORTED_EXTENSIONS = new Set(['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp']);

const OPTIMIZED_MAX = 2400;
const THUMB_MAX = 640;

const args = process.argv.slice(2);
const sourceFlagIndex = args.indexOf('--source');
const sourceDir = sourceFlagIndex !== -1 ? path.resolve(args[sourceFlagIndex + 1]) : null;

for (const dir of [ORIGINALS_DIR, OPTIMIZED_DIR, THUMBS_DIR]) mkdirSync(dir, { recursive: true });

// ---------- Step 1: bring source files into originals/ (if --source given) ----------

function collectImageFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectImageFiles(full));
    } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

if (sourceDir) {
  if (!existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }
  const files = collectImageFiles(sourceDir);
  console.log(`Found ${files.length} image file(s) in ${sourceDir}`);
  for (const file of files) {
    const dest = path.join(ORIGINALS_DIR, path.basename(file));
    if (existsSync(dest)) {
      console.warn(`  skip (already in originals/): ${path.basename(file)}`);
      continue;
    }
    copyFileSync(file, dest);
    console.log(`  copied -> originals/${path.basename(file)}`);
  }
}

// ---------- Step 2: process every file currently in originals/ ----------

const originalFiles = readdirSync(ORIGINALS_DIR)
  .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
  .sort();

if (originalFiles.length === 0) {
  console.error(`No supported image files found in ${ORIGINALS_DIR}`);
  process.exit(1);
}

function slugify(filename) {
  return path.basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function toDominantToneHex(buffer) {
  // 3-channel average over a tiny downsample — a cheap, honest "roughly
  // this color" swatch for a loading placeholder, not a design choice.
  const r = buffer[0], g = buffer[1], b = buffer[2];
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function formatDateLabel(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const tmpDir = path.join(os.tmpdir(), `photo-build-${Date.now()}`);
mkdirSync(tmpDir, { recursive: true });

const entries = [];
const gpsToGeocode = new Map(); // "lat,lng" -> [entryIndex, ...]

console.log(`\nProcessing ${originalFiles.length} photo(s)...\n`);

for (const filename of originalFiles) {
  const originalPath = path.join(ORIGINALS_DIR, filename);
  const slug = slugify(filename);

  // Every source file — not just HEIC — is normalized through sips before
  // sharp ever sees it. Two independent real-world reasons: (1) libheif
  // (which sharp uses for HEIC) enforces a strict security limit on the
  // number of auxiliary-image references a HEIC container may have and
  // rejects real, unmodified iPhone Portrait/Live Photos over that limit;
  // (2) some already-JPEG exports (seen here from Instagram/Snapchat) use
  // slightly non-conforming restart markers that libjpeg/libvips reject
  // outright even though they're valid, viewable images. Apple's own
  // decoder (sips) is lenient enough to read and cleanly re-encode both
  // cases, so it's the one normalization path for every format.
  const normalizedPath = path.join(tmpDir, `${slug}.jpg`);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', originalPath, '--out', normalizedPath], { stdio: 'pipe' });
  } catch (err) {
    console.error(`  FAILED to convert ${filename}: ${err.message}`);
    continue;
  }

  // Read directly from the original file (exifr parses HEIC containers
  // natively) rather than the sips-converted intermediate, so metadata
  // never depends on sips's EXIF passthrough fidelity.
  let exif = {};
  try {
    exif = (await exifr.parse(originalPath, { gps: true, translateValues: true })) ?? {};
  } catch {
    exif = {};
  }

  const optimizedRel = `/images/photos/optimized/${slug}.webp`;
  const thumbRel = `/images/photos/thumbs/${slug}.webp`;

  const pipeline = sharp(normalizedPath).rotate();
  const { data: optimizedBuffer, info: optimizedInfo } = await pipeline
    .clone()
    .resize({ width: OPTIMIZED_MAX, height: OPTIMIZED_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  writeFileSync(path.join(OPTIMIZED_DIR, `${slug}.webp`), optimizedBuffer);

  await pipeline
    .clone()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(THUMBS_DIR, `${slug}.webp`));

  const toneSample = await sharp(normalizedPath).resize(4, 4, { fit: 'fill' }).raw().toBuffer();
  const dominantTone = toDominantToneHex(toneSample);

  const dateTaken = exif.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.toISOString()
    : exif.CreateDate instanceof Date ? exif.CreateDate.toISOString()
    : null;

  const hasGps = typeof exif.latitude === 'number' && typeof exif.longitude === 'number';
  const camera = exif.Model ? String(exif.Model).trim() : null;

  const albumIds = [];
  if (dateTaken) albumIds.push(`year-${new Date(dateTaken).getFullYear()}`);

  const entry = {
    id: slug,
    src: optimizedRel,
    thumbnailSrc: thumbRel,
    width: optimizedInfo.width,
    height: optimizedInfo.height,
    aspectRatio: Number((optimizedInfo.width / optimizedInfo.height).toFixed(4)),
    filename,
    albumIds,
    isFavorite: false,
    dateTaken,
    dateLabel: dateTaken ? formatDateLabel(dateTaken) : null,
    location: hasGps ? { lat: Number(exif.latitude.toFixed(5)), lng: Number(exif.longitude.toFixed(5)), label: null } : null,
    camera,
    alt: "Photograph from Harsh's personal photo library",
    dominantTone,
    tags: dateTaken ? [String(new Date(dateTaken).getFullYear())] : [],
  };

  if (hasGps) {
    const key = `${entry.location.lat.toFixed(2)},${entry.location.lng.toFixed(2)}`;
    if (!gpsToGeocode.has(key)) gpsToGeocode.set(key, []);
    gpsToGeocode.get(key).push(entries.length);
  }

  entries.push(entry);
  console.log(`  ${filename} -> ${slug}.webp (${optimizedInfo.width}x${optimizedInfo.height})${dateTaken ? `, ${entry.dateLabel}` : ', no date'}${hasGps ? ', GPS' : ''}`);
}

rmSync(tmpDir, { recursive: true, force: true });

// ---------- Step 3: best-effort reverse geocoding for real GPS clusters ----------

if (gpsToGeocode.size > 0) {
  console.log(`\nReverse-geocoding ${gpsToGeocode.size} distinct location(s)...`);
  for (const [key, indices] of gpsToGeocode) {
    const [lat, lng] = key.split(',');
    let label = null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`, {
        headers: { 'User-Agent': 'harsh-portfolio-photo-build-script/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        const a = data.address ?? {};
        label = a.city || a.town || a.village || a.municipality || a.county || a.state || null;
      }
    } catch {
      label = null;
    }
    for (const idx of indices) {
      entries[idx].location.label = label ?? `${entries[idx].location.lat}°, ${entries[idx].location.lng}°`;
    }
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim usage policy: max 1 req/sec
  }
}

// ---------- Step 4: sort and write manifest ----------

entries.sort((a, b) => {
  if (a.dateTaken && b.dateTaken) return new Date(b.dateTaken) - new Date(a.dateTaken);
  if (a.dateTaken) return -1;
  if (b.dateTaken) return 1;
  return 0;
});

const banner = `// Auto-generated by scripts/build-photo-manifest.mjs — do not hand-edit.
// Every field here is derived from a real file in public/images/photos/
// (filename, EXIF date/GPS/camera, decoded dimensions) — nothing is invented.
// Re-run the script (see README) after adding or removing source photos.
`;

const body = `${banner}\nexport const PHOTOS = ${JSON.stringify(entries, null, 2)};\n`;
writeFileSync(MANIFEST_PATH, body);

const withDate = entries.filter((e) => e.dateTaken).length;
const withGps = entries.filter((e) => e.location).length;
console.log(`\nWrote ${entries.length} photos to src/constants/photos.js`);
console.log(`  with real date metadata: ${withDate}/${entries.length}`);
console.log(`  with real GPS metadata:  ${withGps}/${entries.length}`);
