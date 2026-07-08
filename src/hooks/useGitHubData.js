import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GITHUB_DATA_URL, GITHUB_PROFILE, GITHUB_REPO_CACHE_TTL_MS, GITHUB_REPO_SESSION_CACHE_KEY,
} from '#constants/github.js';
import {
  normalizeRepositories, readCachedRepositories, writeCachedRepositories,
} from '#utils/githubData.js';
import { flattenContributionWeeks } from '#utils/githubContributions.js';
import { normalizeRepositoryActivityList } from '#utils/githubActivity.js';
import { registerGitHubRepositoryEntries } from '#utils/searchRegistry.js';

const REST_TIMEOUT_MS = 8000;

function createTimeoutController(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function loadGeneratedSnapshot(signal, { bustCache = false } = {}) {
  const url = bustCache ? `${GITHUB_DATA_URL}?t=${Date.now()}` : GITHUB_DATA_URL;
  const response = await fetch(url, { signal, cache: bustCache ? 'no-store' : 'default' });
  if (!response.ok) throw new Error(`Generated GitHub data request failed (HTTP ${response.status}).`);
  const json = await response.json();
  if (!json || typeof json !== 'object' || !json.profile || !json.contributions) {
    throw new Error('Generated GitHub data has an unexpected shape.');
  }
  return json;
}

// Best-effort, unauthenticated, read-only repository refresh — never
// throws past this function; a failure just means "keep showing what we
// already have." Never attempted more than once per TTL window, and never
// retried automatically after a 403/429.
async function refreshRepositoriesFromRest() {
  const cached = readCachedRepositories(GITHUB_REPO_SESSION_CACHE_KEY, GITHUB_REPO_CACHE_TTL_MS);
  if (cached) return { repositories: cached, source: 'cache' };

  const { signal, cancel } = createTimeoutController(REST_TIMEOUT_MS);
  try {
    const perPage = 100;
    let page = 1;
    const all = [];
    for (;;) {
      const url = `${GITHUB_PROFILE.repositoriesApiUrl}?type=owner&sort=pushed&direction=desc&per_page=${perPage}&page=${page}`;
      const response = await fetch(url, { signal, headers: { Accept: 'application/vnd.github+json' } });
      if (response.status === 403 || response.status === 429) {
        return { repositories: null, source: 'rate-limited' };
      }
      if (!response.ok) return { repositories: null, source: 'error' };

      const batch = await response.json();
      if (!Array.isArray(batch)) return { repositories: null, source: 'error' };
      all.push(...batch);
      if (batch.length < perPage || page >= 10) break;
      page += 1;
    }

    const repositories = normalizeRepositories(all);
    if (!repositories.length) return { repositories: null, source: 'error' };
    writeCachedRepositories(GITHUB_REPO_SESSION_CACHE_KEY, repositories);
    return { repositories, source: 'live' };
  } catch {
    return { repositories: null, source: 'offline' };
  } finally {
    cancel();
  }
}

// Loads the build-time-generated GitHub snapshot immediately (so the
// window is never blank), then makes exactly one best-effort, cached,
// unauthenticated REST call to refresh just the repository list — never on
// every render, resize, or focus, only once per mount plus whenever the
// caller explicitly asks via `refresh()`.
export function useGitHubData() {
  const [state, setState] = useState({
    status: 'loading', // 'loading' | 'ready' | 'error'
    profile: null,
    contributionDays: [],
    contributionMeta: null,
    activity: null,
    repositoryActivity: [],
    repositories: [],
    generatedAt: null,
    repoDataSource: 'generated', // 'generated' | 'cache' | 'live'
    error: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  // Adapts whichever generated-snapshot schema version is actually on disk
  // into one stable internal shape — this is the one place that boundary
  // lives, so GitHubContributionCalendar/Summary/ActivityOverview never
  // needed to know a schema version exists at all.
  //   v1: contributions{from,to,totalContributions,totalCommitContributions,weeks}
  //   v2: v1 + activity{commits,pullRequests,issues,codeReviews,classifiedTotal} + repositoryActivity[]
  //   v3: period{from,to} (date-only) + contributions gains
  //       totalIssue/PullRequest/PullRequestReviewContributions directly +
  //       contributedRepositories[] (renamed from repositoryActivity)
  const applySnapshot = useCallback((snapshot) => {
    if (!mountedRef.current) return;
    const days = flattenContributionWeeks(snapshot.contributions?.weeks);
    const c = snapshot.contributions ?? {};

    let activity;
    if ([c.totalCommitContributions, c.totalPullRequestContributions,
      c.totalIssueContributions, c.totalPullRequestReviewContributions].some(Number.isFinite)) {
      const commits = Number.isFinite(c.totalCommitContributions) ? c.totalCommitContributions : 0;
      const pullRequests = Number.isFinite(c.totalPullRequestContributions) ? c.totalPullRequestContributions : 0;
      const issues = Number.isFinite(c.totalIssueContributions) ? c.totalIssueContributions : 0;
      const codeReviews = Number.isFinite(c.totalPullRequestReviewContributions) ? c.totalPullRequestReviewContributions : 0;
      activity = {
        commits, pullRequests, issues, codeReviews, classifiedTotal: commits + pullRequests + issues + codeReviews,
      };
    } else if (snapshot.activity && Number.isFinite(snapshot.activity.classifiedTotal)) {
      activity = snapshot.activity;
    } else {
      activity = {
        commits: 0, pullRequests: 0, issues: 0, codeReviews: 0, classifiedTotal: 0,
      };
    }

    setState((prev) => ({
      ...prev,
      status: 'ready',
      profile: snapshot.profile,
      contributionDays: days,
      contributionMeta: {
        from: snapshot.period?.from ?? c.from ?? null,
        to: snapshot.period?.to ?? c.to ?? null,
        totalContributions: c.totalContributions ?? null,
        totalCommitContributions: c.totalCommitContributions ?? null,
        synced: days.length > 0,
      },
      activity,
      repositoryActivity: normalizeRepositoryActivityList(snapshot.contributedRepositories ?? snapshot.repositoryActivity),
      repositories: normalizeRepositories(snapshot.repositories),
      generatedAt: snapshot.generatedAt ?? null,
      error: null,
    }));
  }, []);

  const runLiveRepoRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const { repositories, source } = await refreshRepositoriesFromRest();
    if (!mountedRef.current) return;
    if (repositories?.length) {
      setState((prev) => ({ ...prev, repositories, repoDataSource: source }));
    }
    // A failed/rate-limited/offline live refresh intentionally leaves the
    // already-displayed (generated or cached) repositories untouched.
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    (async () => {
      try {
        const snapshot = await loadGeneratedSnapshot(controller.signal);
        applySnapshot(snapshot);
        runLiveRepoRefresh();
      } catch {
        if (controller.signal.aborted || !mountedRef.current) return;
        setState((prev) => ({ ...prev, status: 'error', error: 'GitHub data could not be loaded.' }));
      }
    })();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    const { signal, cancel } = createTimeoutController(REST_TIMEOUT_MS);
    try {
      const snapshot = await loadGeneratedSnapshot(signal, { bustCache: true });
      applySnapshot(snapshot);
    } catch {
      // Keep whatever is currently displayed — a failed manual refresh of
      // the generated file is not itself an error state worth surfacing
      // beyond the button simply finishing.
    } finally {
      cancel();
    }
    await runLiveRepoRefresh();
  }, [applySnapshot, runLiveRepoRefresh]);

  // Makes individual repo names Spotlight-searchable as soon as real data is
  // available — this window mounts (and its data hook runs) regardless of
  // whether the user has ever opened it, same as every other window.
  useEffect(() => {
    if (state.repositories.length) registerGitHubRepositoryEntries(state.repositories);
  }, [state.repositories]);

  return { ...state, isRefreshing, refresh };
}

export default useGitHubData;
