import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Disable worker entirely - run on main thread for universal compatibility
// This avoids ALL worker loading issues (CORS, CSP, CDN blocks, MIME types)
pdfjsLib.GlobalWorkerOptions.workerPort = null;

const { getDocument } = pdfjsLib;

export default function PdfDocumentViewer({ src, zoom = 100, title }) {
  const containerRef = useRef(null);
  const canvasRefs = useRef([]);
  const [pages, setPages] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    
    const loadPdf = async () => {
      try {
        const loadingTask = getDocument(src);
        const pdf = await loadingTask.promise;
        
        if (!cancelled) {
          setPdfDoc(pdf);
          setPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Không thể tải PDF');
          setStatus('error');
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [src]);

  // Render pages with proper mobile scaling
  useEffect(() => {
    if (!pdfDoc || status !== 'ready' || !containerRef.current) return;

    const renderPages = async () => {
      const containerWidth = containerRef.current.clientWidth - 24;
      
      for (let pageNum of pages) {
        const canvas = canvasRefs.current[pageNum - 1];
        if (!canvas) continue;

        const page = await pdfDoc.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        
        // Scale to fit container width, then apply user zoom
        const scale = (containerWidth / baseViewport.width) * (zoom / 100);
        const viewport = page.getViewport({ scale });
        
        // High DPI rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        await page.render({ 
          canvasContext: ctx, 
          viewport 
        }).promise;
      }
    };

    renderPages();
  }, [pdfDoc, pages, zoom, status]);

  if (status === 'loading') {
    return <div className="pdf-viewer-message">Đang tải PDF...</div>;
  }

  if (status === 'error') {
    return (
      <div className="pdf-viewer-message pdf-viewer-error">
        <p>Lỗi: {error}</p>
        <a href={src} target="_blank" rel="noreferrer">Mở PDF riêng</a>
      </div>
    );
  }

  return (
    <div 
      className="pdf-document-viewer" 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      }}
    >
      {pages.map((pageNum) => (
        <canvas
          key={pageNum}
          ref={(el) => { canvasRefs.current[pageNum - 1] = el; }}
          className="pdf-document-page"
          style={{ 
            display: 'block', 
            margin: '0 auto 12px',
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      ))}
    </div>
  );
}
