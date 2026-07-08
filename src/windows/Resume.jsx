import React, { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react';
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

const Resume = () => {
  const viewerRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(0);

  useEffect(() => {
    const el = viewerRef.current;
    if(!el) return undefined;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if(width) setPageWidth(Math.max(width - 32, 200));
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
   <>
   <div id="window-header">
    <WindowControls target="resume" />
    <h2>Resume.pdf</h2>

    <ShareButton destination={{ app: 'resume' }} className="icon" label="Share Resume" />

    <a href="files/resume.pdf"
    download
    className="cursor-pointer"
    title="Download resume"
    >  <Download className="icon"/>
    </a>

   </div>
   <div className="pdf-viewer" ref={viewerRef}>
    <Document file="files/resume.pdf">
      <Page pageNumber={1}
      width={pageWidth || undefined}
      renderTextLayer
      renderAnnotationLayer
      />
    </Document>
   </div>
   </>
  )
};
const ResumeWindow = WindowWrapper(Resume, "resume");

export default ResumeWindow;
