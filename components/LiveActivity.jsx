import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Pause, Play, X, Compass } from 'lucide-react';
import useTourStore from '#store/tour.js';
import useSystemUIStore from '#store/systemUI.js';
import { isEditableTarget } from '#utils/keyboard.js';
import executePortfolioAction from '#utils/executePortfolioAction.js';

// Compact menu-bar Live Activity capsule for the guided Portfolio Tour —
// the only genuinely supported "activity" this batch. Rendered as a fixed,
// portaled element (not JSX inside Navbar.jsx) so its appearance/disappearance
// never reflows the Navbar's own flex layout.
const LiveActivity = () => {
  const {
    isActive, isPaused, currentStep, steps, nextStep, prevStep, pauseTour, resumeTour, exitTour,
  } = useTourStore();
  const hasRunStep = useRef(-1);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // A refresh mid-tour leaves a session-only record behind (see
  // src/store/tour.js). Offer to pick it back up — but only ever via this
  // explicit prompt, never automatically.
  useEffect(() => {
    if (!isActive && useTourStore.getState().peekInterruptedTour()) {
      setShowResumePrompt(true);
    }
  }, [isActive]);

  const resumeInterrupted = () => {
    setShowResumePrompt(false);
    useTourStore.getState().resumeInterruptedTour();
  };

  const dismissInterrupted = () => {
    setShowResumePrompt(false);
    useTourStore.getState().dismissInterruptedTour();
  };

  const step = steps[currentStep];

  // Fires the current step's action once per (currentStep) while active and
  // not paused. Ref-guarded so React StrictMode's double-invoke or an
  // unrelated re-render never re-opens the same step's window twice.
  useEffect(() => {
    if (!isActive || isPaused || !step) return;
    if (hasRunStep.current === currentStep) return;
    hasRunStep.current = currentStep;
    executePortfolioAction(step.action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isPaused, currentStep]);

  useEffect(() => {
    if (!isActive) hasRunStep.current = -1;
  }, [isActive]);

  // Escape exits the tour without touching any window — only when no other
  // overlay currently owns Escape.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (isEditableTarget(event.target)) return;
      const tourState = useTourStore.getState();
      if (!tourState.isActive) return;
      if (useSystemUIStore.getState().activeOverlay) return;
      event.preventDefault();
      tourState.exitTour();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (showResumePrompt && !isActive) {
    return createPortal(
      <div className="live-activity-capsule" role="status">
        <div className="live-activity-main live-activity-main--static">
          <Compass size={16} aria-hidden="true" className="live-activity-icon" />
          <span className="live-activity-text">
            <span className="live-activity-label">Resume your portfolio tour?</span>
          </span>
        </div>
        <div className="live-activity-controls">
          <button type="button" className="live-activity-text-btn" onClick={resumeInterrupted}>Resume</button>
          <button type="button" aria-label="Dismiss" onClick={dismissInterrupted}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  if (!isActive || !step) return null;

  const focusCurrent = () => executePortfolioAction(step.action);

  const stop = (event, fn) => {
    event.stopPropagation();
    fn();
  };

  return createPortal(
    <>
      <div className="live-activity-capsule" role="status">
        <button type="button" className="live-activity-main" onClick={focusCurrent}>
          <img src={step.icon} alt="" className="live-activity-icon" />
          <span className="live-activity-text">
            <span className="live-activity-label">{isPaused ? 'Portfolio Tour paused' : step.title}</span>
            <span className="live-activity-progress" aria-live="polite">{currentStep + 1} of {steps.length}</span>
          </span>
        </button>
        <div className="live-activity-controls">
          <button type="button" aria-label="Previous step" disabled={currentStep === 0} onClick={(event) => stop(event, prevStep)}>
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button type="button" aria-label={isPaused ? 'Resume tour' : 'Pause tour'} onClick={(event) => stop(event, isPaused ? resumeTour : pauseTour)}>
            {isPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          </button>
          <button type="button" aria-label="Next step" disabled={currentStep === steps.length - 1} onClick={(event) => stop(event, nextStep)}>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Exit tour" onClick={(event) => stop(event, exitTour)}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="live-activity-coach" aria-live="off">
        <p className="live-activity-coach-title">{step.title}</p>
        <p className="live-activity-coach-text">{step.explanation}</p>
      </div>
    </>,
    document.body,
  );
};

export default LiveActivity;
