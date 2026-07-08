// Single safe action executor for Spotlight, the guided tour, and Time
// Machine. Every action runs through zustand store actions or component
// APIs — nothing here ever touches the DOM directly or simulates a click
// via `document.querySelector(...).click()`. Deliberately store-agnostic at
// the call site: every store is read via `.getState()` so this file can be
// called from anywhere (a result row, a tour-step effect, a timeline card)
// without prop-drilling hooks through every caller.
import useWindowStore from "#store/window.js";
import useLocationStore from "#store/location.js";
import useSystemUIStore from "#store/systemUI.js";
import usePreferencesStore from "#store/preferences.js";
import useWidgetsStore from "#store/widgets.js";
import useTourStore from "#store/tour.js";
import { locations } from "#constants/index.js";
import { runItemAction, toQuickLookEntry } from "#utils/portfolioItems.js";
import {
  findFinderItemBySlug, getWindowKeyForApp,
} from "#utils/shareableDestinations.js";
import { TIMELINE_EVENTS } from "#constants/timeline.js";

function storeContext() {
  const { openWindow, focusWindow, restoreWindow, minimizeWindow, windows } = useWindowStore.getState();
  const { setActiveLocation } = useLocationStore.getState();
  return { openWindow, focusWindow, restoreWindow, minimizeWindow, windows, setActiveLocation };
}

export default function executePortfolioAction(action) {
  if (!action?.type) return;
  const ctx = storeContext();
  const systemUI = useSystemUIStore.getState();

  switch (action.type) {
    // Note: none of the routine "open X" cases below touch the browser URL
    // anymore. They used to call updateUrlForDestination() on every open,
    // which meant ordinary navigation (a Dock click, a Spotlight pick)
    // permanently rewrote the address bar — so simply reloading the page
    // later "auto-reopened" whatever had last been opened. The Handoff/
    // Share feature (components/ShareButton.jsx, HandoffPanel.jsx) still
    // computes a shareable URL on demand for copying, and restoring an
    // explicit incoming `?app=...` link on load (HandoffBootstrap.jsx)
    // still works — only the automatic *writing* of routine navigation
    // into history was removed.
    case "open-window":
    case "open-file": {
      runItemAction({ type: "open-window", windowId: action.windowId, data: action.data }, ctx);
      return;
    }

    case "open-spotify":
      runItemAction({ type: "open-window", windowId: "spotify" }, ctx);
      return;

    case "about-portfolio":
      runItemAction({ type: "open-window", windowId: "aboutPortfolio" }, ctx);
      return;

    case "open-publications":
      runItemAction({ type: "open-window", windowId: "publications" }, ctx);
      return;

    case "open-talks":
      runItemAction({ type: "open-window", windowId: "talks" }, ctx);
      return;

    // Opens Publications and scrolls/highlights one specific verified
    // entry — the same `data.*` deep-link convention Time Machine
    // (eventId) already uses.
    case "open-publication":
      runItemAction({ type: "open-window", windowId: "publications", data: { publicationId: action.id } }, ctx);
      return;

    case "open-time-machine":
      runItemAction({ type: "open-window", windowId: "timeMachine" }, ctx);
      return;

    case "open-photos-section":
      runItemAction({ type: "open-window", windowId: "photos", data: { section: action.section } }, ctx);
      return;

    case "open-terminal-item":
      runItemAction({ type: "open-window", windowId: "terminal", data: { skill: action.skill } }, ctx);
      return;

    case "open-finder-location":
      runItemAction(action, ctx);
      return;

    case "external-link":
      runItemAction(action, ctx);
      return;

    case "focus-window": {
      const win = ctx.windows[action.windowId];
      if (win?.isOpen) ctx.focusWindow(action.windowId);
      else ctx.openWindow(action.windowId, action.data ?? null);
      return;
    }

    case "restore-window": {
      const win = ctx.windows[action.windowId];
      if (win?.isOpen && win.isMinimized) ctx.restoreWindow(action.windowId);
      else if (!win?.isOpen) ctx.openWindow(action.windowId, action.data ?? null);
      else ctx.focusWindow(action.windowId);
      return;
    }

    case "quick-look": {
      const target = action.item ?? systemUI.selectedItem;
      const items = action.items ?? (target ? [target] : []);
      if (!items.length) return;
      const entries = items.map((item) => toQuickLookEntry(item, () => executePortfolioAction(item.action)));
      systemUI.openQuickLook(entries, action.index ?? 0);
      return;
    }

    case "get-info": {
      const target = action.item ?? systemUI.selectedItem;
      if (target) systemUI.openGetInfo(target);
      return;
    }

    case "mission-control":
      systemUI.openMissionControl();
      return;

    case "show-desktop":
      Object.keys(ctx.windows).forEach((key) => {
        const win = ctx.windows[key];
        if (win.isOpen && !win.isMinimized) ctx.minimizeWindow(key);
      });
      return;

    case "start-tour":
      useTourStore.getState().startTour();
      return;

    case "toggle-screen-saver":
      usePreferencesStore.getState().toggleScreenSaverEnabled();
      return;

    case "open-control-center":
      systemUI.openControlCenter();
      return;

    case "edit-widgets":
      usePreferencesStore.getState().setDesktop({ showWidgets: true });
      useWidgetsStore.getState().setEditMode(true);
      return;

    // Opens a validated ShareableDestination (see shareableDestinations.js)
    // — the single entry point Handoff restoration and shared-link opening
    // both funnel through, so there is exactly one place that turns a
    // destination object into real store calls.
    case "open-destination": {
      const destination = action.destination;
      if (!destination?.app) return;

      if (destination.app === "tour") {
        if (destination.step) useTourStore.getState().startTourAtStep(destination.step);
        else useTourStore.getState().startTour();
        return;
      }

      if (destination.app === "finder") {
        const location = destination.location ? locations[destination.location] : null;
        if (location && destination.item) {
          const item = findFinderItemBySlug(destination.location, destination.item);
          if (item) {
            if (item.kind === "folder") { ctx.setActiveLocation(item); ctx.openWindow("finder"); return; }
            if (item.fileType === "txt") { ctx.setActiveLocation(location); ctx.openWindow("txtfile", item); return; }
            if (item.fileType === "img") { ctx.setActiveLocation(location); ctx.openWindow("imgfile", item); return; }
            if (item.fileType === "pdf") { ctx.setActiveLocation(location); ctx.openWindow("resume"); return; }
          }
        }
        if (location) ctx.setActiveLocation(location);
        ctx.openWindow("finder");
        return;
      }

      if (destination.app === "photos") {
        ctx.openWindow("photos", destination.section ? { section: destination.section } : null);
        return;
      }

      if (destination.app === "letterboxd") {
        ctx.openWindow("letterboxd", destination.section ? { section: destination.section } : null);
        return;
      }

      if (destination.app === "time-machine") {
        const event = destination.event ? TIMELINE_EVENTS.find((e) => e.id === destination.event) : null;
        ctx.openWindow("timeMachine", event ? { eventId: event.id } : null);
        return;
      }

      const windowKey = getWindowKeyForApp(destination.app);
      if (windowKey) ctx.openWindow(windowKey);
      return;
    }

    default:
      return;
  }
}
