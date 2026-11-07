import React, { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TRACKS } from './landingContent';
import useReveal from './useReveal';

/**
 * 04 · Hai định hướng, mở ra thành mục lục chủ đề.
 *
 * Hai ô KHMT và THUD là hai nút thật. Nhấn một nút thì mục lục của định hướng
 * đó bung ra ngay bên dưới: ba chặng, đủ danh sách chủ đề lấy nguyên văn từ
 * lộ trình thật trong sản phẩm, để người mới biết mình sẽ học những gì trước
 * khi đăng nhập.
 *
 * Chuyển động: chiều cao bung bằng `grid-template-rows: 0fr -> 1fr`, một mẹo
 * CSS cho phép chuyển động chiều cao mà không phải đo bằng JavaScript, nên
 * không có layout nhảy và không có state nào phải đồng bộ với kích thước thật.
 * Các chủ đề bên trong hiện so le 30ms một dòng.
 *
 * Bàn phím: hai nút nằm trong `role="tablist"`, `aria-expanded` báo trạng thái,
 * mũi tên trái/phải đổi định hướng theo đúng kỳ vọng của một tab list.
 */
export default function LandingTracks() {
  const sectionRef = useReveal();
  const [openId, setOpenId] = useState(null);

  const toggle = useCallback((id) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  const activeTrack = TRACKS.find((track) => track.id === openId) || null;

  // Điều hướng bằng phím mũi tên giữa hai nút, theo chuẩn tab list.
  const onKeyDown = useCallback(
    (event, index) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = (index + (event.key === 'ArrowRight' ? 1 : TRACKS.length - 1)) % TRACKS.length;
      setOpenId(TRACKS[next].id);
      event.currentTarget.parentElement?.querySelectorAll('[data-track-button]')[next]?.focus();
    },
    []
  );

  return (
    <section
      className="mtl-section mtl-section--field mtl-section--field-warm"
      aria-labelledby="tracks-heading"
      ref={sectionRef}
    >
      <div className="mtl-shell">
        <div className="mtl-section__head">
          <div data-reveal><span className="mtl-eyebrow">05 / CHỌN HƯỚNG CỦA BẠN</span>
          <h2 className="mtl-h2" id="tracks-heading" data-reveal style={{ '--i': 0 }}>
            Hai định hướng
          </h2>
          </div>
          <p className="mtl-p" data-reveal style={{ '--i': 1 }}>
            Chương trình 2018 tách Tin học thành hai định hướng. Sáu chủ đề đầu giống nhau, phần
            chuyên sâu thì khác hẳn. Nhấn vào một ô để xem đủ mục lục.
          </p>
        </div>

        <div className="mtl-tracks" role="tablist" aria-label="Chọn định hướng để xem mục lục">
          {TRACKS.map((track, index) => {
            const open = track.id === openId;
            return (
              <button
                type="button"
                key={track.id}
                data-track-button
                id={`track-tab-${track.id}`}
                role="tab"
                aria-selected={open}
                aria-expanded={open}
                aria-controls="track-panel"
                className={`mtl-track${track.accent === 'deep' ? ' mtl-track--deep' : ''}${
                  open ? ' mtl-track--open' : ''
                }`}
                onClick={() => toggle(track.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                data-reveal
                style={{ '--i': index + 2 }}
              >
                <span className="mtl-track__top">
                  <span className="mtl-track__code">{track.code}</span>
                  <span className="mtl-track__name">{track.name}</span>
                </span>
                <span className="mtl-track__focus">{track.focus}</span>
                <span className="mtl-track__foot">
                  <span className="mtl-track__count">{track.stations} trạm học</span>
                  <span className="mtl-track__toggle" aria-hidden="true">
                    <ChevronDown size={16} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Một khung duy nhất cho cả hai định hướng: bung ra và đóng lại cùng một
            chỗ, nên trang không dài thêm hai lần. */}
        <div className={`mtl-major${activeTrack ? ' mtl-major--open' : ''}`}>
          <div className="mtl-major__inner">
            <div
              className="mtl-major__panel"
              id="track-panel"
              role="tabpanel"
              aria-labelledby={activeTrack ? `track-tab-${activeTrack.id}` : undefined}
              inert={!activeTrack}
            >
              {activeTrack && (
                <div key={activeTrack.id} className="mtl-major__body">
                  <p className="mtl-major__lead">{activeTrack.lead}</p>

                  <div className="mtl-stages">
                    {activeTrack.stages.map((stage, stageIndex) => (
                      <div
                        className="mtl-stage"
                        key={stage.title}
                        style={{ '--d': `${120 + stageIndex * 70}ms` }}
                      >
                        <h3 className="mtl-stage__title">{stage.title}</h3>
                        <p className="mtl-stage__note">{stage.note}</p>
                        <ul className="mtl-stage__list">
                          {stage.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mtl-small mtl-major__foot">
          Chọn định hướng sau khi đăng nhập. Đổi lại được bất cứ lúc nào.
        </p>
      </div>
    </section>
  );
}
