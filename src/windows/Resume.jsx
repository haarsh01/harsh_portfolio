import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Download, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import {WindowControls} from "#components/index.js";
import ShareButton from '#components/ShareButton.jsx';
import {Document, Page, pdfjs} from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
'pdfjs-dist/build/pdf.worker.min.mjs',
import.meta.url,
).toString();

const RESUME_FILE_NAME = "cv_harsh_kaushik.pdf";
const RESUME_PDF_URL = `${import.meta.env.BASE_URL}files/${RESUME_FILE_NAME}`;
// Keeps rendered pages readable on a wide, maximized window and legible on
// a narrow/mobile one, per the viewer's own available width.
const MIN_PAGE_WIDTH = 320;
const MAX_PAGE_WIDTH = 900;
const VIEWER_PADDING = 32; // matches .pdf-viewer's `p-4` on both sides

const clampPageWidth = (width) => Math.min(Math.max(width - VIEWER_PADDING, MIN_PAGE_WIDTH), MAX_PAGE_WIDTH);

const Resume = () => {
  const viewerRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [numPages, setNumPages] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Measured synchronously (before paint) so the first render already has a
  // real width instead of flashing at the fallback, then kept in sync with
  // every later resize/maximize/restore via ResizeObserver.
  useLayoutEffect(() => {
    const el = viewerRef.current;
    if(!el) return undefined;

    setPageWidth(clampPageWidth(el.getBoundingClientRect().width));

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if(width) setPageWidth(clampPageWidth(width));
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const handleLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(total);
    setLoadError(null);
  }, []);

  const handleLoadError = useCallback(() => {
    setLoadError("The résumé PDF couldn't be loaded.");
  }, []);

  return (
   <>
   <div id="window-header">
    <WindowControls target="resume" />
    <h2>Resume / CV</h2>

    <ShareButton destination={{ app: 'resume' }} className="icon" label="Share Resume" />

    <a href={RESUME_PDF_URL}
    download={RESUME_FILE_NAME}
    className="resume-download-button ui-button ui-button--secondary ui-button--small"
    title={`Download ${RESUME_FILE_NAME}`}
    >
      <Download size={14} aria-hidden="true" />
      <span>Download CV</span>
    </a>
   </div>

   <div className="resume-meta">
    <span className="resume-filename" title={RESUME_FILE_NAME}>{RESUME_FILE_NAME}</span>
    <div className="resume-meta-right">
      {numPages ? (
        <span className="resume-page-count">{numPages} page{numPages === 1 ? '' : 's'}</span>
      ) : null}
      <a
        href={RESUME_PDF_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="resume-open-tab"
      >
        <ExternalLink size={12} aria-hidden="true" />
        <span>Open in new tab</span>
      </a>
    </div>
   </div>

   <div className="pdf-viewer" ref={viewerRef}>
    {loadError ? (
      <div className="resume-error" role="alert">
        <AlertCircle size={32} aria-hidden="true" />
        <p>{loadError}</p>
        <a
          href={RESUME_PDF_URL}
          download={RESUME_FILE_NAME}
          className="ui-button ui-button--secondary ui-button--small"
        >
          <Download size={14} aria-hidden="true" />
          <span>Download CV</span>
        </a>
      </div>
    ) : (
      <Document
        file={RESUME_PDF_URL}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={
          <div className="resume-loading">
            <Loader2 size={22} aria-hidden="true" className="ui-button__spinner" />
            <p>Loading résumé…</p>
          </div>
        }
        className="resume-pages"
      >
        {numPages ? Array.from({ length: numPages }, (_, index) => (
          <Page
            key={`resume-page-${index + 1}`}
            pageNumber={index + 1}
            width={pageWidth || undefined}
            renderTextLayer
            renderAnnotationLayer
            className="resume-page"
          />
        )) : null}
      </Document>
    )}
   </div>
   </>
  )
};
const ResumeWindow = WindowWrapper(Resume, "resume");

export default ResumeWindow;
