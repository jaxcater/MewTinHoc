import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { DURATIONS, EASINGS } from '../../variants';
import tailPainting from '../../assets/hero-mobile-tail.webp';
import './hero-mobile-tail.css';

// Một ảnh liền khối: không cắt đuôi thành mảnh nên không có mép ghép bị rách.
export default function HeroMobileTail() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.1 });
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return (
    <div ref={ref} className="hero-mobile-tail" aria-hidden="true"
      data-animate={inView && visible && !reduce ? 'true' : 'false'}
      style={{ '--tail-cycle': `${DURATIONS.ambientSlow / 2}s`, '--tail-ease': `cubic-bezier(${EASINGS.easeInOut.join(',')})` }}>
      <div className="hero-mobile-tail-sway">
        <img className="hero-mobile-tail-curl" src={tailPainting} alt="" width="1024" height="1536" decoding="async" draggable={false} />
      </div>
    </div>
  );
}
