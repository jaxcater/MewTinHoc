import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useInView
} from 'framer-motion';
import { EASINGS } from '../../variants';
import './hero-banner-background.css';

// Đốm sáng ambient (giữ nguyên thông số cũ, khai báo dạng dữ liệu)
const ORBS = [
  { cls: 'orb-1', x: [0, 18, -10, 0], y: [0, -14, 12, 0], o: [0.14, 0.2, 0.15, 0.14], dur: 12, delay: 0,
    box: { top: '-40px', right: '40px', width: 260, height: 260 }, blur: 50,
    bg: 'radial-gradient(circle, #FDE68A 0%, rgba(251, 191, 36, 0.6) 50%, transparent 70%)' },
  { cls: 'orb-2', x: [0, -16, 12, 0], y: [0, 12, -8, 0], o: [0.12, 0.18, 0.13, 0.12], dur: 10, delay: 1.5,
    box: { bottom: '-30px', left: '12%', width: 220, height: 220 }, blur: 45,
    bg: 'radial-gradient(circle, #FED7AA 0%, rgba(249, 115, 22, 0.5) 55%, transparent 75%)' },
  { cls: 'orb-3', x: [0, 14, -8, 0], y: [0, -10, 14, 0], o: [0.13, 0.17, 0.12, 0.13], dur: 14, delay: 3,
    box: { top: '20px', left: '45%', width: 200, height: 200 }, blur: 42,
    bg: 'radial-gradient(circle, #FEF08A 0%, rgba(245, 158, 11, 0.45) 50%, transparent 70%)' },
  { cls: 'orb-4', x: [0, -10, 14, 0], y: [0, 8, -12, 0], o: [0.08, 0.15, 0.1, 0.08], dur: 11, delay: 2,
    box: { bottom: '-20px', right: '-20px', width: 240, height: 240 }, blur: 52,
    bg: 'radial-gradient(circle, #FFF7ED 0%, rgba(254, 215, 170, 0.4) 50%, transparent 70%)' }
];

// Tọa độ orbit neo theo cùng khung với mèo, không theo chiều rộng banner.
const GLYPHS = [
  { t: '</>', left: '70%', top: '12%', orbitLeft: '4%', orbitTop: '0%', size: 20, dur: 9, delay: 0 },
  { t: 'SELECT', left: '86%', top: '15%', orbitLeft: '63%', orbitTop: '-12%', size: 13, dur: 11, delay: 1.2 },
  { t: '1011', left: '92%', top: '62%', orbitLeft: '-5%', orbitTop: '42%', size: 15, dur: 10, delay: 2.4 },
  { t: 'def f():', left: '64%', top: '84%', orbitLeft: '-12%', orbitTop: '80%', size: 13, dur: 12, delay: 0.8 },
  { t: ';', left: '79%', top: '84%', orbitLeft: '88%', orbitTop: '68%', size: 26, dur: 8, delay: 3 }
];

const PARALLAX_SPRING = { stiffness: 90, damping: 18, mass: 0.6 };

export default function HeroBannerBackground() {
  const prefersReducedMotion = useReducedMotion();
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { margin: '80px 0px' });
  const [isTabVisible, setIsTabVisible] = useState(true);
  const active = isTabVisible && inView;

  // Vị trí con trỏ chuẩn hoá -1..1 so với tâm banner, đi qua spring để có quán tính
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, PARALLAX_SPRING);
  const sy = useSpring(my, PARALLAX_SPRING);

  // 3 tầng sâu: xa (ngược chiều, rất nhẹ), giữa, gần (kính)
  const farX = useTransform(sx, (v) => v * -5);
  const farY = useTransform(sy, (v) => v * -4);
  const midX = useTransform(sx, (v) => v * 9);
  const midY = useTransform(sy, (v) => v * 6);
  const nearX = useTransform(sx, (v) => v * -14);
  const nearY = useTransform(sy, (v) => v * -9);
  const lensRotate = useTransform(sx, (v) => -6 + v * 3);
  const farTransform = useMotionTemplate`translate3d(${farX}px, ${farY}px, 0)`;
  const midTransform = useMotionTemplate`translate3d(${midX}px, ${midY}px, 0)`;
  const lensTransform = useMotionTemplate`translate3d(${nearX}px, ${nearY}px, 0) rotate(${lensRotate}deg)`;

  // Tạm dừng chuyển động nền khi người dùng ẩn tab trình duyệt (tiết kiệm CPU/pin)
  useEffect(() => {
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Parallax theo con trỏ: chỉ khi có chuột thật và không bật giảm chuyển động
  useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (!host || prefersReducedMotion || !active) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
      my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const onLeave = () => {
      mx.set(0);
      my.set(0);
    };
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      mx.set(0);
      my.set(0);
    };
  }, [prefersReducedMotion, active, mx, my]);

  return (
    <div
      ref={rootRef}
      className={`hero-animated-bg ${!active ? 'is-paused' : ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        zIndex: 0,
        '--hero-orb-ease': `cubic-bezier(${EASINGS.easeInOut.join(',')})`
      }}
      aria-hidden="true"
    >
      {/* Lớp gradient dịch chuyển chậm chu kỳ 12s (chỉ dùng transform) */}
      <div className="hero-gradient-layer" />

      {/* Tầng xa: đốm sáng mờ trôi lơ lửng rất chậm */}
      {!prefersReducedMotion && (
        <motion.div className="hero-depth-layer" style={{ transform: farTransform }}>
          {ORBS.map((orb) => (
            <div
              key={orb.cls}
              className={`hero-ambient-orb ${orb.cls}`}
              style={{
                position: 'absolute',
                ...orb.box,
                borderRadius: '50%',
                background: orb.bg,
                filter: `blur(${orb.blur}px)`,
                '--orb-duration': `${orb.dur}s`, '--orb-delay': `${orb.delay}s`,
                '--orb-name': `hero-${orb.cls}`
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Tầng giữa: ký tự code trôi nhẹ, mỗi ký tự một nhịp riêng */}
      <div className="hero-glyph-orbit">
      <motion.div className="hero-depth-layer" style={prefersReducedMotion ? undefined : { transform: midTransform }}>
        {GLYPHS.map((g) => (
          <span
            key={g.t}
            className="hero-glyph"
            data-glyph={g.t}
            style={{ left: `var(--orbit-left, ${g.left})`, top: `var(--orbit-top, ${g.top})`, fontSize: g.size, '--cat-orbit-left': g.orbitLeft, '--cat-orbit-top': g.orbitTop, '--dur': `${g.dur}s`, '--delay': `${g.delay}s` }}
          >
            {g.t}
          </span>
        ))}
      </motion.div>
      </div>

      {/* Tầng gần: cặp kính của Mew, nhìn code qua tròng kính */}
      <div className="hero-lens-slot">
        <motion.div
          className="hero-lens"
          style={prefersReducedMotion ? { transform: 'rotate(-6deg)' } : { transform: lensTransform }}
        >
          <div className="hero-lens-rim">
            <span className="hero-lens-sweep" />
            <span className="hero-lens-glyph">{'{ }'}</span>
          </div>
          <div className="hero-lens-bridge" />
          <div className="hero-lens-rim">
            <span className="hero-lens-sweep hero-lens-sweep--late" />
            <span className="hero-lens-glyph">{'</>'}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
