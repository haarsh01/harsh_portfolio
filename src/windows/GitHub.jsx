import React, { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { WindowControls } from '#components';
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import ShareButton from '#components/ShareButton.jsx';
import GitHubProfileHeader from '#components/GitHubProfileHeader.jsx';
import GitHubRepositoryList from '#components/GitHubRepositoryList.jsx';
import { useGitHubData } from '#hooks/useGitHubData.js';
import { GITHUB_PROFILE } from '#constants/github.js';
import useWindowStore from '#store/window.js';

// Anchors a Spotlight section deep-link (`openWindow("github", { section })`)
// to the heading it should scroll into view — this page is one continuous
// scroll (not tabs like Letterboxd), so "section-targeted" here means
// scrolling within `.github-content`, not swapping panels. Contribution
// activity/Activity overview were removed (content/privacy cleanup) —
// their anchors are gone too, since nothing on the page has those
// headings anymore.
const SECTION_ANCHOR_IDS = {
  profile: 'github-profile-heading',
  repositories: 'github-repos-heading',
};

const GitHubApp = () => {
  const {
    status, profile, repositories,
    generatedAt, isRefreshing, refresh,
  } = useGitHubData();
  const { windows } = useWindowStore();
  const requestedSection = windows.github?.data?.section;
  const contentRef = useRef(null);

  // Scrolls to *and* focuses the target heading — scrolling alone leaves a
  // screen-reader user's focus wherever it already was, so arriving via
  // Spotlight would visually jump the page without ever announcing where.
  // Every heading below carries `tabIndex={-1}` so it's programmatically
  // focusable without joining the normal Tab order.
  useEffect(() => {
    if (status !== 'ready') return;
    const anchorId = SECTION_ANCHOR_IDS[requestedSection];
    if (!anchorId) return;
    const target = document.getElementById(anchorId);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }, [requestedSection, status]);

  return (
    <>
      <div id="window-header">
        <WindowControls target="github" />
        <h2 className="flex-1 text-center font-bold text-sm">GitHub — @{GITHUB_PROFILE.username}</h2>
        <ShareButton destination={{ app: 'github' }} className="icon" label="Share GitHub" />
      </div>

      <div className="github-app">
        <div className="github-content" ref={contentRef}>
          {status === 'loading' ? (
            <div className="github-skeleton">
              <p className="sr-only" role="status">Fetching GitHub profile and repositories…</p>
              <div className="github-skeleton__row github-skeleton__row--wide" aria-hidden="true" />
              <div className="github-skeleton__row" aria-hidden="true" />
              <div className="github-skeleton__block" aria-hidden="true" />
            </div>
          ) : status === 'error' ? (
            <div className="github-error">
              <AlertCircle size={22} aria-hidden="true" />
              <p role="status">GitHub data is temporarily unavailable.</p>
              <a href={GITHUB_PROFILE.profileUrl} target="_blank" rel="noopener noreferrer" className="github-profile__view-btn">
                View GitHub Profile
              </a>
            </div>
          ) : (
            <>
              <GitHubProfileHeader
                profile={profile}
                generatedAt={generatedAt}
                isRefreshing={isRefreshing}
                onRefresh={refresh}
              />

              <section className="github-section" aria-labelledby="github-repos-heading">
                <header className="github-section__header">
                  <h2 id="github-repos-heading" tabIndex={-1}>Public repositories</h2>
                </header>
                <GitHubRepositoryList repositories={repositories} />
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
};

const GitHubWindow = WindowWrapper(GitHubApp, 'github');
export default GitHubWindow;
