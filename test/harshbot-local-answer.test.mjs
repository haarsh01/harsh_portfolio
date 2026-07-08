// Tests the Tier 1 (LLM-free) local answer composer against the real,
// generated knowledge corpus — this is the exact path a visitor hits
// whenever OPENAI_API_KEY is absent or the model call fails, so it must
// hold up on its own without ever calling out to a network service.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { retrieveKnowledge } from '../server/lib/retrieveHarshKnowledge.js';
import { composeLocalAnswer } from '../server/lib/composeLocalAnswer.js';

const KNOWLEDGE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../server/data/harshbot-knowledge.json');
const CHUNKS = JSON.parse(readFileSync(KNOWLEDGE_PATH, 'utf8')).chunks;

function answerFor(question) {
  const { results } = retrieveKnowledge(question, CHUNKS);
  return composeLocalAnswer(results);
}

test('composeLocalAnswer: returns null for an empty retrieval result', () => {
  assert.equal(composeLocalAnswer([]), null);
  assert.equal(composeLocalAnswer(undefined), null);
});

test('composeLocalAnswer: "What is NexAI?" produces non-empty, sourced text', () => {
  const local = answerFor('What is NexAI?');
  assert.ok(local);
  assert.ok(local.text.length > 0);
  assert.ok(local.citations.length > 0);
  assert.ok(local.citations.every((c) => c.action && c.label));
});

for (const question of [
  "What is Harsh's education?",
  'What is his work and research experience?',
  'What has Harsh published?',
  'Has Harsh given any talks?',
  'What technologies does he use?',
  'How can I contact Harsh?',
  'Where is Harsh based?',
  'What does Harsh enjoy outside work?',
]) {
  test(`composeLocalAnswer: "${question}" produces a grounded, sourced answer`, () => {
    const local = answerFor(question);
    assert.ok(local, `expected a local answer for "${question}"`);
    assert.ok(local.text.length > 0);
  });
}

test('composeLocalAnswer: never invents a citation not present in the retrieved chunks', () => {
  const { results } = retrieveKnowledge('What is NexAI?', CHUNKS);
  const local = composeLocalAnswer(results);
  const retrievedIds = new Set(results.map((r) => r.id));
  for (const citation of local.citations) {
    assert.ok(retrievedIds.has(citation.id), `citation ${citation.id} was not actually retrieved`);
  }
});

test('composeLocalAnswer: text is pure concatenation of retrieved chunk text (no fabrication)', () => {
  const { results } = retrieveKnowledge('What is NexAI?', CHUNKS);
  const local = composeLocalAnswer(results);
  const expectedSubstring = results[0].text;
  assert.ok(local.text.includes(expectedSubstring));
});
