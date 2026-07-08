// Dependency-free local dev launcher — starts the HarshBot local API
// server and the Vite dev server together, so a plain `npm run dev` gives
// a complete working environment (POST /api/harshbot no longer 404s under
// plain `vite`) without adding any new package. Both children are started
// and stopped together, output is forwarded, and a nonzero exit code is
// returned on startup failure.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code ?? 0), 100);
}

function spawnChild(name, command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  children.push({ name, child });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] "${name}" exited unexpectedly (code=${code}, signal=${signal}) — stopping the other process.`);
    shutdown(code && code !== 0 ? code : 1);
  });
  child.on('error', (error) => {
    console.error(`[dev] "${name}" failed to start:`, error.message);
    shutdown(1);
  });
  return child;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

spawnChild('harshbot-api', process.execPath, [path.join(rootDir, 'scripts', 'dev-api-server.mjs')]);
spawnChild('vite', process.execPath, [path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')]);
