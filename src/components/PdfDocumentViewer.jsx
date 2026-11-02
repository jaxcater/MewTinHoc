import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite biến worker thành asset cùng origin (chạy được cả dev và build, không cần CDN/CORS).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MOBILE_QUERY = '(max-width: 820px)';
// Khoảng đệm quanh trang PDF (px). Mobile dùng đệm nhỏ để trang to tối đa.
const STAGE_PADDING_DESKTOP = 12;
const STAGE_PADDING_MOBILE = 4;
// Chặn trần bộ nhớ canvas: trang lớn nhất ~ 6 triệu điểm ảnh để không tràn RAM.
const MAX_CANVAS_PIXELS = 6_000_000;
const MAX_DPR = 2.5;
// Tỉ lệ A4 dọc, dùng làm khung chờ trước khi biết kích thước thật của trang.
const A4_RATIO = 297 / 210;

/** Hook: phát hiện màn hình mobile để chuyển sang chế độ xem từng trang. */
function useIsMobile() {
  const read = () => (typeof window === 'undefined' ? false : window.matchMedia(MOBILE_QUERY).matches);
  const [isMobile, setIsMobile] = useState(read);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

/**
 * Tải PDF. Ưu tiên nạp toàn bộ file vào bộ nhớ: signed URL của Supabase Storage
 * không trả đủ header cho range-request nên pdf.js sẽ lỗi nếu stream trực tiếp.
 */
async function openDocument(url) {
  try {
    const response = await fetch(url, { credentials: 'omit' });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) {
        return await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          isEvalSupported: false
        }).promise;
      }
    }
  } catch {
    // Rơi xuống fallback bên dưới (ví dụ môi trường chặn fetch chéo origin).
  }
  return pdfjsLib.getDocument({ url, withCredentials: false }).promise;
}

/**
 * Một trang PDF.
 * Tự đo trang, tự tính scale vừa khung, tự huỷ render dở khi đổi zoom/kích thước
 * nên không bao giờ bị lỗi "Cannot use the same canvas" hay nhấp nháy.
 */
function PdfPage({ pdfDoc, pageNumber, boxWidth, boxHeight, zoom, single, eager }) {
  const canvasRef = useRef(null);
  const holderRef = useRef(null);
  const [inView, setInView] = useState(eager);
  const [layout, setLayout] = useState(null);
  const [paintError, setPaintError] = useState('');

  // Chỉ vẽ trang đang (hoặc sắp) hiển thị để cuộn mượt với tài liệu dài.
  useEffect(() => {
    if (eager) {
      setInView(true);
      return undefined;
    }
    const node = holderRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { root: null, rootMargin: '800px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    if (!inView || !pdfDoc || boxWidth <= 0) return undefined;

    let cancelled = false;
    let task = null;

    const paint = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const base = page.getViewport({ scale: 1 });

        // --- Tính kích thước hiển thị ---
        // Mobile (single): luôn "contain" cả ngang lẫn dọc -> không cắt, không tràn.
        // Desktop: fit bề ngang, sau đó nhân zoom (zoom > 100% sẽ cuộn ngang).
        let cssWidth;
        if (single) {
          const maxW = Math.max(1, boxWidth);
          const maxH = boxHeight > 0 ? boxHeight : maxW * (base.height / base.width);
          const fitScale = Math.min(maxW / base.width, maxH / base.height);
          cssWidth = Math.max(1, Math.floor(base.width * fitScale));
        } else {
          cssWidth = Math.max(1, Math.floor(boxWidth * (zoom / 100)));
        }
        const cssHeight = Math.max(1, Math.round(cssWidth * (base.height / base.width)));
        const scale = cssWidth / base.width;

        // --- Chặn trần điểm ảnh để không tràn RAM trên máy yếu ---
        const dprRaw = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const dpr = Math.max(
          1,
          Math.min(dprRaw, Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight)))
        );

        const canvas = canvasRef.current;
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        setLayout({ width: cssWidth, height: cssHeight });

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Trình duyệt không hỗ trợ canvas 2D.');
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        task = page.render({
          canvasContext: context,
          viewport: page.getViewport({ scale }),
          transform: dpr === 1 ? null : [dpr, 0, 0, dpr, 0, 0]
        });
        await task.promise;

        if (!cancelled) setPaintError('');
      } catch (err) {
        if (cancelled || err?.name === 'RenderingCancelledException') return;
        setPaintError(err?.message || 'Không hiển thị được trang này.');
      }
    };

    paint();

    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        /* render đã hoàn tất */
      }
    };
  }, [pdfDoc, pageNumber, inView, boxWidth, boxHeight, zoom, single]);

  // Khung chờ (trước khi vẽ xong) giữ đúng tỉ lệ trang để bố cục không nhảy.
  const placeholderWidth = single
    ? Math.max(1, Math.min(boxWidth || 1, boxHeight > 0 ? boxHeight / A4_RATIO : boxWidth || 1))
    : Math.max(1, boxWidth || 1);
  const width = layout?.width ?? Math.round(placeholderWidth);
  const height = layout?.height ?? Math.round(placeholderWidth * A4_RATIO);

  return (
    <div
      ref={holderRef}
      className={`pdfx-page${single ? ' pdfx-page--single' : ''}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      data-page={pageNumber}
    >
      <canvas ref={canvasRef} className="pdfx-canvas" aria-label={`Trang ${pageNumber}`} />
      {!layout && <span className="pdfx-skeleton" aria-hidden="true" />}
      {paintError && (
        <div className="pdfx-page-error">
          <AlertTriangle size={15} />
          <span>Trang {pageNumber}: {paintError}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Trình xem PDF.
 * - Desktop: cuộn dọc liên tục, mỗi trang tự fit bề ngang khung đọc.
 * - Mobile:  từng trang một, tự fit cả ngang lẫn dọc (không tràn, không cắt),
 *            chuyển trang bằng nút "‹" / "›" thay vì vuốt.
 */
export default function PdfDocumentViewer({ src, zoom = 100, title }) {
  const isMobile = useIsMobile();
  const stageRef = useRef(null);
  const scrollRef = useRef(null);
  const dialogLabel = title ? `Tài liệu PDF: ${title}` : 'Tài liệu PDF';

  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [box, setBox] = useState({ width: 0, height: 0 });

  // 1. Tải tài liệu
  useEffect(() => {
    let cancelled = false;
    let doc = null;

    setStatus('loading');
    setError('');
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);

    (async () => {
      try {
        doc = await openDocument(src);
        if (cancelled) {
          doc.destroy();
          return;
        }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Không thể tải tài liệu PDF.');
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      try {
        doc?.destroy();
      } catch {
        /* đã huỷ trước đó */
      }
    };
  }, [src]);

  // 2. Đo khung đọc -> tính lại scale khi xoay máy / đổi kích thước cửa sổ
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;

    const padding = isMobile ? STAGE_PADDING_MOBILE : STAGE_PADDING_DESKTOP;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(0, rect.width - padding * 2);
      const height = Math.max(0, rect.height - padding * 2);
      setBox((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height }
      );
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      window.addEventListener('orientationchange', measure);
      return () => {
        window.removeEventListener('resize', measure);
        window.removeEventListener('orientationchange', measure);
      };
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [status, isMobile]);

  // 3. Đổi trang (chế độ mobile)
  const goToPage = useCallback(
    (next) => {
      setCurrentPage((prev) => {
        const target = Math.min(Math.max(1, next), numPages || 1);
        return target === prev ? prev : target;
      });
    },
    [numPages]
  );

  // 4. Desktop: theo dõi trang đang xem để hiện "Trang x / y"
  useEffect(() => {
    if (isMobile || status !== 'ready') return undefined;
    const root = scrollRef.current;
    if (!root) return undefined;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rootRect = root.getBoundingClientRect();
        const anchor = rootRect.top + rootRect.height * 0.35;
        let visible = 1;
        root.querySelectorAll('.pdfx-page').forEach((pageEl) => {
          if (pageEl.getBoundingClientRect().bottom >= anchor) {
            visible = Number(pageEl.dataset.page) || visible;
          }
        });
        setCurrentPage((prev) => (prev === visible ? prev : visible));
      });
    };

    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isMobile, status]);

  // 5. Phím mũi tên qua lại khi xem từng trang
  useEffect(() => {
    if (!isMobile || status !== 'ready') return undefined;
    const onKey = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') goToPage(currentPage + 1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') goToPage(currentPage - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, status, currentPage, goToPage]);

  const total = numPages || 1;

  if (status === 'loading') {
    return (
      <div className="pdfx-message" role="status" aria-live="polite">
        <Loader2 size={22} className="pdfx-spin" />
        <span>Đang tải tài liệu PDF...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="pdfx-message pdfx-message--error" role="alert">
        <AlertTriangle size={22} />
        <strong>Không mở được tài liệu</strong>
        <p>{error}</p>
        <a href={src} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          <span>Mở PDF trong tab mới</span>
        </a>
      </div>
    );
  }

  if (isMobile) {
    const canPrev = currentPage > 1;
    const canNext = currentPage < total;

    return (
      <div className="pdfx pdfx--mobile" role="region" aria-label={dialogLabel} style={{ '--pdfx-pad': `${STAGE_PADDING_MOBILE}px` }}>
        <div className="pdfx-stage pdfx-stage--single" ref={stageRef}>          <PdfPage
            pdfDoc={pdfDoc}
            pageNumber={currentPage}
            boxWidth={box.width}
            boxHeight={box.height}
            zoom={zoom}
            single
            eager
          />

          {/* Nút chuyển trang nổi 2 bên: mờ, gọn, không chiếm diện tích màn hình */}
          <button
            type="button"
            className="pdfx-nav pdfx-nav--prev"
            onClick={() => goToPage(currentPage - 1)}
            disabled={!canPrev}
            aria-label="Trang trước"
            title="Trang trước"
          >
            <ChevronLeft size={20} strokeWidth={2.6} />
          </button>

          <button
            type="button"
            className="pdfx-nav pdfx-nav--next"
            onClick={() => goToPage(currentPage + 1)}
            disabled={!canNext}
            aria-label="Trang tiếp theo"
            title="Trang tiếp theo"
          >
            <ChevronRight size={20} strokeWidth={2.6} />
          </button>

          <div className="pdfx-pill" aria-live="polite">
            <span className="pdfx-pill-current">{currentPage}</span>
            <span className="pdfx-pill-sep">/</span>
            <span className="pdfx-pill-total">{total}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdfx pdfx--desktop" role="region" aria-label={dialogLabel} style={{ '--pdfx-pad': `${STAGE_PADDING_DESKTOP}px` }}>
      <div className="pdfx-stage pdfx-stage--scroll" ref={stageRef}>
        <div className="pdfx-scroll" ref={scrollRef}>
          <div className="pdfx-stack">
            {box.width > 0 &&
              Array.from({ length: total }, (_, i) => i + 1).map((pageNumber) => (
                <PdfPage
                  key={`${pageNumber}`}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNumber}
                  boxWidth={box.width}
                  boxHeight={box.height}
                  zoom={zoom}
                  single={false}
                  eager={pageNumber <= 2}
                />
              ))}
          </div>
        </div>
        <div className="pdfx-badge">Trang {currentPage}/{total}</div>
      </div>
    </div>
  );
}
