// Deterministic RAG-lite retriever for HarshBot — no embeddings, no
// vector store, no network call. Pure function of (query, knowledge
// chunks) => ranked results, reusing the exact same normalize/tokenize/
// fuzzy-match primitives Spotlight's own search already uses
// (#utils/portfolioSearch.js), so the "does this typo still match" answer
// stays consistent across the whole portfolio rather than diverging in a
// second, independently-tuned implementation.
//
// Upgrade path: this file's only exported entry point is
// `retrieveKnowledge(query, chunks, options)`. A later V2 (OpenAI File
// Search, embeddings, a real vector store) only ever needs to replace the
// body of this one function — every caller (api/harshbot.js, the tests in
// test/) depends on the return shape below, never on how it was computed.
import { normalize, tokenize, fuzzyMatches } from '#utils/portfolioSearch.js';

// Generic English function words, plus "harsh"/"kaushik" themselves —
// every chunk in this corpus is about Harsh, so matching his own name
// discriminates between chunks no better than "the" would. Filtered out
// of the QUERY only (never from chunk keywords/text), so a real query
// like "What is NexAI?" or "How can I reach him?" reduces to the words
// that actually carry topical meaning ("nexai" / "reach") before any
// scoring happens — this single fix is what stops every chunk scoring
// near-equally on an unrelated query.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'doing', 'has', 'have', 'had', 'having',
  'what', 'who', 'whom', 'where', 'when', 'how', 'why', 'which',
  'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must',
  'i', 'you', 'he', 'she', 'it', 'they', 'we', 'him', 'her', 'his', 'its', 'their', 'our', 'my', 'your', 'them',
  'and', 'or', 'but', 'if', 'so', 'than', 'then',
  'of', 'to', 'in', 'on', 'at', 'for', 'with', 'about', 'from', 'by', 'as', 'into', 'like', 'over', 'after',
  'that', 'this', 'these', 'those', 'there', 'here',
  'me', 'us', 'am', 'get', 'got', 'up', 'out', 'any', 'some',
  'harsh', 'kaushik', 'haarsh01',
]);

function meaningfulTokens(rawText) {
  return tokenize(rawText).filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

const DEFAULT_LIMIT = 6;
const DEFAULT_MAX_CONTEXT_CHARS = 6000;
// A chunk below this per-chunk score is treated as noise, never returned
// — "no low-confidence unrelated chunks," even if the corpus is small
// enough that plenty of chunks would otherwise fill out a 6-result list.
const MIN_CHUNK_SCORE = 18;

const WEIGHTS = {
  exactAlias: 100,
  partialAlias: 55,
  categoryTokenMatch: 35,
  exactTitle: 90,
  titleSubstring: 50,
  titleTokenMatch: 18,
  perKeywordHit: 15,
  perTokenOverlap: 8,
  fuzzyBonus: 10,
  priorityWeight: 0.05,
};

function scoreChunk(chunk, normQuery, meaningfulQueryTokens) {
  const normTitle = normalize(chunk.title);
  const normCategory = normalize(chunk.category);
  const categoryTokens = meaningfulTokens(chunk.category.replace(/-/g, ' '));
  const normAliases = (chunk.aliases ?? []).map(normalize);
  const normKeywords = (chunk.keywords ?? []).map(normalize);
  const normText = normalize(chunk.text);

  let score = 0;
  const reasons = [];

  // 1. Exact entity/alias match — a visitor's question phrased almost
  // exactly like one of the chunk's own worked examples. Uses the full
  // normalized query (stop words included) since the aliases themselves
  // are natural questions ("What is NexAI?") that only match as phrases.
  if (normAliases.includes(normQuery)) {
    score += WEIGHTS.exactAlias;
    reasons.push('exact-alias');
  } else if (normAliases.some((alias) => alias.includes(normQuery) || normQuery.includes(alias))) {
    score += WEIGHTS.partialAlias;
    reasons.push('partial-alias');
  }

  // 2. Category match — e.g. the query contains "education" and this
  // chunk's category literally is "education".
  if (categoryTokens.some((word) => meaningfulQueryTokens.includes(word))) {
    score += WEIGHTS.categoryTokenMatch;
    reasons.push('category');
  }

  // 3. Title match
  if (normTitle === normQuery) {
    score += WEIGHTS.exactTitle;
    reasons.push('exact-title');
  } else if (normQuery.length > 2 && normTitle.includes(normQuery)) {
    score += WEIGHTS.titleSubstring;
    reasons.push('title-substring');
  } else if (meaningfulQueryTokens.some((token) => normTitle.includes(token))) {
    score += WEIGHTS.titleTokenMatch;
    reasons.push('title-token');
  }

  // 4. Keyword overlap — each matching keyword counts once, whichever
  // direction contains the other (handles both a longer keyword phrase
  // containing a short query token, and a longer query containing a
  // short keyword). Only meaningful (non-stop-word) query tokens are
  // considered, so a keyword phrase like "reach him" still matches a
  // query token "reach" without every chunk's incidental "him"/"the"
  // scoring a hit too.
  const keywordHits = normKeywords.filter(
    (keyword) => meaningfulQueryTokens.some((token) => keyword === token || keyword.includes(token) || token.includes(keyword)),
  );
  score += keywordHits.length * WEIGHTS.perKeywordHit;
  if (keywordHits.length) reasons.push(`keywords:${keywordHits.length}`);

  // 5. Normalized token overlap against the full searchable text — catches
  // a query like "Where did Harsh go to university?" against a chunk
  // whose title/keywords say "education" but whose body text says
  // "Dalhousie University", without needing the word "education" anywhere
  // in the query itself. Restricted to meaningful tokens for the same
  // noise-reduction reason as step 4.
  const haystackTokens = new Set(meaningfulTokens([normTitle, normCategory, ...normKeywords, normText].join(' ')));
  const tokenOverlap = meaningfulQueryTokens.filter((token) => haystackTokens.has(token)).length;
  score += tokenOverlap * WEIGHTS.perTokenOverlap;
  if (tokenOverlap) reasons.push(`overlap:${tokenOverlap}`);

  // 6. Small fuzzy-match bonus — only applied when nothing exact matched
  // yet, so a typo can still surface a chunk but never outranks a real
  // match.
  if (keywordHits.length === 0 && tokenOverlap === 0) {
    const candidateWords = [...normTitle.split(' '), ...normKeywords.flatMap((k) => k.split(' '))];
    if (meaningfulQueryTokens.some((token) => fuzzyMatches(candidateWords, token))) {
      score += WEIGHTS.fuzzyBonus;
      reasons.push('fuzzy');
    }
  }

  // 7. Source priority — always a tie-breaker-scale nudge (chunk priority
  // values run 50-100, so this contributes at most ~5 points), never
  // enough to make an irrelevant high-priority chunk outrank a genuinely
  // matching low-priority one.
  score += (chunk.priority ?? 0) * WEIGHTS.priorityWeight;

  return { score, reasons };
}

// Calibrated against MIN_CHUNK_SCORE (18) — anything that clears that bar
// already has real evidence behind it (an exact keyword/category/alias
// match, never pure noise), so a single-strong-signal query like "How can
// I reach him?" (one meaningful token after stop-word removal, one clean
// keyword hit, ~28 points) should register as answerable ("medium"), not
// get treated the same as zero results. "low" is reserved for genuinely
// no qualifying evidence — see the empty-results branch in
// retrieveKnowledge below, which is what api/harshbot.js actually checks
// before deciding whether to call the model at all.
function confidenceFor(topScore) {
  if (topScore >= 70) return 'high';
  if (topScore >= 25) return 'medium';
  return 'low';
}

// Pure — no I/O, no randomness, same input always produces the same
// output (aside from the deliberate `lastVerified` recency tie-break,
// which is still a pure function of the chunk data itself).
export function retrieveKnowledge(query, chunks, options = {}) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const maxContextChars = options.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;

  const normQuery = normalize(query);
  const meaningfulQueryTokens = meaningfulTokens(query);
  // A query that's entirely stop words ("How are you?", "What's up?") has
  // no topical signal at all — treated the same as an empty query, rather
  // than scored against every chunk's incidental "the"/"is" matches.
  if (!normQuery || !meaningfulQueryTokens.length || !Array.isArray(chunks) || !chunks.length) {
    return { results: [], confidence: 'low', matchedCategories: [] };
  }

  const scored = chunks
    .map((chunk) => ({ chunk, ...scoreChunk(chunk, normQuery, meaningfulQueryTokens) }))
    .filter(({ score }) => score >= MIN_CHUNK_SCORE)
    // 8. Recency only breaks a genuine near-tie (within 3 points) between
    // two chunks — it never overrides an actual relevance difference.
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 3) return b.score - a.score;
      const dateA = a.chunk.lastVerified ?? '';
      const dateB = b.chunk.lastVerified ?? '';
      return dateB.localeCompare(dateA) || (b.score - a.score);
    });

  const results = [];
  let usedChars = 0;
  for (const entry of scored) {
    if (results.length >= limit) break;
    const chunkChars = entry.chunk.text.length;
    if (results.length > 0 && usedChars + chunkChars > maxContextChars) continue;
    results.push(entry);
    usedChars += chunkChars;
  }

  const topScore = results[0]?.score ?? 0;

  return {
    results: results.map(({ chunk, score, reasons }) => ({
      id: chunk.id,
      category: chunk.category,
      title: chunk.title,
      text: chunk.text,
      source: chunk.source,
      score: Math.round(score * 10) / 10,
      matchReasons: reasons,
    })),
    confidence: confidenceFor(topScore),
    matchedCategories: [...new Set(results.map(({ chunk }) => chunk.category))],
  };
}

export default retrieveKnowledge;
