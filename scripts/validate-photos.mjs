// Validates src/constants/photos.js against the real files on disk.
// Fails the build only for things that would actually break the Photos
// app (broken paths, duplicate ids, unsupported formats, missing alt
// text) — never for optional metadata (date/GPS/camera) simply being
// absent, since that's an honest, expected state for some photos.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PHOTOS } from '../src/constants/photos.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SUPPORTED_DISPLAY_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg']);

const errors = [];
const warnings = [];

const seenIds = new Set();
const seenPaths = new Set();

for (const photo of PHOTOS) {
  const label = photo.id ?? photo.filename ?? '(unknown photo)';

  if (!photo.id) errors.push(`${label}: missing id`);
  else if (seenIds.has(photo.id)) errors.push(`${label}: duplicate id "${photo.id}"`);
  else seenIds.add(photo.id);

  for (const field of ['src', 'thumbnailSrc']) {
    const value = photo[field];
    if (!value) { errors.push(`${label}: missing ${field}`); continue; }

    const ext = path.extname(value).toLowerCase();
    if (!SUPPORTED_DISPLAY_EXTENSIONS.has(ext)) {
      errors.push(`${label}: ${field} "${value}" uses an unsupported display format (${ext || 'no extension'}) — must be .webp or .jpg`);
    }

    const diskPath = path.join(PUBLIC_DIR, value);
    if (!existsSync(diskPath)) {
      errors.push(`${label}: ${field} "${value}" does not exist on disk (${diskPath})`);
    }

    if (seenPaths.has(value)) errors.push(`${label}: duplicate photo path "${value}"`);
    else seenPaths.add(value);
  }

  if (!photo.alt || !photo.alt.trim()) errors.push(`${label}: missing alt text`);

  if (photo.dateTaken && Number.isNaN(new Date(photo.dateTaken).getTime())) {
    errors.push(`${label}: dateTaken "${photo.dateTaken}" is not a valid date`);
  }

  if (photo.width != null && (!Number.isFinite(photo.width) || photo.width <= 0)) {
    errors.push(`${label}: invalid width "${photo.width}"`);
  }
  if (photo.height != null && (!Number.isFinite(photo.height) || photo.height <= 0)) {
    errors.push(`${label}: invalid height "${photo.height}"`);
  }

  if (!photo.dateTaken) warnings.push(`${label}: no date metadata (will show under "Recently Added")`);
  if (!photo.location) warnings.push(`${label}: no GPS metadata (won't appear in Places)`);
}

console.log(`Validated ${PHOTOS.length} photo(s): ${errors.length} error(s), ${warnings.length} warning(s)\n`);

if (warnings.length) {
  console.log('Warnings (non-fatal):');
  warnings.forEach((w) => console.log(`  - ${w}`));
  console.log('');
}

if (errors.length) {
  console.error('Errors:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('Photos manifest is valid.');
