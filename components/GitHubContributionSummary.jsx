import React from 'react';
import dayjs from 'dayjs';
import { computeContributionSummary } from '#utils/githubContributions.js';
import { formatContributionHeading } from '#utils/githubActivity.js';

// A compact, honest summary derived entirely from the real day-level data
// — never a separate hardcoded statistic. Distinguishes "not yet synced"
// (an empty calendar because the workflow hasn't populated it yet) from
// genuine zero activity, which would instead show real zeros below.
const GitHubContributionSummary = ({
  days, totalContributions, totalCommitContributions, synced, from, to,
}) => {
  if (!synced) {
    return (
      <p className="github-summary github-summary--pending" role="status">
        GitHub contribution activity has not been synchronized yet. It refreshes automatically every hour —
        check back soon, or view the live profile above.
      </p>
    );
  }

  const summary = computeContributionSummary(days, { totalContributions });
  const busiestLabel = summary.busiestDay
    ? `${summary.busiestDay.count} on ${dayjs(summary.busiestDay.date).format('MMM D')}`
    : '—';

  return (
    <div className="github-summary">
      <p className="github-contribution-heading">{formatContributionHeading(summary.totalContributions, from, to)}</p>
      <p className="github-summary__sentence">
        {summary.activeDays} active day{summary.activeDays === 1 ? '' : 's'} in the period
      </p>
      <dl className="github-summary__items">
        <div className="github-summary__item">
          <dt>Current streak</dt>
          <dd>{summary.currentStreak} day{summary.currentStreak === 1 ? '' : 's'}</dd>
        </div>
        <div className="github-summary__item">
          <dt>Longest streak</dt>
          <dd>{summary.longestStreak} day{summary.longestStreak === 1 ? '' : 's'}</dd>
        </div>
        <div className="github-summary__item">
          <dt>Busiest day</dt>
          <dd>{busiestLabel}</dd>
        </div>
        {Number.isFinite(totalCommitContributions) ? (
          <div className="github-summary__item">
            <dt>Commit contributions</dt>
            <dd>{totalCommitContributions}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
};

export default GitHubContributionSummary;
