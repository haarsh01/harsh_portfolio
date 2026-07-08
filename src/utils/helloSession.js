// Session-scoped (not permanent) gate for the Hello intro. `sessionStorage`
// is cleared when the tab/browser session ends, so a brand-new visit still
// sees the full intro — only a same-session refresh skips replaying it.
// Versioned key so a future intro redesign can force it to show again for
// everyone by bumping the suffix.
const SESSION_KEY = "harsh-portfolio-hello-shown:v1";

export function hasSeenHelloThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function markHelloSeenThisSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, "true");
  } catch {
    // sessionStorage unavailable (private mode, disabled) — the intro will
    // simply replay next reload, a harmless degradation, not a crash.
  }
}
