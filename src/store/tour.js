import { create } from "zustand";
import { TOUR_STEPS } from "#constants/tour.js";
import useSystemUIStore from "#store/systemUI.js";
import useTelemetryStore from "#store/telemetry.js";

const SESSION_KEY = "portfolio-tour-session";

// Best-effort session-only persistence so an accidental refresh mid-tour
// isn't a dead end — never long-term, and any failure (private mode,
// storage disabled) just means the tour won't survive a refresh.
function loadInterrupted() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.currentStep !== "number") return null;
    if (parsed.currentStep < 0 || parsed.currentStep >= TOUR_STEPS.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    if (state.isActive) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        currentStep: state.currentStep,
        isPaused: state.isPaused,
        startedAt: state.startedAt,
      }));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // sessionStorage unavailable — the tour still runs fine this session.
  }
}

const useTourStore = create((set, get) => ({
  isActive: false,
  isPaused: false,
  currentStep: 0,
  steps: TOUR_STEPS,
  startedAt: null,

  // Never auto-starts — only ever called from an explicit user action
  // (Spotlight, About This Portfolio, or the Welcome button).
  startTour: () => {
    if (!TOUR_STEPS.length) return false;
    if (useSystemUIStore.getState().activeOverlay) return false;
    const next = { isActive: true, isPaused: false, currentStep: 0, startedAt: Date.now() };
    set(next);
    persist({ ...get(), ...next });
    useTelemetryStore.getState().recordTourStepVisited();
    return true;
  },

  // Starts the tour directly at a specific step (Handoff/shared-link
  // restoration only) — unlike nextStep()'s progression, this doesn't
  // replay every intermediate step's action, it jumps straight there.
  startTourAtStep: (stepId) => {
    const index = TOUR_STEPS.findIndex((step) => step.id === stepId);
    if (index === -1) return false;
    if (useSystemUIStore.getState().activeOverlay) return false;
    const next = { isActive: true, isPaused: false, currentStep: index, startedAt: Date.now() };
    set(next);
    persist({ ...get(), ...next });
    useTelemetryStore.getState().recordTourStepVisited();
    return true;
  },

  // Read-only peek at a session-interrupted tour (e.g. after a refresh),
  // for a prompt to offer resuming — never called automatically.
  peekInterruptedTour: () => (get().isActive ? null : loadInterrupted()),

  resumeInterruptedTour: () => {
    if (get().isActive) return false;
    const saved = loadInterrupted();
    if (!saved) return false;
    set({ isActive: true, isPaused: saved.isPaused, currentStep: saved.currentStep, startedAt: saved.startedAt });
    return true;
  },

  // Discards a remembered-but-not-resumed interrupted tour (e.g. the user
  // dismissed the "Resume your tour?" prompt) without touching live state.
  dismissInterruptedTour: () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* nothing to clean up */ }
  },

  nextStep: () => set((state) => {
    if (!state.isActive || state.currentStep >= state.steps.length - 1) return state;
    const next = { ...state, currentStep: state.currentStep + 1, isPaused: false };
    persist(next);
    useTelemetryStore.getState().recordTourStepVisited();
    return next;
  }),

  prevStep: () => set((state) => {
    if (!state.isActive || state.currentStep <= 0) return state;
    const next = { ...state, currentStep: state.currentStep - 1, isPaused: false };
    persist(next);
    useTelemetryStore.getState().recordTourStepVisited();
    return next;
  }),

  pauseTour: () => set((state) => {
    if (!state.isActive) return state;
    const next = { ...state, isPaused: true };
    persist(next);
    return next;
  }),

  resumeTour: () => set((state) => {
    if (!state.isActive) return state;
    const next = { ...state, isPaused: false };
    persist(next);
    return next;
  }),

  // Stops the tour without touching any window — whatever the last step
  // opened stays exactly as it was.
  exitTour: () => {
    set({ isActive: false, isPaused: false, currentStep: 0, startedAt: null });
    persist({ isActive: false });
  },
}));

export default useTourStore;
