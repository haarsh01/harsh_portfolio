// Single source of truth for "should this animation run" — combines the
// live OS prefers-reduced-motion signal with the site-level Control Center
// toggle. The OS is authoritative: it can only ever add more reduction,
// never be overridden by the site preference (System preferences override
// site animation preferences). Replaces the three near-identical local
// getDuration()/prefersReducedMotion() copies that existed before this
// batch (WindowWarpper, MissionControl, TimeMachine) now that the
// behavior needs to change (incorporating the new site toggle) rather than
// staying independently duplicated.
import usePreferencesStore from "#store/preferences.js";

export function isReducedMotion() {
  const state = usePreferencesStore.getState();
  return state.motionOSReduced || !state.motion.animationsEnabled;
}

export function getMotionDuration(seconds) {
  return isReducedMotion() ? 0 : seconds;
}
