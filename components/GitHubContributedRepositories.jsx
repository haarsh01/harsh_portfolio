import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { buildRepositoryContributionSentence } from '#utils/githubActivity.js';

// Owner badge (shown only when a non-"all" scope is active, since "All
// activity" has no single owner to badge) + a dynamic contribution
// sentence + an inline expandable table — never a modal for something this
// small. Every name, count, and link comes straight from the (possibly
// scope-filtered) repositoryActivity list; nothing here is hand-typed.
const GitHubContributedRepositories = ({ repositoryActivity, scope }) => {
  const [expanded, setExpanded] = useState(false);
  const sentence = buildRepositoryContributionSentence(repositoryActivity);
  const ownerBadge = scope && scope.type !== 'all' ? scope : null;

  return (
    <div className="github-contributed-repositories">
      {ownerBadge ? (
        ownerBadge.url ? (
          <a
            href={ownerBadge.url}
            target="_blank"
            rel="noopener noreferrer"
            className="github-owner-badge"
            aria-label={`View ${ownerBadge.label} on GitHub`}
          >
            {ownerBadge.avatarUrl ? <img src={ownerBadge.avatarUrl} alt="" /> : null}
            <span>{ownerBadge.label}</span>
          </a>
        ) : (
          <span className="github-owner-badge" aria-label={ownerBadge.label}>
            {ownerBadge.avatarUrl ? <img src={ownerBadge.avatarUrl} alt="" /> : null}
            <span>{ownerBadge.label}</span>
          </span>
        )
      ) : null}

      <p className="github-contributed-repositories__sentence">{sentence}</p>

      {repositoryActivity.length > 0 ? (
        <>
          <button
            type="button"
            className="github-contributed-repositories__toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
            {expanded ? 'Hide contributed repositories' : 'View all contributed repositories'}
          </button>

          {expanded ? (
            <div className="github-contributed-repositories__table-wrap">
              <table className="github-contributed-repositories__table">
                <thead>
                  <tr>
                    <th scope="col">Repository</th>
                    <th scope="col">Commits</th>
                    <th scope="col">Pull requests</th>
                    <th scope="col">Issues</th>
                    <th scope="col">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {repositoryActivity.map((repo) => (
                    <tr key={repo.nameWithOwner}>
                      <td>
                        <a href={repo.url} target="_blank" rel="noopener noreferrer">
                          {repo.nameWithOwner} <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      </td>
                      <td>{repo.commitCount}</td>
                      <td>{repo.pullRequestCount}</td>
                      <td>{repo.issueCount}</td>
                      <td>{repo.codeReviewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default GitHubContributedRepositories;
