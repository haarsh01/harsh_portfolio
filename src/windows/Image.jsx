// JavaScript (React)
// src/windows/Image.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Scan } from 'lucide-react';
import { WindowControls } from "#components";
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window';

const MIN_ZOOM = 25;
const MAX_ZOOM = 400;
const ZOOM_STEP = 25;
const DEFAULT_ZOOM = 100;

const ImageFile = () => {
  const { windows } = useWindowStore();
  const win = windows?.imgfile;
  const data = win?.data;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [fitSize, setFitSize] = useState(null);
  const [syncedImageUrl, setSyncedImageUrl] = useState(data?.imageUrl);
  const previewRef = useRef(null);
  const imgRef = useRef(null);

  // Resets zoom/fit whenever a different image opens — adjusted during
  // render, not in an effect, since this is purely "reset state in
  // response to a changed value."
  if (data?.imageUrl !== syncedImageUrl) {
    setSyncedImageUrl(data?.imageUrl);
    setZoom(DEFAULT_ZOOM);
    setFitSize(null);
  }

  const computeFitSize = () => {
    const container = previewRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;

    const ratio = Math.min(
      container.clientWidth / img.naturalWidth,
      container.clientHeight / img.naturalHeight,
      1,
    );
    setFitSize({ width: img.naturalWidth * ratio, height: img.naturalHeight * ratio });
  };

  useEffect(() => {
    const container = previewRef.current;
    if(!container) return undefined;

    const observer = new ResizeObserver(() => computeFitSize());
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  if (!data) return null;

  const { name, imageUrl } = data;

  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const resetZoom = () => setZoom(DEFAULT_ZOOM);

  const scaledStyle = fitSize
    ? { width: (fitSize.width * zoom) / 100, height: (fitSize.height * zoom) / 100 }
    : undefined;

  return (
    <>
      <div id="window-header">
        <WindowControls target="imgfile"/>
        {name ? <p className="flex-1 text-center truncate px-2">{name}</p> : null}

        {imageUrl ? (
          <div className="zoom-controls">
            <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
              <Minus className="icon"/>
            </button>
            <span>{zoom}%</span>
            <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
              <Plus className="icon"/>
            </button>
            <button type="button" onClick={resetZoom} aria-label="Fit to window">
              <Scan className="icon"/>
            </button>
          </div>
        ) : null}
      </div>

      {imageUrl ? (
        <div className="preview" ref={previewRef}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt={name || 'image-file'}
            onLoad={computeFitSize}
            style={scaledStyle}
          />
        </div>
      ) : null}
    </>
  );
};

const ImageWindow = WindowWarpper(ImageFile, 'imgfile');
export default ImageWindow;
