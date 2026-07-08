import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Activity, Search, Gauge, Clock, Globe2, AppWindow } from 'lucide-react';
import { WindowControls } from '#components';
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window.js';
import useSystemUIStore from '#store/systemUI.js';
import usePreferencesStore from '#store/preferences.js';
import useTourStore from '#store/tour.js';
import useTelemetryStore from '#store/telemetry.js';
import useWidgetsStore from '#store/widgets.js';
import { dockApps } from '#constants/index.js';
import ShareButton from '#components/ShareButton.jsx';

const FALLBACK_LABELS = {
  resume: 'Resume', txtfile: 'Text File', imgfile: 'Image', aboutPortfolio: 'About This Portfolio',
  timeMachine: 'Time Machine', activityMonitor: 'Activity Monitor',
};
const FALLBACK_ICONS = { resume: '/images/pdf.png', txtfile: '/images/txt.png', imgfile: '/images/image.png' };

function getWindowMeta(key, windowState) {
  const dockApp = dockApps.find((app) => app.id === key);
  if (dockApp) return { label: dockApp.name, icon: `/images/${dockApp.icon}` };
  const label = windowState?.data?.name ?? FALLBACK_LABELS[key] ?? key;
  return { label, icon: FALLBACK_ICONS[key] ?? null };
}

function getWindowDestinationSummary(key, windowState) {
  if (!windowState?.isOpen) return null;
  if (key === 'finder') return windowState.data?.name ? `Viewing: ${windowState.data.name}` : null;
  if (key === 'photos') return windowState.data?.section ? `Section: ${windowState.data.section}` : 'Library';
  if (key === 'timeMachine') return windowState.data?.eventId ? `Event: ${windowState.data.eventId}` : null;
  return null;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Minimal inline SVG sparkline — no charting dependency. `values` is a
// bounded, caller-managed history array; nothing here accumulates state.
function Sparkline({ values, max, height = 36, label }) {
  const width = 160;
  const safeMax = max || Math.max(1, ...values);
  const points = values.length > 1
    ? values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (Math.min(v, safeMax) / safeMax) * height}`).join(' ')
    : '';
  return (
    <svg
      className="am-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${label}: ${values.length ? values[values.length - 1] : 'no data yet'}, recent range 0 to ${safeMax}`}
    >
      {points ? <polyline points={points} fill="none" stroke="var(--accent-color)" strokeWidth="2" /> : null}
    </svg>
  );
}

function MetricRow({ label, value, tag }) {
  return (
    <div className="am-metric-row">
      <span className="am-metric-label">{label}</span>
      <span className="am-metric-value">
        {value}
        {tag ? <span className={clsx('am-metric-tag', `am-metric-tag--${tag.toLowerCase()}`)}>{tag}</span> : null}
      </span>
    </div>
  );
}

const HISTORY_LENGTH = 30;

function ApplicationsTab() {
  const { windows, focusWindow, restoreWindow, minimizeWindow, closeWindow, lastFocusedAt } = useWindowStore();
  const [filter, setFilter] = useState('');
  const [rects, setRects] = useState({});

  useEffect(() => {
    const measure = () => {
      const next = {};
      Object.keys(windows).forEach((key) => {
        const el = document.getElementById(key);
        if (el && windows[key].isOpen && !windows[key].isMinimized) {
          const rect = el.getBoundingClientRect();
          next[key] = { width: Math.round(rect.width), height: Math.round(rect.height), x: Math.round(rect.left), y: Math.round(rect.top) };
        }
      });
      setRects(next);
    };
    measure();
    const interval = window.setInterval(measure, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxOpenZIndex = Math.max(0, ...Object.values(windows).filter((w) => w.isOpen && !w.isMinimized).map((w) => w.zIndex));

  const rows = useMemo(() => Object.keys(windows)
    .map((key) => ({ key, win: windows[key], meta: getWindowMeta(key, windows[key]) }))
    .filter(({ meta }) => meta.label.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => Number(b.win.isOpen) - Number(a.win.isOpen) || a.meta.label.localeCompare(b.meta.label)),
  [windows, filter]);

  const handleClose = (key) => {
    if (key === 'activityMonitor') {
      const confirmed = window.confirm('Close Activity Monitor?');
      if (!confirmed) return;
    }
    closeWindow(key);
  };

  return (
    <div className="am-applications">
      <div className="am-filter">
        <Search size={13} aria-hidden="true" />
        <input
          type="text"
          placeholder="Filter applications…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter applications"
        />
      </div>

      <div className="am-table-scroll">
        <table className="am-table">
          <thead>
            <tr>
              <th scope="col">Application</th>
              <th scope="col">State</th>
              <th scope="col">Focused</th>
              <th scope="col">Z-Index</th>
              <th scope="col">Size</th>
              <th scope="col">Position</th>
              <th scope="col">Last Focused</th>
              <th scope="col">Destination</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, win, meta }) => {
              const rect = rects[key];
              const isFocused = win.isOpen && !win.isMinimized && win.zIndex === maxOpenZIndex && maxOpenZIndex > 0;
              const state = !win.isOpen ? 'Closed' : win.isMinimized ? 'Minimized' : win.isMaximized ? 'Maximized' : 'Open';
              const destination = getWindowDestinationSummary(key, win);
              return (
                <tr key={key} className={clsx(!win.isOpen && 'am-row-closed')}>
                  <td>
                    <span className="am-app-cell">
                      {meta.icon ? <img src={meta.icon} alt="" /> : <AppWindow size={16} aria-hidden="true" />}
                      {meta.label}
                    </span>
                  </td>
                  <td><span className={clsx('am-state-badge', `am-state-badge--${state.toLowerCase()}`)}>{state}</span></td>
                  <td>{isFocused ? 'Yes' : 'No'}</td>
                  <td>{win.isOpen ? win.zIndex : '—'}</td>
                  <td>{rect ? `${rect.width} × ${rect.height}` : '—'}</td>
                  <td>{rect ? `${rect.x}, ${rect.y}` : '—'}</td>
                  <td>{formatRelativeTime(lastFocusedAt[key])}</td>
                  <td>{destination ?? '—'}</td>
                  <td className="am-actions-cell">
                    {win.isOpen && win.isMinimized ? (
                      <button type="button" onClick={() => restoreWindow(key)}>Restore</button>
                    ) : win.isOpen ? (
                      <>
                        <button type="button" onClick={() => focusWindow(key)}>Focus</button>
                        <button type="button" onClick={() => minimizeWindow(key)}>Minimize</button>
                      </>
                    ) : null}
                    {win.isOpen ? <button type="button" onClick={() => handleClose(key)}>Close</button> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function usePerformanceSampling(isVisible) {
  const [fpsHistory, setFpsHistory] = useState([]);
  const [domNodeCount, setDomNodeCount] = useState(null);
  const [longTaskCount, setLongTaskCount] = useState(0);
  // This needs to be state, not a ref: its value is read during render
  // (returned below) and a fallback change (in the catch block) should
  // trigger a re-render — both are things a ref can't safely do.
  const [longTaskSupported, setLongTaskSupported] = useState(
    () => typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask'),
  );

  useEffect(() => {
    if (!isVisible) return undefined;
    let rafId = null;
    let frameCount = 0;
    let windowStart = performance.now();

    const tick = (now) => {
      frameCount += 1;
      const elapsed = now - windowStart;
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        setFpsHistory((prev) => [...prev, fps].slice(-HISTORY_LENGTH));
        frameCount = 0;
        windowStart = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const handleVisibility = () => {
      if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = null; }
      else if (!document.hidden && !rafId) { windowStart = performance.now(); frameCount = 0; rafId = requestAnimationFrame(tick); }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return undefined;
    const measure = () => setDomNodeCount(document.getElementsByTagName('*').length);
    measure();
    const interval = window.setInterval(measure, 2000);
    return () => window.clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || !longTaskSupported) return undefined;
    let observer;
    const markUnsupported = () => setLongTaskSupported(false);
    try {
      observer = new PerformanceObserver((list) => {
        setLongTaskCount((count) => count + list.getEntries().length);
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      markUnsupported();
    }
    return () => observer?.disconnect();
  }, [isVisible, longTaskSupported]);

  return { fpsHistory, domNodeCount, longTaskCount, longTaskSupported };
}

function PerformanceTab({ isVisible }) {
  const { fpsHistory, domNodeCount, longTaskCount, longTaskSupported } = usePerformanceSampling(isVisible);
  const currentFps = fpsHistory[fpsHistory.length - 1];
  const memory = typeof performance.memory !== 'undefined' ? performance.memory : null;
  const navEntry = performance.getEntriesByType?.('navigation')?.[0] ?? null;
  const resourceCount = performance.getEntriesByType?.('resource')?.length ?? null;

  return (
    <div className="am-performance">
      <div className="am-chart-block">
        <p className="am-chart-title">Estimated FPS (rolling)</p>
        <Sparkline values={fpsHistory} max={60} label="Frames per second" />
        <p className="am-chart-caption">{currentFps != null ? `${currentFps} fps` : 'Sampling…'} <span className="am-tag am-tag--estimated">Estimated</span></p>
      </div>

      <MetricRow label="Viewport" value={`${window.innerWidth} × ${window.innerHeight}`} tag="Real" />
      <MetricRow label="Device Pixel Ratio" value={window.devicePixelRatio} tag="Real" />
      <MetricRow label="DOM Node Count" value={domNodeCount ?? '—'} tag="Real" />
      <MetricRow label="Resource Count" value={resourceCount ?? '—'} tag="Real" />
      <MetricRow
        label="Page Load Time"
        value={navEntry ? `${Math.round(navEntry.duration)} ms` : 'Unsupported'}
        tag={navEntry ? 'Real' : 'Unsupported'}
      />
      <MetricRow
        label="Long Tasks (≥50ms)"
        value={longTaskSupported ? longTaskCount : 'Unsupported'}
        tag={longTaskSupported ? 'Real' : 'Unsupported'}
      />
      <MetricRow
        label="Estimated JS Heap Usage"
        value={memory ? `${Math.round(memory.usedJSHeapSize / 1048576)} MB` : 'Unsupported in this browser'}
        tag={memory ? 'Estimated' : 'Unsupported'}
      />
      <p className="am-footnote">Memory reflects this tab&apos;s JS heap only — not total system RAM.</p>
    </div>
  );
}

function SessionTab({ isVisible }) {
  const { sessionStart, counters } = useTelemetryStore();
  const [now, setNow] = useState(() => Date.now());
  const { windows } = useWindowStore();
  const tour = useTourStore();
  const [windowCountHistory, setWindowCountHistory] = useState([]);

  useEffect(() => {
    if (!isVisible) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isVisible]);

  const openCount = Object.values(windows).filter((w) => w.isOpen).length;

  useEffect(() => {
    if (!isVisible) return undefined;
    const interval = window.setInterval(() => {
      setWindowCountHistory((prev) => [...prev, openCount].slice(-HISTORY_LENGTH));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isVisible, openCount]);

  const activeAppKey = Object.entries(windows)
    .filter(([, w]) => w.isOpen && !w.isMinimized)
    .sort((a, b) => b[1].zIndex - a[1].zIndex)[0]?.[0];
  const activeAppLabel = activeAppKey ? getWindowMeta(activeAppKey, windows[activeAppKey]).label : 'None';

  const counterEntries = [
    { label: 'Apps Opened', value: counters.appsOpened },
    { label: 'Focus Changes', value: counters.focusChanges },
    { label: 'Quick Look Opens', value: counters.quickLookOpens },
    { label: 'Mission Control Opens', value: counters.missionControlOpens },
    { label: 'Spotlight Opens', value: counters.spotlightOpens },
    { label: 'Spotlight Searches', value: counters.spotlightSearches },
    { label: 'Tour Steps Visited', value: counters.tourStepsVisited },
    { label: 'Links Shared', value: counters.linksShared },
  ];
  const maxCounter = Math.max(1, ...counterEntries.map((c) => c.value));

  return (
    <div className="am-session">
      <p className="am-session-label">Current local portfolio session — kept in this browser tab only, never transmitted.</p>

      <MetricRow label="Session Duration" value={formatDuration(now - sessionStart)} tag="Real" />
      <MetricRow label="Open Windows" value={openCount} tag="Real" />
      <MetricRow label="Active Application" value={activeAppLabel} tag="Real" />
      <MetricRow
        label="Guided Tour Progress"
        value={tour.isActive ? `Step ${tour.currentStep + 1} of ${tour.steps.length}` : 'Not started'}
        tag="Real"
      />

      <div className="am-chart-block">
        <p className="am-chart-title">Open Windows (recent)</p>
        <Sparkline values={windowCountHistory} max={Math.max(4, openCount)} label="Open window count" />
      </div>

      <div className="am-chart-block">
        <p className="am-chart-title">Interaction Counts</p>
        <ul className="am-bar-list">
          {counterEntries.map((entry) => (
            <li key={entry.label}>
              <span className="am-bar-label">{entry.label}</span>
              <span className="am-bar-track"><span className="am-bar-fill" style={{ width: `${(entry.value / maxCounter) * 100}%` }} /></span>
              <span className="am-bar-value">{entry.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EnvironmentTab() {
  const preferences = usePreferencesStore();
  const [online, setOnline] = useState(navigator.onLine);
  const [visibilityState, setVisibilityState] = useState(document.visibilityState);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleVisibility = () => setVisibilityState(document.visibilityState);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const reduceTransparencySupported = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-transparency: reduce)').media !== 'not all';
  const osReduceTransparency = reduceTransparencySupported && window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Coarse, non-identifying engine label only — never the raw user-agent
  // string, and never persisted anywhere.
  const engine = (() => {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Chromium (Edge)';
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chromium (Chrome)';
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'WebKit (Safari)';
    if (/Firefox\//.test(ua)) return 'Gecko (Firefox)';
    return 'Unknown';
  })();

  return (
    <div className="am-environment">
      <MetricRow label="Viewport" value={`${window.innerWidth} × ${window.innerHeight}`} tag="Real" />
      <MetricRow label="Pixel Ratio" value={window.devicePixelRatio} tag="Real" />
      <MetricRow label="Color Scheme" value={preferences.appearance.mode === 'auto' ? `Auto (${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'})` : preferences.appearance.mode} tag="Real" />
      <MetricRow label="Reduced Motion" value={preferences.motionOSReduced ? 'On (system)' : 'Off'} tag="Real" />
      <MetricRow
        label="Reduced Transparency"
        value={reduceTransparencySupported ? (osReduceTransparency ? 'On (system)' : 'Off') : 'Unsupported'}
        tag={reduceTransparencySupported ? 'Real' : 'Unsupported'}
      />
      <MetricRow label="Online" value={online ? 'Online' : 'Offline'} tag="Real" />
      <MetricRow label="Touch Capable" value={touchCapable ? 'Yes' : 'No'} tag="Real" />
      <MetricRow label="Language" value={navigator.language} tag="Real" />
      <MetricRow label="Time Zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} tag="Real" />
      <MetricRow label="Browser Engine" value={engine} tag="Real" />
      <MetricRow label="Page Visibility" value={visibilityState} tag="Real" />
      <p className="am-footnote">Shown for transparency only — never combined into an identity or stored.</p>
    </div>
  );
}

const TABS = [
  { id: 'applications', label: 'Applications', icon: Activity },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'session', label: 'Session', icon: Clock },
  { id: 'environment', label: 'Environment', icon: Globe2 },
];

const ActivityMonitor = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const isOpen = useWindowStore((state) => state.windows.activityMonitor.isOpen);
  const isMinimized = useWindowStore((state) => state.windows.activityMonitor.isMinimized);
  const activeOverlay = useSystemUIStore((state) => state.activeOverlay);
  const isEditingWidgets = useWidgetsStore((state) => state.isEditMode);
  const isVisible = isOpen && !isMinimized && activeTab === 'performance' && !activeOverlay && !isEditingWidgets;

  return (
    <>
      <div id="window-header">
        <WindowControls target="activityMonitor" />
        <Activity size={14} className="icon" aria-hidden="true" />
        <h2 className="flex-1 text-center font-bold text-sm">Activity Monitor</h2>
        <ShareButton destination={{ app: 'activity-monitor' }} className="icon" label="Share Activity Monitor" />
      </div>

      <div className="am-body">
        <div role="tablist" aria-label="Activity Monitor sections" className="am-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`am-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`am-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={clsx('am-tab', activeTab === tab.id && 'active')}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={13} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`am-panel-${activeTab}`} aria-labelledby={`am-tab-${activeTab}`} className="am-panel">
          {activeTab === 'applications' ? <ApplicationsTab /> : null}
          {activeTab === 'performance' ? <PerformanceTab isVisible={isVisible} /> : null}
          {activeTab === 'session' ? <SessionTab isVisible={isOpen && !isMinimized} /> : null}
          {activeTab === 'environment' ? <EnvironmentTab /> : null}
        </div>
      </div>
    </>
  );
};

const ActivityMonitorWindow = WindowWarpper(ActivityMonitor, 'activityMonitor');
export default ActivityMonitorWindow;
