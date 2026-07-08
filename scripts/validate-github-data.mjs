#!/usr/bin/env node
// Validates the CURRENT public/data/github-profile.json on disk against
// the schemaVersion 3 shape — no network access, no token required. Run
// by `npm run github:validate` locally, and by the sync workflow as an
// independent check after generation (a bug in the generator's own
// validation shouldn't be the only thing standing between bad data and a
// commit).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/data/github-profile.json',
);
const EXPECTED_USERNAME = 'haarsh01';
const VALID_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function main() {
  const problems = [];
  const warnings = [];
  let raw;
  try {
    raw = await readFile(OUTPUT_PATH, 'utf8');
  } catch (error) {
    console.error(`Cannot read ${OUTPUT_PATH}: ${error.message}`);
    process.exit(1);
  }

  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (error) {
    console.error(`${OUTPUT_PATH} is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  if (doc.schemaVersion !== 3) warnings.push(`schemaVersion is ${doc.schemaVersion}, expected 3 (older snapshot not yet regenerated?)`);
  if (!doc.generatedAt || Number.isNaN(Date.parse(doc.generatedAt))) problems.push('missing/invalid generatedAt');
  if (doc.profile?.login !== EXPECTED_USERNAME) problems.push(`profile.login is "${doc.profile?.login}", expected "${EXPECTED_USERNAME}"`);

  const weeks = doc.contributions?.weeks;
  const synced = Array.isArray(weeks) && weeks.some((w) => (w.days ?? []).length > 0);
  if (!synced) {
    warnings.push('contributions.weeks is empty — this is the honest "not yet synced" state, not a bug in this validator.');
  } else {
    const seenDates = new Set();
    let dayCount = 0;
    for (const week of weeks) {
      for (const day of week.days ?? []) {
        dayCount += 1;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date ?? '')) problems.push(`invalid date "${day.date}"`);
        else if (seenDates.has(day.date)) problems.push(`duplicate date "${day.date}"`);
        else seenDates.add(day.date);
        if (!Number.isFinite(day.count) || day.count < 0) problems.push(`negative/invalid count on ${day.date}`);
        if (!VALID_LEVELS.includes(day.level)) problems.push(`invalid level "${day.level}" on ${day.date}`);
      }
    }
    console.log(`Weeks: ${weeks.length}, daily cells: ${dayCount}, unique dates: ${seenDates.size}`);
    console.log(`Total contributions reported: ${doc.contributions.totalContributions}`);
  }

  for (const repo of doc.contributedRepositories ?? []) {
    if (!isSafeHttpUrl(repo.url)) problems.push(`unsafe contributedRepositories URL for "${repo.nameWithOwner}"`);
  }
  for (const repo of doc.repositories ?? []) {
    if (!isSafeHttpUrl(repo.htmlUrl)) problems.push(`unsafe repositories URL for "${repo.fullName}"`);
  }
  console.log(`Public repositories: ${doc.repositories?.length ?? 0}`);
  console.log(`Repositories with classified activity: ${doc.contributedRepositories?.length ?? 0}`);

  if (warnings.length) {
    console.log('\nWarnings:');
    warnings.forEach((w) => console.log(`  - ${w}`));
  }

  if (problems.length) {
    console.error('\nValidation FAILED:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }

  console.log('\nValidation passed.');
}

main();
