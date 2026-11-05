import React from 'react';
import { ArrowRight } from 'lucide-react';
import useReveal from './useReveal';
import mewClosing from '../../assets/landing/mew-closing.webp';
import brandMark from '../../assets/landing/mew-mark.webp';

/**
 * 05 · CTA cuối và footer.
 *
 * Mèo trở lại đây, đúng một lần nữa, để khép trang. Nút chính giữ nguyên tên
 * "Bắt đầu học ngay" như ở hero · một hành động chỉ có một tên trên cả trang.
 *
 * Chân trang dùng đúng bộ lớp `site-footer` của trang chủ (src/App.jsx) để hai
 * nơi đọc như cùng một website. Chỉ dòng tài khoản Google đổi thành trạng thái
 * "Chưa đăng nhập", vì ở landing chưa có ai đăng nhập.
 */
export function LandingClosing({ onStart }) {
  const sectionRef = useReveal({ threshold: 0.25 });

  return (
    <section
      className="mtl-section mtl-section--tight"
      id="bat-dau"
      aria-labelledby="closing-heading"
      ref={sectionRef}
    >
      <div className="mtl-shell">
        <div className="mtl-cta" data-reveal>
          <div className="mtl-cta__copy">
            <h2 className="mtl-cta__title" id="closing-heading">
              Sẵn sàng bắt đầu tuần đầu tiên?
            </h2>
            <p className="mtl-cta__text">
              Đăng nhập bằng Google để lộ trình, chuỗi ngày học và kết quả thi thử được lưu lại trên
              đám mây.
            </p>
            <div className="mtl-cta__actions">
              <button type="button" className="mtl-btn" onClick={onStart}>
                Bắt đầu học ngay
                <ArrowRight size={19} className="mtl-btn__arrow" aria-hidden="true" />
              </button>
              <button type="button" className="mtl-link mtl-cta__link" onClick={onStart}>
                Tôi đã có tài khoản
              </button>
            </div>
          </div>

          <div className="mtl-cta__cat" aria-hidden="true">
            <img
              src={mewClosing}
              width="760"
              height="706"
              alt=""
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="site-footer-logo">
            <img
              src={brandMark}
              alt="MewTinHoc"
              className="site-footer-logo-img"
              width="512"
              height="512"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </div>
          <div className="site-footer-brand-text">
            <div className="site-footer-brand-name">
              <span className="site-footer-brand-accent">Mew</span>
              <span className="site-footer-brand-name-text">TinHoc</span>
              <span className="site-footer-brand-tag">THPTQG</span>
            </div>
            <div className="site-footer-brand-slogan">Đồng hành cùng bạn vượt qua kì thi</div>
          </div>
        </div>

        <p className="site-footer-desc">
          Nền tảng luyện thi Tin học tốt nghiệp THPT chuẩn cấu trúc mới của Bộ Giáo dục &amp; Đào
          tạo. Lộ trình trực quan, kho đề thi chuyên sâu và đánh giá phân hóa bằng trí tuệ nhân tạo
          (AI).
        </p>

        <div className="site-footer-highlight">
          <span className="site-footer-highlight-item">Lộ trình trực quan</span>
          <span className="site-footer-highlight-dot" />
          <span className="site-footer-highlight-item">Kho đề thi chuyên sâu</span>
          <span className="site-footer-highlight-dot" />
          <span className="site-footer-highlight-item">Chấm điểm &amp; đánh giá bằng AI</span>
        </div>

        <div className="site-footer-bottom">
          <span className="site-footer-copyright">
            © 2026 <strong>MewTinHoc</strong>. Bảo lưu mọi quyền.
          </span>
          <span className="site-footer-account">
            Trạng thái: <strong>Chưa đăng nhập</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}
