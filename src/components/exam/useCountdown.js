// ============================================================
//  Đồng hồ đếm ngược cho phòng thi
//  - Không dùng setInterval 1s trực tiếp trong component để tránh
//    drift: tính theo mốc thời gian tuyệt đối.
//  - Tự nộp bài khi hết giờ.
// ============================================================
import { useEffect, useRef, useState } from 'react';

/**
 * @param {number} durationMinutes tổng thời gian làm bài
 * @param {() => void} onExpire gọi 1 lần khi hết giờ
 * @param {boolean} running false = tạm dừng (đã nộp bài)
 */
export default function useCountdown(durationMinutes, onExpire, running = true) {
  // Khởi tạo deadline trong useState initializer (không phải trong render)
  // để không bị tính lại khi component re-render.
  const [deadline] = useState(() => Date.now() + durationMinutes * 60 * 1000);
  const [remainingMs, setRemainingMs] = useState(durationMinutes * 60 * 1000);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!running) return undefined;

    const tick = () => {
      const left = deadline - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire?.();
        }
        return;
      }
      setRemainingMs(left);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [running, onExpire, deadline]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    remainingMs,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    isUrgent: remainingMs <= 5 * 60 * 1000,
    isExpired: remainingMs <= 0,
  };
}
