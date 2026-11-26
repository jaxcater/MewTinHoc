// Lucian UX/UI Prompt #010 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#010
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './trackSplitButton.css';

function IctTrackIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="2.2" />
      <path d="M8.5 8.2h2.2M13.3 8.2h2.2M8.5 11.8h7" />
      <path d="M2.5 19.5h19" />
    </svg>
  );
}

function CsTrackIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
      <path d="M10.5 10 8.5 12l2 2M13.5 10l2 2-2 2" />
      <path d="M9.5 3.2V6M14.5 3.2V6M9.5 18v2.8M14.5 18v2.8M3.2 9.5H6M3.2 14.5H6M18 9.5h2.8M18 14.5h2.8" />
    </svg>
  );
}

const TRACK_OPTIONS = [
  {
    id: 'ict',
    label: 'Tin học ứng dụng',
    desc: 'Excel, CSDL thực hành & Thiết kế Web',
    busyText: 'Đang mở THƯD...',
    doneText: 'Đã mở THƯD',
    iconBg: 'linear-gradient(140deg, #38BDF8, #0284C7)',
    Icon: IctTrackIcon,
  },
  {
    id: 'cs',
    label: 'Khoa học máy tính',
    desc: 'Python, Thuật toán, SQL & Học máy',
    busyText: 'Đang mở KHMT...',
    doneText: 'Đã mở KHMT',
    iconBg: 'linear-gradient(140deg, #FB923C, #EA580C)',
    Icon: CsTrackIcon,
  },
];

function readStoredTrack() {
  try {
    const saved = localStorage.getItem('tinhoc_selected_track');
    return saved === 'cs' || saved === 'ict' ? saved : 'ict';
  } catch {
    return 'ict';
  }
}

export function TrackSplitButton({ onOpenRoadmap }) {
  const rootRef = useRef(null);
  const caretRef = useRef(null);
  const optRefs = useRef([]);
  const timersRef = useRef([]);

  const location = useLocation();
  const navigate = useNavigate();

  const routeMatch = location.pathname.match(/^\/roadmap\/(cs|ict)/i);
  const routeTrack = routeMatch ? routeMatch[1].toLowerCase() : null;

  const [storedTrack, setStoredTrack] = useState(readStoredTrack);
  const [open, setOpen] = useState(false);
  const [actionState, setActionState] = useState('idle');
  const [liveMessage, setLiveMessage] = useState('');

  const selectedTrack = routeTrack || storedTrack;
  const activeOption = TRACK_OPTIONS.find((o) => o.id === selectedTrack) || TRACK_OPTIONS[0];
  const ActiveIcon = activeOption.Icon;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Đồng bộ định hướng giữa Top Split Button và RoadmapTab / Storage.
  useEffect(() => {
    const onTrackChange = (e) => {
      const next = e?.detail;
      if (next === 'cs' || next === 'ict') setStoredTrack(next);
    };
    const onStorage = (e) => {
      if (e.key === 'tinhoc_selected_track' && (e.newValue === 'cs' || e.newValue === 'ict')) {
        setStoredTrack(e.newValue);
      }
    };
    window.addEventListener('tinhoc-track-change', onTrackChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('tinhoc-track-change', onTrackChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Đóng menu khi bấm ra ngoài hoặc nhấn Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        caretRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectTrack = (trackId) => {
    setStoredTrack(trackId);
    try {
      localStorage.setItem('tinhoc_selected_track', trackId);
    } catch {
      // Ignore storage quota / private mode restriction
    }
    window.dispatchEvent(new CustomEvent('tinhoc-track-change', { detail: trackId }));
    setOpen(false);
    caretRef.current?.focus({ preventScroll: true });
    onOpenRoadmap?.(trackId);
    navigate(`/roadmap/${trackId}`);
  };

  const handleToggleMenu = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      const activeIdx = TRACK_OPTIONS.findIndex((o) => o.id === selectedTrack);
      const t = setTimeout(() => {
        optRefs.current[Math.max(0, activeIdx)]?.focus({ preventScroll: true });
      }, 30);
      timersRef.current.push(t);
    }
  };

  const handleMainAction = () => {
    if (actionState !== 'idle') return;
    setOpen(false);
    clearTimers();

    const rm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setActionState('busy');
    setLiveMessage(activeOption.busyText);

    try {
      localStorage.setItem('tinhoc_selected_track', activeOption.id);
    } catch {
      // Ignore
    }
    window.dispatchEvent(new CustomEvent('tinhoc-track-change', { detail: activeOption.id }));
    onOpenRoadmap?.(activeOption.id);
    navigate(`/roadmap/${activeOption.id}`);

    const tDone = setTimeout(() => {
      setActionState('done');
      setLiveMessage(activeOption.doneText);
    }, rm ? 80 : 1150);

    const tReset = setTimeout(() => {
      setActionState('idle');
      setLiveMessage('');
    }, rm ? 600 : 2500);

    timersRef.current.push(tDone, tReset);
  };

  const handleOptionKeyDown = (e, idx) => {
    const dir = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const nextIdx = (idx + dir + TRACK_OPTIONS.length) % TRACK_OPTIONS.length;
    optRefs.current[nextIdx]?.focus();
  };

  const displayLabel =
    actionState === 'busy'
      ? activeOption.busyText
      : actionState === 'done'
        ? activeOption.doneText
        : activeOption.label;

  return (
    <div
      ref={rootRef}
      className="ux u010 u010--light-shell"
      data-track={activeOption.id}
      data-state={actionState}
      data-open={open ? '1' : '0'}
    >
      <div className="u010-grp">
        <button
          type="button"
          className="u010-main"
          onClick={handleMainAction}
          title={`Vào lộ trình ${activeOption.label}`}
        >
          <span className="u010-ic" aria-hidden="true">
            <ActiveIcon className="u010-go" />
            <svg className="u010-spin" viewBox="0 0 24 24">
              <path d="M12 4a8 8 0 1 0 8 8" />
            </svg>
            <svg className="u010-ok" viewBox="0 0 24 24">
              <path d="M5.5 12.5l4.2 4.2L18.5 8" />
            </svg>
          </span>
          <span className="u010-labs">
            <span key={displayLabel} className="u010-lab">
              {displayLabel}
            </span>
          </span>
          <span className="u010-bar" aria-hidden="true" />
        </button>

        <span className="u010-div" aria-hidden="true" />

        <button
          ref={caretRef}
          type="button"
          className="u010-caret"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Chọn định hướng học tập"
          onClick={handleToggleMenu}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.5 9.5l5.5 5.5 5.5-5.5" />
          </svg>
        </button>
      </div>

      <ul className="u010-menu" role="menu" aria-label="Định hướng lộ trình học">
        {TRACK_OPTIONS.map((opt, idx) => {
          const OptIcon = opt.Icon;
          const isChecked = opt.id === activeOption.id;
          return (
            <li key={opt.id} role="none">
              <button
                ref={(el) => { optRefs.current[idx] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={isChecked}
                tabIndex={open ? 0 : -1}
                className="u010-opt"
                onClick={() => selectTrack(opt.id)}
                onKeyDown={(e) => handleOptionKeyDown(e, idx)}
              >
                <span className="u010-oi" style={{ background: opt.iconBg }} aria-hidden="true">
                  <OptIcon />
                </span>
                <span>
                  <b>{opt.label}</b>
                  <small>{opt.desc}</small>
                </span>
                <span className="u010-chk" aria-hidden="true">
                  <svg viewBox="0 0 12 12">
                    <path d="M2.5 6.2l2.2 2.2L9.5 3.6" />
                  </svg>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <span className="u010-live" aria-live="polite">
        {liveMessage}
      </span>
    </div>
  );
}

export default TrackSplitButton;
