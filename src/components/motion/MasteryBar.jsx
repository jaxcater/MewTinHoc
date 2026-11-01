import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { EASINGS } from '../../variants';

// Thanh tiến độ vẽ bằng clip-path (không đổi layout) và vẫn giữ đầu tròn khi co giãn.
const clipFor = (v) =>
  `inset(0 ${100 - Math.min(100, Math.max(0, v))}% 0 0 round 999px)`;

/**
 * @param {number} value  Phần trăm làm chủ 0-100
 * @param {string} [color] Màu nền; bỏ trống thì dùng gradient mặc định của .progress-bar-fill
 *
 * Tự đợi vào khung nhìn rồi mới "đầy dần" lần đầu; các lần đổi giá trị sau (+5% / -5%)
 * chạy lại từ vị trí hiện tại nên không giật.
 */
export default function MasteryBar({ value, color }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div
      ref={ref}
      className="progress-bar-shell"
      style={{ width: '100%', height: '7px' }}
      aria-hidden="true"
    >
      <motion.div
        className="progress-bar-fill"
        style={{ width: '100%', transition: 'none', ...(color ? { background: color } : {}) }}
        initial={{ clipPath: clipFor(0) }}
        animate={{ clipPath: clipFor(inView ? value : 0) }}
        transition={
          reduce
            ? { duration: 0.01 }
            : { duration: 0.7, ease: EASINGS.emilOut }
        }
      />
    </div>
  );
}
