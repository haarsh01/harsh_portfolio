import React, { useMemo, useState } from 'react';
import {
  deriveActivityScopes, shouldShowScopeMenu, filterRepositoryActivityByScope, sumRepositoryActivity,
} from '#utils/githubActivity.js';
import GitHubContributedRepositories from '#components/GitHubContributedRepositories.jsx';
import GitHubActivityBreakdownChart from '#components/GitHubActivityBreakdownChart.jsx';

// Ties together the (optional) activity-scope selector, the contributed-
// repositories summary, and the four-axis breakdown chart. Scope filtering
// only ever changes what's shown here — the annual contribution calendar
// above stays labeled "All GitHub contributions" regardless of scope,
// since GitHub only provides genuinely per-day-scoped counts for the
// account as a whole, never per-organization.
const GitHubActivityOverview = ({ repositoryActivity, activity, viewerLogin }) => {
  const scopes = useMemo(
    () => deriveActivityScopes(repositoryActivity, viewerLogin),
    [repositoryActivity, viewerLogin],
  );
  const showScopeMenu = shouldShowScopeMenu(scopes);
  const [scopeId, setScopeId] = useState('all');
  const activeScope = scopes.find((scope) => scope.id === scopeId) ?? scopes[0];

  const scopedRepositoryActivity = useMemo(
    () => filterRepositoryActivityByScope(repositoryActivity, activeScope),
    [repositoryActivity, activeScope],
  );

  // "All activity" uses GitHub's own precise per-category totals (the
  // snapshot's top-level `activity` field) rather than summing the
  // per-repository breakdown, which is capped at the top 25 repositories
  // per category and could silently undercount past that. Any other scope
  // has no such precise field from GitHub — it's summed from the
  // (scope-filtered) repository breakdown instead, the only real source
  // for an organization-specific total.
  const scopedActivityTotals = activeScope.type === 'all' ? activity : sumRepositoryActivity(scopedRepositoryActivity);

  return (
    <section className="github-section github-activity-overview" aria-labelledby="github-activity-overview-heading">
      <header className="github-section__header">
        <h2 id="github-activity-overview-heading" tabIndex={-1}>Activity overview</h2>
      </header>

      {!repositoryActivity.length ? (
        <p className="github-empty">
          Repository-level contribution details aren&apos;t available for this period yet.
        </p>
      ) : (
        <>
          {showScopeMenu ? (
            <>
              <div className="github-scope-menu" role="group" aria-label="Filter activity by scope">
                {scopes.map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    className="github-scope-menu__item"
                    aria-pressed={scope.id === activeScope.id}
                    onClick={() => setScopeId(scope.id)}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
              <p className="github-scope-menu__note">
                This filter only changes the summary below — the contribution calendar above always
                shows all GitHub contributions.
              </p>
            </>
          ) : null}

          <div className="github-activity-overview__body">
            <div className="github-activity-overview__repositories">
              <GitHubContributedRepositories repositoryActivity={scopedRepositoryActivity} scope={activeScope} />
            </div>
            <div className="github-activity-overview__visual">
              <GitHubActivityBreakdownChart activity={scopedActivityTotals} />
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default GitHubActivityOverview;
