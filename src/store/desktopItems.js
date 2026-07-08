import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { getDesktopIconItems } from "#utils/portfolioItems.js";

// Position persistence for every individually draggable desktop icon
// (project folders, about-me.txt, Resume.pdf) — deliberately its own tiny
// store (not folded into window.js or preferences.js) since it holds
// exactly one concern: where each real desktop item currently sits.
const STORAGE_KEY = "harsh-portfolio-desktop-items:v1";

const ICON_WIDTH = 96;
const ICON_HEIGHT = 104;
const COLUMN_GAP = 24;
const ROW_GAP = 28;
// Matches the desktop widgets' own safe-area convention (src/store/widgets.js)
// so icons and widgets never fight over the same screen edges.
const NAVBAR_SAFE_TOP = 72;
const DOCK_SAFE_BOTTOM = 132;
const SIDE_MARGIN = 24;

function clampPosition(x, y) {
  const maxX = Math.max(SIDE_MARGIN, window.innerWidth - ICON_WIDTH - SIDE_MARGIN);
  const maxY = Math.max(NAVBAR_SAFE_TOP, window.innerHeight - ICON_HEIGHT - DOCK_SAFE_BOTTOM);
  return {
    x: Math.min(Math.max(x, SIDE_MARGIN), maxX),
    y: Math.min(Math.max(y, NAVBAR_SAFE_TOP), maxY),
  };
}

// A clean top-to-bottom column along the desktop's left edge, wrapping
// into a new column once a column runs out of vertical room — the same
// spirit as the project's original hand-placed positions, just computed
// instead of hand-tuned per item.
function computeDefaultPosition(index) {
  const usableHeight = window.innerHeight - NAVBAR_SAFE_TOP - DOCK_SAFE_BOTTOM;
  const rowsPerColumn = Math.max(1, Math.floor(usableHeight / (ICON_HEIGHT + ROW_GAP)));
  const col = Math.floor(index / rowsPerColumn);
  const row = index % rowsPerColumn;
  return clampPosition(
    SIDE_MARGIN + col * (ICON_WIDTH + COLUMN_GAP),
    NAVBAR_SAFE_TOP + row * (ICON_HEIGHT + ROW_GAP),
  );
}

function loadStoredPositions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.positions)) return {};

    // Desktop item ids are strings (e.g. "project-5", "document-about-me"),
    // but a JSON round-trip always yields string object keys regardless —
    // normalizing explicitly here keeps this robust even if an id scheme
    // ever changes back to something numeric.
    const itemIds = new Set(getDesktopIconItems().map((item) => String(item.id)));
    const stored = {};
    parsed.positions.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const id = String(entry.id);
      if (!itemIds.has(id)) return; // unknown/removed item — ignored, never crashes
      if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return;
      stored[id] = clampPosition(entry.x, entry.y);
    });
    return stored;
  } catch {
    // Corrupted JSON, private-mode storage denial, anything else — recover
    // to "nothing stored" rather than crash the desktop.
    return {};
  }
}

// Every real desktop item gets a position: its validated stored one, or
// (for an item that's new or was never dragged) a fresh, non-overlapping
// grid default computed from its position in the real item list.
function loadPositions() {
  const stored = loadStoredPositions();
  const positions = {};
  getDesktopIconItems().forEach((item, index) => {
    positions[item.id] = stored[item.id] ?? computeDefaultPosition(index);
  });
  return positions;
}

function persist(positions) {
  try {
    const list = Object.entries(positions).map(([id, pos]) => ({ id, x: pos.x, y: pos.y }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, positions: list }));
  } catch {
    // localStorage unavailable — positions simply won't survive a refresh.
  }
}

const useDesktopItemsStore = create(immer((set, get) => ({
  positions: loadPositions(),

  setPosition: (id, x, y) => set((state) => {
    if (!getDesktopIconItems().some((item) => item.id === id)) return;
    state.positions[id] = clampPosition(x, y);
    persist(state.positions);
  }),

  resetPositions: () => set((state) => {
    const next = {};
    getDesktopIconItems().forEach((item, index) => { next[item.id] = computeDefaultPosition(index); });
    state.positions = next;
    persist(state.positions);
  }),

  // Re-clamps every icon to the current viewport — called on resize so an
  // icon can never end up unreachable off-screen. Skips the write entirely
  // when nothing actually moved.
  clampAllToViewport: () => {
    const current = get().positions;
    let changed = false;
    const next = {};
    Object.entries(current).forEach(([id, pos]) => {
      const clamped = clampPosition(pos.x, pos.y);
      if (clamped.x !== pos.x || clamped.y !== pos.y) changed = true;
      next[id] = clamped;
    });
    if (!changed) return;
    set({ positions: next });
    persist(next);
  },
})));

export default useDesktopItemsStore;
export { ICON_WIDTH, ICON_HEIGHT };
