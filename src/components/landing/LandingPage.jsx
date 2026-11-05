import React, { useCallback, useEffect } from 'react';
import LandingHero from './LandingHero';
import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, Route, Sparkles } from 'lucide-react';
import useLandingMotion from './useLandingMotion';
import LandingRoute from './LandingRoute';
import LandingDemo from './LandingDemo';
import LandingBank from './LandingBank';
import LandingExam from './LandingExam';
import LandingTracks from './LandingTracks';
import { LandingClosing, LandingFooter } from './LandingClosing';
import './landing.css';
// Mobile typesetting pass: loaded second so it wins on equal specificity.
import './landing-mobile.css';
import './landing-refresh.css';
import brandMark from '../../assets/landing/mew-mark.webp';

/**
 * Landing page hiển thị khi học viên truy cập website mà chưa đăng nhập.
 *
 * Luồng: cuộn hết landing, nhấn "Bắt đầu học ngay", LoginPage trượt lên.
 * `onStart` do LoginPage truyền vào; landing không tự quản lý trạng thái đăng
 * nhập để giữ một nguồn sự thật duy nhất.
 *
 * Landing chỉ để gây ấn tượng: mọi hành động thật (mở kho đề, tạo đề) đều phải
 * qua đăng nhập, nên trong các mục không còn nút "Mở..." hay "Tạo...".
 */
export default function LandingPage({ onStart }) {
  const rootRef = useRef(null);
  const [showDock, setShowDock] = useState(false);
  useLandingMotion(rootRef);
  // Đưa học viên từ cuối trang về đầu trang khi mở màn hình đăng nhập, để
  // LoginPage xuất hiện ở vị trí đầu thay vì giữa trang.
  const handleStart = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    onStart();
  }, [onStart]);

  // Keep the mobile action between the hero and the closing section.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const hero = root.querySelector('.mtl-hero');
    const closing = root.querySelector('#bat-dau');
    let heroPassed = false;
    let closingVisible = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        if (entry.target === closing) closingVisible = entry.isIntersecting;
      }
      setShowDock(heroPassed && !closingVisible);
    });
    if (hero) observer.observe(hero);
    if (closing) observer.observe(closing);
    return () => observer.disconnect();
  }, []);

  // Khoá ảnh: chặn menu chuột phải và kéo ảnh thả sang ứng dụng khác. Chỉ áp
  // cho <img> bên trong landing — chữ vẫn bôi đen và sao chép bình thường.
  useEffect(() => {
    const root = document.querySelector('.mtl-root');
    if (!root) return undefined;

    const blockContextMenu = (event) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    };
    const blockDrag = (event) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    };

    root.addEventListener('contextmenu', blockContextMenu);
    root.addEventListener('dragstart', blockDrag);
    return () => {
      root.removeEventListener('contextmenu', blockContextMenu);
      root.removeEventListener('dragstart', blockDrag);
    };
  }, []);

  return (
    <div className="mtl-root" ref={rootRef}>
      {/* Static warm background: no full-page animation layers on mobile. */}
      <div className="mtl-mesh" aria-hidden="true">
        <div className="mtl-mesh__layer mtl-mesh__layer--a" />
        <div className="mtl-mesh__layer mtl-mesh__layer--b" />
        <div className="mtl-mesh__layer mtl-mesh__layer--c" />
      </div>

      <header className="mtl-nav">
        <div className="mtl-shell">
          <div className="mtl-nav__inner">
            <div className="mtl-brand">
              <span className="mtl-brand__logo">
                <img
                  className="mtl-brand__mark"
                  src={brandMark}
                  width="512"
                  height="512"
                  alt=""
                  decoding="async"
                  draggable="false"
                />
              </span>
              <div className="mtl-brand__text">
                <div className="mtl-brand__name">
                  <span className="mtl-brand__accent">Mew</span>TinHoc
                </div>
                <div className="mtl-brand__tag">
                  <span className="mtl-brand__dot" aria-hidden="true" />
                  Luyện thi Tin học THPT
                </div>
              </div>
            </div>

            <nav className="mtl-nav__links" aria-label="Điều hướng trang giới thiệu">
              <a className="mtl-nav__link" href="#lo-trinh">
                Lộ trình
              </a>
              <a className="mtl-nav__link" href="#kho-de">
                Kho đề
              </a>
              <a className="mtl-nav__link" href="#de-ai">
                Đề AI
              </a>
              <a className="mtl-nav__link" href="#dinh-huong">
                Định hướng
              </a>
              <button type="button" className="mtl-btn mtl-nav__cta" onClick={handleStart}>
                Đăng nhập
              </button>
            </nav>
          </div>
        </div>
          <nav className="mtl-mobile-nav" aria-label="Khám phá MewTinHoc">
            <a href="#lo-trinh"><Route size={14} aria-hidden="true" />Lộ trình</a>
            <a href="#thu-suc"><BookOpen size={14} aria-hidden="true" />Thử một câu</a>
            <a href="#de-ai"><Sparkles size={14} aria-hidden="true" />Thi thử &amp; AI</a>
          </nav>
      </header>

      <main>
        <div className="mtl-shell">
          <div className="mtl-hero">
            <LandingHero onStart={handleStart} />
          </div>
        </div>

        <div id="lo-trinh">
          <LandingRoute />
        </div>

        {/* Trình diễn câu hỏi thật, ngay sau lộ trình, không có tiêu đề riêng. */}
        <LandingDemo />

        <div id="kho-de">
          <LandingBank />
        </div>

        <div id="de-ai">
          <LandingExam />
        </div>

        <div id="dinh-huong">
          <LandingTracks />
        </div>

        <LandingClosing onStart={handleStart} />
      </main>

      <LandingFooter />
      {showDock && (
        <aside className="mtl-mobile-dock" aria-label="Bắt đầu học">
          <span>Học cùng Mew<strong>Từng bước vững kiến thức.</strong></span>
          <button type="button" className="mtl-btn" onClick={handleStart}>
            Bắt đầu <ArrowRight size={17} aria-hidden="true" />
          </button>
        </aside>
      )}
    </div>
  );
}
