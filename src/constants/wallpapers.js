// Curated, entirely local wallpaper set. The repository ships exactly one
// photographic wallpaper asset (wallpaper.jpg) — rather than fabricate or
// fetch additional photography (explicitly disallowed: no remote wallpaper
// API), the time-of-day set is implemented as small, zero-network-cost CSS
// gradients. This is an honest reading of "local assets": no image bytes to
// download, nothing to preload but the one real photo.
export const WALLPAPERS = [
  { id: "sequoia", label: "Sequoia", kind: "image", value: "url('/images/wallpaper.jpg')", textColor: "light" },
  { id: "morning", label: "Morning", kind: "gradient", value: "linear-gradient(160deg, #ffd89b 0%, #f6a97a 45%, #a390e4 100%)", textColor: "dark", phase: "morning" },
  { id: "afternoon", label: "Afternoon", kind: "gradient", value: "linear-gradient(160deg, #6dd5ed 0%, #2193b0 100%)", textColor: "light", phase: "afternoon" },
  { id: "sunset", label: "Sunset", kind: "gradient", value: "linear-gradient(160deg, #ff9a56 0%, #ff6a88 45%, #6a3093 100%)", textColor: "light", phase: "sunset" },
  { id: "night", label: "Night", kind: "gradient", value: "linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)", textColor: "light", phase: "night" },
  { id: "graphite", label: "Graphite", kind: "gradient", value: "linear-gradient(160deg, #232526 0%, #414345 100%)", textColor: "light" },
  { id: "aurora", label: "Aurora", kind: "gradient", value: "linear-gradient(160deg, #00c6ff 0%, #7b2ff7 50%, #f107a3 100%)", textColor: "light" },
];

export const WALLPAPER_IDS = WALLPAPERS.map((wallpaper) => wallpaper.id);
export const DEFAULT_WALLPAPER_ID = "sequoia";

const PHASE_ORDER = ["morning", "afternoon", "sunset", "night"];
const PHASE_WALLPAPER = Object.fromEntries(
  WALLPAPERS.filter((w) => w.phase).map((w) => [w.phase, w.id]),
);

// Pure function of a Date — deliberately takes `date` as a parameter (rather
// than reading `new Date()` internally) so a phase can be tested directly
// with a fixed time instead of mocking the system clock.
export function getWallpaperPhase(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "sunset";
  return "night";
}

export function getDynamicWallpaperId(date = new Date()) {
  return PHASE_WALLPAPER[getWallpaperPhase(date)] ?? DEFAULT_WALLPAPER_ID;
}

export function getAdjacentPhaseWallpaperIds(date = new Date()) {
  const phase = getWallpaperPhase(date);
  const index = PHASE_ORDER.indexOf(phase);
  const next = PHASE_ORDER[(index + 1) % PHASE_ORDER.length];
  return [PHASE_WALLPAPER[phase], PHASE_WALLPAPER[next]].filter(Boolean);
}

export function getWallpaperById(id) {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? WALLPAPERS[0];
}
