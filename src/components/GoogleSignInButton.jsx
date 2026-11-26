// Lucian UX/UI Prompt #401 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#401
import React, { useEffect, useRef } from 'react';
import './googleSignInButton.css';

export default function GoogleSignInButton({
  loading = false,
  done = false,
  disabled = false,
  lightShell = false,
  onClick,
  idleLabel = 'Tiếp tục với Google',
  busyLabel = 'Đang kết nối…',
  doneLabel = 'Đã đăng nhập',
  busyLiveText = 'Đang kết nối với Google',
  doneLiveText = 'Đã đăng nhập bằng Google',
}) {
  const lbRef = useRef(null);
  const s0Ref = useRef(null);
  const s1Ref = useRef(null);
  const s2Ref = useRef(null);
  const prevPhaseRef = useRef('idle');
  const timerRef = useRef(0);

  const phase = done ? 'ok' : loading ? 'busy' : 'idle';
  const liveText = phase === 'busy' ? busyLiveText : phase === 'ok' ? doneLiveText : '';

  useEffect(() => {
    const lb = lbRef.current;
    const spans = [s0Ref.current, s1Ref.current, s2Ref.current];
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (!lb || spans.some((el) => !el)) return undefined;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = 0;
    }

    const fit = (index) => {
      const target = spans[index];
      if (!target) return;
      const w = target.offsetWidth;
      lb.style.width = w ? `${w}px` : '';
    };

    const rm =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (phase === 'busy') {
      if (prevPhase === 'idle') {
        fit(0);
        void lb.offsetWidth;
      }
      fit(1);
    } else if (phase === 'ok') {
      fit(2);
    } else if (prevPhase !== 'idle') {
      fit(0);
      timerRef.current = window.setTimeout(() => {
        if (lbRef.current && prevPhaseRef.current === 'idle') {
          lbRef.current.style.width = '';
        }
        timerRef.current = 0;
      }, rm ? 0 : 600);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = 0;
      }
    };
  }, [phase]);

  const handleClick = (e) => {
    if (phase !== 'idle' || disabled) return;
    if (onClick) onClick(e);
  };

  const rootClassName = `ux u401${lightShell ? ' u401--light-shell' : ''}`;
  const buttonClassName = `u401-b${phase === 'busy' ? ' is-busy' : ''}${phase === 'ok' ? ' is-ok' : ''}`;

  return (
    <div className={rootClassName}>
      <button
        type="button"
        className={buttonClassName}
        aria-busy={phase === 'busy' ? 'true' : undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        <span className="u401-ic" aria-hidden="true">
          <svg className="u401-g" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <svg className="u401-arc" viewBox="0 0 20 20">
            <g>
              <circle cx="10" cy="10" r="8" stroke="#EA4335" strokeDashoffset="0" />
              <circle cx="10" cy="10" r="8" stroke="#4285F4" strokeDashoffset="-12.57" />
              <circle cx="10" cy="10" r="8" stroke="#34A853" strokeDashoffset="-25.13" />
              <circle cx="10" cy="10" r="8" stroke="#FBBC05" strokeDashoffset="-37.7" />
            </g>
          </svg>
          <svg className="u401-ck" viewBox="0 0 20 20">
            <path d="M4.8 10.4l3.4 3.4 7-7.4" />
          </svg>
        </span>
        <span className="u401-lb" ref={lbRef}>
          <span className="s0" ref={s0Ref}>
            {idleLabel}
          </span>
          <span className="s1" ref={s1Ref} aria-hidden="true">
            {busyLabel}
          </span>
          <span className="s2" ref={s2Ref} aria-hidden="true">
            {doneLabel}
          </span>
        </span>
      </button>
      <p className="u401-live" role="status">
        {liveText}
      </p>
    </div>
  );
}
