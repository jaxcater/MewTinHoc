import { useEffect, useId, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { DURATIONS, EASINGS } from '../../variants';
import catPainting from '../../assets/hero-cat-pastel.png';
import './hero-room-cat.css';
import HeroMobileTail from './HeroMobileTail';

// Đưa đường gốc tai về trục x cục bộ: shear/scale giữ cả đường nối đứng yên.
const EARS = [
  { side: 'left', start: [278, 348], end: [650, 195], outline: 'M250 0H650V195L278 348Z' },
  { side: 'right', start: [650, 195], end: [1000, 400], outline: 'M650 0H1060V400H1000L650 195Z' }
].map(ear => {
  const [x, y] = ear.start;
  const dx = ear.end[0] - x;
  const dy = ear.end[1] - y;
  const length = Math.hypot(dx, dy);
  const c = dx / length;
  const s = dy / length;
  return {
    ...ear,
    toPainting: `matrix(${c} ${s} ${-s} ${c} ${x} ${y})`,
    toEar: `matrix(${c} ${-s} ${s} ${c} ${-c * x - s * y} ${s * x - c * y})`
  };
});

// Tranh sáp có mắt và tai tách lớp; không thêm khung vào block cam.
export default function HeroRoomCat() {
  const catRef = useRef(null);
  const inView = useInView(catRef, { amount: 0.2 });
  const reducedMotion = useReducedMotion();
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches);
  const id = useId().replace(/:/g, '');
  useEffect(() => {
    const update = () => setTabVisible(!document.hidden);
    const media = window.matchMedia('(min-width: 769px)');
    const resize = event => setIsDesktop(event.matches);
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', resize);
    return () => {
      document.removeEventListener('visibilitychange', update);
      media.removeEventListener('change', resize);
    };
  }, []);

  const leftEye = 'M455 333Q562 340 620 444Q486 469 460 349Z';
  const rightEye = 'M766 465Q809 393 912 389Q899 494 766 465Z';
  return (
    <>
    <div ref={catRef} className="hero-room-cat" aria-hidden="true"
      data-animate={inView && tabVisible && !reducedMotion ? 'true' : 'false'}
      style={{ '--cat-idle-duration': `${DURATIONS.ambientSlow}s`, '--cat-idle-ease': `cubic-bezier(${EASINGS.easeInOut.join(',')})` }}>
      {isDesktop && <div className="hero-room-cat-breath"><div className="hero-room-cat-sway">
      <svg className="hero-room-cat-portrait" viewBox="0 0 1254 1254" fill="none" focusable="false">
        <defs>
          <mask id={`${id}-body`} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
            <rect width="1254" height="1254" fill="white" />
            {EARS.map(ear => <path key={ear.side} d={ear.outline} fill="black" />)}
            <path d={leftEye} fill="black" /><path d={rightEye} fill="black" />
          </mask>
          {EARS.map(ear => (
            <mask key={ear.side} id={`${id}-${ear.side}-ear`} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
              {/* Chồng lông 4 đơn vị để không lộ đường khử răng cưa ở mép ghép. */}
              <path d={ear.outline} fill="white" stroke="white" strokeWidth="8" strokeLinejoin="round" />
            </mask>
          ))}
          <clipPath id={`${id}-left-eye`}><path d={leftEye} /></clipPath>
          <clipPath id={`${id}-right-eye`}><path d={rightEye} /></clipPath>
        </defs>
        <image href={catPainting} width="1254" height="1254" mask={`url(#${id}-body)`} />
        {/* Lông từ chính tranh gốc nằm dưới mí để giữ chất sáp khi nháy. */}
        <g clipPath={`url(#${id}-left-eye)`}><image href={catPainting} y="110" width="1254" height="1254" /></g>
        <g clipPath={`url(#${id}-right-eye)`}><image href={catPainting} y="110" width="1254" height="1254" /></g>
        {EARS.map(ear => (
          <g key={ear.side} transform={ear.toPainting}>
            <g className={`hero-room-cat-ear hero-room-cat-ear--${ear.side}`}>
              <g transform={ear.toEar}>
                <image href={catPainting} width="1254" height="1254" mask={`url(#${id}-${ear.side}-ear)`} />
              </g>
            </g>
          </g>
        ))}
        {[
          { side: 'left', x: 565, y: 398 },
          { side: 'right', x: 862, y: 439 }
        ].map(({ side, x, y }) => (
          <g key={side} className={`hero-room-cat-eye hero-room-cat-eye--${side}`}>
            <g clipPath={`url(#${id}-${side}-eye)`}>
              <image href={catPainting} width="1254" height="1254" />
              <g className="hero-room-cat-gaze">
                <path d={`M${x - 8} ${y - 38} Q${x + 21} ${y - 8} ${x + 10} ${y + 34} Q${x - 17} ${y + 23} ${x - 8} ${y - 38}`} fill="#302319" />
                <ellipse cx={x + 3} cy={y - 16} rx="4" ry="7" fill="#fff0ce" />
              </g>
            </g>
          </g>
        ))}
        <g className="hero-room-cat-closed-eyes" stroke="#503019" strokeWidth="9" strokeLinecap="round">
          <path d="M477 392Q541 433 598 423" /><path d="M787 451Q843 466 890 421" />
        </g>
      </svg>
      </div></div>}
    </div>
    {!isDesktop && <HeroMobileTail />}
    </>
  );
}
