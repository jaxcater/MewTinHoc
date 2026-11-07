import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Hàm Easing cubic-bezier(0.22, 1, 0.36, 1) chuẩn hóa
 * Giúp số tăng nhanh trong 300ms đầu rồi chầm chậm dừng lại ở giá trị đích.
 */
function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

/**
 * Component CountUpNumber
 * @param {number|string} end - Giá trị đích cần đếm tới
 * @param {number} duration - Thời gian chạy (mặc định 900ms theo thiết kế)
 * @param {string} prefix - Tiền tố (ví dụ: "")
 * @param {string} suffix - Hậu tố (ví dụ: "%", " Ngày", " Đề", "/10")
 * @param {number} decimals - Số chữ số thập phân (tự động nhận diện nếu end là số thực)
 */
export default function CountUpNumber({
  end = 0,
  duration = 900,
  prefix = '',
  suffix = '',
  decimals = null,
  className = ''
}) {
  // Tách giá trị số từ chuỗi nếu người dùng truyền chuỗi (ví dụ: "91.4%" hay 8.9)
  let numericTarget = 0;
  if (typeof end === 'number') {
    numericTarget = end;
  } else if (typeof end === 'string') {
    const matched = end.match(/[-+]?[0-9]*\.?[0-9]+/);
    numericTarget = matched ? parseFloat(matched[0]) : 0;
  }

  // Tự động phát hiện số thập phân nếu không chỉ định rõ
  const decimalPlaces = decimals !== null
    ? decimals
    : (numericTarget.toString().split('.')[1] || '').length;

  const numberRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = numberRef.current;
    if (!node) return undefined;
    let frame = 0;
    let startTime = null;
    const write = value => {
      const text = decimalPlaces > 0 ? value.toFixed(decimalPlaces) : Math.round(value).toString();
      if (node.textContent !== text) node.textContent = text;
    };
    if (reduce || duration <= 0 || numericTarget === 0) {
      write(numericTarget);
      return undefined;
    }

    // Giữ nguyên đường đếm và thời lượng, chỉ cập nhật nút số thay vì render React mỗi frame.
    write(0);

    const animate = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuint(progress);

      write(numericTarget * easedProgress);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        write(numericTarget);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [numericTarget, duration, decimalPlaces, reduce]);

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}<span ref={numberRef}>{decimalPlaces > 0 ? (0).toFixed(decimalPlaces) : '0'}</span>{suffix}
    </span>
  );
}
