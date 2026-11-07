/**
 * Biến CSS `--app-vh` = chiều cao vùng nhìn thấy thật của trình duyệt (px).
 *
 * Vì sao cần: trên điện thoại, `100vh`/`100dvh` không luôn khớp vùng hiển thị
 * thật (thanh địa chỉ, thanh công cụ động của Safari/Chrome). Hệ quả là modal
 * cao hơn màn hình một chút: mép trên chui dưới header trình duyệt và mép dưới
 * chui dưới thanh công cụ, nên khi cuộn tới đầu/cuối nội dung sẽ bị che.
 *
 * Giải pháp: đo `visualViewport.height` (chính xác nhất) và ghi vào biến CSS.
 */

let cleanup = null;

export function installViewportHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (cleanup) return cleanup;

  const root = document.documentElement;
  let frame = 0;
  let lastHeight = 0;

  const apply = () => {
    frame = 0;
    const vv = window.visualViewport;
    const height = Math.round(vv?.height || window.innerHeight || root.clientHeight || 0);
    // Thanh địa chỉ có thể phát nhiều sự kiện scroll với cùng chiều cao.
    // Không ghi lại biến kế thừa trên cả cây DOM khi giá trị không đổi.
    if (height > 0 && height !== lastHeight) {
      lastHeight = height;
      root.style.setProperty('--app-vh', `${height}px`);
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(apply);
  };

  apply();

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  const vv = window.visualViewport;
  vv?.addEventListener('resize', schedule, { passive: true });
  vv?.addEventListener('scroll', schedule, { passive: true });

  cleanup = () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    vv?.removeEventListener('resize', schedule);
    vv?.removeEventListener('scroll', schedule);
    root.style.removeProperty('--app-vh');
    cleanup = null;
  };

  return cleanup;
}

export default installViewportHeight;
