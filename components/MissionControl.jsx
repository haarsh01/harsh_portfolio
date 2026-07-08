import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import useWindowStore from '#store/window.js';
import useSystemUIStore from '#store/systemUI.js';
import { isEditableTarget } from '#utils/keyboard.js';
import { getMotionDuration as getDuration } from '#utils/motion.js';
import { dockApps } from '#constants';

const DESKTOP_MARGIN = { top: 76, left: 24, right: 24, bottom: 120 };
const STRIP_HEIGHT = 108;
const GRID_GAP = 20;

const FALLBACK_LABELS = { resume: 'Resume', txtfile: 'Text File', imgfile: 'Image' };
const FALLBACK_ICONS = { resume: '/images/pdf.png', txtfile: '/images/txt.png', imgfile: '/images/image.png' };

const getAppMeta = (key, windowState) => {
  const dockApp = dockApps.find((app) => app.id === key);
  if (dockApp) return { label: dockApp.name, icon: `/images/${dockApp.icon}` };
  const label = windowState?.data?.name ?? FALLBACK_LABELS[key] ?? key;
  return { label, icon: FALLBACK_ICONS[key] ?? '/images/finder.png' };
};

const computeGridLayout = (count) => {
  if (!count) return [];
  const availableWidth = window.innerWidth - DESKTOP_MARGIN.left - DESKTOP_MARGIN.right;
  const availableHeight = window.innerHeight - DESKTOP_MARGIN.top - DESKTOP_MARGIN.bottom - STRIP_HEIGHT;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellWidth = (availableWidth - GRID_GAP * (cols - 1)) / cols;
  const cellHeight = (availableHeight - GRID_GAP * (rows - 1)) / rows;

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const itemsInRow = Math.min(cols, count - row * cols);
    const rowOffsetX = ((cols - itemsInRow) * (cellWidth + GRID_GAP)) / 2;
    return {
      left: DESKTOP_MARGIN.left + rowOffsetX + col * (cellWidth + GRID_GAP),
      top: DESKTOP_MARGIN.top + row * (cellHeight + GRID_GAP),
      width: cellWidth,
      height: cellHeight,
    };
  });
};

const MissionControl = () => {
  const { activeOverlay, closeMissionControl } = useSystemUIStore();
  const { windows, openWindow } = useWindowStore();
  const isOpen = activeOverlay === 'mission-control';
  const snapshotsRef = useRef(new Map());
  const [thumbnails, setThumbnails] = useState([]);

  // Global open/close shortcut — lives here for the app's lifetime (empty deps).
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && !event.metaKey && event.key === 'ArrowUp') {
        if (isEditableTarget(event.target)) return;
        const state = useSystemUIStore.getState();
        if (state.activeOverlay) return;
        event.preventDefault();
        useSystemUIStore.getState().openMissionControl();
        return;
      }
      if (event.key === 'Escape' && useSystemUIStore.getState().activeOverlay === 'mission-control') {
        event.preventDefault();
        useSystemUIStore.getState().closeMissionControl();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enter: snapshot each open window's live transform, animate it into a
  // grid cell via GSAP (scale + relative x/y only — width/height/top/left
  // are never touched, so nothing is permanently overwritten).
  // Exit: animate every snapshotted window straight back to its exact prior
  // transform and drop the snapshots.
  useEffect(() => {
    // Routes both branches' final state update through one named function
    // rather than calling `setThumbnails` directly — the array being set
    // is the direct result of real DOM measurement (getBoundingClientRect)
    // and GSAP layout math just above, which cannot happen during render.
    const commitThumbnails = (next) => setThumbnails(next);

    if (isOpen) {
      const windowsState = useWindowStore.getState().windows;
      const openKeys = Object.keys(windowsState).filter(
        (key) => windowsState[key].isOpen && !windowsState[key].isMinimized,
      );

      const entries = openKeys
        .map((key) => {
          const el = document.getElementById(key);
          if (!el) return null;
          return { key, el, rect: el.getBoundingClientRect() };
        })
        .filter(Boolean);

      const layout = computeGridLayout(entries.length);
      const nextThumbnails = [];

      entries.forEach((entry, i) => {
        const { key, el, rect } = entry;
        const target = layout[i];
        const currentScale = gsap.getProperty(el, 'scale') || 1;
        const currentX = gsap.getProperty(el, 'x') || 0;
        const currentY = gsap.getProperty(el, 'y') || 0;
        snapshotsRef.current.set(key, { x: currentX, y: currentY, scale: currentScale });

        const naturalWidth = rect.width / currentScale;
        const naturalHeight = rect.height / currentScale;
        const targetScale = Math.min(target.width / naturalWidth, target.height / naturalHeight, 1);
        const finalWidth = naturalWidth * targetScale;
        const finalHeight = naturalHeight * targetScale;
        const finalLeft = target.left + (target.width - finalWidth) / 2;
        const finalTop = target.top + (target.height - finalHeight) / 2;

        const currentCenterX = rect.left + rect.width / 2;
        const currentCenterY = rect.top + rect.height / 2;
        const targetCenterX = finalLeft + finalWidth / 2;
        const targetCenterY = finalTop + finalHeight / 2;

        gsap.to(el, {
          x: currentX + (targetCenterX - currentCenterX),
          y: currentY + (targetCenterY - currentCenterY),
          scale: targetScale,
          duration: getDuration(0.35),
          ease: 'power3.out',
        });

        const meta = getAppMeta(key, windowsState[key]);
        nextThumbnails.push({ key, label: meta.label, left: finalLeft, top: finalTop, width: finalWidth, height: finalHeight });
      });

      commitThumbnails(nextThumbnails);
    } else if (snapshotsRef.current.size) {
      snapshotsRef.current.forEach((snap, key) => {
        const el = document.getElementById(key);
        if (!el) return;
        gsap.to(el, {
          x: snap.x,
          y: snap.y,
          scale: snap.scale,
          duration: getDuration(0.3),
          ease: 'power3.inOut',
        });
      });
      snapshotsRef.current.clear();
      commitThumbnails([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const minimizedKeys = Object.keys(windows).filter((key) => windows[key].isOpen && windows[key].isMinimized);

  const activate = (key) => {
    openWindow(key);
    closeMissionControl();
  };

  return createPortal(
    <>
      {/* Plain dimming layer only — deliberately NOT an ancestor of the
          thumbnails/strip below. A `position:fixed` + `z-index` element
          establishes its own stacking context, which would otherwise trap
          any higher z-index children inside it, unable to out-rank sibling
          windows (z-index 1000+) at the top level. Keeping the interactive
          chrome as siblings of the backdrop lets each layer's z-index
          compare directly at the same (body-level) stacking context. */}
      <div
        className="mission-control-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Mission Control"
        onClick={() => closeMissionControl()}
      />

      {thumbnails.length === 0 && minimizedKeys.length === 0 ? (
        <p className="mission-control-empty">No open windows</p>
      ) : null}

      {thumbnails.map((thumb) => (
        <button
          key={thumb.key}
          type="button"
          className="mission-control-thumb"
          style={{ left: thumb.left, top: thumb.top, width: thumb.width, height: thumb.height }}
          aria-label={`Show ${thumb.label}`}
          onClick={(event) => { event.stopPropagation(); activate(thumb.key); }}
        >
          <span className="mission-control-thumb-label">{thumb.label}</span>
        </button>
      ))}

      {minimizedKeys.length ? (
        <div className="mission-control-strip" onClick={(event) => event.stopPropagation()}>
          {minimizedKeys.map((key) => {
            const meta = getAppMeta(key, windows[key]);
            return (
              <button
                key={key}
                type="button"
                className="mission-control-strip-item"
                aria-label={`Restore ${meta.label}`}
                onClick={() => activate(key)}
              >
                <img src={meta.icon} alt="" className="mission-control-strip-icon" />
                <span className="mission-control-strip-label">{meta.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </>,
    document.body,
  );
};

export default MissionControl;
