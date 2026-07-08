import { HELLO_GREETINGS } from "#constants/greetings.js";

const STORAGE_KEY = "harsh-portfolio-hello-greeting:v1";

// Deterministic, non-repeating rotation: reads the last-shown index, moves
// to the next one (wrapping after the final greeting), and persists only
// that single integer — no timestamps, no visitor identity, nothing that
// could function as tracking data.
export function getNextGreeting() {
  const count = HELLO_GREETINGS.length;
  if (count === 0) return null;

  let previousIndex = -1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < count) {
        previousIndex = parsed;
      }
    }
  } catch {
    // localStorage unavailable (private mode, disabled, corrupted) —
    // fall through and pick a safe starting index below.
  }

  const nextIndex = (previousIndex + 1) % count;

  try {
    localStorage.setItem(STORAGE_KEY, String(nextIndex));
  } catch {
    // Can't persist — the rotation just won't advance across reloads this
    // session, which is a harmless degradation, not a crash.
  }

  return HELLO_GREETINGS[nextIndex];
}
