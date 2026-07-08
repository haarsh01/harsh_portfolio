// Tier 1 of HarshBot's two-tier answer system — a deterministic, LLM-free
// answer composer. Used whenever OPENAI_API_KEY is not configured, or the
// model call itself fails, so a portfolio visitor always gets a genuinely
// useful, sourced answer instead of a flat "unavailable" wall (see the
// project's own repair notes on why an all-or-nothing design was wrong).
//
// Deliberately not a second copy of any prose: the knowledge chunks
// (server/data/harshbot-knowledge.json, built from the portfolio's own
// constants) are already written as grounded, third-person, standalone
// prose for exactly this reason — this just reshapes the top retrieval
// result(s) into a reply and reuses the same source/action data the LLM
// tier would have cited.
import { validateHarshBotAction } from './harshbotActions.js';

const MAX_CHUNKS_IN_ANSWER = 2;

// Pure — no I/O, no network, same input always produces the same output.
export function composeLocalAnswer(retrievedResults) {
  if (!Array.isArray(retrievedResults) || !retrievedResults.length) return null;

  const top = retrievedResults.slice(0, MAX_CHUNKS_IN_ANSWER);
  const text = top.map((chunk) => chunk.text).join('\n\n');

  const citations = top
    .map((chunk) => ({
      id: chunk.id,
      label: chunk.source?.label,
      action: validateHarshBotAction(chunk.source?.action),
    }))
    .filter((citation) => citation.action && citation.label);

  return { text, citations };
}

export default composeLocalAnswer;
