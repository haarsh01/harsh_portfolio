import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AppWindow, Compass, Activity } from 'lucide-react';
import { WindowControls } from '#components';
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window.js';
import useTourStore from '#store/tour.js';
import { getRegisteredApplications, getDesktopItems, groupPortfolioItems, getTechStack } from '#utils/portfolioItems.js';
import ShareButton from '#components/ShareButton.jsx';
import pkg from '../../package.json';

const cleanVersion = (v) => v?.replace(/^[\^~]/, '') ?? null;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
  { id: 'technology', label: 'Technology' },
  { id: 'storage', label: 'Storage' },
  { id: 'credits', label: 'Credits' },
];

const CATEGORY_COLORS = {
  Projects: '#3b82f6',
  Documents: '#f59e0b',
  Photography: '#22c55e',
  Research: '#a855f7',
  Music: '#ec4899',
  Contact: '#06b6d4',
};

const ENGINEERING_HIGHLIGHTS = [
  {
    title: 'One shared window manager',
    detail: 'Every app — this one included — opens, closes, focuses, drags, resizes, minimizes, and maximizes through the same centralized window lifecycle, not a one-off per app.',
  },
  {
    title: 'Mission Control',
    detail: 'Shows a live overview of whatever windows are actually open right now, not a static screenshot standing in for the feature.',
  },
  {
    title: 'Control Center preferences',
    detail: 'Appearance, wallpaper, and transparency choices are saved and restored across visits, not reset on every reload.',
  },
  {
    title: 'Handoff & shareable links',
    detail: 'A share action can hand off the exact window and section you’re looking at, so a link opens back into that same state.',
  },
  {
    title: 'Accessible Spotlight search',
    detail: 'A single keyboard-driven index searches across every app, project, and action, ranked and reachable without a mouse.',
  },
  {
    title: 'Dynamic wallpaper',
    detail: 'The desktop background shifts with the time of day rather than staying static.',
  },
  {
    title: 'Responsive architecture',
    detail: 'The same window registry and content model power a full desktop shell and a compact mobile app grid — no separate mobile site.',
  },
  {
    title: 'Honest live data',
    detail: 'Sections backed by real external data (like GitHub activity or Letterboxd) show it as it actually is — including saying so plainly when something is sparse or unsynced, instead of filling the space.',
  },
];

const OverviewTab = ({ appCount, onStartTour, tourActive, onOpenActivityMonitor }) => (
  <div className="about-overview">
    <div className="about-overview-hero">
      <img src="/images/finder.png" alt="" className="about-overview-icon" />
      <div>
        <h3>About This Portfolio</h3>
        <p className="about-overview-product">HarshOS — a portfolio interface inspired by desktop operating systems, not a real one</p>
      </div>
    </div>

    <p className="about-overview-description">
      An interactive portfolio for exploring Harsh Kaushik&apos;s projects, skills, and experience through a
      simulated desktop — built as a real application with its own window manager, preferences, search, and
      responsive layout, not a static template.
    </p>

    <dl className="about-overview-facts">
      <div><dt>Developer</dt><dd>Harsh Kaushik</dd></div>
      <div><dt>Portfolio Version</dt><dd>{pkg.version}</dd></div>
      <div><dt>Framework</dt><dd>React {cleanVersion(pkg.dependencies.react)} + Vite {cleanVersion(pkg.devDependencies.vite)}</dd></div>
      <div><dt>Registered Applications</dt><dd>{appCount}</dd></div>
      <div><dt>Build Mode</dt><dd className="capitalize">{import.meta.env.MODE}</dd></div>
    </dl>

    <div className="about-overview-engineering">
      <h4>What&apos;s actually engineered here</h4>
      <ul>
        {ENGINEERING_HIGHLIGHTS.map((item) => (
          <li key={item.title}>
            <p className="about-overview-engineering-title">{item.title}</p>
            <p className="about-overview-engineering-detail">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>

    <div className="about-overview-buttons">
      <button type="button" className="about-tour-button" disabled={tourActive} onClick={onStartTour}>
        <Compass size={15} aria-hidden="true" />
        {tourActive ? 'Tour in progress…' : 'Start Portfolio Tour'}
      </button>
      <button type="button" className="about-tour-button about-tour-button--secondary" onClick={onOpenActivityMonitor}>
        <Activity size={15} aria-hidden="true" />
        Open Activity Monitor
      </button>
    </div>
  </div>
);

const ApplicationsTab = () => {
  const { windows, openWindow } = useWindowStore();
  const apps = useMemo(() => getRegisteredApplications(), []);

  return (
    <ul className="about-app-list">
      {apps.map((app) => {
        const state = windows[app.key];
        const status = state?.isOpen ? (state.isMinimized ? 'Minimized' : 'Open') : 'Closed';
        return (
          <li key={app.key} className="about-app-item">
            {app.icon ? <img src={app.icon} alt="" /> : <AppWindow size={22} aria-hidden="true" className="about-app-fallback-icon" />}
            <div className="about-app-info">
              <p>{app.name}</p>
              <span className={clsx('about-app-status', status === 'Open' && 'is-open')}>{status}</span>
            </div>
            <button type="button" className="about-app-action" onClick={() => openWindow(app.key)}>
              {state?.isOpen ? 'Focus' : 'Open'}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const TechnologyTab = () => {
  const coreStack = [
    { name: 'React', version: cleanVersion(pkg.dependencies.react) },
    { name: 'Vite', version: cleanVersion(pkg.devDependencies.vite) },
    { name: 'Tailwind CSS', version: cleanVersion(pkg.dependencies.tailwindcss) },
    { name: 'Zustand', version: cleanVersion(pkg.dependencies.zustand) },
    { name: 'GSAP', version: cleanVersion(pkg.dependencies.gsap) },
    { name: 'Immer', version: cleanVersion(pkg.dependencies.immer) },
  ];
  const skillStack = getTechStack();

  return (
    <div className="about-tech">
      <h4>Core Stack</h4>
      <ul className="about-tech-core">
        {coreStack.map((tech) => (
          <li key={tech.name}><span>{tech.name}</span><span>{tech.version}</span></li>
        ))}
      </ul>

      <h4>Skills</h4>
      <ul className="about-tech-skills">
        {skillStack.map(({ category, items }) => (
          <li key={category}>
            <p>{category}</p>
            <div className="about-tech-pills">
              {items.map((item) => <span key={item} className="about-tech-pill">{item}</span>)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const StorageTab = () => {
  const items = useMemo(() => getDesktopItems(), []);
  const groups = useMemo(() => groupPortfolioItems(items, 'category'), [items]);
  const total = items.length || 1;

  return (
    <div className="about-storage">
      <p className="about-storage-disclaimer">Creative portfolio content visualization — not real disk usage</p>

      <div className="about-storage-bar">
        {groups.map((group) => (
          <span
            key={group.key}
            style={{ width: `${(group.items.length / total) * 100}%`, background: CATEGORY_COLORS[group.key] ?? '#9ca3af' }}
          />
        ))}
      </div>

      <ul className="about-storage-legend">
        {groups.map((group) => (
          <li key={group.key}>
            <span className="about-storage-dot" style={{ background: CATEGORY_COLORS[group.key] ?? '#9ca3af' }} />
            <span className="about-storage-legend-label">{group.label}</span>
            <span className="about-storage-legend-count">{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const CreditsTab = () => (
  <div className="about-credits">
    <p className="about-credits-line"><strong>Designed and developed by</strong> Harsh Kaushik</p>

    <div className="about-credits-section">
      <h4>Technologies used</h4>
      <p>React, Vite, Tailwind CSS, Zustand, Immer, GSAP, react-pdf, react-tooltip, lucide-react, dayjs, clsx</p>
    </div>

    <div className="about-credits-section">
      <h4>Acknowledgements</h4>
      <ul>
        <li>Georama &amp; Roboto Mono typefaces via Google Fonts</li>
        <li>Playlist playback powered by Spotify</li>
      </ul>
    </div>
  </div>
);

const AboutPortfolio = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const appCount = useMemo(() => getRegisteredApplications().length, []);
  const { isActive: tourActive, startTour } = useTourStore();
  const { openWindow } = useWindowStore();

  return (
    <>
      <div id="window-header">
        <WindowControls target="aboutPortfolio" />
        <h2>About This Portfolio</h2>
        <ShareButton destination={{ app: 'about-portfolio' }} className="icon" label="Share About This Portfolio" />
      </div>

      <div className="about-portfolio-body">
        <div role="tablist" aria-label="About This Portfolio sections" className="about-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`about-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`about-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={clsx('about-tab', activeTab === tab.id && 'active')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`about-panel-${activeTab}`}
          aria-labelledby={`about-tab-${activeTab}`}
          className="about-panel"
        >
          {activeTab === 'overview' ? (
            <OverviewTab
              appCount={appCount}
              tourActive={tourActive}
              onStartTour={startTour}
              onOpenActivityMonitor={() => openWindow('activityMonitor')}
            />
          ) : null}
          {activeTab === 'applications' ? <ApplicationsTab /> : null}
          {activeTab === 'technology' ? <TechnologyTab /> : null}
          {activeTab === 'storage' ? <StorageTab /> : null}
          {activeTab === 'credits' ? <CreditsTab /> : null}
        </div>
      </div>
    </>
  );
};

const AboutPortfolioWindow = WindowWarpper(AboutPortfolio, 'aboutPortfolio');
export default AboutPortfolioWindow;
