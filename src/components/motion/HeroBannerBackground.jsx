import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform
} from 'framer-motion';

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

// Ký tự code lơ lửng: chỉ đặt ở nửa phải banner để không đè lên chữ
const GLYPHS = [
  { t: '</>', left: '70%', top: '12%', size: 20, dur: 9, delay: 0 },
  { t: 'SELECT', left: '86%', top: '15%', size: 13, dur: 11, delay: 1.2 },
  { t: '1011', left: '92%', top: '62%', size: 15, dur: 10, delay: 2.4 },
  { t: 'def f():', left: '64%', top: '84%', size: 13, dur: 12, delay: 0.8 },
  { t: ';', left: '79%', top: '84%', size: 26, dur: 8, delay: 3 }
];

const PARALLAX_SPRING = { stiffness: 90, damping: 18, mass: 0.6 };

export default function HeroBannerBackground() {
  const prefersReducedMotion = useReducedMotion();
  const rootRef = useRef(null);
  const [isTabVisible, setIsTabVisible] = useState(true);

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

  // Tạm dừng chuyển động nền khi người dùng ẩn tab trình duyệt (tiết kiệm CPU/pin)
  useEffect(() => {
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Parallax theo con trỏ: chỉ khi có chuột thật và không bật giảm chuyển động
  useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (!host || prefersReducedMotion) return undefined;
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
    };
  }, [prefersReducedMotion, mx, my]);

  return (
    <div
      ref={rootRef}
      className={`hero-animated-bg ${!isTabVisible ? 'is-paused' : ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        zIndex: 0
      }}
      aria-hidden="true"
    >
      {/* Lớp gradient dịch chuyển chậm chu kỳ 12s (chỉ dùng transform) */}
      <div className="hero-gradient-layer" />

      {/* Tầng xa: đốm sáng mờ trôi lơ lửng rất chậm */}
      {!prefersReducedMotion && (
        <motion.div className="hero-depth-layer" style={{ x: farX, y: farY }}>
          {ORBS.map((orb) => (
            <motion.div
              key={orb.cls}
              className={`hero-ambient-orb ${orb.cls}`}
              animate={isTabVisible ? { x: orb.x, y: orb.y, opacity: orb.o } : {}}
              transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
              style={{
                position: 'absolute',
                ...orb.box,
                borderRadius: '50%',
                background: orb.bg,
                filter: `blur(${orb.blur}px)`
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Tầng giữa: ký tự code trôi nhẹ, mỗi ký tự một nhịp riêng */}
      <motion.div className="hero-depth-layer" style={prefersReducedMotion ? undefined : { x: midX, y: midY }}>
        {GLYPHS.map((g) => (
          <span
            key={g.t}
            className="hero-glyph"
            style={{ left: g.left, top: g.top, fontSize: g.size, '--dur': `${g.dur}s`, '--delay': `${g.delay}s` }}
          >
            {g.t}
          </span>
        ))}
      </motion.div>

      {/* Tầng gần: cặp kính của Mew, nhìn code qua tròng kính */}
      <div className="hero-lens-slot">
        <motion.div
          className="hero-lens"
          style={prefersReducedMotion ? { rotate: -6 } : { x: nearX, y: nearY, rotate: lensRotate }}
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
