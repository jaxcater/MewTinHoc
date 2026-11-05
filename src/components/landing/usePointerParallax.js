import { useEffect, useRef } from 'react';

/**
 * Parallax theo con trỏ, chạy hoàn toàn ngoài React.
 *
 * Vì sao không dùng useState: mỗi lần chuột di chuyển là một lần render lại cả
 * cây component. Ở đây ta ghi thẳng toạ độ vào CSS custom property của phần tử
 * giữ (một lần mỗi animation frame), nên React không render lại lần nào.
 *
 * - `--px` / `--py` nằm trong khoảng -1..1 (chuẩn hoá theo tâm màn hình).
 * - Từng lớp con tự nhân với hệ số sâu của nó trong CSS:
 *     transform: translate3d(calc(var(--px) * 14px), calc(var(--py) * 14px), 0);
 * - Chỉ chạy khi: không bật prefers-reduced-motion, và thiết bị có chuột thật.
 * - Dừng hẳn khi tab bị ẩn để không đốt pin.
 */
export default function usePointerParallax() {
  const layerRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fineQuery.matches) return;
    const root = layer.closest('.mtl-root');
    let inView = true;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let running = true;

    const write = () => {
      layer.style.setProperty('--px', currentX.toFixed(4));
      layer.style.setProperty('--py', currentY.toFixed(4));
    };

    const tick = () => {
      if (!running || !inView || reduceQuery.matches || root?.dataset.motionMode !== 'full') {
        frame = 0;
        return;
      }
      // Nội suy mỗi frame ~18%: chuyển động có quán tính nhẹ, không giật theo chuột.
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      write();
      if (running && (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001)) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const queue = () => {
      if (!frame && running && inView && !reduceQuery.matches) frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (event) => {
      if (!inView || document.hidden || reduceQuery.matches || !fineQuery.matches || root?.dataset.motionMode !== 'full') return;
      const { innerWidth, innerHeight } = window;
      targetX = (event.clientX / innerWidth) * 2 - 1;
      targetY = (event.clientY / innerHeight) * 2 - 1;
      queue();
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      queue();
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (!running && frame) { cancelAnimationFrame(frame); frame = 0; }
    };

    const onPreference = () => {
      if (reduceQuery.matches || !fineQuery.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        targetX = targetY = currentX = currentY = 0;
        write();
      }
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView && frame) { cancelAnimationFrame(frame); frame = 0; }
    });
    observer?.observe(layer);

    write();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);
    reduceQuery.addEventListener('change', onPreference);
    fineQuery.addEventListener('change', onPreference);

    return () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      reduceQuery.removeEventListener('change', onPreference);
      fineQuery.removeEventListener('change', onPreference);
      observer?.disconnect();
    };
  }, []);

  return layerRef;
}
