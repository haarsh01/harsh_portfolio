import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, ExternalLink, Copy, Check } from 'lucide-react';
import useSystemUIStore from '#store/systemUI.js';
import useWindowStore from '#store/window.js';
import useLocationStore from '#store/location.js';
import { isEditableTarget } from '#utils/keyboard.js';
import { getInfoFields, getCopyableLink, runItemAction, toQuickLookEntry } from '#utils/portfolioItems.js';
import { getShareableItemDestination } from '#utils/shareableDestinations.js';
import ShareButton from '#components/ShareButton.jsx';

const GetInfo = () => {
  const { getInfoItem, closeGetInfo, openQuickLook } = useSystemUIStore();
  const { openWindow } = useWindowStore();
  const { setActiveLocation } = useLocationStore();
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const [copied, setCopied] = React.useState(false);
  const [copiedResetKey, setCopiedResetKey] = React.useState(null);

  const isOpen = Boolean(getInfoItem);

  // Resets "Copied" whenever a different item opens (or the panel
  // re-opens) — adjusted during render, not in an effect, since this is
  // purely "reset state in response to a changed value."
  const currentResetKey = isOpen ? getInfoItem.id : null;
  if (currentResetKey !== copiedResetKey) {
    setCopiedResetKey(currentResetKey);
    if (currentResetKey !== null) setCopied(false);
  }

  // Global Cmd/Ctrl+I — mounted for the app's lifetime (empty deps), reads
  // the currently selected Finder/Stack item via .getState() so the
  // closure never goes stale, matching the Command-Tab / Mission Control
  // listener convention from Batch 1.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isGetInfoShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i';
      if (isGetInfoShortcut) {
        if (isEditableTarget(event.target)) return;
        const opened = useSystemUIStore.getState().openGetInfo();
        if (opened) event.preventDefault();
        return;
      }
      if (event.key === 'Escape' && useSystemUIStore.getState().getInfoItem) {
        // Quick Look, if opened from the "Quick Look" button below, owns
        // Escape first — otherwise one press would close both at once.
        if (useSystemUIStore.getState().activeOverlay === 'quick-look') return;
        event.preventDefault();
        useSystemUIStore.getState().closeGetInfo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement;
      const raf = requestAnimationFrame(() => panelRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [isOpen, getInfoItem?.id]);

  if (!isOpen) return null;

  const item = getInfoItem;
  const fields = getInfoFields(item);
  const copyableLink = getCopyableLink(item);
  const shareDestination = getShareableItemDestination(item);
  const descriptionParagraphs = Array.isArray(item.metadata?.description) ? item.metadata.description : null;

  const close = () => {
    closeGetInfo();
    returnFocusRef.current?.focus?.();
  };

  const openItem = () => runItemAction(item.action, { openWindow, setActiveLocation });

  const quickLookItem = () => {
    openQuickLook([toQuickLookEntry(item, openItem)], 0);
  };

  const copyLink = async () => {
    if (!copyableLink) return;
    try {
      await navigator.clipboard.writeText(copyableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable/denied — nothing meaningful to recover to.
    }
  };

  return createPortal(
    <div
      id="get-info-panel"
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`Get Info: ${item.name}`}
      className="get-info-panel"
      tabIndex={-1}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}
    >
      <div className="get-info-header">
        <img src={item.icon} alt="" className="get-info-icon" />
        <p className="get-info-name" title={item.name}>{item.name}</p>
        <button type="button" className="get-info-close" aria-label="Close Get Info" onClick={close}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="get-info-body">
        {descriptionParagraphs ? (
          <div className="get-info-description">
            {descriptionParagraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
        ) : null}

        <dl className="get-info-fields">
          {fields.map((field) => (
            <div key={field.label} className="get-info-row">
              <dt>{field.label}</dt>
              <dd>
                {field.href ? (
                  <a href={field.href} target="_blank" rel="noopener noreferrer" download={field.download || undefined}>
                    {field.value}
                  </a>
                ) : field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="get-info-actions">
        {item.action ? (
          <button type="button" className="get-info-action" onClick={openItem}>
            <ExternalLink size={14} aria-hidden="true" /> Open
          </button>
        ) : null}
        {item.kind !== 'stack' ? (
          <button type="button" className="get-info-action" onClick={quickLookItem}>
            <Eye size={14} aria-hidden="true" /> Quick Look
          </button>
        ) : null}
        {copyableLink ? (
          <button type="button" className="get-info-action" onClick={copyLink}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        ) : null}
        {shareDestination ? (
          <ShareButton destination={shareDestination} className="get-info-action" label="Share" showLabel />
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export default GetInfo;
