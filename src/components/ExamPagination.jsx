// Lucian UX/UI Prompt #449 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#449
import { useLayoutEffect, useRef } from 'react';
import './examPagination.css';

function getWindowSlots(cur, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }
  if (cur <= 4) return [1, 2, 3, 4, 5, '', total];
  if (cur >= total - 3) {
    return [1, '', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '', cur - 1, cur, cur + 1, '', total];
}

export function ExamPagination({
  currentPage,
  totalPages,
  onPageChange,
  lightShell = true,
  ariaLabel = 'Phân trang kho đề thi',
}) {
  const pillRef = useRef(null);
  const slotRefs = useRef([]);
  const prevPageRef = useRef(null);
  const prevTotalRef = useRef(null);
  const prevSlotsRef = useRef([]);
  const timersRef = useRef([]);

  const safeTotal = Math.max(1, totalPages || 1);
  const safePage = Math.max(1, Math.min(safeTotal, currentPage || 1));
  const windowSlots = getWindowSlots(safePage, safeTotal);

  useLayoutEffect(() => {
    if (safeTotal <= 1) return undefined;

    const slots = getWindowSlots(safePage, safeTotal);
    const prevPage = prevPageRef.current;
    const prevTotal = prevTotalRef.current;
    const isInitialOrResized = prevPage === null || prevTotal !== safeTotal;
    const back = prevPage !== null && safePage < prevPage;

    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];

    slots.forEach((v, k) => {
      const btn = slotRefs.current[k];
      if (!btn) return;
      const valStr = String(v);
      const txt = v === '' ? '…' : valStr;

      if (isInitialOrResized) {
        btn.replaceChildren();
        const span = document.createElement('span');
        span.textContent = txt;
        btn.appendChild(span);
        btn.classList.remove('is-back');
        return;
      }

      if (prevSlotsRef.current[k] === valStr) return;

      btn.querySelectorAll('.is-out').forEach((el) => el.remove());
      const curSpan = btn.querySelector('span');
      const nextSpan = document.createElement('span');
      nextSpan.textContent = txt;
      nextSpan.className = 'is-in';
      btn.classList.toggle('is-back', back);

      if (curSpan) {
        curSpan.className = 'is-out';
        const tId = window.setTimeout(() => {
          if (curSpan.isConnected) curSpan.remove();
        }, 320);
        timersRef.current.push(tId);
      }
      btn.appendChild(nextSpan);
    });

    const pill = pillRef.current;
    const activeIdx = Math.max(0, slots.indexOf(safePage));
    if (pill) {
      if (isInitialOrResized) {
        pill.style.transition = 'none';
        pill.style.setProperty('--x', `${activeIdx * 34}px`);
        void pill.offsetWidth;
        pill.style.transition = '';
      } else {
        pill.classList.remove('is-sq');
        void pill.offsetWidth;
        pill.classList.add('is-sq');
        pill.style.setProperty('--x', `${activeIdx * 34}px`);
      }
    }

    prevPageRef.current = safePage;
    prevTotalRef.current = safeTotal;
    prevSlotsRef.current = slots.map((v) => String(v));

    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, [safePage, safeTotal]);

  if (safeTotal <= 1) return null;

  const go = (nextPage) => {
    const clamped = Math.max(1, Math.min(safeTotal, nextPage));
    if (clamped === safePage) return;
    onPageChange?.(clamped);
  };

  const slotCount = windowSlots.length;
  const rootClassName = `ux u449${lightShell ? ' u449--light-shell' : ''}`;

  return (
    <div className={rootClassName}>
      <nav className="u449-nav" aria-label={ariaLabel}>
        <button
          type="button"
          className="u449-ar u449-pv"
          aria-label="Trang trước"
          disabled={safePage <= 1}
          onClick={() => go(safePage - 1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" />
          </svg>
        </button>

        <div className="u449-sl" style={{ '--u449-cols': slotCount }}>
          <span ref={pillRef} className="u449-pill" aria-hidden="true" />
          {windowSlots.map((v, k) => {
            const isDots = v === '';
            const isCurrent = v === safePage;
            return (
              <button
                key={k}
                ref={(el) => {
                  slotRefs.current[k] = el;
                }}
                type="button"
                className={`u449-n${isDots ? ' is-dots' : ''}`}
                aria-hidden={isDots ? 'true' : undefined}
                tabIndex={isDots ? -1 : 0}
                aria-label={isDots ? undefined : `Trang ${v}`}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => {
                  if (!isDots) go(v);
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          className="u449-ar u449-nx"
          aria-label="Trang sau"
          disabled={safePage >= safeTotal}
          onClick={() => go(safePage + 1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" />
          </svg>
        </button>
      </nav>

      <p className="u449-live" role="status">
        Trang {safePage} / {safeTotal}
      </p>
    </div>
  );
}

export default ExamPagination;
