import { useEffect, useRef } from 'react';

const DEPTH_LAYERS = [
  ['.mtl-glow', -10], ['.mtl-orbit', -16], ['.mtl-cat', 20],
  ['.mtl-cat__bubble', 34], ['.mtl-preview', 12], ['.mtl-chip', 44]
];

/**
 * Parallax theo con trỏ, chạy hoàn toàn ngoài React.
 *
 * Vì sao không dùng useState: mỗi lần chuột di chuyển là một lần render lại cả
 * cây component. Ghi transform trực tiếp trên từng lớp, tránh thay đổi biến
 * CSS kế thừa làm cả nội dung hero phải tính lại style mỗi khung hình.
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
    const root = layer.closest('.mtl-root');
    const targets = DEPTH_LAYERS.flatMap(([selector, depth]) =>
      [...layer.querySelectorAll(selector)].map(node => ({ node, depth, original: node.style.transform }))
    );
    let inView = true;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let running = true;

    const write = () => {
      for (const { node, depth } of targets) {
        const transform = `translate3d(${(currentX * depth).toFixed(3)}px, ${(currentY * depth).toFixed(3)}px, 0)`;
        if (node.style.transform !== transform) node.style.transform = transform;
      }
    };

    const tick = () => {
      if (!running || !inView || !fineQuery.matches || reduceQuery.matches || root?.dataset.motionMode !== 'full') {
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
      if (!frame && running && inView && fineQuery.matches && !reduceQuery.matches && root?.dataset.motionMode === 'full') frame = requestAnimationFrame(tick);
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
      if (running) queue();
    };

    const onPreference = () => {
      if (reduceQuery.matches || !fineQuery.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        targetX = targetY = currentX = currentY = 0;
        write();
      } else {
        queue();
      }
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView && frame) { cancelAnimationFrame(frame); frame = 0; }
      if (inView) queue();
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
      targets.forEach(({ node, original }) => { node.style.transform = original; });
    };
  }, []);

  return layerRef;
}
