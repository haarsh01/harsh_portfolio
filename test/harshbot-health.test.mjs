// Tests the pure health->status derivation used to decide the composer's
// status text (Phase 9) — never gates whether the composer accepts input,
// only what it says about itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveBackendHealth } from '../src/hooks/useHarshBot.js';

test('deriveBackendHealth: llm ready -> llm-ready', () => {
  assert.equal(deriveBackendHealth({ status: 'ok', retrieval: 'ready', llm: 'ready', fallback: 'ready' }), 'llm-ready');
});

test('deriveBackendHealth: llm not-configured but retrieval fine -> local-only', () => {
  assert.equal(deriveBackendHealth({ status: 'ok', retrieval: 'ready', llm: 'not-configured', fallback: 'ready' }), 'local-only');
});

test('deriveBackendHealth: retrieval broken -> unavailable regardless of llm', () => {
  assert.equal(deriveBackendHealth({ status: 'degraded', retrieval: 'error', llm: 'ready', fallback: 'unavailable' }), 'unavailable');
});

test('deriveBackendHealth: health endpoint unreachable -> unavailable', () => {
  assert.equal(deriveBackendHealth({ status: 'unavailable', retrieval: 'unknown', llm: 'unknown', fallback: 'unknown' }), 'unavailable');
});
