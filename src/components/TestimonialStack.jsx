// Lucian UX/UI Prompt #422 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#422
import { useEffect, useRef } from 'react';
import './testimonialStack.css';

const DEFAULT_REVIEWS = [
  {
    id: 'minh-anh',
    quote: 'Trước sợ câu SQL Đúng/Sai lắm mà học theo lộ trình Mew mượt hẳn luôn <3',
    name: 'Minh Anh',
    role: '12A1 · KHMT',
    initials: 'MA',
    avatarBg: '#EA580C',
  },
  {
    id: 'gia-bao',
    quote: 'Đề AI chấm xong chỉ đúng chỗ hay dính bẫy, cày 2 tuần lên hẳn 9+ =))',
    name: 'Gia Bảo',
    role: '12A3 · THƯD',
    initials: 'GB',
    avatarBg: '#F97316',
  },
  {
    id: 'khanh-linh',
    quote: 'Học mà sợ đứt streak của Mew nên tối nào cũng tự giác vào làm đề hihi',
    name: 'Khánh Linh',
    role: '12A2 · KHMT',
    initials: 'KL',
    avatarBg: '#D97706',
  },
  {
    id: 'duc-huy',
    quote: 'Hàm VLOOKUP với Pivot Table giải thích dễ hiểu xỉu, làm phát ăn luôn =>>',
    name: 'Đức Huy',
    role: '12C1 · THƯD',
    initials: 'ĐH',
    avatarBg: '#C2410C',
  },
  {
    id: 'thao-vy',
    quote: 'Giao diện xinh với đua top vui thật sự, mấy đứa cùng bàn rủ nhau cày kkk',
    name: 'Thảo Vy',
    role: '12A5 · KHMT',
    initials: 'TV',
    avatarBg: '#E06D1B',
  },
];

const STAR_PATH =
  'm7 1.2 1.75 3.6 3.95.55-2.86 2.78.68 3.92L7 10.2l-3.52 1.85.68-3.92L1.3 5.35l3.95-.55z';

const DEPTH = [
  [0, 1, 1],
  [20, 0.94, 1],
  [40, 0.88, 1],
  [40, 0.86, 0],
];

const STAR_INDICES = [0, 1, 2, 3, 4];

export function TestimonialStack({
  reviews = DEFAULT_REVIEWS,
  ariaLabel = 'Đánh giá của học viên MewTinHoc',
}) {
  const rootRef = useRef(null);
  const stackRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const st = stackRef.current;
    if (!root || !st || reviews.length === 0) return undefined;

    const cards = Array.from(st.querySelectorAll('.u422-cd'));
    if (cards.length === 0) return undefined;

    let disposed = false;
    const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rm = rmQuery.matches;

    let order = cards.slice();
    let busy = false;
    let tAuto = 0;
    let tAnim = 0;
    let held = false;
    let drag = null;

    function place(c, d) {
      const p = DEPTH[Math.min(d, 3)];
      c.style.setProperty('--dy', `${p[0]}px`);
      c.style.setProperty('--s', String(p[1]));
      c.style.setProperty('--o', String(p[2]));
      c.style.zIndex = String(10 - d);
      c.classList.toggle('is-top', d === 0);
      c.setAttribute('aria-hidden', String(d !== 0));
    }

    function layout() {
      order.forEach(place);
    }

    function stars(c) {
      c.classList.remove('is-on');
      void c.offsetWidth;
      c.classList.add('is-on');
    }

    function clearPose(c) {
      c.style.removeProperty('--x');
      c.style.removeProperty('--y');
      c.style.removeProperty('--r');
    }

    function clearAllCardState() {
      cards.forEach((c) => {
        c.classList.remove('is-top', 'is-drag', 'is-fly', 'is-on');
        clearPose(c);
        c.style.removeProperty('--dy');
        c.style.removeProperty('--s');
        c.style.removeProperty('--o');
        c.style.removeProperty('z-index');
        c.style.removeProperty('transition');
      });
    }

    function schedule() {
      clearTimeout(tAuto);
      if (disposed || rm || held || order.length < 2) return;
      tAuto = setTimeout(() => {
        if (!disposed && root.isConnected && !held) next(-1);
      }, 3200);
    }

    function next(dir) {
      if (disposed || busy || order.length < 2) return;
      busy = true;
      const top = order[0];
      top.classList.add('is-fly');
      top.style.zIndex = '12';
      top.style.setProperty('--x', `${dir * 130}%`);
      top.style.setProperty('--y', '-14px');
      top.style.setProperty('--r', `${dir * 14}deg`);
      top.style.setProperty('--o', '0');

      order.push(order.shift());
      order.slice(0, -1).forEach(place);
      stars(order[0]);

      clearTimeout(tAnim);
      tAnim = setTimeout(() => {
        if (disposed || !root.isConnected) return;
        top.classList.remove('is-fly');
        top.style.transition = 'none';
        clearPose(top);
        place(top, order.length - 1);
        void top.offsetWidth;
        top.style.transition = '';
        busy = false;
        schedule();
      }, rm ? 0 : 460);
    }

    function prev() {
      if (disposed || busy || order.length < 2) return;
      busy = true;
      const c = order.pop();
      c.style.transition = 'none';
      c.style.setProperty('--x', '-130%');
      c.style.setProperty('--y', '-14px');
      c.style.setProperty('--r', '-14deg');
      c.style.setProperty('--o', '0');
      c.style.zIndex = '11';
      void c.offsetWidth;
      c.style.transition = '';
      order.unshift(c);
      clearPose(c);
      layout();
      stars(c);

      clearTimeout(tAnim);
      tAnim = setTimeout(() => {
        if (disposed) return;
        busy = false;
        schedule();
      }, rm ? 0 : 400);
    }

    function hold(v) {
      held = v;
      if (v) clearTimeout(tAuto);
      else schedule();
    }

    function onPointerDown(e) {
      const top = order[0];
      if (busy || !top.contains(e.target) || (e.button && e.button !== 0)) return;
      drag = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        lx: e.clientX,
        lt: performance.now(),
        dx: 0,
        k: root.getBoundingClientRect().width / root.offsetWidth || 1,
      };
      top.classList.add('is-drag');
      try {
        st.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failure on synthetic or unsupported pointers
      }
      hold(true);
    }

    function onPointerMove(e) {
      if (!drag) return;
      const top = order[0];
      drag.dx = (e.clientX - drag.x) / drag.k;
      const dy = ((e.clientY - drag.y) / drag.k) * 0.25;
      drag.v = (e.clientX - drag.lx) / Math.max(1, performance.now() - drag.lt);
      drag.lx = e.clientX;
      drag.lt = performance.now();
      top.style.setProperty('--x', `${drag.dx}px`);
      top.style.setProperty('--y', `${dy}px`);
      top.style.setProperty('--r', `${drag.dx / 18}deg`);
      const p = Math.min(1, Math.abs(drag.dx) / 180);
      const b = order[1];
      if (b) {
        b.style.setProperty('--dy', `${20 - 20 * p}px`);
        b.style.setProperty('--s', String(0.94 + 0.06 * p));
      }
    }

    function onEnd() {
      if (!drag) return;
      const top = order[0];
      const d = drag;
      drag = null;
      top.classList.remove('is-drag');
      if (Math.abs(d.dx) > 90 || Math.abs(d.v || 0) > 0.6) {
        next(d.dx < 0 ? -1 : 1);
      } else {
        clearPose(top);
        if (order[1]) place(order[1], 1);
      }
      hold(st.matches(':hover') || st.matches(':focus-visible'));
    }

    function onPointerEnter() {
      hold(true);
    }

    function onPointerLeave() {
      if (!drag) hold(st.matches(':focus-visible'));
    }

    function onFocus() {
      if (st.matches(':focus-visible')) hold(true);
    }

    function onBlur() {
      hold(st.matches(':hover'));
    }

    function onKeyDown(e) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next(-1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    }

    function onReducedMotionChange(e) {
      rm = e.matches;
      if (rm) clearTimeout(tAuto);
      else schedule();
    }

    st.addEventListener('pointerdown', onPointerDown);
    st.addEventListener('pointermove', onPointerMove);
    st.addEventListener('pointerup', onEnd);
    st.addEventListener('pointercancel', onEnd);
    st.addEventListener('pointerenter', onPointerEnter);
    st.addEventListener('pointerleave', onPointerLeave);
    st.addEventListener('focus', onFocus);
    st.addEventListener('blur', onBlur);
    st.addEventListener('keydown', onKeyDown);
    if (rmQuery.addEventListener) rmQuery.addEventListener('change', onReducedMotionChange);
    else if (rmQuery.addListener) rmQuery.addListener(onReducedMotionChange);

    clearAllCardState();
    layout();
    stars(order[0]);
    schedule();

    return () => {
      disposed = true;
      clearTimeout(tAuto);
      clearTimeout(tAnim);
      st.removeEventListener('pointerdown', onPointerDown);
      st.removeEventListener('pointermove', onPointerMove);
      st.removeEventListener('pointerup', onEnd);
      st.removeEventListener('pointercancel', onEnd);
      st.removeEventListener('pointerenter', onPointerEnter);
      st.removeEventListener('pointerleave', onPointerLeave);
      st.removeEventListener('focus', onFocus);
      st.removeEventListener('blur', onBlur);
      st.removeEventListener('keydown', onKeyDown);
      if (rmQuery.removeEventListener) rmQuery.removeEventListener('change', onReducedMotionChange);
      else if (rmQuery.removeListener) rmQuery.removeListener(onReducedMotionChange);
      clearAllCardState();
    };
  }, [reviews]);

  return (
    <div ref={rootRef} className="ux u422">
      <div
        ref={stackRef}
        className="u422-st"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
      >
        {reviews.map((review) => (
          <figure key={review.id || review.name} className="u422-cd" style={{ margin: 0 }}>
            <div className="u422-sr" role="img" aria-label="5 trên 5 sao">
              {STAR_INDICES.map((starIdx) => (
                <i key={starIdx} style={{ '--i': starIdx }}>
                  <svg className="bg" viewBox="0 0 14 14" aria-hidden="true">
                    <path d={STAR_PATH} />
                  </svg>
                  <svg className="fg" viewBox="0 0 14 14" aria-hidden="true">
                    <path d={STAR_PATH} />
                  </svg>
                </i>
              ))}
            </div>
            <blockquote className="u422-q">{review.quote}</blockquote>
            <figcaption className="u422-by">
              <span
                className="u422-av"
                aria-hidden="true"
                style={{ background: review.avatarBg }}
              >
                {review.initials}
              </span>
              <span>
                <b>{review.name}</b>
                <small>{review.role}</small>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export default TestimonialStack;
