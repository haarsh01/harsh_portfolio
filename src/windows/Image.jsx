// JavaScript (React)
// src/windows/Image.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Scan, ChevronLeft, ChevronRight, Heart, MapPin } from 'lucide-react';
import { WindowControls } from "#components";
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window';
import useSystemUIStore from '#store/systemUI.js';
import usePhotoFavoritesStore from '#store/photoFavorites.js';

// Manual zoom is a percentage of the image's real NATURAL pixel size —
// distinct from "Fit", which is whatever percentage of natural size
// currently fills the stage without overflowing it. Fit is the only
// default: a phone photo's natural size is almost always taller than the
// viewer, so opening at a fixed "100%" (as this used to) let it spill out
// of the window.
const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];
const DEFAULT_ZOOM_MODE = 'fit';

const ImageFile = () => {
  const { windows } = useWindowStore();
  const win = windows?.imgfile;
  const data = win?.data;
  // 'fit' or one of ZOOM_STEPS (a percentage of natural size).
  const [zoomMode, setZoomMode] = useState(DEFAULT_ZOOM_MODE);
  const [naturalSize, setNaturalSize] = useState(null);
  const [fitSize, setFitSize] = useState(null);
  const [index, setIndex] = useState(data?.index ?? 0);
  const previewRef = useRef(null);
  const imgRef = useRef(null);

  // Optional gallery context (only set when opened from the Photos app —
  // every other caller (Finder, Talks, About) still just passes
  // {name, imageUrl} and gets exactly the single-image viewer this always
  // was, with no prev/next, favorite, or metadata affordances.
  const photos = Array.isArray(data?.photos) ? data.photos : null;
  const hasGallery = !!photos && photos.length > 0;
  const current = hasGallery ? photos[Math.min(index, photos.length - 1)] : null;

  const imageUrl = current?.src ?? data?.imageUrl;
  const name = current?.filename ?? data?.name;

  const toggleFavorite = usePhotoFavoritesStore((state) => state.toggleFavorite);
  const favoriteIds = usePhotoFavoritesStore((state) => state.ids);
  const isFavorite = !!current && favoriteIds.includes(current.id);

  // Identifies which photo was just *requested* (as opposed to `index`,
  // which also changes from in-window Previous/Next and must NOT trigger
  // this reset) — the id of data.photos[data.index] when in gallery mode,
  // else the plain imageUrl every other caller passes.
  const requestedKey = hasGallery ? photos[Math.min(data.index ?? 0, photos.length - 1)]?.id : data?.imageUrl;
  const [syncedKey, setSyncedKey] = useState(requestedKey);

  // Resets zoom/fit/index whenever a genuinely different image (or a
  // different gallery entirely) is opened — adjusted during render, not in
  // an effect, since this is purely "reset state in response to a changed
  // value."
  if (requestedKey !== syncedKey) {
    setSyncedKey(requestedKey);
    setZoomMode(DEFAULT_ZOOM_MODE);
    setNaturalSize(null);
    setFitSize(null);
    setIndex(data?.index ?? 0);
  }

  // Measures the stage and the loaded image, computing both its real
  // natural size (used for manual zoom-step math) and its "fit" size — the
  // largest it can render at inside the stage without exceeding it in
  // either dimension. Never upscales a small image past its natural size.
  const computeSizes = () => {
    const container = previewRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;

    const ratio = Math.min(
      container.clientWidth / img.naturalWidth,
      container.clientHeight / img.naturalHeight,
      1,
    );
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setFitSize({ width: img.naturalWidth * ratio, height: img.naturalHeight * ratio });
  };

  // Depends on whether .preview is currently rendered at all (it's
  // conditional on imageUrl), not on the empty array the original version
  // used — this component stays mounted for the app's lifetime (windows
  // are hidden via CSS, not unmounted), so an empty-deps effect only ever
  // ran once, before the very first image had opened and .preview
  // existed, permanently found previewRef.current null, and never
  // attached an observer at all — meaning resize/maximize/restore never
  // recalculated Fit after the initial onLoad-triggered measurement.
  useEffect(() => {
    const container = previewRef.current;
    if(!container) return undefined;

    const observer = new ResizeObserver(() => computeSizes());
    observer.observe(container);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!imageUrl]);

  const goPrev = () => {
    if (!hasGallery) return;
    setIndex((i) => Math.max(0, i - 1));
    setZoomMode(DEFAULT_ZOOM_MODE);
    setNaturalSize(null);
    setFitSize(null);
  };
  const goNext = () => {
    if (!hasGallery) return;
    setIndex((i) => Math.min(photos.length - 1, i + 1));
    setZoomMode(DEFAULT_ZOOM_MODE);
    setNaturalSize(null);
    setFitSize(null);
  };

  // Scoped keyboard navigation: only acts while this window is open, not
  // minimized, no overlay is active, and it's the frontmost normal window
  // — same convention Time Machine's arrow-key navigation uses — so it
  // never steals keys intended for another focused window or overlay.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const winState = useWindowStore.getState().windows.imgfile;
      if (!winState?.isOpen || winState.isMinimized) return;
      if (useSystemUIStore.getState().activeOverlay) return;
      const allWindows = useWindowStore.getState().windows;
      const isFrontmost = Object.values(allWindows).every((w) => !w.isOpen || w.isMinimized || w.zIndex <= winState.zIndex);
      if (!isFrontmost) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        useWindowStore.getState().closeWindow('imgfile');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGallery, photos?.length]);

  if (!data) return null;

  // Zooming in from Fit jumps to the first manual step that's actually
  // bigger than what Fit is already showing — not a fixed step — so a
  // small image already filling the stage at, say, 140% doesn't jump
  // backwards to 50% on the first click.
  const zoomIn = () => {
    setZoomMode((mode) => {
      if (mode !== 'fit') {
        const currentIndex = ZOOM_STEPS.indexOf(mode);
        return ZOOM_STEPS[Math.min(currentIndex + 1, ZOOM_STEPS.length - 1)];
      }
      if (!naturalSize || !fitSize || !naturalSize.width) return ZOOM_STEPS[0];
      const fitPercent = (fitSize.width / naturalSize.width) * 100;
      return ZOOM_STEPS.find((step) => step > fitPercent + 0.5) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    });
  };

  // Nothing renders smaller than Fit — zooming out from the smallest
  // manual step returns to Fit rather than continuing past it.
  const zoomOut = () => {
    setZoomMode((mode) => {
      if (mode === 'fit') return 'fit';
      const currentIndex = ZOOM_STEPS.indexOf(mode);
      return currentIndex <= 0 ? 'fit' : ZOOM_STEPS[currentIndex - 1];
    });
  };

  const resetZoom = () => setZoomMode('fit');
  const isFitMode = zoomMode === 'fit';

  const imageStyle = !naturalSize || !fitSize
    // Before the image has loaded/measured, a passive safety net (never a
    // permanent class rule, which would also cap intentional zoom-beyond-
    // fit) so nothing can flash at unconstrained natural size.
    ? { maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }
    : isFitMode
      ? { width: fitSize.width, height: fitSize.height }
      : { width: (naturalSize.width * zoomMode) / 100, height: (naturalSize.height * zoomMode) / 100 };

  const altText = current?.alt ?? name ?? 'Image file';

  return (
    <>
      <div id="window-header">
        <WindowControls target="imgfile"/>
        {name ? <p className="flex-1 text-center truncate px-2">{name}</p> : null}

        <div className="flex items-center gap-2">
          {current ? (
            <button
              type="button"
              className="favorite-toggle"
              aria-label={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              aria-pressed={isFavorite}
              onClick={() => toggleFavorite(current.id)}
            >
              <Heart className="icon" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          ) : null}

          {imageUrl ? (
            <div className="zoom-controls">
              <button type="button" onClick={zoomOut} disabled={isFitMode} aria-label="Zoom out">
                <Minus className="icon"/>
              </button>
              <span>{isFitMode ? 'Fit' : `${zoomMode}%`}</span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={!isFitMode && zoomMode === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                aria-label="Zoom in"
              >
                <Plus className="icon"/>
              </button>
              <button type="button" onClick={resetZoom} disabled={isFitMode} aria-label="Fit to window">
                <Scan className="icon"/>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {current && (current.dateLabel || current.location?.label || data.contextLabel) ? (
        <div className="photo-meta-bar">
          {data.contextLabel ? <span className="photo-meta-context">{data.contextLabel}</span> : null}
          {current.dateLabel ? <span>{current.dateLabel}</span> : null}
          {current.location?.label ? (
            <span className="photo-meta-location"><MapPin className="icon" aria-hidden="true" />{current.location.label}</span>
          ) : null}
        </div>
      ) : null}

      {imageUrl ? (
        <div className="preview" ref={previewRef}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt={altText}
            onLoad={computeSizes}
            onDragStart={(event) => event.preventDefault()}
            decoding="async"
            style={imageStyle}
          />

          {hasGallery && photos.length > 1 ? (
            <>
              <button
                type="button"
                className="photo-nav photo-nav--prev"
                aria-label="Previous photo"
                onClick={goPrev}
                disabled={index <= 0}
              >
                <ChevronLeft className="icon" />
              </button>
              <button
                type="button"
                className="photo-nav photo-nav--next"
                aria-label="Next photo"
                onClick={goNext}
                disabled={index >= photos.length - 1}
              >
                <ChevronRight className="icon" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

const ImageWindow = WindowWarpper(ImageFile, 'imgfile');
export default ImageWindow;
