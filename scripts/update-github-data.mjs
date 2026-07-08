#!/usr/bin/env node
// Generates public/data/github-profile.json — a static, public snapshot of
// Harsh Kaushik's GitHub profile, contribution calendar, and public
// repositories. Run by .github/workflows/update-github-data.yml on a
// schedule (and by `workflow_dispatch`), or locally via `npm run
// github:sync` with a token supplied in the environment — NEVER hardcoded
// here, never written to the output file, never logged.
//
// Usage:
//   GITHUB_ACTIVITY_TOKEN=xxxx node scripts/update-github-data.mjs
//   (locally: GITHUB_ACTIVITY_TOKEN="$(gh auth token)" npm run github:sync)
//
// This script is intentionally the ONLY place in the whole project that
// ever sees a GitHub token, and reads it from exactly one environment
// variable name — never several ambiguous aliases. It never imports
// anything from `src/` that could pull the token into a browser bundle —
// the reverse import (this script reusing src/utils/*'s pure normalization
// functions) is safe because those files have zero DOM/browser
// dependencies and this script never re-exports them anywhere the
// frontend can reach.
import {
  writeFile, readFile, rename, unlink,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeRepositories, isSafeHttpUrl,
} from '../src/utils/githubData.js';
import {
  mapGraphQLContributionLevel,
} from '../src/utils/githubContributions.js';
import { GITHUB_PROFILE } from '../src/constants/github.js';

const GITHUB_USERNAME = GITHUB_PROFILE.username;
// v3: restructures around `source`/`period` metadata blocks, folds the
// four contribution-category totals directly into `contributions` (no
// separate `activity` object), adds `restrictedContributionsCount` and
// `months`, and renames the per-repository breakdown to
// `contributedRepositories`. The frontend hook adapts this shape at the
// boundary (src/hooks/useGitHubData.js) so downstream components never
// needed to change.
const SCHEMA_VERSION = 3;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(SCRIPT_DIR, '../public/data/github-profile.json');
const TEMP_OUTPUT_PATH = `${OUTPUT_PATH}.tmp`;
const CONTRIBUTION_WINDOW_DAYS = 365;
const MAX_REPOSITORIES_PER_CATEGORY = 25;

function fail(message) {
  // Every abort path goes through here — one place that guarantees the
  // message never contains a token, header, or full environment, no
  // matter which validation step triggered it.
  console.error(`GitHub data generation aborted: ${message}`);
  console.error(`Output path: ${OUTPUT_PATH}`);
  console.error('Previous snapshot (if any) was left untouched.');
  process.exit(1);
}

// ---------- Phase 3.1: environment validation ----------
// A single canonical variable name — the workflow decides which secret
// feeds it (see .github/workflows/update-github-data.yml), this script
// never branches on several differently named env vars itself.
const token = process.env.GITHUB_ACTIVITY_TOKEN?.trim();
if (!token) {
  // An unset Actions secret is interpolated as an empty string, not left
  // undefined — `?.trim()` above turns that into the same falsy result as
  // a genuinely missing variable, so both cases fail identically here.
  fail('GITHUB_ACTIVITY_TOKEN is not set (or is empty). This must be a GitHub Actions secret, never a hardcoded value.');
}
if (!GITHUB_USERNAME || typeof GITHUB_USERNAME !== 'string') {
  fail('GITHUB_PROFILE.username (src/constants/github.js) is not configured.');
}

function authHeaders(extra = {}) {
  // Never spread/log this object — only ever pass it directly to fetch().
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'harsh-portfolio-github-data-script',
    ...extra,
  };
}

async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// maxRepositories: 25 matches GitHub's own default for these connections —
// plenty for a personal portfolio's real activity volume. These four
// "ByRepository" fields (not the paginated node-level `issueContributions`/
// `pullRequestContributions` connections) are used deliberately: they only
// ever expose a repository + a total count, never an individual issue/PR/
// review's title, body, or branch — so a private repository's contribution
// count can be aggregated without ever reading anything from inside it.
const CONTRIBUTIONS_QUERY = `
query GitHubContributions($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    login
    name
    avatarUrl
    url
    bio
    location
    contributionsCollection(from: $from, to: $to) {
      startedAt
      endedAt
      restrictedContributionsCount
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalRepositoriesWithContributedCommits
      totalRepositoriesWithContributedIssues
      totalRepositoriesWithContributedPullRequests
      totalRepositoriesWithContributedPullRequestReviews
      contributionCalendar {
        totalContributions
        months {
          name
          year
          firstDay
          totalWeeks
        }
        weeks {
          firstDay
          contributionDays {
            date
            weekday
            contributionCount
            contributionLevel
          }
        }
      }
      commitContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
        repository { nameWithOwner url isPrivate owner { login avatarUrl url } }
        contributions { totalCount }
      }
      issueContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
        repository { nameWithOwner url isPrivate owner { login avatarUrl url } }
        contributions { totalCount }
      }
      pullRequestContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
        repository { nameWithOwner url isPrivate owner { login avatarUrl url } }
        contributions { totalCount }
      }
      pullRequestReviewContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES_PER_CATEGORY}) {
        repository { nameWithOwner url isPrivate owner { login avatarUrl url } }
        contributions { totalCount }
      }
    }
  }
}
`;

// Merges the four per-repository contribution breakdowns into one list,
// keyed by repository. A repository only ever appears here if the token
// could see it AND GitHub reports it as public (`isPrivate === false`) —
// this is the one place a private repository could otherwise leak into the
// public JSON, so it is filtered out here defensively even though the
// token itself is only ever meant to have public read access.
function aggregateContributedRepositories(collection) {
  const byRepo = new Map();

  const addContributions = (entries, key) => {
    for (const entry of entries ?? []) {
      const repo = entry?.repository;
      const count = entry?.contributions?.totalCount;
      if (!repo || repo.isPrivate !== false) continue;
      if (typeof repo.nameWithOwner !== 'string' || !repo.nameWithOwner) continue;
      if (!isSafeHttpUrl(repo.url)) continue;
      const ownerLogin = typeof repo.owner?.login === 'string' ? repo.owner.login : null;
      if (!ownerLogin) continue;
      if (!Number.isFinite(count) || count < 0) continue;

      const existing = byRepo.get(repo.nameWithOwner) ?? {
        nameWithOwner: repo.nameWithOwner,
        url: repo.url,
        ownerLogin,
        ownerAvatarUrl: isSafeHttpUrl(repo.owner?.avatarUrl) ? repo.owner.avatarUrl : null,
        ownerUrl: isSafeHttpUrl(repo.owner?.url) ? repo.owner.url : null,
        commitCount: 0,
        pullRequestCount: 0,
        issueCount: 0,
        codeReviewCount: 0,
      };
      existing[key] += Math.trunc(count);
      byRepo.set(repo.nameWithOwner, existing);
    }
  };

  addContributions(collection.commitContributionsByRepository, 'commitCount');
  addContributions(collection.issueContributionsByRepository, 'issueCount');
  addContributions(collection.pullRequestContributionsByRepository, 'pullRequestCount');
  addContributions(collection.pullRequestReviewContributionsByRepository, 'codeReviewCount');

  return Array.from(byRepo.values())
    .map((repo) => ({
      ...repo,
      total: repo.commitCount + repo.pullRequestCount + repo.issueCount + repo.codeReviewCount,
    }))
    .filter((repo) => repo.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Validates one raw month entry from GitHub's own `months` field. Stored
// as-is (after validation) purely as descriptive metadata — the frontend
// derives its own month-label positions from the validated day list
// instead (see #utils/githubContributions.js's buildContributionGrid),
// so a malformed entry here is dropped rather than allowed to break
// anything downstream.
function normalizeMonth(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.name !== 'string' || !raw.name) return null;
  if (!Number.isInteger(raw.year)) return null;
  if (typeof raw.firstDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.firstDay)) return null;
  if (!Number.isInteger(raw.totalWeeks) || raw.totalWeeks < 0) return null;
  return {
    name: raw.name, year: raw.year, firstDay: raw.firstDay, totalWeeks: raw.totalWeeks,
  };
}

async function fetchContributions() {
  const to = new Date();
  const from = new Date(to.getTime() - CONTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (!(from.getTime() < to.getTime())) {
    fail(`Invalid contribution date range: from=${from.toISOString()} to=${to.toISOString()}.`);
  }

  const response = await fetchWithTimeout('https://api.github.com/graphql', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { login: GITHUB_USERNAME, from: from.toISOString(), to: to.toISOString() },
    }),
  });

  // GitHub includes a request ID header on every response — safe to log
  // (it identifies the request to GitHub support, it does not identify
  // the caller or the token) and genuinely useful for diagnosing a
  // one-off failure without needing to reproduce it.
  const requestId = response.headers.get('x-github-request-id') ?? 'unknown';

  if (!response.ok) {
    fail(`GraphQL HTTP request failed: HTTP ${response.status} ${response.statusText} (x-github-request-id: ${requestId}).`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    fail(`GraphQL response was not valid JSON (x-github-request-id: ${requestId}).`);
  }

  if (payload.errors?.length) {
    // GraphQL error messages/types from GitHub don't include the token, so
    // these are safe to surface — but never log `payload` wholesale, only
    // the type/message text, to avoid ever accidentally printing request
    // headers the API might echo back in an unrelated field.
    const details = payload.errors
      .map((e) => `${e.type ?? 'ERROR'}: ${e.message}`)
      .join('; ');
    fail(`GraphQL returned errors (x-github-request-id: ${requestId}): ${details}`);
  }

  const user = payload.data?.user;
  if (!user) {
    fail(`GraphQL user(login: "${GITHUB_USERNAME}") returned null — check the username is exactly correct and the token can read this profile (x-github-request-id: ${requestId}).`);
  }
  if (user.login !== GITHUB_USERNAME) {
    fail(`GraphQL returned a user whose login ("${user.login}") does not match the configured username ("${GITHUB_USERNAME}").`);
  }

  const collection = user.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (!collection || !calendar) {
    fail(`GraphQL response is missing contributionsCollection/contributionCalendar (x-github-request-id: ${requestId}).`);
  }
  if (!Array.isArray(calendar.weeks)) {
    fail('contributionCalendar.weeks was not an array.');
  }

  const weeks = calendar.weeks.map((week) => ({
    firstDay: typeof week?.firstDay === 'string' ? week.firstDay : null,
    days: (week?.contributionDays ?? []).map((day) => {
      const count = Number.isFinite(day.contributionCount) ? day.contributionCount : 0;
      const level = mapGraphQLContributionLevel(day.contributionLevel) ?? (count > 0 ? 'LOW' : 'NONE');
      return {
        date: day.date, weekday: Number.isInteger(day.weekday) ? day.weekday : null, count, level,
      };
    }),
  }));

  // Phase 3.4: an empty `weeks` array for a ~365-day request is always a
  // failed synchronization, never a legitimate zero-contribution result —
  // a real zero-activity year still comes back with ~52 populated weeks,
  // each day present with count: 0. GitHub only omits the whole structure
  // when the token can't actually read this collection (see the
  // read:user/"Read access to profile" scope note below). Refusing to
  // write here is what makes a scope-less token fail loudly instead of
  // silently overwriting a good snapshot with an empty one.
  const totalDayCount = weeks.reduce((sum, week) => sum + week.days.length, 0);
  if (weeks.length === 0 || totalDayCount === 0) {
    fail(
      'contributionCalendar.weeks was empty. For a ~365-day request this is always a failed sync, never a valid '
      + 'zero-contribution year — most likely GITHUB_ACTIVITY_TOKEN lacks the `read:user` OAuth scope (classic PAT) '
      + 'or "Read access to profile" account permission (fine-grained PAT) that GraphQL contributionsCollection '
      + 'requires. Repository data is fetched via a separate, unauthenticated-friendly REST call and is unaffected '
      + `by this (x-github-request-id: ${requestId}).`,
    );
  }

  const months = (calendar.months ?? []).map(normalizeMonth).filter(Boolean);

  return {
    profile: {
      login: user.login,
      name: typeof user.name === 'string' ? user.name : null,
      avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : null,
      profileUrl: typeof user.url === 'string' ? user.url : `https://github.com/${GITHUB_USERNAME}`,
      bio: typeof user.bio === 'string' && user.bio.trim() ? user.bio.trim() : null,
      location: typeof user.location === 'string' && user.location.trim() ? user.location.trim() : null,
    },
    period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    contributions: {
      totalContributions: Number.isFinite(calendar.totalContributions) ? calendar.totalContributions : 0,
      restrictedContributionsCount: Number.isFinite(collection.restrictedContributionsCount)
        ? collection.restrictedContributionsCount : 0,
      totalCommitContributions: Number.isFinite(collection.totalCommitContributions)
        ? collection.totalCommitContributions : 0,
      totalIssueContributions: Number.isFinite(collection.totalIssueContributions)
        ? collection.totalIssueContributions : 0,
      totalPullRequestContributions: Number.isFinite(collection.totalPullRequestContributions)
        ? collection.totalPullRequestContributions : 0,
      totalPullRequestReviewContributions: Number.isFinite(collection.totalPullRequestReviewContributions)
        ? collection.totalPullRequestReviewContributions : 0,
      months,
      weeks,
    },
    contributedRepositories: aggregateContributedRepositories(collection),
  };
}

async function fetchAllRepositories() {
  const perPage = 100;
  let page = 1;
  const all = [];

  // Supports pagination even though this account currently fits on one
  // page — the count can grow, and per_page is capped at 100 by GitHub
  // regardless of what's requested.
  for (;;) {
    const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?type=owner&sort=pushed&direction=desc&per_page=${perPage}&page=${page}`;
    const response = await fetchWithTimeout(url, {
      headers: authHeaders({ Accept: 'application/vnd.github+json' }),
    });

    if (!response.ok) {
      fail(`REST repos request failed: HTTP ${response.status} ${response.statusText}.`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch)) fail('REST repos response was not an array.');
    all.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
    if (page > 20) break; // hard safety cap (2000 repos) against a runaway loop
  }

  return normalizeRepositories(all).map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.fullName,
    description: repo.description,
    htmlUrl: repo.htmlUrl,
    homepage: repo.homepage,
    primaryLanguage: repo.primaryLanguage,
    topics: [...repo.topics].sort(),
    stargazersCount: repo.stargazersCount,
    forksCount: repo.forksCount,
    openIssuesCount: repo.openIssuesCount,
    isFork: repo.isFork,
    isArchived: repo.isArchived,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
    pushedAt: repo.pushedAt,
    defaultBranch: repo.defaultBranch,
  }));
}

// Deterministic key order + no undefined/NaN anywhere, so an unrelated
// property-order shuffle never produces a meaningless commit and a bad
// value can never silently reach the committed file.
function sanitizeForJson(value) {
  if (value === undefined) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) return value.map(sanitizeForJson);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sanitizeForJson(value[key]);
      return acc;
    }, {});
  }
  return value;
}

// ---------- Phase 4: validate before writing ----------
// Every rule here rejects the whole document rather than trying to salvage
// a partially-bad one — a snapshot that fails validation should never
// reach disk at all, so the previous good snapshot keeps serving.
function validateDocument(doc) {
  const problems = [];

  if (doc.schemaVersion !== SCHEMA_VERSION) problems.push('schemaVersion mismatch');
  if (!doc.generatedAt || Number.isNaN(Date.parse(doc.generatedAt))) problems.push('invalid generatedAt');
  if (doc.profile?.login !== GITHUB_USERNAME) problems.push('profile.login does not match configured username');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.period?.from ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(doc.period?.to ?? '')) {
    problems.push('invalid period.from/period.to');
  }

  const c = doc.contributions;
  if (!c || !Array.isArray(c.weeks) || c.weeks.length === 0) problems.push('empty or missing contributions.weeks');
  for (const [key, value] of Object.entries(c ?? {})) {
    if (['totalContributions', 'restrictedContributionsCount', 'totalCommitContributions',
      'totalIssueContributions', 'totalPullRequestContributions', 'totalPullRequestReviewContributions']
      .includes(key) && (!Number.isFinite(value) || value < 0)) {
      problems.push(`contributions.${key} is not a non-negative number`);
    }
  }

  const seenDates = new Set();
  let dayCount = 0;
  for (const week of c?.weeks ?? []) {
    for (const day of week.days ?? []) {
      dayCount += 1;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date ?? '')) problems.push(`invalid date "${day.date}"`);
      else if (seenDates.has(day.date)) problems.push(`duplicate date "${day.date}"`);
      else seenDates.add(day.date);
      if (!Number.isFinite(day.count) || day.count < 0) problems.push(`negative/invalid count on "${day.date}"`);
      if (!['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(day.level)) problems.push(`invalid level on "${day.date}"`);
    }
  }
  if (dayCount === 0) problems.push('no daily cells present');

  for (const repo of doc.contributedRepositories ?? []) {
    if (!isSafeHttpUrl(repo.url)) problems.push(`unsafe contributedRepositories URL for "${repo.nameWithOwner}"`);
    if (!repo.nameWithOwner) problems.push('contributedRepositories entry missing nameWithOwner');
  }
  for (const repo of doc.repositories ?? []) {
    if (!isSafeHttpUrl(repo.htmlUrl)) problems.push(`unsafe repositories URL for "${repo.fullName}"`);
  }

  return problems;
}

async function main() {
  const [{
    profile, period, contributions, contributedRepositories,
  }, repositories] = await Promise.all([
    fetchContributions(),
    fetchAllRepositories(),
  ]);

  // Repositories are sorted "recently pushed first" here purely so the
  // generated file itself reads sensibly on disk — the frontend re-sorts
  // independently and never assumes this order is authoritative.
  repositories.sort((a, b) => new Date(b.pushedAt ?? 0) - new Date(a.pushedAt ?? 0));

  const document = sanitizeForJson({
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: { provider: 'github-graphql', username: GITHUB_USERNAME, status: 'ok' },
    profile: {
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
      bio: profile.bio,
      location: profile.location,
    },
    period,
    contributions,
    contributedRepositories,
    repositories,
  });

  const problems = validateDocument(document);
  if (problems.length) {
    fail(`Generated document failed validation:\n  - ${problems.join('\n  - ')}`);
  }

  const json = `${JSON.stringify(document, null, 2)}\n`;

  let previous = null;
  try {
    previous = await readFile(OUTPUT_PATH, 'utf8');
  } catch {
    previous = null; // file doesn't exist yet — first run
  }

  // Compare ignoring only `generatedAt`, so a run that fetched byte-for-
  // byte identical data doesn't still produce a commit every hour.
  const stripTimestamp = (text) => (text ?? '').replace(/"generatedAt":\s*"[^"]*"/, '"generatedAt":""');
  if (previous !== null && stripTimestamp(previous) === stripTimestamp(json)) {
    console.log('GitHub data unchanged since last run — skipping write.');
    return;
  }

  // Phase 4: atomic write — write to a temp file, then rename() over the
  // real path. A failure at any point before the rename leaves the
  // previous good snapshot exactly as it was; there is no window where a
  // partially-written file could be read by anything.
  await writeFile(TEMP_OUTPUT_PATH, json, 'utf8');
  try {
    const writtenBack = await readFile(TEMP_OUTPUT_PATH, 'utf8');
    if (writtenBack !== json) fail('Temp file content did not round-trip correctly; refusing to replace the snapshot.');
    await rename(TEMP_OUTPUT_PATH, OUTPUT_PATH);
  } catch (error) {
    await unlink(TEMP_OUTPUT_PATH).catch(() => {});
    throw error;
  }

  const dayCount = contributions.weeks.reduce((sum, week) => sum + week.days.length, 0);
  console.log(
    `Wrote ${OUTPUT_PATH}: ${contributions.weeks.length} weeks, ${dayCount} daily cells, `
    + `${contributions.totalContributions} total contributions, ${repositories.length} repositories, `
    + `${contributedRepositories.length} repositories with classified activity.`,
  );
}

main().catch((error) => {
  fail(error.message);
});
