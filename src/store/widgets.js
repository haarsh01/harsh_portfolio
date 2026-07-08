import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { WIDGET_DIMENSIONS, WIDGET_TYPE_IDS, getWidgetTypeMeta } from "#constants/widgets.js";

const STORAGE_KEY = "portfolio-widget-layout";
const STORAGE_VERSION = 1;

// Keeps widgets clear of the Navbar (top) and Dock (bottom-center) — the
// same safe-area convention Mission Control's grid already uses.
const NAVBAR_SAFE_TOP = 72;
const DOCK_SAFE_BOTTOM = 132;
const SIDE_MARGIN = 16;

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `widget-${Date.now()}-${idCounter}`;
}

// Clamped independently of any single viewport snapshot, so it stays
// correct whether called right after a resize or from stale persisted data.
function clampPosition(x, y, size) {
  const { width, height } = WIDGET_DIMENSIONS[size] ?? WIDGET_DIMENSIONS.medium;
  const maxX = Math.max(SIDE_MARGIN, window.innerWidth - width - SIDE_MARGIN);
  const maxY = Math.max(NAVBAR_SAFE_TOP, window.innerHeight - height - DOCK_SAFE_BOTTOM);
  return {
    x: Math.min(Math.max(x, SIDE_MARGIN), maxX),
    y: Math.min(Math.max(y, NAVBAR_SAFE_TOP), maxY),
  };
}

function sanitizeInstance(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!WIDGET_TYPE_IDS.includes(raw.type)) return null;
  const meta = getWidgetTypeMeta(raw.type);
  const size = WIDGET_DIMENSIONS[raw.size] ? raw.size : meta.defaultSize;
  const x = Number.isFinite(raw.x) ? raw.x : SIDE_MARGIN;
  const y = Number.isFinite(raw.y) ? raw.y : NAVBAR_SAFE_TOP;
  const clamped = clampPosition(x, y, size);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : nextId(),
    type: raw.type,
    x: clamped.x,
    y: clamped.y,
    size,
    visible: typeof raw.visible === "boolean" ? raw.visible : true,
    config: raw.config && typeof raw.config === "object" ? raw.config : {},
  };
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.instances)) return [];
    return parsed.instances.map(sanitizeInstance).filter(Boolean);
  } catch {
    return [];
  }
}

function persist(instances) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, instances }));
  } catch {
    // localStorage unavailable — layout simply won't survive a refresh.
  }
}

const useWidgetsStore = create(immer((set, get) => ({
  instances: loadLayout(),
  isEditMode: false, // transient UI state — never persisted

  setEditMode: (value) => set((state) => { state.isEditMode = value; }),
  toggleEditMode: () => set((state) => { state.isEditMode = !state.isEditMode; }),

  addWidget: (type) => {
    const meta = getWidgetTypeMeta(type);
    if (!meta) return null;
    // Row-major grid cascade (4 columns) rather than a short diagonal — a
    // diagonal that wraps every few widgets would eventually place a new
    // widget exactly on top of an earlier one, making the one underneath
    // permanently unreachable to clicks. Steps are sized to the largest
    // widget variant (288x264) plus a gap, so no two default-placed
    // widgets ever overlap regardless of which size each type defaults to.
    const index = get().instances.length;
    const columns = 4;
    const col = index % columns;
    const row = Math.floor(index / columns);
    const { x, y } = clampPosition(SIDE_MARGIN + col * 304, NAVBAR_SAFE_TOP + row * 280, meta.defaultSize);
    const instance = { id: nextId(), type, x, y, size: meta.defaultSize, visible: true, config: {} };
    set((state) => { state.instances.push(instance); });
    return instance.id;
  },

  removeWidget: (id) => set((state) => {
    state.instances = state.instances.filter((widget) => widget.id !== id);
  }),

  updateWidgetPosition: (id, x, y) => set((state) => {
    const widget = state.instances.find((w) => w.id === id);
    if (!widget) return;
    const clamped = clampPosition(x, y, widget.size);
    widget.x = clamped.x;
    widget.y = clamped.y;
  }),

  updateWidgetSize: (id, size) => set((state) => {
    const widget = state.instances.find((w) => w.id === id);
    if (!widget || !WIDGET_DIMENSIONS[size]) return;
    widget.size = size;
    const clamped = clampPosition(widget.x, widget.y, size);
    widget.x = clamped.x;
    widget.y = clamped.y;
  }),

  toggleWidgetVisible: (id) => set((state) => {
    const widget = state.instances.find((w) => w.id === id);
    if (widget) widget.visible = !widget.visible;
  }),

  // Re-clamps every widget to the current viewport — called on window
  // resize so a widget can never become permanently unreachable.
  clampAllToViewport: () => set((state) => {
    state.instances.forEach((widget) => {
      const clamped = clampPosition(widget.x, widget.y, widget.size);
      widget.x = clamped.x;
      widget.y = clamped.y;
    });
  }),

  resetWidgets: () => set((state) => { state.instances = []; }),
})));

let previousInstances = useWidgetsStore.getState().instances;
useWidgetsStore.subscribe((state) => {
  if (state.instances !== previousInstances) {
    persist(state.instances);
    previousInstances = state.instances;
  }
});

export default useWidgetsStore;
export { clampPosition };
