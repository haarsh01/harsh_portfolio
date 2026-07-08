import { create } from "zustand";
import useTelemetryStore from "#store/telemetry.js";

// Coordinates every system-level overlay through this one store so they
// never compete for keyboard shortcuts, focus, or z-index.
//
// Two tiers:
// - "Screen takeover" overlays (Quick Look, the Command-Tab app switcher,
//   Mission Control, Spotlight) are mutually exclusive through
//   `activeOverlay` — only one may be active at a time, exactly as in
//   Batch 1. Spotlight is allowed to interrupt Quick Look specifically
//   (a lightweight preview, safe to dismiss to search) but defers to
//   Mission Control / App Switcher — see components/Spotlight.jsx.
// - Lighter auxiliary panels (an expanded desktop Stack, Get Info, a
//   context menu) live in their own fields so they can layer on top of a
//   window *and* on top of each other where that composition makes sense
//   (e.g. Quick Look opened from inside an expanded Stack, or Get Info
//   opened while Quick Look is previewing the same item). Opening a
//   screen-takeover overlay closes all three of these, since Mission
//   Control/App Switcher visually replace everything else on screen.
const useSystemUIStore = create((set, get) => ({
  activeOverlay: null, // null | "quick-look" | "app-switcher" | "mission-control" | "spotlight" | "control-center"
  quickLook: null, // { items: Array<QuickLookEntry>, index: number } | null
  stackExpanded: null, // { key, label, items: Array<PortfolioItem> } | null
  getInfoItem: null, // PortfolioItem | null
  selectedItem: null, // PortfolioItem | null — last item selected in Finder or a Stack
  contextMenu: null, // { x, y, items: Array<MenuEntry> } | null
  handoffTarget: null, // ShareableDestination | null — the Handoff/Share panel's current subject

  openQuickLook: (items, index = 0) => {
    if (!items?.length) return false;
    const { activeOverlay } = get();
    if (activeOverlay && activeOverlay !== "quick-look") return false;
    set({
      activeOverlay: "quick-look",
      quickLook: { items, index: Math.min(Math.max(index, 0), items.length - 1) },
    });
    useTelemetryStore.getState().recordQuickLookOpen();
    return true;
  },
  closeQuickLook: () => set((state) => (
    state.activeOverlay === "quick-look" ? { activeOverlay: null, quickLook: null } : state
  )),
  setQuickLookIndex: (index) => set((state) => (
    state.quickLook ? { quickLook: { ...state.quickLook, index } } : state
  )),

  openAppSwitcher: () => {
    const { activeOverlay } = get();
    if (activeOverlay && activeOverlay !== "app-switcher") return false;
    set({ activeOverlay: "app-switcher", stackExpanded: null, getInfoItem: null, contextMenu: null });
    return true;
  },
  closeAppSwitcher: () => set((state) => (
    state.activeOverlay === "app-switcher" ? { activeOverlay: null } : state
  )),

  openMissionControl: () => {
    const { activeOverlay } = get();
    if (activeOverlay && activeOverlay !== "mission-control") return false;
    set({ activeOverlay: "mission-control", stackExpanded: null, getInfoItem: null, contextMenu: null });
    useTelemetryStore.getState().recordMissionControlOpen();
    return true;
  },
  closeMissionControl: () => set((state) => (
    state.activeOverlay === "mission-control" ? { activeOverlay: null } : state
  )),

  // Desktop Stacks (grouped category folders) no longer render on the
  // desktop, so nothing calls the setter for this anymore — `stackExpanded`
  // itself and `closeStack()` are kept: several other overlays (Mission
  // Control, Spotlight, Control Center, Desktop Widgets) still defensively
  // reset/read this field as part of their own "close every other panel"
  // guard, and removing it would mean touching all of those for no
  // behavioral gain.
  closeStack: () => set({ stackExpanded: null }),

  setSelectedItem: (item) => set({ selectedItem: item ?? null }),

  openGetInfo: (item) => {
    const target = item ?? get().selectedItem;
    if (!target) return false;
    if (get().activeOverlay) return false;
    set({ getInfoItem: target, contextMenu: null });
    return true;
  },
  closeGetInfo: () => set({ getInfoItem: null }),

  openContextMenu: (menu) => {
    if (get().activeOverlay) return false;
    set({ contextMenu: menu });
    return true;
  },
  closeContextMenu: () => set({ contextMenu: null }),

  openSpotlight: () => {
    const { activeOverlay } = get();
    if (activeOverlay && activeOverlay !== "spotlight") return false;
    set({ activeOverlay: "spotlight", stackExpanded: null, getInfoItem: null, contextMenu: null });
    useTelemetryStore.getState().recordSpotlightOpen();
    return true;
  },
  closeSpotlight: () => set((state) => (
    state.activeOverlay === "spotlight" ? { activeOverlay: null } : state
  )),

  openControlCenter: () => {
    const { activeOverlay } = get();
    if (activeOverlay && activeOverlay !== "control-center") return false;
    set({ activeOverlay: "control-center", stackExpanded: null, getInfoItem: null, contextMenu: null });
    return true;
  },
  closeControlCenter: () => set((state) => (
    state.activeOverlay === "control-center" ? { activeOverlay: null } : state
  )),

  // Handoff/Share is a lightweight auxiliary panel like Get Info — it can
  // layer on top of a window or another light panel, but not while a
  // screen-takeover overlay (Quick Look excepted is not needed here since
  // sharing FROM Quick Look just opens Handoff on top of it) owns the
  // whole screen.
  openHandoff: (destination) => {
    if (!destination?.app) return false;
    if (get().activeOverlay === "mission-control" || get().activeOverlay === "app-switcher") return false;
    set({ handoffTarget: destination, contextMenu: null });
    return true;
  },
  closeHandoff: () => set({ handoffTarget: null }),
}));

export default useSystemUIStore;
