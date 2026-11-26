// Lucian UX/UI Prompt #002 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#002
import { useEffect, useRef, useState } from 'react';
import './magneticArrowButton.css';

export function MagneticArrowButton({
  label = 'Làm thử đề AI ngay',
  goLabel = 'Mở bài làm thử!',
  onClick,
  ariaExpanded,
  ariaControls,
}) {
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const magRef = useRef(null);
  const txtRef = useRef(null);
  const orbRef = useRef(null);
  const timerRef = useRef(0);

  const [state, setState] = useState('idle');
  const [liveText, setLiveText] = useState('');

  useEffect(() => () => {
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const btn = btnRef.current;
    const mag = magRef.current;
    const txt = txtRef.current;
    const orb = orbRef.current;
    if (!root || !btn || !mag || !txt || !orb) return undefined;

    const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onPointerMove = (e) => {
      if (rmQuery.matches) return;
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const p = Math.max(0, 1 - Math.hypot(dx, dy) / 240);
      mag.style.translate = `${(dx * 0.12 * p).toFixed(1)}px ${(dy * 0.22 * p).toFixed(1)}px`;
      txt.style.translate = `${(dx * 0.05 * p).toFixed(1)}px ${(dy * 0.08 * p).toFixed(1)}px`;
      orb.style.translate = `${(dx * 0.1 * p).toFixed(1)}px ${(dy * 0.14 * p).toFixed(1)}px`;
    };

    const onPointerLeave = () => {
      mag.style.translate = '0px 0px';
      txt.style.translate = '0px 0px';
      orb.style.translate = '0px 0px';
    };

    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
    return () => {
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  const handleClick = () => {
    clearTimeout(timerRef.current);
    const rm = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setState('idle');
    if (btnRef.current) void btnRef.current.offsetWidth;
    setState('go');
    setLiveText(goLabel);
    onClick?.();

    timerRef.current = setTimeout(() => {
      setState('idle');
      setLiveText('');
    }, rm ? 900 : 1900);
  };

  return (
    <div ref={rootRef} className="ux u002" data-state={state}>
      <span className="u002-glow" aria-hidden="true" />
      <div ref={magRef} className="u002-mag">
        <button
          ref={btnRef}
          type="button"
          className="u002-btn"
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          onClick={handleClick}
        >
          <span className="u002-fill" aria-hidden="true" />
          <span ref={txtRef} className="u002-txt">
            <span>{label}</span>
            <span aria-hidden="true">{goLabel}</span>
          </span>
          <span ref={orbRef} className="u002-orb" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
            <svg viewBox="0 0 24 24">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>
      <span className="u002-live" aria-live="polite">
        {liveText}
      </span>
    </div>
  );
}

export default MagneticArrowButton;
