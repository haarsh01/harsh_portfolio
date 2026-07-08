import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { ACCENT_IDS, APPEARANCE_MODE_IDS } from "#constants/appearance.js";
import { WALLPAPER_IDS, DEFAULT_WALLPAPER_ID } from "#constants/wallpapers.js";

const STORAGE_KEY = "portfolio-preferences";
const STORAGE_VERSION = 2;

const VALID_SCREEN_SAVER_DELAYS = [60, 120, 300, 0]; // 0 = Never

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const DEFAULT_PREFERENCES = {
  appearance: {
    // A clean/new visitor always starts in light mode — the site no longer
    // infers a default from the OS's prefers-color-scheme. An explicit
    // saved choice (including a visitor deliberately switching to "auto"
    // or "dark" in Control Center) is still respected on return visits;
    // this only changes what a *first-ever* visitor sees.
    mode: "light",
    accent: "blue",
    transparency: 100,
    reduceTransparency: false,
    highContrast: false,
  },
  desktop: {
    wallpaper: DEFAULT_WALLPAPER_ID,
    dynamicWallpaper: false,
    showWidgets: false,
    screenSaverEnabled: false,
    screenSaverDelay: 120,
  },
  dock: {
    magnification: true,
    magnificationScale: 0.25,
  },
  motion: {
    animationsEnabled: true,
  },
  sound: {
    interfaceSounds: false,
  },
};

// Every field is validated independently and falls back to its own default
// rather than discarding the whole record — one corrupted field shouldn't
// cost the visitor every other preference they set.
function sanitize(partial) {
  const p = partial && typeof partial === "object" ? partial : {};
  const appearance = p.appearance ?? {};
  const desktop = p.desktop ?? {};
  const dock = p.dock ?? {};
  const motion = p.motion ?? {};
  const sound = p.sound ?? {};
  const d = DEFAULT_PREFERENCES;

  return {
    appearance: {
      mode: APPEARANCE_MODE_IDS.includes(appearance.mode) ? appearance.mode : d.appearance.mode,
      accent: ACCENT_IDS.includes(appearance.accent) ? appearance.accent : d.appearance.accent,
      transparency: Number.isFinite(appearance.transparency) ? clamp(appearance.transparency, 40, 100) : d.appearance.transparency,
      reduceTransparency: typeof appearance.reduceTransparency === "boolean" ? appearance.reduceTransparency : d.appearance.reduceTransparency,
      highContrast: typeof appearance.highContrast === "boolean" ? appearance.highContrast : d.appearance.highContrast,
    },
    desktop: {
      wallpaper: WALLPAPER_IDS.includes(desktop.wallpaper) ? desktop.wallpaper : d.desktop.wallpaper,
      dynamicWallpaper: typeof desktop.dynamicWallpaper === "boolean" ? desktop.dynamicWallpaper : d.desktop.dynamicWallpaper,
      showWidgets: typeof desktop.showWidgets === "boolean" ? desktop.showWidgets : d.desktop.showWidgets,
      screenSaverEnabled: typeof desktop.screenSaverEnabled === "boolean" ? desktop.screenSaverEnabled : d.desktop.screenSaverEnabled,
      screenSaverDelay: VALID_SCREEN_SAVER_DELAYS.includes(desktop.screenSaverDelay) ? desktop.screenSaverDelay : d.desktop.screenSaverDelay,
    },
    dock: {
      magnification: typeof dock.magnification === "boolean" ? dock.magnification : d.dock.magnification,
      magnificationScale: Number.isFinite(dock.magnificationScale) ? clamp(dock.magnificationScale, 0.1, 0.5) : d.dock.magnificationScale,
    },
    motion: {
      animationsEnabled: typeof motion.animationsEnabled === "boolean" ? motion.animationsEnabled : d.motion.animationsEnabled,
    },
    sound: {
      interfaceSounds: typeof sound.interfaceSounds === "boolean" ? sound.interfaceSounds : d.sound.interfaceSounds,
    },
  };
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.version === STORAGE_VERSION) {
        return sanitize(parsed);
      }
    }
    return sanitize(null);
  } catch {
    return sanitize(null);
  }
}

function persist(slices) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...slices }));
  } catch {
    // localStorage unavailable (private mode, quota, disabled) — preferences
    // simply won't survive a refresh; nothing to crash.
  }
}

const initial = loadPreferences();

const usePreferencesStore = create(immer((set) => ({
  appearance: initial.appearance,
  desktop: initial.desktop,
  dock: initial.dock,
  motion: initial.motion,
  sound: initial.sound,

  // Live mirror of the OS-level media query — NOT persisted (we don't keep
  // our own copy of the browser's reduced-motion flag), kept here purely so
  // every consumer can read it from the one store instead of each adding
  // its own matchMedia listener. Synced by PreferencesBridge.
  motionOSReduced: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,

  setAppearance: (patch) => set((state) => { Object.assign(state.appearance, patch); }),
  setDesktop: (patch) => set((state) => { Object.assign(state.desktop, patch); }),
  setDock: (patch) => set((state) => { Object.assign(state.dock, patch); }),
  setMotion: (patch) => set((state) => { Object.assign(state.motion, patch); }),
  setSound: (patch) => set((state) => { Object.assign(state.sound, patch); }),

  toggleShowWidgets: () => set((state) => { state.desktop.showWidgets = !state.desktop.showWidgets; }),
  toggleScreenSaverEnabled: () => set((state) => { state.desktop.screenSaverEnabled = !state.desktop.screenSaverEnabled; }),
  toggleDynamicWallpaper: () => set((state) => { state.desktop.dynamicWallpaper = !state.desktop.dynamicWallpaper; }),

  toggleDockMagnification: () => set((state) => { state.dock.magnification = !state.dock.magnification; }),
  toggleAnimationsEnabled: () => set((state) => { state.motion.animationsEnabled = !state.motion.animationsEnabled; }),
  toggleInterfaceSounds: () => set((state) => { state.sound.interfaceSounds = !state.sound.interfaceSounds; }),

  syncOSReducedMotion: (value) => set((state) => { state.motionOSReduced = value; }),

  resetPreferences: () => set((state) => {
    state.appearance = { ...DEFAULT_PREFERENCES.appearance };
    state.desktop = { ...DEFAULT_PREFERENCES.desktop };
    state.dock = { ...DEFAULT_PREFERENCES.dock };
    state.motion = { ...DEFAULT_PREFERENCES.motion };
    state.sound = { ...DEFAULT_PREFERENCES.sound };
  }),
})));

// Single persistence trigger point: any change to a persisted slice writes
// the whole record back out. `motionOSReduced` is intentionally excluded —
// it's a live OS mirror, not a stored preference.
let previous = usePreferencesStore.getState();
usePreferencesStore.subscribe((state) => {
  if (
    state.appearance !== previous.appearance
    || state.desktop !== previous.desktop
    || state.dock !== previous.dock
    || state.motion !== previous.motion
    || state.sound !== previous.sound
  ) {
    persist({
      appearance: state.appearance,
      desktop: state.desktop,
      dock: state.dock,
      motion: state.motion,
      sound: state.sound,
    });
  }
  previous = state;
});

export default usePreferencesStore;
