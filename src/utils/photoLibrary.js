// Pure derivation helpers over the real photo manifest (#constants/photos.js).
// Nothing here invents data — every grouping (month, year album, memory
// cluster, place) is computed strictly from each photo's own dateTaken/
// location, and produces an empty result when the underlying metadata
// isn't there, rather than a fabricated placeholder.

const DAY_MS = 24 * 60 * 60 * 1000;
const MEMORY_GAP_MS = 4 * DAY_MS;
const MEMORY_MIN_PHOTOS = 3;

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const shortDayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function groupByMonth(photos) {
  const dated = photos.filter((p) => p.dateTaken);
  const undated = photos.filter((p) => !p.dateTaken);

  const buckets = new Map();
  for (const photo of dated) {
    const key = monthKey(photo.dateTaken);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(photo);
  }

  const groups = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, groupPhotos]) => ({
      key,
      label: monthFormatter.format(new Date(groupPhotos[0].dateTaken)),
      photos: groupPhotos,
    }));

  if (undated.length) {
    groups.push({ key: 'undated', label: 'Recently Added', photos: undated });
  }

  return groups;
}

export function getRecents(photos) {
  return [...photos].sort((a, b) => {
    if (a.dateTaken && b.dateTaken) return new Date(b.dateTaken) - new Date(a.dateTaken);
    if (a.dateTaken) return -1;
    if (b.dateTaken) return 1;
    return 0;
  });
}

export function getAlbums(photos) {
  const buckets = new Map();
  for (const photo of photos) {
    for (const albumId of photo.albumIds ?? []) {
      if (!albumId.startsWith('year-')) continue;
      if (!buckets.has(albumId)) buckets.set(albumId, []);
      buckets.get(albumId).push(photo);
    }
  }

  return [...buckets.entries()]
    .map(([id, albumPhotos]) => {
      const sorted = getRecents(albumPhotos);
      return {
        id,
        title: id.replace('year-', ''),
        count: sorted.length,
        coverPhoto: sorted[0],
        photos: sorted,
      };
    })
    .sort((a, b) => (a.title < b.title ? 1 : -1));
}

export function getFavorites(photos, favoriteIds) {
  if (!favoriteIds || favoriteIds.size === 0) return [];
  return photos.filter((p) => favoriteIds.has(p.id));
}

function placeKey(location) {
  // Grouped by the resolved place name when one exists — several distinct
  // GPS points a short walk apart in the same city are still "Halifax" to
  // a person browsing Places, not six separate cards. Only falls back to
  // raw coordinates (which naturally can't merge across distinct points)
  // when no verified label was available to group by.
  return location.label ?? `${location.lat.toFixed(2)},${location.lng.toFixed(2)}`;
}

export function getPlaces(photos) {
  const withLocation = photos.filter((p) => p.location);
  if (withLocation.length === 0) return [];

  const buckets = new Map();
  for (const photo of withLocation) {
    const key = placeKey(photo.location);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(photo);
  }

  return [...buckets.entries()]
    .map(([key, placePhotos]) => {
      const sorted = getRecents(placePhotos);
      return {
        key,
        title: sorted[0].location.label ?? `${sorted[0].location.lat}°, ${sorted[0].location.lng}°`,
        lat: sorted[0].location.lat,
        lng: sorted[0].location.lng,
        count: sorted.length,
        coverPhoto: sorted[0],
        photos: sorted,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function formatDateRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start.toDateString() === end.toDateString()) return dayFormatter.format(start);
  if (start.getFullYear() === end.getFullYear()) return `${shortDayFormatter.format(start)} – ${shortDayFormatter.format(end)}, ${end.getFullYear()}`;
  return `${dayFormatter.format(start)} – ${dayFormatter.format(end)}`;
}

export function getMemories(photos) {
  const dated = photos.filter((p) => p.dateTaken).sort((a, b) => new Date(a.dateTaken) - new Date(b.dateTaken));
  if (dated.length === 0) return [];

  const clusters = [];
  let current = [dated[0]];

  for (let i = 1; i < dated.length; i += 1) {
    const gap = new Date(dated[i].dateTaken) - new Date(dated[i - 1].dateTaken);
    if (gap > MEMORY_GAP_MS) {
      clusters.push(current);
      current = [];
    }
    current.push(dated[i]);
  }
  clusters.push(current);

  return clusters
    .filter((cluster) => cluster.length >= MEMORY_MIN_PHOTOS)
    .map((cluster) => {
      const dateStart = cluster[0].dateTaken;
      const dateEnd = cluster[cluster.length - 1].dateTaken;
      const sorted = getRecents(cluster);
      return {
        id: `memory-${dateStart}`,
        title: formatDateRange(dateStart, dateEnd),
        dateStart,
        dateEnd,
        count: sorted.length,
        coverPhoto: sorted[0],
        photos: sorted,
      };
    })
    .sort((a, b) => new Date(b.dateStart) - new Date(a.dateStart));
}
