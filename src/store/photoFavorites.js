import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// Visitor-side only: there is no favorite metadata in the real photo
// manifest (see #constants/photos.js), so "favoriting" a photo is a local
// UI affordance scoped to this browser, never written back to the
// manifest — same versioned-localStorage convention as useWidgetsStore.
const STORAGE_KEY = "portfolio-photo-favorites";
const STORAGE_VERSION = 1;

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.ids)) return [];
    return parsed.ids.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

function persist(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ids }));
  } catch {
    // localStorage unavailable — favorites simply won't survive a refresh.
  }
}

const usePhotoFavoritesStore = create(immer((set) => ({
  ids: loadFavorites(),

  toggleFavorite: (photoId) => set((state) => {
    const index = state.ids.indexOf(photoId);
    if (index === -1) state.ids.push(photoId);
    else state.ids.splice(index, 1);
  }),
})));

let previousIds = usePhotoFavoritesStore.getState().ids;
usePhotoFavoritesStore.subscribe((state) => {
  if (state.ids !== previousIds) {
    persist(state.ids);
    previousIds = state.ids;
  }
});

export default usePhotoFavoritesStore;
