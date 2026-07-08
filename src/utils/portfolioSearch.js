// Local, deterministic search engine for the Help Search feature.
// Normalizes text, tokenizes queries, and ranks entries with a small
// weighted scoring model plus restrained typo tolerance. No network calls,
// no eval, nothing persisted beyond what the caller chooses to store.

const SCORES = {
  exactTitle: 120,
  exactAlias: 110,
  titlePrefix: 95,
  aliasPrefix: 90,
  allTokens: 85,
  exactKeyword: 80,
  titleSubstring: 70,
  keywordSubstring: 60,
  descriptionMatch: 35,
  fuzzy: 20,
};

export function normalize(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value = "") {
  const normalized = normalize(value);
  return normalized ? normalized.split(" ") : [];
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (!la) return lb;
  if (!lb) return la;

  let prevRow = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    const currentRow = [i];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        prevRow[j] + 1,
        currentRow[j - 1] + 1,
        prevRow[j - 1] + cost,
      );
    }
    prevRow = currentRow;
  }
  return prevRow[lb];
}

// Never fuzzy-match very short tokens (cv, js, ai...) and scale tolerance
// with word length so long words can absorb more typos than short ones.
function maxEditDistanceFor(word) {
  if (word.length < 4) return 0;
  if (word.length < 8) return 1;
  return 2;
}

// Exported (in addition to being used locally below) so
// server/lib/retrieveHarshKnowledge.js can reuse the exact same
// zero-dependency typo-tolerance logic rather than re-implementing it —
// this file has no imports and no browser/DOM dependency, so it's already
// safe to import from a plain-Node server context.
export function fuzzyMatches(candidateWords, queryToken) {
  const maxDist = maxEditDistanceFor(queryToken);
  if (maxDist === 0) return false;
  return candidateWords.some((word) => {
    if (Math.abs(word.length - queryToken.length) > maxDist) return false;
    return levenshtein(word, queryToken) <= maxDist;
  });
}

// Precomputes normalized/searchable fields on a raw entry once, so per-keystroke
// scoring never re-normalizes the same static strings.
export function prepareEntry(entry) {
  const aliases = entry.aliases ?? [];
  const keywords = entry.keywords ?? [];
  const normTitle = normalize(entry.title);
  const normSubtitle = normalize(entry.subtitle ?? "");
  const normAliases = aliases.map(normalize);
  const normKeywords = keywords.map(normalize);
  const haystack = normalize(
    [entry.title, entry.subtitle, entry.category, ...aliases, ...keywords].join(" "),
  );

  return {
    ...entry,
    _normTitle: normTitle,
    _normSubtitle: normSubtitle,
    _normAliases: normAliases,
    _normKeywords: normKeywords,
    _titleWords: normTitle.split(" ").filter(Boolean),
    _keywordWords: normKeywords.flatMap((k) => k.split(" ")).filter(Boolean),
    _haystack: haystack,
  };
}

function scoreEntry(entry, query, queryTokens) {
  if (!query) return 0;
  let best = 0;

  if (entry._normTitle === query) best = Math.max(best, SCORES.exactTitle);
  if (entry._normAliases.includes(query)) best = Math.max(best, SCORES.exactAlias);
  if (entry._normTitle.startsWith(query)) best = Math.max(best, SCORES.titlePrefix);
  if (entry._normAliases.some((a) => a.startsWith(query))) best = Math.max(best, SCORES.aliasPrefix);
  // Only a genuinely multi-word query counts here — for a single token this
  // degenerates into a plain substring check (e.g. "work" trivially matches
  // inside the unrelated keyword "work experience"), which would outrank a
  // more specific exact-keyword match on a different, more relevant entry.
  if (queryTokens.length > 1 && queryTokens.every((t) => entry._haystack.includes(t))) {
    best = Math.max(best, SCORES.allTokens);
  }
  if (entry._normKeywords.includes(query)) best = Math.max(best, SCORES.exactKeyword);
  if (entry._normTitle.includes(query)) best = Math.max(best, SCORES.titleSubstring);
  if (entry._normKeywords.some((k) => k.includes(query))) best = Math.max(best, SCORES.keywordSubstring);
  if (entry._normSubtitle && entry._normSubtitle.includes(query)) best = Math.max(best, SCORES.descriptionMatch);

  if (best === 0 && queryTokens.length) {
    const candidateWords = [...entry._titleWords, ...entry._keywordWords];
    const anyTokenFuzzy = queryTokens.some((token) => fuzzyMatches(candidateWords, token));
    if (anyTokenFuzzy) best = Math.max(best, SCORES.fuzzy);
  }

  return best;
}

export function searchEntries(preparedEntries, rawQuery, { limit = 12 } = {}) {
  const query = normalize(rawQuery);
  if (!query) return [];

  const queryTokens = tokenize(rawQuery);

  return preparedEntries
    .map((entry) => ({ entry, score: scoreEntry(entry, query, queryTokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => (b.score - a.score) || (a.entry.priority ?? 0) - (b.entry.priority ?? 0))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

// Splits `text` into safe React-renderable segments around the first match of
// `query`, so callers can wrap the match in <mark> without dangerouslySetInnerHTML.
export function getHighlightSegments(text, rawQuery) {
  if (!text) return [{ text: "", match: false }];
  const query = normalize(rawQuery);
  if (!query) return [{ text, match: false }];

  const normalizedText = normalize(text);
  // Normalization can change length (space collapsing, punctuation removal);
  // only highlight when it's safe to map indices back onto the original text.
  if (normalizedText.length !== text.length) return [{ text, match: false }];

  const index = normalizedText.indexOf(query);
  if (index === -1) return [{ text, match: false }];

  const segments = [];
  if (index > 0) segments.push({ text: text.slice(0, index), match: false });
  segments.push({ text: text.slice(index, index + query.length), match: true });
  if (index + query.length < text.length) {
    segments.push({ text: text.slice(index + query.length), match: false });
  }
  return segments;
}
