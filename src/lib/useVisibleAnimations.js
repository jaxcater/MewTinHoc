import { useEffect } from 'react';

// Chỉ tạm dừng animation CSS ở vùng không nhìn thấy; không unmount,
// không đặt lại timeline, nên quay lại vẫn tiếp tục đầy đủ hiệu ứng.
export function useVisibleAnimations(rootRef, selector) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const zones = [...root.querySelectorAll(selector)];
    const visible = new Set();
    const update = node => node.toggleAttribute('data-animation-visible', visible.has(node) && !document.hidden);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
        update(entry.target);
      }
    }, { rootMargin: '80px 0px' });
    zones.forEach(node => {
      node.setAttribute('data-animation-zone', '');
      observer.observe(node);
    });
    const onVisibility = () => zones.forEach(update);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      zones.forEach(node => {
        node.removeAttribute('data-animation-zone');
        node.removeAttribute('data-animation-visible');
      });
    };
  }, [rootRef, selector]);
}
