// Minimal local-development server for HarshBot's API routes — a
// dependency-free stand-in for a serverless dev runtime (chosen over
// installing the `vercel` CLI so local dev needs no new dependency, no
// account, and no network access; see vite.config.js for the matching
// `/api` proxy target that makes this same-origin from the browser's
// point of view). Wraps the SAME production handlers
// (api/harshbot.js, api/harshbot/health.js) — this file only adds the
// couple of Vercel response convenience methods (`res.status()`,
// `res.json()`) those handlers already assume, so there is exactly one
// copy of the real request-handling logic, shared by local dev and
// production.
import http from 'node:http';
import chatHandler from '../api/harshbot.js';
import healthHandler from '../api/harshbot/health.js';

const PORT = Number(process.env.HARSHBOT_API_PORT) || 8787;

function withVercelResponseShim(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  withVercelResponseShim(res);
  const pathname = (req.url || '/').split('?')[0];

  try {
    if (pathname === '/api/harshbot/health') {
      await healthHandler(req, res);
      return;
    }
    if (pathname === '/api/harshbot') {
      await chatHandler(req, res);
      return;
    }
    res.status(404).json({ error: 'Not found.' });
  } catch (error) {
    console.error('[harshbot-api] request handler threw:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error.' });
    else res.end();
  }
});

server.on('error', (error) => {
  console.error(`[harshbot-api] failed to start on port ${PORT}:`, error.message);
  process.exitCode = 1;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[harshbot-api] listening on http://127.0.0.1:${PORT} (proxied by Vite at /api)`);
});
