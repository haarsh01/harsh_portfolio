// GET /api/harshbot/health — a lightweight, non-sensitive status check the
// frontend uses purely for status messaging (Ask HarshBot / Portfolio
// answers available / degraded). Never disables the composer by itself —
// see src/hooks/useHarshBot.js. Reuses the exact same knowledge loader the
// main handler uses rather than re-reading/parsing the artifact a second
// way.
import { loadKnowledge } from '../harshbot.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  let retrieval = 'ready';
  try {
    const knowledge = await loadKnowledge();
    if (!Array.isArray(knowledge) || !knowledge.length) retrieval = 'error';
  } catch {
    retrieval = 'error';
  }

  const llm = process.env.OPENAI_API_KEY ? 'ready' : 'not-configured';

  res.status(200).json({
    status: retrieval === 'ready' ? 'ok' : 'degraded',
    retrieval,
    llm,
    fallback: retrieval === 'ready' ? 'ready' : 'unavailable',
  });
}
