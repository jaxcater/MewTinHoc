import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Check, Sparkles } from 'lucide-react';
import usePointerParallax from './usePointerParallax';
import mewHero from '../../assets/landing/mew-hero.webp';

/**
 * Tiêu đề chia dòng và trượt lên khỏi mặt nạ.
 *
 * Mỗi dòng là một khối overflow:hidden chứa một <span> dịch xuống 110%.
 * Khi có `data-ready` (đặt sau khung hình đầu tiên), CSS kéo về 0 với độ trễ
 * so le. Chữ nằm sẵn trong DOM ngay từ HTML đầu tiên nên trình đọc màn hình
 * và công cụ tìm kiếm đọc được toàn bộ tiêu đề, không phải chờ hiệu ứng.
 */
function SplitHeadline({ lines, deltas = [0, 110, 220] }) {
  return (
    <h1 className="mtl-h1">
      {lines.map((line, index) => (
        <span className="mtl-mask-line" key={line.key}>
          <span style={{ '--delay': `${deltas[index] ?? index * 110}ms` }}>
            {line.gradient ? <em className="mtl-grad">{line.text}</em> : line.text}
          </span>
        </span>
      ))}
    </h1>
  );
}

export default function LandingHero({ onStart }) {
  const parallaxRef = usePointerParallax();
  const [ready, setReady] = useState(false);

  // Đặt `data-ready` sau khung hình đầu tiên: nội dung đã vẽ xong nên hiệu ứng
  // mở màn không bao giờ làm tiêu đề nhấp nháy.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const lines = [
    { key: 'line-1', text: 'Ôn Tin học' },
    { key: 'line-2', text: 'vững từng bước.', gradient: true },
  ];

  return (
    <div className="mtl-hero__grid" ref={parallaxRef} data-ready={ready ? '' : undefined}>
      <div className="mtl-hero__copy">
        <span className="mtl-hero__eyebrow"><span aria-hidden="true" />Có Mew đồng hành, có hướng để đi</span>
        <SplitHeadline lines={lines} />

        <p className="mtl-lead">
          Từ hiểu bài đến tự tin vào phòng thi. Lộ trình rõ ràng, kho đề theo chủ đề
          và AI giúp bạn nhận ra phần cần ôn tiếp.
        </p>

        <div className="mtl-hero__actions">
          <button type="button" className="mtl-btn" onClick={onStart}>
            Bắt đầu học ngay
            <ArrowRight size={19} className="mtl-btn__arrow" aria-hidden="true" />
          </button>
          <a className="mtl-link mtl-hero__try" href="#thu-suc">Thử một câu trước <ArrowDown size={15} aria-hidden="true" /></a>
        </div>

        <p className="mtl-hero__reassurance"><Check size={14} aria-hidden="true" />Đăng nhập với Google · Lưu lại tiến độ học</p>
      </div>

      <div className="mtl-hero__stage">
        <span className="mtl-stage-caption">GÓC HỌC TẬP CỦA BẠN</span>
        <div className="mtl-glow" aria-hidden="true" />

        <div className="mtl-orbit" aria-hidden="true">
          <span className="mtl-orbit__dot mtl-orbit__dot--1" />
          <span className="mtl-orbit__dot mtl-orbit__dot--2" />
          <span className="mtl-orbit__dot mtl-orbit__dot--3" />
        </div>

        {/* Ba bông tai mèo đi vòng quanh sân khấu. Một lớp xoay duy nhất lo cả
            ba, nên chỉ có một animation chạy trên compositor. */}
        <div className="mtl-ring" aria-hidden="true">
          <span className="mtl-ear-drift mtl-ear-drift--1" />
          <span className="mtl-ear-drift mtl-ear-drift--2" />
          <span className="mtl-ear-drift mtl-ear-drift--3" />
        </div>

        {/* Mèo: ảnh thật của thương hiệu, tách nền trong suốt, phóng to vừa
            khít đường tròn của quỹ đạo. `scale` trong CSS lo phần phóng to,
            nên ảnh chiếm trọn vòng tròn thay vì lọt thỏm ở giữa. */}
        <div className="mtl-cat">
          <img
            src={mewHero}
            width="640"
            height="677"
            alt="Mew, linh vật mèo cam đeo kính của MewTinHoc"
            fetchPriority="high"
            decoding="async"
          />
          <span className="mtl-cat__bubble">
            <Sparkles size={14} aria-hidden="true" />
            Học cùng Mew nhé!
          </span>
        </div>

        {/* Bản xem trước tiến độ · dữ liệu thật của lộ trình, không phải ảnh giả. */}
        <div className="mtl-preview">
          <div className="mtl-preview__head">
            <span className="mtl-preview__title">Ví dụ tiến độ</span>
            <span className="mtl-preview__pct">Tuần 7/12</span>
          </div>
          <div className="mtl-preview__bar">
            <span className="mtl-preview__fill" />
          </div>
          <div className="mtl-preview__meta">
            <span>Giai đoạn 2 · Chuyên sâu</span>
          </div>
        </div>

        <div className="mtl-chip">
          <span className="mtl-chip__dot" aria-hidden="true" />
          Mỗi ngày, tiến một bước
        </div>
      </div>
      <div className="mtl-hero__facts">
        <div className="mtl-fact"><span className="mtl-fact__value">12 tuần</span><span className="mtl-fact__label">lộ trình rõ ràng</span></div>
        <div className="mtl-fact"><span className="mtl-fact__value">24 + 4 câu</span><span className="mtl-fact__label">thi thử 50 phút</span></div>
        <div className="mtl-fact"><span className="mtl-fact__value">2 định hướng</span><span className="mtl-fact__label">KHMT &amp; THUD</span></div>
      </div>
    </div>
  );
}
