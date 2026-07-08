// Deterministic (non-AI) intent parsing for natural Spotlight phrases like
// "open my resume" or "quick look about". Strips a recognized leading verb
// phrase and drops filler words, producing a cleaner target string that is
// then re-run through the normal scorer in portfolioSearch.js. A handful of
// verbs (quick look / get info) also mark an action-type override so the
// matched results can be re-pointed at that action instead of their default.
const NOISE_WORDS = new Set(["my", "the", "a", "an", "please", "for", "me", "to", "on"]);

const VERB_PATTERNS = [
  { re: /^quick\s*look\s+/i, actionType: "quick-look" },
  { re: /^(get\s+info|info)(\s+(on|for))?\s+/i, actionType: "get-info" },
  { re: /^(open|launch|show|go\s*to|navigate\s*to|play|start)\s+/i, actionType: null },
  { re: /^(find|search(\s+for)?|look\s+for)\s+/i, actionType: null },
  { re: /^email\s+/i, actionType: null },
];

// Splits a raw query into a cleaned-up `target` string (verb phrase and
// noise words stripped) and an optional `actionType` the matched results
// should be re-pointed at.
export function parseSpotlightQuery(rawQuery) {
  const raw = (rawQuery ?? "").trim();
  if (!raw) return { target: "", actionType: null };

  let rest = raw;
  let actionType = null;

  for (const pattern of VERB_PATTERNS) {
    if (pattern.re.test(rest)) {
      rest = rest.replace(pattern.re, "").trim();
      actionType = pattern.actionType;
      break;
    }
  }

  const cleaned = rest
    .split(/\s+/)
    .filter((word) => word && !NOISE_WORDS.has(word.toLowerCase()))
    .join(" ")
    .trim();

  return { target: cleaned || rest || raw, actionType };
}
