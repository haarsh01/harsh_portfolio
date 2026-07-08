import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Search, X, ArrowLeft } from 'lucide-react';
import useSystemUIStore from '#store/systemUI.js';
import { getSearchRegistry, HELP_TOPICS, QUICK_LINK_IDS } from '#utils/searchRegistry.js';
import { searchEntries, getHighlightSegments } from '#utils/portfolioSearch.js';
import { parseSpotlightQuery } from '#utils/spotlightIntents.js';
import executePortfolioAction from '#utils/executePortfolioAction.js';
import { toQuickLookEntry } from '#utils/portfolioItems.js';
import { PreviewBody } from '#components/QuickLook.jsx';
import { getShareableItemDestination } from '#utils/shareableDestinations.js';
import ShareButton from '#components/ShareButton.jsx';
import useTelemetryStore from '#store/telemetry.js';

function Highlighted({ text, query }) {
  const segments = getHighlightSegments(text, query);
  return segments.map((segment, i) => (
    segment.match ? <mark key={i}>{segment.text}</mark> : <React.Fragment key={i}>{segment.text}</React.Fragment>
  ));
}

function ResultRow({ id, result, query, active, onClick, onMouseEnter }) {
  const Icon = result.icon;
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      data-active={active ? 'true' : undefined}
      className={clsx('spotlight-result', active && 'active')}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <span className="spotlight-result-icon">
        {result.image ? <img src={result.image} alt="" /> : (Icon ? <Icon size={18} aria-hidden="true" /> : null)}
      </span>
      <div className="spotlight-result-text">
        <p className="spotlight-result-title"><Highlighted text={result.title} query={query} /></p>
        {result.subtitle ? <p className="spotlight-result-subtitle">{result.subtitle}</p> : null}
      </div>
      {result.category ? <span className="spotlight-result-category">{result.category}</span> : null}
    </div>
  );
}

function HelpTopicView({ topic, onBack, onRunAction }) {
  if (!topic) return null;
  return (
    <div className="spotlight-topic">
      <button type="button" className="spotlight-topic-back" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" /> Back
      </button>
      <h3 className="spotlight-topic-title">{topic.title}</h3>
      {topic.body.map((paragraph, i) => (
        <p key={i} className="spotlight-topic-paragraph">{paragraph}</p>
      ))}
      {topic.shortcuts ? (
        <ul className="spotlight-topic-shortcuts">
          {topic.shortcuts.map((shortcut) => (
            <li key={shortcut.keys}>
              <kbd>{shortcut.keys}</kbd>
              <span>{shortcut.description}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {topic.action ? (
        <button type="button" className="spotlight-topic-action" onClick={() => onRunAction(topic.action)}>
          {topic.actionLabel ?? 'Open'}
        </button>
      ) : null}
    </div>
  );
}

function PreviewPane({ result }) {
  // Hooks must run unconditionally every render, so the "nothing to
  // preview" early return moves below both useMemo calls; each guards its
  // own computation instead.
  const previewItem = useMemo(
    () => (result?.quickLookItem ? toQuickLookEntry(result.quickLookItem, () => {}) : null),
    [result],
  );
  const shareDestination = useMemo(
    () => (result?.quickLookItem ? getShareableItemDestination(result.quickLookItem) : null),
    [result],
  );
  if (!result?.quickLookItem) return null;
  return (
    <div className="spotlight-preview">
      <div className="spotlight-preview-header">
        {result.image ? <img src={result.image} alt="" className="spotlight-preview-icon" /> : null}
        <div className="spotlight-preview-heading">
          <p className="spotlight-preview-title">{result.title}</p>
          {result.subtitle ? <p className="spotlight-preview-subtitle">{result.subtitle}</p> : null}
        </div>
        {shareDestination ? (
          <ShareButton destination={shareDestination} className="spotlight-preview-share" label="Share" />
        ) : null}
      </div>
      <div className="spotlight-preview-body">
        <PreviewBody item={previewItem} />
      </div>
    </div>
  );
}

const Spotlight = () => {
  const { activeOverlay, closeSpotlight } = useSystemUIStore();
  const isOpen = activeOverlay === 'spotlight';

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState('search');
  const [activeTopicId, setActiveTopicId] = useState(null);

  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const returnFocusRef = useRef(null);
  const wasQueryEmptyRef = useRef(true);

  const registry = useMemo(() => getSearchRegistry(), []);
  const quickLinkResults = useMemo(
    () => QUICK_LINK_IDS.map((id) => registry.find((entry) => entry.id === id)).filter(Boolean),
    [registry],
  );

  const { target, actionType } = useMemo(() => parseSpotlightQuery(query), [query]);
  const rawResults = useMemo(() => (target ? searchEntries(registry, target, { limit: 10 }) : []), [registry, target]);

  const results = useMemo(() => {
    if (!actionType) return rawResults;
    const filterKey = actionType === 'quick-look' ? 'quickLookItem' : 'getInfoItem';
    return rawResults
      .filter((entry) => Boolean(entry[filterKey]))
      .map((entry) => ({
        ...entry,
        id: `${actionType}-${entry.id}`,
        subtitle: actionType === 'quick-look' ? `Quick Look · ${entry.subtitle ?? entry.title}` : `Get Info · ${entry.subtitle ?? entry.title}`,
        action: actionType === 'quick-look' ? { type: 'quick-look', item: entry.quickLookItem } : { type: 'get-info', item: entry.getInfoItem },
      }));
  }, [rawResults, actionType]);

  const visibleResults = query.trim() ? results : quickLinkResults;

  // Resets search state whenever the panel transitions closed -> open —
  // adjusted during render, not in an effect, since this is purely
  // "reset state in response to a changed value."
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setView('search');
      setActiveTopicId(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    returnFocusRef.current = document.activeElement;
    wasQueryEmptyRef.current = true;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Global open/close/toggle shortcut, mounted for the app's lifetime.
  // Spotlight is allowed to interrupt Quick Look (a lightweight preview,
  // safe to dismiss to search) but defers to Mission Control / App
  // Switcher, which keep priority over their own screen takeover.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isSpaceCombo = event.key === ' ' || event.code === 'Space';
      const isKCombo = !event.shiftKey && event.key.toLowerCase() === 'k';
      const isHelpCombo = event.shiftKey && event.key === '?';
      const isShortcut = (event.metaKey || event.ctrlKey) && (isSpaceCombo || isKCombo || isHelpCombo);
      if (!isShortcut) return;

      event.preventDefault();
      const state = useSystemUIStore.getState();
      if (state.activeOverlay === 'spotlight') {
        state.closeSpotlight();
        returnFocusRef.current?.focus?.();
        return;
      }
      if (state.activeOverlay === 'quick-look') state.closeQuickLook();
      else if (state.activeOverlay) return;
      state.openSpotlight();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, view]);

  if (!isOpen) return null;

  const close = () => {
    closeSpotlight();
    returnFocusRef.current?.focus?.();
  };

  const runResult = (result) => {
    if (!result) return;
    if (result.action?.type === 'help-topic') {
      setView('topic');
      setActiveTopicId(result.action.topicId);
      return;
    }
    close();
    executePortfolioAction(result.action);
  };

  const runTopicAction = (action) => {
    close();
    executePortfolioAction(action);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (view === 'topic') { setView('search'); return; }
      close();
      return;
    }
    if (view === 'topic' || !visibleResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(visibleResults.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runResult(visibleResults[activeIndex]);
    }
  };

  const activeTopic = HELP_TOPICS.find((topic) => topic.id === activeTopicId) ?? null;
  const activeResult = visibleResults[activeIndex];

  return createPortal(
    <div className="spotlight-backdrop" onClick={close}>
      <div
        id="spotlight"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Spotlight search"
        className="spotlight-panel"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="spotlight-main">
          {view === 'search' ? (
            <>
              <div className="spotlight-field" role="search">
                <Search className="spotlight-search-icon" size={20} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  role="searchbox"
                  aria-label="Search the portfolio and run actions"
                  aria-controls="spotlight-listbox"
                  aria-activedescendant={activeResult ? `spotlight-result-${activeResult.id}` : undefined}
                  placeholder="Search or run a command…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={query}
                  onChange={(event) => {
                    const value = event.target.value;
                    setQuery(value);
                    setActiveIndex(0);
                    // Counts distinct search sessions only — never the
                    // query text itself, just the empty->non-empty edge.
                    const isEmpty = !value.trim();
                    if (!isEmpty && wasQueryEmptyRef.current) useTelemetryStore.getState().recordSpotlightSearch();
                    wasQueryEmptyRef.current = isEmpty;
                  }}
                />
                {query ? (
                  <button
                    type="button"
                    className="spotlight-clear"
                    aria-label="Clear search"
                    onClick={() => { setQuery(''); setActiveIndex(0); inputRef.current?.focus(); }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div id="spotlight-listbox" role="listbox" aria-label="Spotlight results" className="spotlight-results" ref={listRef}>
                {query.trim() ? (
                  results.length ? (
                    results.map((result, idx) => (
                      <ResultRow
                        key={result.id}
                        id={`spotlight-result-${result.id}`}
                        result={result}
                        query={target}
                        active={idx === activeIndex}
                        onClick={() => runResult(result)}
                        onMouseEnter={() => setActiveIndex(idx)}
                      />
                    ))
                  ) : (
                    <div className="spotlight-empty">
                      <p>No results for &ldquo;{query.trim()}&rdquo;</p>
                      <span>Try &ldquo;resume&rdquo;, &ldquo;React&rdquo;, &ldquo;projects&rdquo;, or &ldquo;Mission Control&rdquo;.</span>
                    </div>
                  )
                ) : (
                  <>
                    <div className="spotlight-section-label"><span>Quick Links</span></div>
                    {quickLinkResults.map((result, idx) => (
                      <ResultRow
                        key={result.id}
                        id={`spotlight-result-${result.id}`}
                        result={result}
                        query=""
                        active={idx === activeIndex}
                        onClick={() => runResult(result)}
                        onMouseEnter={() => setActiveIndex(idx)}
                      />
                    ))}
                    <p className="spotlight-hint">Try &ldquo;open my resume&rdquo;, &ldquo;find React skills&rdquo;, or &ldquo;start portfolio tour&rdquo;.</p>
                  </>
                )}
              </div>

              <div className="spotlight-footer">
                <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                <span><kbd>↵</kbd> Open</span>
                <span><kbd>esc</kbd> Close</span>
                <span><kbd>⌘</kbd><kbd>Space</kbd> Toggle</span>
              </div>
            </>
          ) : (
            <HelpTopicView topic={activeTopic} onBack={() => setView('search')} onRunAction={runTopicAction} />
          )}
        </div>

        {view === 'search' && activeResult ? <PreviewPane result={activeResult} /> : null}
      </div>
    </div>,
    document.body,
  );
};

export default Spotlight;
