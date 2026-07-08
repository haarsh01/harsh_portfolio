// The one place HarshBot's frontend resolves its API endpoint, builds
// requests, and parses responses — src/hooks/useHarshBot.js owns
// conversation state; this owns "how do we talk to the server." Nothing
// else in the app should call fetch(".../harshbot") directly.

const DEFAULT_PATH = '/api/harshbot';

// Same-origin by default ("/api/harshbot", served by the same deployment
// as the frontend) — only overridden when the API is deliberately
// deployed separately from the static site (e.g. a GitHub-Pages-hosted
// frontend calling a small serverless function elsewhere). This URL is
// not secret; the model key never leaves the server (see api/harshbot.js).
function resolveEndpoint() {
  const explicit = import.meta.env?.VITE_HARSHBOT_API_URL;
  if (!explicit) return DEFAULT_PATH;

  const trimmed = explicit.trim().replace(/\/+$/, '');
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    console.error('HarshBot: VITE_HARSHBOT_API_URL is not a valid absolute URL — falling back to same-origin /api/harshbot.');
    return DEFAULT_PATH;
  }
  const isLocalHttp = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !isLocalHttp) {
    console.error('HarshBot: VITE_HARSHBOT_API_URL must use https:// (or http://localhost during development) — falling back to same-origin /api/harshbot.');
    return DEFAULT_PATH;
  }
  return trimmed;
}

export const HARSHBOT_ENDPOINT = resolveEndpoint();
export const HARSHBOT_HEALTH_ENDPOINT = `${HARSHBOT_ENDPOINT}/health`;

export class HarshBotClientError extends Error {
  constructor(kind, message, extra) {
    super(message);
    this.name = 'HarshBotClientError';
    this.kind = kind;
    if (extra) Object.assign(this, extra);
  }
}

// Parses a fetch() ReadableStream of Server-Sent Events (the native
// EventSource API only supports GET, and this endpoint is POST) into
// discrete { event, data } objects.
async function* readSSE(response, signal) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      if (signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        let event = 'message';
        let data = '';
        for (const line of part.split('\n')) {
          if (line.startsWith('event: ')) event = line.slice(7);
          else if (line.startsWith('data: ')) data = line.slice(6);
        }
        if (!data) continue;
        try {
          yield { event, data: JSON.parse(data) };
        } catch {
          // malformed event payload — skip rather than crash the stream
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Requests a HarshBot answer and returns an async generator of
// { event, data } SSE entries. Throws HarshBotClientError for anything
// that isn't a usable stream — callers decide how to render that.
export async function streamHarshBotAnswer({ message, history, sessionId, signal }) {
  let response;
  try {
    response = await fetch(HARSHBOT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, sessionId }),
      signal,
    });
  } catch (networkError) {
    if (signal.aborted) throw networkError; // let callers distinguish a deliberate Stop
    throw new HarshBotClientError('network', "HarshBot couldn't be reached. Check your connection and try again.");
  }

  if (response.status === 404) {
    if (import.meta.env.DEV) {
      console.error(
        'HarshBot API route was not found. The Vite frontend is running, but the local HarshBot backend is not available. '
        + 'Start the full development environment (npm run dev) or configure VITE_HARSHBOT_API_URL.',
      );
    }
    throw new HarshBotClientError('not-found', "HarshBot is temporarily unavailable. You can still explore Harsh's portfolio directly.");
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !response.body || !contentType.includes('text/event-stream')) {
    // A JSON-parse failure here must never hide the real HTTP status —
    // this branch is reached precisely because the response *isn't* the
    // stream we expect (an HTML error page, a plain-text 500, etc.).
    throw new HarshBotClientError('bad-response', "I couldn't complete that response. Your question has been kept so you can try again.", { status: response.status });
  }

  return readSSE(response, signal);
}

// Best-effort, non-blocking status probe (Phase 9) — used purely for
// status text ("Ask HarshBot" / "Portfolio answers available" / a
// degraded notice). A failure here must never disable the composer;
// callers treat any rejection the same as an "unavailable" health report.
export async function fetchHarshBotHealth(signal) {
  try {
    const response = await fetch(HARSHBOT_HEALTH_ENDPOINT, { signal });
    if (!response.ok) return { status: 'degraded', retrieval: 'unknown', llm: 'unknown', fallback: 'unknown' };
    const data = await response.json();
    return {
      status: typeof data.status === 'string' ? data.status : 'degraded',
      retrieval: typeof data.retrieval === 'string' ? data.retrieval : 'unknown',
      llm: typeof data.llm === 'string' ? data.llm : 'unknown',
      fallback: typeof data.fallback === 'string' ? data.fallback : 'unknown',
    };
  } catch {
    return { status: 'unavailable', retrieval: 'unknown', llm: 'unknown', fallback: 'unknown' };
  }
}

export default { streamHarshBotAnswer, fetchHarshBotHealth, HARSHBOT_ENDPOINT };
