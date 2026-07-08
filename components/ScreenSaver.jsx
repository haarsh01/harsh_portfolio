import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import usePreferencesStore from '#store/preferences.js';
import { locations, techStack } from '#constants/index.js';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
const POINTERMOVE_THROTTLE_MS = 500;

// Real project names and skills — floating labels, not fabricated content.
const FLOATING_LABELS = [
  ...locations.work.children.map((project) => project.name),
  ...techStack.flatMap((group) => group.items).slice(0, 6),
].slice(0, 10);

const LABEL_POSITIONS = [
  { top: '12%', left: '10%' }, { top: '22%', left: '72%' }, { top: '68%', left: '14%' },
  { top: '78%', left: '64%' }, { top: '38%', left: '4%' }, { top: '15%', left: '48%' },
  { top: '82%', left: '38%' }, { top: '46%', left: '84%' }, { top: '58%', left: '52%' },
  { top: '30%', left: '28%' },
];

// Full-desktop screen saver shown after a configurable inactivity period.
// Purely visual and self-contained — never touches window state, the
// guided tour, or navigation; exits on any input and cleans up every
// listener/timer it creates.
const ScreenSaver = () => {
  const { screenSaverEnabled, screenSaverDelay } = usePreferencesStore((state) => state.desktop);
  const [isActive, setIsActive] = useState(false);
  const [now, setNow] = useState(() => dayjs());
  const timeoutRef = useRef(null);
  const lastMoveRef = useRef(0);

  const clearInactivityTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleInactivityTimer = () => {
    clearInactivityTimer();
    if (!screenSaverEnabled || !screenSaverDelay || document.hidden) return;
    timeoutRef.current = window.setTimeout(() => setIsActive(true), screenSaverDelay * 1000);
  };

  const registerActivity = () => {
    setIsActive(false);
    scheduleInactivityTimer();
  };

  // Inactivity tracking — all listeners registered once, cleaned up on
  // unmount or whenever the enabled/delay preference changes.
  useEffect(() => {
    if (!screenSaverEnabled || !screenSaverDelay) {
      clearInactivityTimer();
      setIsActive(false);
      return undefined;
    }

    const handlePointerMove = (event) => {
      const now2 = event.timeStamp || performance.now();
      if (now2 - lastMoveRef.current < POINTERMOVE_THROTTLE_MS) return;
      lastMoveRef.current = now2;
      registerActivity();
    };

    scheduleInactivityTimer();
    window.addEventListener('pointermove', handlePointerMove);
    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, registerActivity));

    return () => {
      clearInactivityTimer();
      window.removeEventListener('pointermove', handlePointerMove);
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, registerActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSaverEnabled, screenSaverDelay]);

  // Page Visibility: pause the inactivity timer while hidden, and
  // recalculate from a safe baseline (i.e. just start fresh, not "the user
  // was away for N minutes so show it immediately") when it becomes visible.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        clearInactivityTimer();
      } else {
        setIsActive(false);
        scheduleInactivityTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSaverEnabled, screenSaverDelay]);

  // Clock tick + exit listeners — only while the screen saver is showing,
  // and paused while the tab is hidden (nothing to display anyway).
  useEffect(() => {
    if (!isActive) return undefined;

    const tick = () => setNow(dayjs());
    tick();
    let intervalId = document.hidden ? null : window.setInterval(tick, 1000);

    const exit = () => setIsActive(false);
    const handleKeyDown = (event) => { if (event.key) exit(); };
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalId) { window.clearInterval(intervalId); intervalId = null; }
      } else if (!intervalId) {
        tick();
        intervalId = window.setInterval(tick, 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', exit);
    window.addEventListener('pointermove', exit);
    window.addEventListener('touchstart', exit);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', exit);
      window.removeEventListener('pointermove', exit);
      window.removeEventListener('touchstart', exit);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isActive]);

  if (!isActive) return null;

  return createPortal(
    <div
      id="screen-saver"
      role="dialog"
      aria-modal="true"
      aria-label="Screen saver — press any key or click to exit"
      className="screen-saver"
    >
      <div className="screen-saver-gradient" aria-hidden="true" />
      {FLOATING_LABELS.map((label, index) => (
        <span
          key={label}
          className="screen-saver-floating-label"
          style={{ ...LABEL_POSITIONS[index % LABEL_POSITIONS.length], animationDelay: `${(index % 5) * 1.1}s` }}
        >
          {label}
        </span>
      ))}
      <div className="screen-saver-clock">
        <p className="screen-saver-time">{now.format('h:mm')}</p>
        <p className="screen-saver-date">{now.format('dddd, MMMM D')}</p>
      </div>
      <p className="screen-saver-hint">Move the mouse or press any key</p>
    </div>,
    document.body,
  );
};

export default ScreenSaver;
