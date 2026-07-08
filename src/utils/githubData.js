// Pure helpers for normalizing, searching, sorting, and filtering the
// generated/live GitHub repository list, plus small shared validation used
// by both the frontend and (conceptually) the generation script's own
// output checks. Nothing here talks to the network.

// Only ever accept a real, safe external http(s) link — used for both a
// repository's `htmlUrl` and its optional `homepage`, so nothing renders a
// `javascript:`/data: URL or a value that merely looks like one.
export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Maps one raw GitHub REST repo object (or an already-normalized generated
// entry) onto the single stable frontend schema — never renders a raw API
// object directly, and drops every field this app has no legitimate use
// for (owner email, clone URLs, permissions, etc. are simply not copied
// over).
export function normalizeRepository(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name : null;
  const htmlUrl = raw.html_url ?? raw.htmlUrl;
  if (!name || !isSafeHttpUrl(htmlUrl)) return null;

  const homepage = raw.homepage;
  const stars = Number.isFinite(raw.stargazers_count) ? raw.stargazers_count : Number.isFinite(raw.stargazersCount) ? raw.stargazersCount : 0;
  const forks = Number.isFinite(raw.forks_count) ? raw.forks_count : Number.isFinite(raw.forksCount) ? raw.forksCount : 0;
  const openIssues = Number.isFinite(raw.open_issues_count) ? raw.open_issues_count : Number.isFinite(raw.openIssuesCount) ? raw.openIssuesCount : 0;

  return {
    id: raw.id ?? `${raw.full_name ?? raw.fullName ?? name}`,
    name,
    fullName: raw.full_name ?? raw.fullName ?? name,
    description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : null,
    htmlUrl,
    homepage: isSafeHttpUrl(homepage) ? homepage : null,
    primaryLanguage: typeof raw.language === 'string' && raw.language ? raw.language : (raw.primaryLanguage ?? null),
    topics: Array.isArray(raw.topics) ? raw.topics.filter((t) => typeof t === 'string' && t) : [],
    stargazersCount: stars,
    forksCount: forks,
    openIssuesCount: openIssues,
    isFork: Boolean(raw.fork ?? raw.isFork),
    isArchived: Boolean(raw.archived ?? raw.isArchived),
    createdAt: typeof raw.created_at === 'string' ? raw.created_at : (raw.createdAt ?? null),
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : (raw.updatedAt ?? null),
    pushedAt: typeof raw.pushed_at === 'string' ? raw.pushed_at : (raw.pushedAt ?? null),
    defaultBranch: typeof raw.default_branch === 'string' ? raw.default_branch : (raw.defaultBranch ?? null),
  };
}

export function normalizeRepositories(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of rawList) {
    const repo = normalizeRepository(raw);
    if (!repo || seen.has(repo.fullName)) continue; // de-dupes by fullName, so a repeated page fetch can never double-list a repo
    seen.add(repo.fullName);
    out.push(repo);
  }
  return out;
}

const normalizeSearchText = (value) => (value ?? '')
  .toString()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[-_]+/g, ' ')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Local-only search across name/description/language/topics — never sent
// to GitHub. Matches when every whitespace-separated query token appears
// somewhere in the repo's combined searchable text.
export function searchRepositories(repos, rawQuery) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return repos;
  const tokens = query.split(' ').filter(Boolean);

  return repos.filter((repo) => {
    const haystack = normalizeSearchText([
      repo.name,
      repo.description,
      repo.primaryLanguage,
      ...(repo.topics ?? []),
    ].filter(Boolean).join(' '));
    return tokens.every((token) => haystack.includes(token));
  });
}

export const REPOSITORY_SORTS = ['pushed', 'updated', 'stars', 'name'];

// Always returns a new array — never mutates/reorders the caller's own
// source list in place.
export function sortRepositories(repos, sortKey) {
  const copy = repos.slice();
  switch (sortKey) {
    case 'stars':
      return copy.sort((a, b) => (b.stargazersCount ?? 0) - (a.stargazersCount ?? 0));
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'updated':
      return copy.sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0));
    case 'pushed':
    default:
      return copy.sort((a, b) => new Date(b.pushedAt ?? 0) - new Date(a.pushedAt ?? 0));
  }
}

export const REPOSITORY_FILTERS = ['all', 'sources', 'forks', 'archived'];

export function filterRepositories(repos, filterKey) {
  switch (filterKey) {
    case 'sources': return repos.filter((r) => !r.isFork);
    case 'forks': return repos.filter((r) => r.isFork);
    case 'archived': return repos.filter((r) => r.isArchived);
    case 'all':
    default:
      return repos;
  }
}

// ---------- Live-refresh session cache ----------
// A short-lived cache for the *unauthenticated* REST repository refresh
// (see src/hooks/useGitHubData.js) — deliberately sessionStorage, not
// localStorage, since this is only meant to smooth over repeat opens of
// the GitHub window within one browsing session, not persist indefinitely.

function readSessionCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Number.isFinite(parsed.cachedAt) || !Array.isArray(parsed.repositories)) return null;
    return parsed;
  } catch {
    return null; // corrupted JSON, storage disabled, etc. — never throws
  }
}

export function readCachedRepositories(key, maxAgeMs) {
  const cached = readSessionCache(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > maxAgeMs) return null;
  const repos = normalizeRepositories(cached.repositories);
  return repos.length ? repos : null;
}

export function writeCachedRepositories(key, repositories) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ cachedAt: Date.now(), repositories }));
  } catch {
    // sessionStorage unavailable (private mode, quota) — safe to ignore,
    // this is purely an optimization.
  }
}
