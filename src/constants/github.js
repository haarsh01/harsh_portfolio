// Single authoritative source for the verified GitHub profile this window
// reads from. Every URL below was confirmed directly against the real
// public GitHub API/profile (api.github.com/users/haarsh01) — nothing here
// is a guess, and nothing downstream should hand-type this username or
// these URLs a second time.
export const GITHUB_PROFILE = {
  username: 'haarsh01',
  displayName: 'Harsh Kaushik',
  profileUrl: 'https://github.com/haarsh01',
  repositoriesUrl: 'https://github.com/haarsh01?tab=repositories',
  apiUrl: 'https://api.github.com/users/haarsh01',
  repositoriesApiUrl: 'https://api.github.com/users/haarsh01/repos',
  icon: '/images/github.png',
};

// Where the build-time-generated snapshot (profile + repos + contribution
// calendar) lives — produced by scripts/update-github-data.mjs and
// refreshed on a schedule by .github/workflows/update-github-data.yml.
// Never fetched with credentials; this is a plain static JSON file.
// Built from Vite's own BASE_URL (always "/" unless a `base` is
// configured in vite.config.js) rather than a hardcoded "/data/..." — a
// hardcoded root path silently 404s the moment this site is ever deployed
// under a subpath (e.g. GitHub Pages project sites default to
// "/<repo-name>/"), which is a common source of "works locally, breaks in
// production" bugs. `import.meta.env` only exists under Vite — this file
// is also imported directly by plain-Node scripts (scripts/update-
// github-data.mjs, scripts/build-harshbot-knowledge.mjs), so the access is
// optional-chained with a "/" fallback rather than assumed to exist.
export const GITHUB_DATA_URL = `${import.meta.env?.BASE_URL ?? '/'}data/github-profile.json`;

// How long a successful *live* REST repository refresh is considered
// fresh before the window is willing to try again — matches the "10-30
// minutes" guidance so a visitor re-opening the window repeatedly doesn't
// hammer GitHub's unauthenticated rate limit.
export const GITHUB_REPO_CACHE_TTL_MS = 20 * 60 * 1000;

// If the generated snapshot's own `generatedAt` is older than this, the UI
// discloses that the data may be temporarily out of date rather than
// silently presenting it as current.
export const GITHUB_DATA_STALE_AFTER_MS = 30 * 60 * 60 * 1000; // 30 hours

export const GITHUB_REPO_SESSION_CACHE_KEY = 'harsh-portfolio-github-repos-cache:v1';
