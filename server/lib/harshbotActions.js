// The whitelist every HarshBot source action is validated against — both
// when the knowledge corpus is built (scripts/build-harshbot-knowledge.mjs)
// and again at request time in api/harshbot.js, right before any action is
// sent to the browser. The model never generates these objects; they are
// authored once, here and in the knowledge chunks themselves, and only
// ever looked up by a cited chunk ID. This module still exists as a real
// defense-in-depth check (a corrupted knowledge file, a future bug in the
// build script) rather than trusting that chunk authoring alone is enough.
//
// Deliberately hand-listed rather than imported from WINDOW_CONFIG: this
// is the one place a new window becomes "citable by HarshBot," and that
// should be a conscious decision, not automatic the moment any window is
// added anywhere else in the app.
const ALLOWED_WINDOW_IDS = new Set([
  'nexai', 'resume', 'publications', 'talks', 'github', 'contact',
  'aboutPortfolio', 'letterboxd', 'spotify', 'photos', 'terminal', 'txtfile',
]);

const ALLOWED_FINDER_LOCATIONS = new Set(['work', 'about', 'resume', 'publications', 'talks', 'utilities']);

const ALLOWED_WINDOW_DATA_KEYS = new Set(['section', 'talkId', 'publicationId']);

// Exact-match only — never "any https URL the model wants." Every entry
// here is a real, verified profile URL already used elsewhere in the
// portfolio's own constants (never hand-typed a second time; kept as a
// short literal list here purely because this file must stay independently
// auditable without importing the whole constants tree into the server
// bundle).
const ALLOWED_EXTERNAL_URLS = new Set([
  'https://github.com/haarsh01',
  'https://www.linkedin.com/in/haarsh01/',
  'https://letterboxd.com/harshh2001/',
  'https://scholar.google.ca/citations?user=0_EGeiEAAAAJ&hl=en',
]);

const SLUG_RE = /^[a-z0-9-]+$/;

function isPlainString(value) {
  return typeof value === 'string' && value.length > 0 && value.length < 120;
}

// Returns the action unchanged if valid, or null if it fails any check —
// callers always treat null as "drop this action," never as "use a
// default."
export function validateHarshBotAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) return null;

  if (action.type === 'open-window') {
    if (!ALLOWED_WINDOW_IDS.has(action.windowId)) return null;
    if (action.data !== undefined && action.data !== null) {
      if (typeof action.data !== 'object' || Array.isArray(action.data)) return null;
      const keys = Object.keys(action.data);
      if (!keys.every((key) => ALLOWED_WINDOW_DATA_KEYS.has(key) && isPlainString(action.data[key]))) return null;
    }
    return { type: 'open-window', windowId: action.windowId, data: action.data ?? null };
  }

  if (action.type === 'open-destination') {
    const destination = action.destination;
    if (!destination || destination.app !== 'finder') return null;
    if (!ALLOWED_FINDER_LOCATIONS.has(destination.location)) return null;
    if (destination.item !== undefined && (!isPlainString(destination.item) || !SLUG_RE.test(destination.item))) return null;
    return {
      type: 'open-destination',
      destination: {
        app: 'finder', location: destination.location, ...(destination.item ? { item: destination.item } : {}),
      },
    };
  }

  if (action.type === 'external-link') {
    if (!ALLOWED_EXTERNAL_URLS.has(action.url)) return null;
    return { type: 'external-link', url: action.url };
  }

  return null;
}

export function isValidHarshBotAction(action) {
  return validateHarshBotAction(action) !== null;
}
