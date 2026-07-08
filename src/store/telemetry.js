import { create } from "zustand";

// Privacy-safe, local-only session counters for the Activity Monitor's
// Session tab. Never stores search text, form content, clipboard data, or
// anything identifying — only counts. Session-storage-backed (not
// localStorage) since this describes "this browser tab's current visit",
// not a durable cross-visit record, and is expected to reset on a new tab.
const STORAGE_KEY = "portfolio-session-telemetry";

const DEFAULT_COUNTERS = {
  appsOpened: 0,
  focusChanges: 0,
  quickLookOpens: 0,
  missionControlOpens: 0,
  spotlightOpens: 0,
  spotlightSearches: 0,
  tourStepsVisited: 0,
  linksShared: 0,
};

function loadCounters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COUNTERS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_COUNTERS };
    const sanitized = { ...DEFAULT_COUNTERS };
    Object.keys(DEFAULT_COUNTERS).forEach((key) => {
      if (Number.isFinite(parsed[key]) && parsed[key] >= 0) sanitized[key] = parsed[key];
    });
    return sanitized;
  } catch {
    return { ...DEFAULT_COUNTERS };
  }
}

function persist(counters) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  } catch {
    // sessionStorage unavailable — counters simply live in memory only.
  }
}

function loadSessionStart() {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}-started`);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) return parsed;
  } catch {
    // ignore
  }
  const now = Date.now();
  try { sessionStorage.setItem(`${STORAGE_KEY}-started`, String(now)); } catch { /* in-memory only */ }
  return now;
}

const increment = (key) => (state) => {
  const next = { ...state.counters, [key]: state.counters[key] + 1 };
  persist(next);
  return { counters: next };
};

const useTelemetryStore = create((set) => ({
  sessionStart: loadSessionStart(),
  counters: loadCounters(),

  recordAppOpened: () => set(increment("appsOpened")),
  recordFocusChange: () => set(increment("focusChanges")),
  recordQuickLookOpen: () => set(increment("quickLookOpens")),
  recordMissionControlOpen: () => set(increment("missionControlOpens")),
  recordSpotlightOpen: () => set(increment("spotlightOpens")),
  recordSpotlightSearch: () => set(increment("spotlightSearches")),
  recordTourStepVisited: () => set(increment("tourStepsVisited")),
  recordLinkShared: () => set(increment("linksShared")),
}));

export default useTelemetryStore;
