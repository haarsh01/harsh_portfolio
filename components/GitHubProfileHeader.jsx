import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { GITHUB_PROFILE, GITHUB_DATA_STALE_AFTER_MS } from '#constants/github.js';
import Button from '#components/Button.jsx';

// Honest freshness wording — this is periodically synced data, never
// called "real-time," and a stale (but still valid) snapshot is disclosed
// rather than silently presented as current.
function formatUpdatedStatus(generatedAt) {
  if (!generatedAt) return null;
  const parsed = dayjs(generatedAt);
  if (!parsed.isValid()) return null;
  const diffHours = dayjs().diff(parsed, 'hour');
  if (diffHours < 1) return 'Updated less than an hour ago';
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `Last refreshed ${parsed.format('MMMM D, YYYY')}`;
}

const GitHubProfileHeader = ({ profile, generatedAt, isRefreshing, onRefresh }) => {
  const avatarSrc = profile?.avatarUrl || GITHUB_PROFILE.icon;
  const updatedStatus = formatUpdatedStatus(generatedAt);

  // `Date.now()` is impure to call during render, so the staleness check
  // reads the clock inside an effect (a genuine external system) and
  // mirrors it into state — rechecked periodically since staleness can
  // become true purely from time passing, with no other prop change.
  const [isStale, setIsStale] = useState(false);

  // No generatedAt at all means trivially "not stale" — plain derived
  // state, computed during render rather than in an effect.
  if (!generatedAt && isStale) setIsStale(false);

  useEffect(() => {
    if (!generatedAt) return undefined;
    const generatedMs = new Date(generatedAt).getTime();
    const recheck = () => setIsStale(Date.now() - generatedMs > GITHUB_DATA_STALE_AFTER_MS);
    recheck();
    const intervalId = window.setInterval(recheck, 30 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [generatedAt]);

  return (
    <div className="github-profile">
      <img
        src={avatarSrc}
        alt={`${GITHUB_PROFILE.displayName}'s GitHub avatar`}
        className="github-profile__avatar"
        loading="eager"
        draggable={false}
        onError={(event) => {
          if (event.currentTarget.dataset.fallbackApplied) return;
          event.currentTarget.dataset.fallbackApplied = 'true';
          event.currentTarget.src = GITHUB_PROFILE.icon;
        }}
      />

      <div className="github-profile__identity">
        <h1 id="github-profile-heading" tabIndex={-1}>{GITHUB_PROFILE.displayName}</h1>
        <p className="github-profile__username">@{GITHUB_PROFILE.username}</p>
        {profile?.bio ? <p className="github-profile__bio">{profile.bio}</p> : null}
        {profile?.location ? <p className="github-profile__location">{profile.location}</p> : null}
      </div>

      <div className="github-profile__actions">
        <Button href={GITHUB_PROFILE.profileUrl} variant="primary" className="github-profile__view-btn">
          View GitHub Profile <ExternalLink size={13} aria-hidden="true" />
        </Button>
        <Button variant="secondary" className="github-profile__refresh-btn" icon={RefreshCw} onClick={onRefresh} loading={isRefreshing}>
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <p className="github-status" role="status">
        {updatedStatus ?? 'Synced from GitHub'}
        {isStale ? ' — GitHub data may be temporarily out of date.' : ''}
      </p>
    </div>
  );
};

export default GitHubProfileHeader;
