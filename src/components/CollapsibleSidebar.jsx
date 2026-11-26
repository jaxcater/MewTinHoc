// Lucian UX/UI Prompt #417 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#417
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Layers, Lock, LogOut, X } from 'lucide-react';
import './collapsibleSidebar.css';

export function CollapsibleSidebar({
  items,
  activeKey,
  onSelect,
  onPrefetch,
  onLogout,
  user,
  mobileOpen = false,
  onCloseMobile,
}) {
  const rootRef = useRef(null);
  const pillRef = useRef(null);
  const navRef = useRef(null);
  const firstMountRef = useRef(true);
  const sidebarId = useId();

  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  const isRail = !mobileOpen && !pinned && !hovered && !focusWithin;

  // Đồng bộ khoảng hở trên cùng của thanh sidebar theo chiều cao thực tế của header ngang.
  useEffect(() => {
    const root = rootRef.current;
    const header = document.querySelector('.horizontal-sidebar');
    if (!root || !header) return undefined;

    const updateTop = () => {
      const h = Math.round(header.getBoundingClientRect().height);
      if (h > 0) root.style.setProperty('--u417-top', `${h}px`);
    };

    updateTop();
    window.addEventListener('resize', updateTop);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateTop) : null;
    ro?.observe(header);
    return () => {
      window.removeEventListener('resize', updateTop);
      ro?.disconnect();
    };
  }, []);

  // Khoá cuộn nền khi mở ngăn kéo menu trên mobile.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  // Trượt highlight pill theo nút đang chọn (giữ đúng chuyển động #417).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;

    const activeBtn = nav.querySelector('[aria-current="page"]');
    const activeLi = activeBtn?.parentElement;
    if (!activeLi) return;

    const y = `${activeLi.offsetTop}px`;
    if (firstMountRef.current) {
      firstMountRef.current = false;
      pill.style.transition = 'none';
      pill.style.setProperty('--py', y);
      void pill.offsetWidth;
      pill.style.transition = '';
    } else {
      pill.style.setProperty('--py', y);
    }
  }, [activeKey, items]);

  // Nhấn Escape đóng ngăn kéo trên mobile hoặc thu gọn khi focus bàn phím.
  useEffect(() => {
    const onEscape = (e) => {
      if (e.key !== 'Escape') return;
      if (mobileOpen) onCloseMobile?.();
      setFocusWithin(false);
      setHovered(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileOpen, onCloseMobile]);

  const handleTogglePin = () => {
    if (isRail) {
      setPinned(true);
    } else {
      setPinned(false);
      setHovered(false);
      setFocusWithin(false);
    }
  };

  const handleItemKeyDown = (e, idx) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    const targetBtn = navRef.current?.querySelectorAll('.u417-it')[idx + step];
    if (!targetBtn) return;
    e.preventDefault();
    targetBtn.focus();
  };

  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setFocusWithin(false);
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="u417-backdrop"
          aria-hidden="true"
          onClick={() => onCloseMobile?.()}
        />
      )}

      <div
        ref={rootRef}
        className={`ux u417 u417--light-shell ${isRail ? 'is-rail' : ''} ${
          mobileOpen ? 'is-mobile-open' : ''
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocusWithin(true)}
        onBlur={handleBlur}
      >
        <aside id={sidebarId} className="u417-sb" aria-label="Điều hướng chức năng chính">
          <div className="u417-hd">
            <span className="u417-mk" aria-hidden="true">
              <Layers size={16} />
            </span>
            <b className="u417-lb">Learning</b>
            <button
              type="button"
              className="u417-close-btn"
              aria-label="Đóng menu chức năng"
              onClick={() => onCloseMobile?.()}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <ul className="u417-nav" ref={navRef} role="tablist" aria-orientation="vertical">
            <li ref={pillRef} className="u417-pl" aria-hidden="true" />
            {items.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key;
              return (
                <li key={item.key} role="presentation">
                  <button
                    type="button"
                    id={item.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={item.locked || undefined}
                    title={item.title || item.label}
                    className={`u417-it ${item.locked ? 'is-locked' : ''}`}
                    onClick={() => {
                      onSelect?.(item.key);
                      if (mobileOpen) onCloseMobile?.();
                    }}
                    onPointerEnter={() => onPrefetch?.(item.key)}
                    onFocus={() => onPrefetch?.(item.key)}
                    onKeyDown={(e) => handleItemKeyDown(e, idx)}
                  >
                    <Icon aria-hidden="true" />
                    <span className="u417-lb">{item.label}</span>
                    {item.locked ? (
                      <span className="u417-lock" aria-label="Bị khoá với tài khoản Demo">
                        <Lock size={13} aria-hidden="true" />
                      </span>
                    ) : item.badge ? (
                      <span className="u417-bd" aria-hidden="true">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {user && onLogout && (
            <div className="u417-ft">
              <button
                type="button"
                className="u417-ft-btn"
                onClick={() => {
                  if (mobileOpen) onCloseMobile?.();
                  onLogout();
                }}
                title="Đăng xuất tài khoản"
              >
                <LogOut aria-hidden="true" />
                <span className="u417-lb">Đăng xuất</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="u417-tg"
            aria-controls={sidebarId}
            aria-expanded={!isRail}
            aria-label={isRail ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            onClick={handleTogglePin}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M7.5 2.5 4 6l3.5 3.5" />
            </svg>
          </button>
        </aside>
      </div>
    </>
  );
}

export default CollapsibleSidebar;
