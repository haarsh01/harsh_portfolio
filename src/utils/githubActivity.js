// Pure functions for the four-axis activity breakdown (commits, pull
// requests, issues, code reviews), the per-repository contribution
// summary, and activity-scope (personal/organization) derivation — all
// built from the normalized snapshot written by
// scripts/update-github-data.mjs and read by src/hooks/useGitHubData.js.
// Nothing here talks to the network or touches the DOM.
import dayjs from 'dayjs';
import { isSafeHttpUrl } from '#utils/githubData.js';

// Validates and coerces one raw repository-activity entry. Returns null
// (never throws) for anything unusable — a single corrupted entry can't
// break the whole list. Mirrors the defensive style of
// normalizeRepositoryDay/normalizeRepository elsewhere in this project.
export function normalizeRepositoryActivity(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.nameWithOwner !== 'string' || !raw.nameWithOwner.includes('/')) return null;
  if (!isSafeHttpUrl(raw.url)) return null;
  if (typeof raw.ownerLogin !== 'string' || !raw.ownerLogin) return null;

  const toCount = (value) => (Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0);
  const commitCount = toCount(raw.commitCount);
  const pullRequestCount = toCount(raw.pullRequestCount);
  const issueCount = toCount(raw.issueCount);
  const codeReviewCount = toCount(raw.codeReviewCount);
  const total = commitCount + pullRequestCount + issueCount + codeReviewCount;
  if (total <= 0) return null;

  return {
    nameWithOwner: raw.nameWithOwner,
    url: raw.url,
    ownerLogin: raw.ownerLogin,
    ownerAvatarUrl: isSafeHttpUrl(raw.ownerAvatarUrl) ? raw.ownerAvatarUrl : null,
    ownerUrl: isSafeHttpUrl(raw.ownerUrl) ? raw.ownerUrl : null,
    commitCount,
    pullRequestCount,
    issueCount,
    codeReviewCount,
    total,
  };
}

export function normalizeRepositoryActivityList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of rawList) {
    const entry = normalizeRepositoryActivity(raw);
    if (!entry || seen.has(entry.nameWithOwner)) continue;
    seen.add(entry.nameWithOwner);
    out.push(entry);
  }
  return out.sort((a, b) => b.total - a.total);
}

// The "all activity" scope always exists (even with zero data, so the UI
// has something stable to key off). Personal/organization scopes are only
// ever derived from repository owners that actually appear in the real
// data — nothing here is hardcoded, so an org disappearing from (or
// appearing in) real activity is reflected automatically.
export function deriveActivityScopes(repositoryActivity, viewerLogin) {
  const owners = new Map();
  for (const repo of repositoryActivity) {
    if (!owners.has(repo.ownerLogin)) {
      owners.set(repo.ownerLogin, { ownerLogin: repo.ownerLogin, avatarUrl: repo.ownerAvatarUrl, url: repo.ownerUrl });
    }
  }

  const scopes = [{ id: 'all', label: 'All activity', type: 'all' }];
  for (const owner of owners.values()) {
    const isViewer = viewerLogin && owner.ownerLogin.toLowerCase() === viewerLogin.toLowerCase();
    scopes.push({
      id: owner.ownerLogin,
      label: `@${owner.ownerLogin}`,
      type: isViewer ? 'user' : 'organization',
      ownerLogin: owner.ownerLogin,
      avatarUrl: owner.avatarUrl,
      url: owner.url,
    });
  }
  return scopes;
}

// The scope menu is only worth showing when it can actually change what's
// displayed — i.e. there's a real personal/organization distinction in the
// data. A single-owner account would show identical results for "All
// activity" and "@username", so the menu is omitted rather than rendered
// as a non-functional choice between two identical views.
export function shouldShowScopeMenu(scopes) {
  return scopes.filter((s) => s.type !== 'all').length > 1;
}

export function filterRepositoryActivityByScope(repositoryActivity, scope) {
  if (!scope || scope.type === 'all') return repositoryActivity;
  return repositoryActivity.filter((repo) => repo.ownerLogin === scope.ownerLogin);
}

// Sums a (possibly scope-filtered) repository-activity list into the same
// four-category shape as the snapshot's top-level `activity` object. Used
// for any scope other than "all", since GitHub has no single field for
// "total pull requests contributed to just this organization" — the only
// way to get that number is by summing the per-repository breakdown.
export function sumRepositoryActivity(repositoryActivity) {
  const totals = repositoryActivity.reduce((acc, repo) => ({
    commits: acc.commits + repo.commitCount,
    pullRequests: acc.pullRequests + repo.pullRequestCount,
    issues: acc.issues + repo.issueCount,
    codeReviews: acc.codeReviews + repo.codeReviewCount,
  }), { commits: 0, pullRequests: 0, issues: 0, codeReviews: 0 });
  return { ...totals, classifiedTotal: totals.commits + totals.pullRequests + totals.issues + totals.codeReviews };
}

// Percentages are always a share of `classifiedTotal` (commits + pull
// requests + issues + code reviews combined) — never of the calendar's
// overall `totalContributions`, which can include contribution categories
// (e.g. repository creation) these four axes don't represent at all.
export function computeActivityBreakdown(activity) {
  const commits = Number.isFinite(activity?.commits) && activity.commits >= 0 ? activity.commits : 0;
  const pullRequests = Number.isFinite(activity?.pullRequests) && activity.pullRequests >= 0 ? activity.pullRequests : 0;
  const issues = Number.isFinite(activity?.issues) && activity.issues >= 0 ? activity.issues : 0;
  const codeReviews = Number.isFinite(activity?.codeReviews) && activity.codeReviews >= 0 ? activity.codeReviews : 0;
  const classifiedTotal = commits + pullRequests + issues + codeReviews;

  const pct = (value) => (classifiedTotal > 0 ? (value / classifiedTotal) * 100 : 0);
  return {
    commits,
    pullRequests,
    issues,
    codeReviews,
    classifiedTotal,
    percentages: {
      commits: pct(commits),
      pullRequests: pct(pullRequests),
      issues: pct(issues),
      codeReviews: pct(codeReviews),
    },
  };
}

// Builds the "Contributed to X, Y, and N others" sentence directly from
// real repository names — grammatically correct for 0/1/2/3/4+ entries,
// nothing hardcoded or padded to look fuller than it is.
export function buildRepositoryContributionSentence(repositoryActivity) {
  const names = repositoryActivity
    .map((repo) => repo.nameWithOwner.split('/')[1] || repo.nameWithOwner)
    .filter(Boolean);

  if (!names.length) return 'No repository-level contribution details are available for this period.';
  if (names.length === 1) return `Contributed to ${names[0]}`;
  if (names.length === 2) return `Contributed to ${names[0]} and ${names[1]}`;
  if (names.length === 3) return `Contributed to ${names[0]}, ${names[1]}, and ${names[2]}`;

  const remaining = names.length - 2;
  return `Contributed to ${names[0]}, ${names[1]}, and ${remaining} other repositor${remaining === 1 ? 'y' : 'ies'}`;
}

// "173 contributions in the last year" when the window is close to a full
// year, or an accurate "from Month Year to Month Year" label otherwise —
// never a hardcoded "last year" for a period that isn't actually one.
export function formatContributionPeriodLabel(fromIso, toIso) {
  const from = dayjs(fromIso);
  const to = dayjs(toIso);
  if (!from.isValid() || !to.isValid()) return null;

  const days = to.diff(from, 'day');
  if (days >= 358 && days <= 372) return 'in the last year';
  return `from ${from.format('MMMM YYYY')} to ${to.format('MMMM YYYY')}`;
}

export function formatContributionHeading(totalContributions, fromIso, toIso) {
  const count = Number.isFinite(totalContributions) ? totalContributions : 0;
  const periodLabel = formatContributionPeriodLabel(fromIso, toIso) ?? 'in the selected period';
  return `${count} contribution${count === 1 ? '' : 's'} ${periodLabel}`;
}
