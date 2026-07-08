import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import useWindowStore from '#store/window.js';
import useSystemUIStore from '#store/systemUI.js';
import { isEditableTarget } from '#utils/keyboard.js';
import { dockApps } from '#constants';

const FALLBACK_LABELS = { resume: 'Resume', txtfile: 'Text File', imgfile: 'Image' };
const FALLBACK_ICONS = { resume: '/images/pdf.png', txtfile: '/images/txt.png', imgfile: '/images/image.png' };

const getAppMeta = (key, windowState) => {
  const dockApp = dockApps.find((app) => app.id === key);
  if (dockApp) return { label: dockApp.name, icon: `/images/${dockApp.icon}` };
  const label = windowState?.data?.name ?? FALLBACK_LABELS[key] ?? key;
  return { label, icon: FALLBACK_ICONS[key] ?? '/images/finder.png' };
};

// Ordered most-recently-focused first (highest zIndex), matching real
// Cmd-Tab — so the initial Tab-forward selection lands on the app you were
// using just before the current one, not an arbitrary declaration order.
const getOpenApps = (windows) =>
  Object.keys(windows)
    .filter((key) => windows[key].isOpen)
    .map((key) => {
      const meta = getAppMeta(key, windows[key]);
      return { key, label: meta.label, icon: meta.icon, isMinimized: windows[key].isMinimized, zIndex: windows[key].zIndex };
    })
    .sort((a, b) => b.zIndex - a.zIndex);

const AppSwitcher = () => {
  const { activeOverlay } = useSystemUIStore();
  const isOpen = activeOverlay === 'app-switcher';
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Mirrors appsRef into real state purely so render can read it — the
  // ref itself stays for the keyboard handler below, which intentionally
  // reads via .getState()/refs so its listener never needs to re-subscribe.
  const [appsSnapshot, setAppsSnapshot] = useState([]);
  const appsRef = useRef([]);
  const selectedIndexRef = useRef(0);

  // One global listener pair for the lifetime of the app (empty deps), all
  // reactive reads go through .getState() so the closures never go stale.
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd+Tab is not actually reachable here in a real browser: Tab
      // is reserved for OS-level app switching (Cmd+Tab on macOS never
      // reaches any browser tab at all) and browser-level tab-cycling
      // (Ctrl+Tab in Chrome/Firefox/Edge/Safari), so a page-level listener
      // for it would never fire for real users. Ctrl/Cmd+Arrow isn't
      // reserved at either level, and pairs naturally with Mission
      // Control's existing Ctrl+ArrowUp.
      const isModifierArrow = (event.metaKey || event.ctrlKey)
        && (event.key === 'ArrowRight' || event.key === 'ArrowLeft');

      if (isModifierArrow) {
        if (isEditableTarget(event.target)) return;

        const uiState = useSystemUIStore.getState();
        const alreadyOpen = uiState.activeOverlay === 'app-switcher';
        if (uiState.activeOverlay && !alreadyOpen) return;

        const apps = getOpenApps(useWindowStore.getState().windows);
        if (!apps.length) return;

        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -1 : 1;

        if (!alreadyOpen) {
          const opened = useSystemUIStore.getState().openAppSwitcher();
          if (!opened) return;
          appsRef.current = apps;
          setAppsSnapshot(apps);
          const startIndex = apps.length > 1 ? (delta + apps.length) % apps.length : 0;
          selectedIndexRef.current = startIndex;
          setSelectedIndex(startIndex);
        } else {
          appsRef.current = apps;
          setAppsSnapshot(apps);
          const next = (selectedIndexRef.current + delta + apps.length) % apps.length;
          selectedIndexRef.current = next;
          setSelectedIndex(next);
        }
        return;
      }

      if (event.key === 'Escape' && useSystemUIStore.getState().activeOverlay === 'app-switcher') {
        event.preventDefault();
        useSystemUIStore.getState().closeAppSwitcher();
      }
    };

    const handleKeyUp = (event) => {
      if (event.key !== 'Meta' && event.key !== 'Control') return;
      if (useSystemUIStore.getState().activeOverlay !== 'app-switcher') return;

      const apps = appsRef.current;
      const target = apps[selectedIndexRef.current];
      useSystemUIStore.getState().closeAppSwitcher();
      if (target) useWindowStore.getState().openWindow(target.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (!isOpen) return null;
  const apps = appsSnapshot;

  return createPortal(
    <div className="app-switcher-overlay" role="dialog" aria-modal="true" aria-label="Application switcher">
      <div className="app-switcher-panel">
        {apps.map((app, index) => (
          <div
            key={app.key}
            className={clsx('app-switcher-item', index === selectedIndex && 'selected')}
            aria-selected={index === selectedIndex}
          >
            <img src={app.icon} alt="" className="app-switcher-icon" />
            <p className="app-switcher-label">{app.label}</p>
            {app.isMinimized ? <span className="app-switcher-minimized-badge">Minimized</span> : null}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
};

export default AppSwitcher;
