#!/usr/bin/env node
// Validates the CURRENT server/data/harshbot-knowledge.json on disk — no
// network access, no OpenAI call, no token required. Re-checks everything
// the build script already validated before writing (a second, independent
// check catches a bug in the build script itself, not just a bug in the
// source content), plus a couple of checks that only make sense once the
// artifact already exists (e.g. "does this file even exist yet").
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHarshBotAction } from '../server/lib/harshbotActions.js';

const KNOWLEDGE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../server/data/harshbot-knowledge.json',
);

const BLOCKED_TEXT_PATTERNS = [
  /\bapi[_-]?key\b/i, /\bsecret\b/i, /\bpassword\b/i, /\btoken\b/i,
  /\/Users\//, /\bhome address\b/i, /\bphone number\b/i,
];

async function main() {
  const problems = [];
  let raw;
  try {
    raw = await readFile(KNOWLEDGE_PATH, 'utf8');
  } catch (error) {
    console.error(`Cannot read ${KNOWLEDGE_PATH}: ${error.message}`);
    console.error('Run `npm run harshbot:knowledge` first.');
    process.exit(1);
  }

  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (error) {
    console.error(`${KNOWLEDGE_PATH} is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  if (doc.schemaVersion !== 1) problems.push(`unexpected schemaVersion: ${doc.schemaVersion}`);
  if (!doc.generatedAt || Number.isNaN(Date.parse(doc.generatedAt))) problems.push('missing/invalid generatedAt');
  if (doc.owner !== 'Harsh Kaushik') problems.push(`unexpected owner: "${doc.owner}"`);
  if (!Array.isArray(doc.chunks) || !doc.chunks.length) problems.push('chunks must be a non-empty array');

  const seenIds = new Set();
  for (const chunk of doc.chunks ?? []) {
    if (!chunk.id) { problems.push('a chunk is missing an id'); continue; }
    if (seenIds.has(chunk.id)) problems.push(`duplicate chunk id "${chunk.id}"`);
    seenIds.add(chunk.id);

    if (!chunk.category) problems.push(`${chunk.id}: missing category`);
    if (!chunk.title) problems.push(`${chunk.id}: missing title`);
    if (!chunk.text?.trim()) problems.push(`${chunk.id}: empty text`);
    if (!Array.isArray(chunk.keywords) || !chunk.keywords.length) problems.push(`${chunk.id}: missing keywords`);
    if (!Number.isFinite(chunk.priority)) problems.push(`${chunk.id}: invalid priority`);
    if (!chunk.source?.label) problems.push(`${chunk.id}: missing source.label`);
    if (!validateHarshBotAction(chunk.source?.action)) problems.push(`${chunk.id}: source.action failed whitelist validation`);

    for (const pattern of BLOCKED_TEXT_PATTERNS) {
      if (pattern.test(chunk.text ?? '')) problems.push(`${chunk.id}: text matched blocked pattern ${pattern}`);
    }
  }

  const categories = new Set((doc.chunks ?? []).map((c) => c.category));
  console.log(`Chunks: ${doc.chunks?.length ?? 0}`);
  console.log(`Categories: ${categories.size} (${[...categories].join(', ')})`);
  console.log(`generatedAt: ${doc.generatedAt}`);

  if (problems.length) {
    console.error('\nValidation FAILED:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }

  console.log('\nValidation passed.');
}

main();
