import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Use legacy build which includes worker inline and handles all browser compat
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const { getDocument } = pdfjsLib;

export default function PdfDocumentViewer({ src, zoom = 100, title }) {
  const scrollRef = useRef(null);
  const canvasRefs = useRef([]);
  const documentRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;
    setError('');
    setStatus('loading');
    setPages([]);
    canvasRefs.current = [];

    const loadPdf = async () => {
      try {
        loadingTask = getDocument({ url: src });
        const document = await loadingTask.promise;
        documentRef.current = document;
        if (!cancelled) {
          setPages(Array.from({ length: document.numPages }, (_, index) => index + 1));
          setStatus('ready');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Không thể tải tài liệu PDF.');
          setStatus('error');
        }
      }
    };
    void loadPdf();

    return () => {
      cancelled = true;
      documentRef.current = null;
      // PDF.js loading-task destruction also tears down its document and worker.
      // Never destroy the document separately; concurrent destroy calls race.
      if (loadingTask) {
        void loadingTask.destroy().catch(() => {
          // Expected if an in-flight request was already aborted by the browser.
        });
      }
    };
  }, [src, loadAttempt]);

  useEffect(() => {
    if (status !== 'ready' || !pages.length || !scrollRef.current) return undefined;
    let cancelled = false;
    const deviceScale = window.devicePixelRatio || 1;

    const renderPages = async () => {
      for (let index = 0; index < pages.length; index += 1) {
        const canvas = canvasRefs.current[index];
        if (!canvas || cancelled) continue;
        try {
          const document = documentRef.current;
          if (!document || cancelled) return;
          const page = await document.getPage(index + 1);
          const availableWidth = Math.max(1, scrollRef.current.clientWidth - 24);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = (availableWidth / baseViewport.width) * (zoom / 100);
          const viewport = page.getViewport({ scale });
          canvas.width = Math.ceil(viewport.width * deviceScale);
          canvas.height = Math.ceil(viewport.height * deviceScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const context = canvas.getContext('2d', { alpha: false });
          const renderTask = page.render({
            canvasContext: context,
            viewport,
            transform: deviceScale === 1 ? null : [deviceScale, 0, 0, deviceScale, 0, 0]
          });
          renderTaskRef.current = renderTask;
          await renderTask.promise;
          if (renderTaskRef.current === renderTask) renderTaskRef.current = null;
        } catch (renderError) {
          renderTaskRef.current = null;
          // Cancellation is expected when the viewer unmounts or zoom changes.
          if (cancelled || renderError?.name === 'RenderingCancelledException' || renderError?.name === 'AbortException') return;
          setError(renderError?.message || 'Không thể hiển thị trang PDF.');
          setStatus('error');
          return;
        }
      }
    };

    renderPages();
    return () => {
      cancelled = true;
      try {
        renderTaskRef.current?.cancel();
      } catch {
        // A render task can finish between cleanup and cancellation.
      }
      renderTaskRef.current = null;
    };
  }, [pages, src, zoom, status]);

  return (
    <div className="pdf-document-viewer" ref={scrollRef} aria-label={title}>
      {status === 'loading' && <div className="pdf-viewer-message">Đang tải tài liệu PDF…</div>}
      {status === 'error' && (
        <div className="pdf-viewer-message pdf-viewer-error">
          <p>Không thể hiển thị PDF trực tiếp. Kiểm tra quyền CORS của tệp hoặc mở tài liệu trong tab mới.</p>
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Thử tải lại</button>
          <a href={src} target="_blank" rel="noreferrer">Mở PDF riêng</a>
          <small>{error}</small>
        </div>
      )}
      {status === 'ready' && pages.map((pageNumber, index) => (
        <canvas
          key={`${src}-${pageNumber}`}
          ref={(canvas) => { canvasRefs.current[index] = canvas; }}
          className="pdf-document-page"
          aria-label={`Trang ${pageNumber}`}
        />
      ))}
    </div>
  );
}
