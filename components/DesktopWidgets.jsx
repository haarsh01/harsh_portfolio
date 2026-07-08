import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { GripVertical, X, Maximize2, Plus, ExternalLink } from 'lucide-react';
import usePreferencesStore from '#store/preferences.js';
import useWidgetsStore from '#store/widgets.js';
import useSystemUIStore from '#store/systemUI.js';
import { locations, techStack, gallery, SPOTIFY_PLAYLIST } from '#constants/index.js';
import { WIDGET_TYPES, WIDGET_SIZES, WIDGET_DIMENSIONS, getWidgetTypeMeta } from '#constants/widgets.js';
import { TIMELINE_EVENTS } from '#constants/timeline.js';
import { NEXAI } from '#constants/nexai.js';
import executePortfolioAction from '#utils/executePortfolioAction.js';
import { playToggleSound } from '#utils/interfaceSound.js';

const GRID_SNAP = 20;
const KEYBOARD_STEP = 12;

const aboutTextFile = locations.about.children.find((child) => child.fileType === 'txt') ?? null;
const featuredProject = locations.work.children.find((project) => project.featured) ?? locations.work.children[0] ?? null;
const latestJourneyEvent = TIMELINE_EVENTS.filter((event) => event.category !== 'Present').slice(-1)[0] ?? null;

// A `kind: "app"` Work entry (NexAI, Portfolio OS) is a direct launch point
// for a real window — route to it directly rather than a Finder location.
const featuredProjectAction = featuredProject
  ? (featuredProject.kind === 'app' && featuredProject.windowId
    ? { type: 'open-window', windowId: featuredProject.windowId }
    : { type: 'open-finder-location', location: featuredProject })
  : null;

// Every widget's content is resolved from real, already-existing portfolio
// data — nothing here invents a headline, an activity, or a metric.
function WidgetContent({ type }) {
  switch (type) {
    case 'about': {
      const description = Array.isArray(aboutTextFile?.description) ? aboutTextFile.description[0] : null;
      return (
        <div className="widget-body">
          <p className="widget-title">Harsh Kaushik</p>
          {description ? <p className="widget-text">{description}</p> : null}
          <button type="button" className="widget-action" onClick={() => executePortfolioAction({ type: 'open-window', windowId: 'txtfile', data: aboutTextFile })}>
            About <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      );
    }
    case 'focus':
      return (
        <div className="widget-body">
          <p className="widget-eyebrow">Research Focus</p>
          <p className="widget-title">{NEXAI.name} · Image authenticity</p>
          <p className="widget-text">{NEXAI.shortDescription}</p>
          <button type="button" className="widget-action" onClick={() => executePortfolioAction({ type: 'open-window', windowId: 'nexai' })}>
            Explore NexAI <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      );
    case 'skills': {
      const preview = techStack.slice(0, 3);
      return (
        <div className="widget-body">
          <p className="widget-title">Skills</p>
          <div className="widget-pill-list">
            {preview.flatMap((group) => group.items.slice(0, 2)).slice(0, 6).map((item) => (
              <span key={item} className="widget-pill">{item}</span>
            ))}
          </div>
          <button type="button" className="widget-action" onClick={() => executePortfolioAction({ type: 'open-window', windowId: 'terminal' })}>
            Terminal <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      );
    }
    case 'project': {
      const imageChild = featuredProject?.children?.find((child) => child.fileType === 'img');
      return (
        <div className="widget-body">
          <p className="widget-eyebrow">Featured Project</p>
          {imageChild ? <img src={imageChild.imageUrl} alt="" className="widget-image" /> : null}
          <p className="widget-title">{featuredProject?.name ?? 'Projects'}</p>
          {featuredProject ? (
            <button type="button" className="widget-action" onClick={() => executePortfolioAction(featuredProjectAction)}>
              {featuredProject.kind === 'app' ? 'Open' : 'Open in Finder'} <ExternalLink size={11} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      );
    }
    case 'photo': {
      const photo = gallery[0];
      return (
        <div className="widget-body widget-body--photo">
          {photo ? <img src={photo.img} alt="" className="widget-image widget-image--fill" /> : null}
          <button type="button" className="widget-action widget-action--overlay" onClick={() => executePortfolioAction({ type: 'open-photos-section', section: 'library' })}>
            Photos <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      );
    }
    case 'spotify':
      return (
        <div className="widget-body">
          <img src={SPOTIFY_PLAYLIST.icon} alt="" className="widget-image widget-image--square" />
          <p className="widget-title">{SPOTIFY_PLAYLIST.title}</p>
          <button type="button" className="widget-action" onClick={() => executePortfolioAction({ type: 'open-window', windowId: 'spotify' })}>
            Open Spotify <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      );
    case 'journey':
      return (
        <div className="widget-body">
          <p className="widget-eyebrow">Journey</p>
          <p className="widget-title">{latestJourneyEvent?.title ?? 'Time Machine'}</p>
          {latestJourneyEvent ? <p className="widget-text">{latestJourneyEvent.dateLabel}</p> : null}
          <button type="button" className="widget-action" onClick={() => executePortfolioAction({ type: 'open-time-machine' })}>
            Time Machine <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      );
    case 'contact':
      return (
        <div className="widget-body">
          <p className="widget-title">Let&apos;s Connect</p>
          <button type="button" className="widget-action" onClick={() => executePortfolioAction({ type: 'open-window', windowId: 'contact' })}>
            Contact <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      );
    default:
      return null;
  }
}

function WidgetCard({ widget, editMode }) {
  const cardRef = useRef(null);
  const { updateWidgetPosition, updateWidgetSize, removeWidget, toggleWidgetVisible } = useWidgetsStore();
  const meta = getWidgetTypeMeta(widget.type);
  const { width, height } = WIDGET_DIMENSIONS[widget.size];
  const activeOverlay = useSystemUIStore((state) => state.activeOverlay);

  useGSAP(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const [instance] = Draggable.create(el, {
      trigger: el.querySelector('.widget-drag-handle'),
      bounds: '#home',
      onDragEnd: function onDragEnd() {
        const rect = el.getBoundingClientRect();
        const homeRect = document.getElementById('home')?.getBoundingClientRect() ?? { left: 0, top: 0 };
        const rawX = rect.left - homeRect.left;
        const rawY = rect.top - homeRect.top;
        const snappedX = Math.round(rawX / GRID_SNAP) * GRID_SNAP;
        const snappedY = Math.round(rawY / GRID_SNAP) * GRID_SNAP;
        gsap.set(el, { x: 0, y: 0 });
        updateWidgetPosition(widget.id, snappedX, snappedY);
      },
    });
    return () => instance.kill();
  }, [widget.id]);

  // Mission Control shrinks/animates every window's transform — a widget
  // drag mid-overview would fight that, so dragging is disabled while it's
  // active (re-enabled automatically once it closes).
  useEffect(() => {
    const instance = Draggable.get(cardRef.current);
    if (!instance) return;
    if (activeOverlay === 'mission-control') instance.disable(); else instance.enable();
  }, [activeOverlay]);

  const cycleSize = () => {
    const index = WIDGET_SIZES.indexOf(widget.size);
    const next = WIDGET_SIZES[(index + 1) % WIDGET_SIZES.length];
    updateWidgetSize(widget.id, next);
  };

  const handleKeyDown = (event) => {
    if (!editMode) return;
    const deltas = { ArrowUp: [0, -KEYBOARD_STEP], ArrowDown: [0, KEYBOARD_STEP], ArrowLeft: [-KEYBOARD_STEP, 0], ArrowRight: [KEYBOARD_STEP, 0] };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    updateWidgetPosition(widget.id, widget.x + delta[0], widget.y + delta[1]);
  };

  if (!widget.visible && !editMode) return null;

  return (
    <div
      ref={cardRef}
      className={clsx('widget-card', `widget-size-${widget.size}`, editMode && 'is-editing', !widget.visible && 'is-hidden')}
      style={{ left: widget.x, top: widget.y, width, height }}
      tabIndex={editMode ? 0 : -1}
      role="group"
      aria-label={`${meta?.label ?? widget.type} widget`}
      onKeyDown={handleKeyDown}
    >
      {editMode ? (
        <div className="widget-drag-handle" aria-hidden="true">
          <GripVertical size={13} />
        </div>
      ) : null}
      <WidgetContent type={widget.type} />
      {editMode ? (
        <div className="widget-edit-controls">
          <button type="button" className="widget-edit-btn" aria-label="Change widget size" onClick={cycleSize}>
            <Maximize2 size={12} aria-hidden="true" />
          </button>
          <button type="button" className="widget-edit-btn" aria-label={widget.visible ? 'Hide widget' : 'Show widget'} onClick={() => toggleWidgetVisible(widget.id)}>
            {widget.visible ? 'Hide' : 'Show'}
          </button>
          <button type="button" className="widget-edit-btn widget-edit-btn--danger" aria-label="Remove widget" onClick={() => removeWidget(widget.id)}>
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WidgetGallery({ onClose }) {
  const { addWidget } = useWidgetsStore();
  const galleryRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    const handlePointerDown = (event) => {
      if (galleryRef.current?.contains(event.target)) return;
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  return createPortal(
    <div ref={galleryRef} id="widget-gallery" role="dialog" aria-label="Add a widget" className="widget-gallery-panel">
      <div className="widget-gallery-header">
        <p>Add a Widget</p>
        <button type="button" aria-label="Close" onClick={onClose}><X size={14} aria-hidden="true" /></button>
      </div>
      <div className="widget-gallery-grid">
        {WIDGET_TYPES.map((widgetType) => {
          const Icon = widgetType.icon;
          return (
            <button
              key={widgetType.type}
              type="button"
              className="widget-gallery-item"
              onClick={() => { addWidget(widgetType.type); playToggleSound(); }}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{widgetType.label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

const DesktopWidgets = () => {
  const showWidgets = usePreferencesStore((state) => state.desktop.showWidgets);
  const { instances, isEditMode, setEditMode, clampAllToViewport } = useWidgetsStore();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  useEffect(() => {
    if (!Draggable.core) gsap.registerPlugin(Draggable);
  }, []);

  useEffect(() => {
    const handleResize = () => clampAllToViewport();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampAllToViewport]);

  useEffect(() => {
    if (!isEditMode) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (isGalleryOpen) { setIsGalleryOpen(false); return; }
      // Defer to anything already layered on top (an expanded Stack, Get
      // Info, a context menu, or a screen-takeover overlay) — otherwise a
      // single Escape meant to close one of those would also silently
      // kick the desktop out of widget edit mode.
      const uiState = useSystemUIStore.getState();
      if (uiState.activeOverlay || uiState.stackExpanded || uiState.getInfoItem || uiState.contextMenu) return;
      setEditMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, isGalleryOpen, setEditMode]);

  const visibleInstances = useMemo(
    () => instances.filter((widget) => widget.visible || isEditMode),
    [instances, isEditMode],
  );

  if (!showWidgets && !isEditMode) return null;

  return (
    <>
      <div className="desktop-widgets-layer">
        {visibleInstances.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} editMode={isEditMode} />
        ))}
      </div>

      {isEditMode ? (
        <div className="widget-edit-toolbar">
          <p>Editing Widgets</p>
          <button type="button" className="widget-edit-toolbar-btn" onClick={() => setIsGalleryOpen(true)}>
            <Plus size={13} aria-hidden="true" /> Add Widget
          </button>
          <button type="button" className="widget-edit-toolbar-btn" onClick={() => setEditMode(false)}>Done</button>
        </div>
      ) : null}

      {isGalleryOpen ? <WidgetGallery onClose={() => setIsGalleryOpen(false)} /> : null}
    </>
  );
};

export default DesktopWidgets;
