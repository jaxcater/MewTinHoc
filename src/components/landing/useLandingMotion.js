import { useEffect } from 'react';

// CSS owns motion; observers toggle attributes without scroll listeners or
// per-frame React updates on a phone.
export default function useLandingMotion(rootRef, paused) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const update = () => {
      root.dataset.motionMode = preference.matches ? 'reduced' : paused ? 'paused' : connection?.saveData ? 'light' : 'full';
      root.toggleAttribute('data-tab-hidden', document.hidden);
    };
    root.setAttribute('data-motion', '');
    update();
    preference.addEventListener('change', update);
    connection?.addEventListener?.('change', update);
    document.addEventListener('visibilitychange', update);
    const zones = root.querySelectorAll('.mtl-hero, .mtl-section, .mtl-nav');
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.toggleAttribute('data-motion-visible', entry.isIntersecting);
    }, { rootMargin: '80px 0px' });
    zones.forEach((zone) => {
      zone.setAttribute('data-motion-zone', '');
      if (observer) observer.observe(zone);
      else zone.setAttribute('data-motion-visible', '');
    });
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', update);
      connection?.removeEventListener?.('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [rootRef, paused]);
}
