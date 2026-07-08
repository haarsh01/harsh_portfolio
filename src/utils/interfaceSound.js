// Tiny, real interface sounds — short procedural tones via the Web Audio
// API. No audio files, no new dependency: every browser already ships
// AudioContext. Gated by preferences.sound.interfaceSounds, so the Control
// Center toggle controls something that actually exists rather than a
// switch with nothing behind it. Scoped to this batch's own new
// interactions (Control Center, widgets) rather than retrofitted onto
// every pre-existing window action.
import usePreferencesStore from "#store/preferences.js";

let sharedContext = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedContext) sharedContext = new AudioContextClass();
  if (sharedContext.state === "suspended") sharedContext.resume().catch(() => {});
  return sharedContext;
}

function playTone(frequency, duration, { type = "sine", peakGain = 0.06 } = {}) {
  if (!usePreferencesStore.getState().sound.interfaceSounds) return;
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

export function playOpenSound() {
  playTone(720, 0.14, { type: "sine", peakGain: 0.05 });
}

export function playCloseSound() {
  playTone(420, 0.12, { type: "sine", peakGain: 0.045 });
}

export function playToggleSound() {
  playTone(880, 0.08, { type: "triangle", peakGain: 0.04 });
}
