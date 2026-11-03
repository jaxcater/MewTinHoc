import { useEffect, useLayoutEffect, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Đánh dấu phần tử đã vào khung nhìn để CSS chạy hiệu ứng xuất hiện.
 *
 * Vì sao dùng IntersectionObserver + attribute, không dùng state React:
 * hiệu ứng chỉ chạy một lần, và ta không muốn mỗi section re-render khi cuộn.
 * Toàn bộ chuyển động nằm trong CSS (transform/opacity) nên trình duyệt chạy
 * trên compositor, không tốn main thread.
 *
 * Hai điểm quan trọng:
 *  1. Trạng thái "ẩn" chỉ bật khi root có `data-motion`, do LandingPage đặt
 *     trước khung hình đầu tiên. Nếu JS không chạy, không có gì bị ẩn cả.
 *  2. Ngưỡng 0 kèm rootMargin dương: khối cao hơn màn hình vẫn kích hoạt được
 *     ngay khi chạm mép dưới, và bắt đầu sớm hơn một nhịp cuộn.
 *
 * Phần tử con dùng `data-reveal` và tự đặt `--i` cho độ trễ so le.
 * Khi prefers-reduced-motion bật, CSS bỏ hết chuyển động và nội dung hiện ngay.
 */
export default function useReveal() {
  const containerRef = useRef(null);

  useIsomorphicLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    // Trình duyệt cũ hoặc môi trường test: hiện nội dung luôn, không ẩn gì cả.
    if (typeof IntersectionObserver === 'undefined') {
      node.setAttribute('data-inview', '');
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-inview', '');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: '12% 0px 12% 0px' }
    );

    // Bản thân khối và mọi `[data-reveal-group]` bên trong đều được theo dõi,
    // để một mục dài có thể tự kích hoạt khi phần đầu của nó lộ ra.
    const targets = [node, ...node.querySelectorAll('[data-reveal-group]')];
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return containerRef;
}
