import React, { useEffect, useRef, useState } from 'react';
import usePreferencesStore from '#store/preferences.js';
import {
  getWallpaperById, getDynamicWallpaperId, getAdjacentPhaseWallpaperIds, WALLPAPERS,
} from '#constants/wallpapers.js';

const PHASE_RECHECK_INTERVAL = 60_000; // phases change on hour boundaries — a minute is frequent enough

// Renders the desktop wallpaper as two stacked, crossfading layers (a CSS
// `background-image` change can't itself be transitioned) so switching
// wallpapers — manually or via the dynamic time-of-day mode — fades
// smoothly instead of popping. Sits behind every other desktop layer.
const DesktopBackground = () => {
  const desktop = usePreferencesStore((state) => state.desktop);
  const preloadedRef = useRef(new Set());

  // A heartbeat that exists purely to force a re-render, so the live
  // time-of-day phase (read fresh below on every render) gets re-evaluated
  // periodically — paused whenever dynamic mode is off or the tab is
  // hidden, so nothing runs unnecessarily in the background.
  const [, forceRerender] = useState(0);
  useEffect(() => {
    if (!desktop.dynamicWallpaper) return undefined;
    let intervalId = null;
    const start = () => {
      forceRerender((n) => n + 1);
      intervalId = window.setInterval(() => forceRerender((n) => n + 1), PHASE_RECHECK_INTERVAL);
    };
    const stop = () => { if (intervalId) window.clearInterval(intervalId); intervalId = null; };
    const handleVisibility = () => { if (document.hidden) stop(); else start(); };

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [desktop.dynamicWallpaper]);

  const activeId = desktop.dynamicWallpaper ? getDynamicWallpaperId() : desktop.wallpaper;

  const [frontId, setFrontId] = useState(activeId);
  const [backId, setBackId] = useState(null);
  const [frontOnTop, setFrontOnTop] = useState(true);

  // Adjusting state in response to a changed derived value, done during
  // render rather than in an effect (see "Storing information from
  // previous renders" — https://react.dev/reference/react/useState). This
  // converges in one extra render: once frontId becomes activeId, the
  // condition is false and nothing else fires.
  if (activeId !== frontId) {
    setBackId(frontId);
    setFrontId(activeId);
    setFrontOnTop(false);
  }

  // Preloads only the actual image-kind wallpapers that could plausibly be
  // shown next (gradients are pure CSS — nothing to preload, zero network
  // cost by construction).
  useEffect(() => {
    const candidates = desktop.dynamicWallpaper
      ? getAdjacentPhaseWallpaperIds().map(getWallpaperById)
      : WALLPAPERS;
    candidates
      .filter((wallpaper) => wallpaper.kind === 'image' && !preloadedRef.current.has(wallpaper.id))
      .forEach((wallpaper) => {
        preloadedRef.current.add(wallpaper.id);
        const img = new Image();
        img.src = wallpaper.value.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
      });
  }, [desktop.dynamicWallpaper]);

  // Flips the crossfade forward exactly once per new backId (set above,
  // never on mount since backId starts null) — needs a real effect
  // because it must run only after the "faded out" frame has committed,
  // so the browser has something to transition from.
  useEffect(() => {
    if (backId === null) return undefined;
    const raf = requestAnimationFrame(() => setFrontOnTop(true));
    return () => cancelAnimationFrame(raf);
  }, [backId]);

  const front = getWallpaperById(frontId);
  const back = backId ? getWallpaperById(backId) : null;

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--desktop-text-color',
      front.textColor === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
    );
  }, [front.textColor]);

  return (
    <div className="desktop-background" aria-hidden="true">
      {back ? (
        <div
          className="desktop-background-layer"
          style={{ backgroundImage: back.value, opacity: frontOnTop ? 0 : 1 }}
        />
      ) : null}
      <div
        className="desktop-background-layer"
        style={{ backgroundImage: front.value, opacity: frontOnTop ? 1 : 0 }}
      />
    </div>
  );
};

export default DesktopBackground;
