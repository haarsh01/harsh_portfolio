import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ExternalLink, Star, GitFork, Search as SearchIcon, Archive, GitBranch,
} from 'lucide-react';
import { GITHUB_PROFILE } from '#constants/github.js';
import { searchRepositories, sortRepositories, filterRepositories } from '#utils/githubData.js';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'pushed', label: 'Recently pushed' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'stars', label: 'Most starred' },
  { value: 'name', label: 'Name' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'sources', label: 'Sources' },
  { value: 'forks', label: 'Forks' },
  { value: 'archived', label: 'Archived' },
];

// No `dayjs.extend(relativeTime)` anywhere else in this project — a small
// manual diff avoids introducing that plugin for one label.
function formatRelative(dateStr) {
  const parsed = dayjs(dateStr);
  if (!dateStr || !parsed.isValid()) return null;
  const now = dayjs();
  const days = now.diff(parsed, 'day');
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = now.diff(parsed, 'month');
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = now.diff(parsed, 'year');
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function RepositoryCard({ repo }) {
  const pushedLabel = formatRelative(repo.pushedAt);

  return (
    <li className="github-repository">
      <div className="github-repository__header">
        <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="github-repository__name">
          {repo.name}
        </a>
        {repo.isArchived ? (
          <span className="github-repository__badge">
            <Archive size={10} aria-hidden="true" /> Archived
          </span>
        ) : null}
        {repo.isFork ? (
          <span className="github-repository__badge">
            <GitBranch size={10} aria-hidden="true" /> Fork
          </span>
        ) : null}
      </div>

      {repo.description ? <p className="github-repository__description">{repo.description}</p> : null}

      {repo.topics.length ? (
        <div className="github-repository__topics">
          {repo.topics.map((topic) => <span key={topic} className="github-topic">{topic}</span>)}
        </div>
      ) : null}

      <div className="github-repository__metadata">
        {repo.primaryLanguage ? <span className="github-language">{repo.primaryLanguage}</span> : null}
        <span className="github-repository__stat"><Star size={12} aria-hidden="true" /> {repo.stargazersCount}</span>
        <span className="github-repository__stat"><GitFork size={12} aria-hidden="true" /> {repo.forksCount}</span>
        {pushedLabel ? <span className="github-repository__stat">Pushed {pushedLabel}</span> : null}
        {repo.homepage ? (
          <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="github-repository__stat">
            Live <ExternalLink size={11} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

const GitHubRepositoryList = ({ repositories }) => {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('pushed');
  const [filterKey, setFilterKey] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [syncedFilters, setSyncedFilters] = useState({ query, sortKey, filterKey });

  // Resets pagination whenever search/sort/filter changes — adjusted
  // during render rather than in an effect, since this is purely
  // "reset state in response to a changed value."
  if (query !== syncedFilters.query || sortKey !== syncedFilters.sortKey || filterKey !== syncedFilters.filterKey) {
    setSyncedFilters({ query, sortKey, filterKey });
    setVisibleCount(PAGE_SIZE);
  }

  const visibleRepos = useMemo(() => {
    const filtered = filterRepositories(repositories, filterKey);
    const searched = searchRepositories(filtered, query);
    return sortRepositories(searched, sortKey);
  }, [repositories, query, sortKey, filterKey]);

  const shown = visibleRepos.slice(0, visibleCount);
  const hasMore = visibleCount < visibleRepos.length;

  return (
    <div className="github-repositories">
      <div className="github-repository-controls">
        <label className="github-repository-search">
          <SearchIcon size={14} aria-hidden="true" />
          <span className="sr-only">Search repositories by name, description, language, or topic</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search repositories…"
          />
        </label>

        <label className="github-repository-select">
          <span className="sr-only">Sort repositories</span>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>

        <div className="github-repository-filters" role="group" aria-label="Filter repositories">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="github-repository-filter"
              aria-pressed={filterKey === opt.value}
              onClick={() => setFilterKey(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <ul className="github-repository-list">
          {shown.map((repo) => <RepositoryCard key={repo.fullName} repo={repo} />)}
        </ul>
      ) : (
        <div className="github-empty">
          <p>No repositories match {query ? `“${query}”` : 'this filter'}.</p>
        </div>
      )}

      <div className="github-repository-footer">
        {hasMore ? (
          <button type="button" className="github-show-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            Show more
          </button>
        ) : null}
        <a href={GITHUB_PROFILE.repositoriesUrl} target="_blank" rel="noopener noreferrer" className="github-view-all">
          View all repositories on GitHub <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
};

export default GitHubRepositoryList;
