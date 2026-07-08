import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink, Folder, FileQuestion, Mail } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import useSystemUIStore from '#store/systemUI.js';
import { isEditableTarget } from '#utils/keyboard.js';
import { KIND_LABEL } from '#utils/portfolioItems.js';
import { getShareableQuickLookDestination } from '#utils/shareableDestinations.js';
import ShareButton from '#components/ShareButton.jsx';
import Button from '#components/Button.jsx';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Exported so Spotlight's optional preview pane can render the exact same
// preview a full Quick Look would, instead of a second, drifting copy.
export const PreviewBody = ({ item }) => {
  switch (item.kind) {
    case 'image':
      return (
        <div className="quick-look-image">
          <img src={item.imageUrl} alt={item.name} draggable={false} />
        </div>
      );
    case 'text':
      return (
        <div className="quick-look-text">
          {item.image ? <img src={item.image} alt={item.name} className="quick-look-text-image" draggable={false} /> : null}
          {item.subtitle ? <h3>{item.subtitle}</h3> : null}
          {Array.isArray(item.description)
            ? item.description.map((paragraph, i) => <p key={i}>{paragraph}</p>)
            : null}
        </div>
      );
    case 'pdf':
      return (
        <div className="quick-look-pdf">
          <Document file="files/resume.pdf">
            <Page pageNumber={1} width={320} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        </div>
      );
    case 'project':
      return (
        <div className="quick-look-project">
          <h3>{item.name}</h3>
          {Array.isArray(item.description) ? item.description.map((paragraph, i) => <p key={i}>{paragraph}</p>) : null}
          <p className="quick-look-meta">{item.childCount} file{item.childCount === 1 ? '' : 's'}</p>
        </div>
      );
    case 'folder':
      return (
        <div className="quick-look-folder">
          <Folder size={40} aria-hidden="true" />
          <p>{item.childCount} item{item.childCount === 1 ? '' : 's'}</p>
        </div>
      );
    case 'link':
      return (
        <div className="quick-look-link">
          <ExternalLink size={28} aria-hidden="true" />
          <p className="quick-look-link-url">{item.href}</p>
        </div>
      );
    case 'blog':
      return (
        <div className="quick-look-blog">
          {item.image ? <img src={item.image} alt={item.name} className="quick-look-blog-image" draggable={false} /> : null}
          {item.date ? <p className="quick-look-meta">{item.date}</p> : null}
          {item.href ? <p className="quick-look-link-url">{item.href}</p> : null}
        </div>
      );
    case 'music':
      return (
        <div className="quick-look-music">
          {item.image ? <img src={item.image} alt={item.name} className="quick-look-music-image" draggable={false} /> : null}
          {item.description ? <p>{item.description}</p> : null}
          {item.href ? <p className="quick-look-link-url">{item.href}</p> : null}
        </div>
      );
    case 'contact':
      return (
        <div className="quick-look-folder">
          <Mail size={40} aria-hidden="true" />
          {item.description ? <p>{item.description}</p> : null}
          {item.socialCount != null ? <p className="quick-look-meta">{item.socialCount} social link{item.socialCount === 1 ? '' : 's'}</p> : null}
        </div>
      );
    default:
      return (
        <div className="quick-look-folder">
          <FileQuestion size={40} aria-hidden="true" />
          <p>No preview available.</p>
        </div>
      );
  }
};

const QuickLook = () => {
  const { activeOverlay, quickLook, closeQuickLook, setQuickLookIndex } = useSystemUIStore();
  const isOpen = activeOverlay === 'quick-look' && Boolean(quickLook);
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement;
      const raf = requestAnimationFrame(() => panelRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [isOpen]);

  const close = () => {
    closeQuickLook();
    returnFocusRef.current?.focus?.();
  };

  const go = (delta) => {
    const state = useSystemUIStore.getState().quickLook;
    if (!state) return;
    const next = (state.index + delta + state.items.length) % state.items.length;
    setQuickLookIndex(next);
  };

  const openCurrent = () => {
    const state = useSystemUIStore.getState().quickLook;
    const item = state?.items[state.index];
    item?.open?.();
    close();
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if ((event.key === ' ' || event.key === 'Spacebar') && !event.metaKey && !event.ctrlKey) {
        // Cmd/Ctrl+Space is Spotlight's shortcut, not Quick Look's — bare
        // Space (no modifier) is the only combination that closes here.
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        openCurrent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const { items, index } = quickLook;
  const item = items[index];
  const shareDestination = getShareableQuickLookDestination(item);

  return createPortal(
    <div className="quick-look-backdrop" onClick={close}>
      <div
        id="quick-look"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick Look: ${item.name}`}
        className="quick-look-panel"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quick-look-toolbar">
          <button type="button" className="quick-look-close" aria-label="Close Quick Look" onClick={close}>
            <X size={16} aria-hidden="true" />
          </button>

          <div className="quick-look-title">
            <p className="quick-look-name">{item.name}</p>
            <p className="quick-look-kind">{KIND_LABEL[item.kind]}</p>
          </div>

          {shareDestination ? (
            <ShareButton destination={shareDestination} className="quick-look-share" label="Share" />
          ) : null}

          <Button variant="primary" size="small" className="flex-none" onClick={openCurrent}>
            Open
          </Button>
        </div>

        <div className="quick-look-body">
          <PreviewBody item={item} />
        </div>

        {items.length > 1 ? (
          <div className="quick-look-nav">
            <button type="button" className="quick-look-nav-btn" aria-label="Previous item" onClick={() => go(-1)}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="quick-look-position">{index + 1} of {items.length}</span>
            <button type="button" className="quick-look-nav-btn" aria-label="Next item" onClick={() => go(1)}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export default QuickLook;
