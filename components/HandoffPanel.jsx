import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Share2, Smartphone } from 'lucide-react';
import useSystemUIStore from '#store/systemUI.js';
import useTelemetryStore from '#store/telemetry.js';
import { buildShareUrl, getDestinationTitle } from '#utils/shareableDestinations.js';

// The "Continue on Phone" sheet — the one Handoff surface every Share
// button opens. Doubles as the Share/Copy-Link UI the batch spec describes
// separately, since both ask for the exact same title+link+copy+share
// content; building two overlapping panels for the same data would be the
// "separate competing" duplication the project explicitly avoids elsewhere.
const HandoffPanel = () => {
  const { handoffTarget, closeHandoff } = useSystemUIStore();
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const statusTimeoutRef = useRef(null);

  const isOpen = Boolean(handoffTarget);

  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement;
      setStatus(null);
      const raf = requestAnimationFrame(() => panelRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const close = () => {
      closeHandoff();
      returnFocusRef.current?.focus?.();
    };
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      close();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeHandoff]);

  useEffect(() => () => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
  }, []);

  if (!isOpen) return null;

  const url = buildShareUrl(handoffTarget);
  const title = getDestinationTitle(handoffTarget);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.isSecureContext;

  const close = () => {
    closeHandoff();
    returnFocusRef.current?.focus?.();
  };

  const flashStatus = (value) => {
    setStatus(value);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatus(null), 2500);
  };

  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(url);
      flashStatus('copied');
      useTelemetryStore.getState().recordLinkShared();
    } catch {
      // Manual selectable-link fallback — select the text so the visitor
      // can copy it themselves instead of silently failing.
      inputRef.current?.select();
      flashStatus('copy-failed');
    }
  };

  const shareLink = async () => {
    if (!canShare) {
      flashStatus('share-unavailable');
      return;
    }
    try {
      await navigator.share({ title, url });
      flashStatus('shared');
      useTelemetryStore.getState().recordLinkShared();
    } catch (error) {
      if (error?.name !== 'AbortError') flashStatus('share-failed');
    }
  };

  const STATUS_MESSAGES = {
    copied: 'Link copied to clipboard.',
    'copy-failed': 'Couldn’t copy automatically — link selected, press Cmd/Ctrl+C.',
    shared: 'Shared successfully.',
    'share-failed': 'Sharing didn’t complete. Try Copy Link instead.',
    'share-unavailable': 'Sharing isn’t supported in this browser — use Copy Link.',
  };

  return createPortal(
    <div className="handoff-backdrop" onClick={close}>
      <div
        id="handoff-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Share: ${title}`}
        className="handoff-panel"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="handoff-header">
          <div className="handoff-icon"><Smartphone size={16} aria-hidden="true" /></div>
          <div className="handoff-heading">
            <p className="handoff-title">{title}</p>
            <p className="handoff-subtitle">Continue on another device</p>
          </div>
          <button type="button" className="handoff-close" aria-label="Close" onClick={close}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <p className="handoff-instruction">Open this link on your phone or another device to pick up right here.</p>

        <input
          ref={inputRef}
          type="text"
          className="handoff-url"
          readOnly
          value={url}
          aria-label="Shareable link"
          onFocus={(event) => event.target.select()}
        />

        <div className="handoff-actions">
          <button type="button" className="handoff-action" onClick={copyLink}>
            {status === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {status === 'copied' ? 'Copied' : 'Copy Link'}
          </button>
          {canShare ? (
            <button type="button" className="handoff-action handoff-action--primary" onClick={shareLink}>
              <Share2 size={14} aria-hidden="true" /> Share
            </button>
          ) : null}
        </div>

        <p className="handoff-status" role="status" aria-live="polite">
          {status ? STATUS_MESSAGES[status] : ''}
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default HandoffPanel;
