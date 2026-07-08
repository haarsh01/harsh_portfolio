import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import gsap from 'gsap';
import { ChevronUp, ChevronDown, RotateCcw, ExternalLink, History } from 'lucide-react';
import { WindowControls } from '#components';
import Button from '#components/Button.jsx';
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window.js';
import useSystemUIStore from '#store/systemUI.js';
import { TIMELINE_EVENTS } from '#constants/timeline.js';
import executePortfolioAction from '#utils/executePortfolioAction.js';
import { isReducedMotion as prefersReducedMotion, getMotionDuration as getDuration } from '#utils/motion.js';
import { getShareableTimelineEventDestination } from '#utils/shareableDestinations.js';
import ShareButton from '#components/ShareButton.jsx';

const TimeMachine = () => {
  const total = TIMELINE_EVENTS.length;
  const [index, setIndex] = useState(Math.max(total - 1, 0));
  const cardRef = useRef(null);
  const wheelLockRef = useRef(false);
  const requestedEventId = useWindowStore((state) => state.windows.timeMachine?.data?.eventId);

  const event = TIMELINE_EVENTS[index];

  // A Handoff/shared link (or any future caller) can deep-link straight to
  // one event via `openWindow("timeMachine", { eventId })` without
  // remounting the window — this just syncs the local navigation index.
  useEffect(() => {
    if (!requestedEventId) return;
    const targetIndex = TIMELINE_EVENTS.findIndex((evt) => evt.id === requestedEventId);
    if (targetIndex !== -1) setIndex(targetIndex);
  }, [requestedEventId]);

  // Crossfades the readable panel on every navigation — one short, discrete
  // tween (never a continuous/looping timeline). Duration collapses to 0
  // under reduced motion, so this becomes direct navigation automatically.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: prefersReducedMotion() ? 0 : 8 },
      { opacity: 1, y: 0, duration: getDuration(0.25), ease: 'power2.out' },
    );
    return () => tween.kill();
  }, [index]);

  // A backgrounded tab has no business animating — snap any in-flight
  // transition to its end state instead of leaving it running unseen.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && cardRef.current) gsap.set(cardRef.current, { opacity: 1, y: 0 });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const goTo = (nextIndex) => setIndex(Math.min(Math.max(nextIndex, 0), total - 1));
  const goNext = () => goTo(index + 1);
  const goPrev = () => goTo(index - 1);
  const goToPresent = () => goTo(total - 1);

  // Scoped keyboard navigation: only acts while this window is open, not
  // minimized, no overlay is active, and it's the frontmost normal window —
  // the same scoping convention Get Info's Cmd+I uses — so it never steals
  // keys intended for another focused window or overlay.
  useEffect(() => {
    const handleKeyDown = (keyEvent) => {
      const winState = useWindowStore.getState().windows.timeMachine;
      if (!winState?.isOpen || winState.isMinimized) return;
      if (useSystemUIStore.getState().activeOverlay) return;
      const allWindows = useWindowStore.getState().windows;
      const isFrontmost = Object.values(allWindows).every((w) => !w.isOpen || w.isMinimized || w.zIndex <= winState.zIndex);
      if (!isFrontmost) return;

      if (keyEvent.key === 'ArrowUp' || keyEvent.key === 'ArrowLeft') {
        keyEvent.preventDefault();
        goPrev();
      } else if (keyEvent.key === 'ArrowDown' || keyEvent.key === 'ArrowRight') {
        keyEvent.preventDefault();
        goNext();
      } else if (keyEvent.key === 'Home') {
        keyEvent.preventDefault();
        goTo(0);
      } else if (keyEvent.key === 'End') {
        keyEvent.preventDefault();
        goToPresent();
      } else if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault();
        useWindowStore.getState().closeWindow('timeMachine');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Controlled, contained wheel navigation (one step per gesture, cooled
  // down for 350ms) — scoped to the stage element only, so it never
  // hijacks the page's own scroll outside this window.
  const handleWheel = (wheelEvent) => {
    if (wheelLockRef.current || Math.abs(wheelEvent.deltaY) < 8) return;
    wheelEvent.preventDefault();
    wheelLockRef.current = true;
    if (wheelEvent.deltaY > 0) goNext(); else goPrev();
    setTimeout(() => { wheelLockRef.current = false; }, 350);
  };

  const openRelated = () => {
    if (event?.relatedAction) executePortfolioAction(event.relatedAction);
  };

  if (!event) return null;

  const prevEvent = TIMELINE_EVENTS[index - 1];
  const nextEvent = TIMELINE_EVENTS[index + 1];
  const showDepthLayers = !prefersReducedMotion();

  return (
    <>
      <div id="window-header">
        <WindowControls target="timeMachine" />
        <History size={14} className="icon" aria-hidden="true" />
        <h2 className="flex-1 text-center font-bold text-sm">Time Machine</h2>
        <button type="button" className="tm-present-btn" disabled={index === total - 1} onClick={goToPresent}>
          <RotateCcw size={13} aria-hidden="true" /> Present
        </button>
      </div>

      <div className="tm-body">
        <nav className="tm-navigator" aria-label="Timeline dates">
          <ul>
            {TIMELINE_EVENTS.map((evt, i) => (
              <li key={evt.id}>
                <button
                  type="button"
                  className={clsx('tm-nav-item', i === index && 'active')}
                  aria-current={i === index}
                  onClick={() => goTo(i)}
                >
                  <span className="tm-nav-year">{evt.year}</span>
                  <span className="tm-nav-date">{evt.dateLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="tm-stage" onWheel={handleWheel}>
          {showDepthLayers ? (
            <div className="tm-depth-layer tm-depth-prev" aria-hidden="true">
              {prevEvent ? (
                <>
                  {prevEvent.image ? <img src={prevEvent.image} alt="" loading="lazy" /> : null}
                  <p>{prevEvent.title}</p>
                </>
              ) : null}
            </div>
          ) : null}

          <article className="tm-card" ref={cardRef} aria-live="polite">
            <p className="tm-card-category">{event.category}</p>
            <h3 className="tm-card-title">{event.title}</h3>
            <p className="tm-card-date">{event.dateLabel}</p>
            {event.image ? <img src={event.image} alt="" className="tm-card-image" loading="eager" /> : null}
            <p className="tm-card-description">{event.description}</p>
            {event.technologies?.length ? (
              <div className="tm-card-tech">
                {event.technologies.map((tech) => <span key={tech}>{tech}</span>)}
              </div>
            ) : null}
            <div className="tm-card-footer">
              {event.relatedAction ? (
                <Button variant="primary" size="small" className="self-start mt-1" icon={ExternalLink} onClick={openRelated}>
                  Open related content
                </Button>
              ) : null}
              <ShareButton destination={getShareableTimelineEventDestination(event)} className="tm-card-action" label="Share" showLabel />
            </div>
          </article>

          {showDepthLayers ? (
            <div className="tm-depth-layer tm-depth-next" aria-hidden="true">
              {nextEvent ? (
                <>
                  {nextEvent.image ? <img src={nextEvent.image} alt="" loading="lazy" /> : null}
                  <p>{nextEvent.title}</p>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="tm-stage-controls">
            <button type="button" aria-label="Earlier event" disabled={index === 0} onClick={goPrev}>
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <span className="tm-stage-position">{index + 1} of {total}</span>
            <button type="button" aria-label="Later event" disabled={index === total - 1} onClick={goNext}>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const TimeMachineWindow = WindowWarpper(TimeMachine, 'timeMachine');
export default TimeMachineWindow;
