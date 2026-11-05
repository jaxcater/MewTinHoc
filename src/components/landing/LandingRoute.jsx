import React from 'react';
import { PHASES } from './landingContent';
import useReveal from './useReveal';

/**
 * Số tuần của từng bậc, dùng để vẽ thước 12 ô bên dưới tiêu đề.
 * Lấy đúng từ `weeks` của PHASES ("Tuần 1–4", "Tuần 5–9", "Tuần 10–12").
 */
const WEEK_SPANS = [
  [1, 4],
  [5, 9],
  [10, 12],
];

/**
 * 02 · Lộ trình học trực quan.
 *
 * Ba giai đoạn nằm trên một đường leo liền mạch: ray dọc ở mép trái, mỗi bậc
 * là một bông tai mèo đóng vai cột mốc. Độ cao của bậc, độ đậm của nền và cỡ
 * con số mục tiêu đều tăng dần, nên thứ tự đọc được bằng mắt mà không cần
 * đánh số. Đây là bản đồ tiến trình, không phải ba thẻ giống nhau.
 */
export default function LandingRoute() {
  const sectionRef = useReveal();

  return (
    <section className="mtl-section" aria-labelledby="route-heading" ref={sectionRef}>
      <div className="mtl-shell">
        <div className="mtl-section__head">
          <div data-reveal><span className="mtl-eyebrow">01 / BIẾT MÌNH ĐANG Ở ĐÂU</span>
          <h2 className="mtl-h2" id="route-heading" data-reveal style={{ '--i': 0 }}>
            Mười hai tuần, ba bậc
          </h2>
          </div>
          <p className="mtl-p" data-reveal style={{ '--i': 1 }}>
            Mỗi bậc có một mục tiêu điểm riêng để bạn biết mình đang ở đâu. Đi hết đường leo là tới
            ngưỡng điểm cao nhất.
          </p>
        </div>

        <div className="mtl-route">
          <div className="mtl-route__rail" aria-hidden="true" />
          {PHASES.map((phase, index) => {
            const [from, to] = WEEK_SPANS[index];
            return (
              <article
                className={`mtl-leg mtl-leg--${index + 1}`}
                key={phase.id}
                data-reveal
                style={{ '--i': index + 2 }}
              >
                <span className="mtl-leg__station" aria-hidden="true" />

                <div className="mtl-leg__body">
                  <h3 className="mtl-leg__title">{phase.title}</h3>
                  <p className="mtl-leg__note">
                    <strong className="mtl-leg__weeks">{phase.weeks}</strong> {phase.note}
                  </p>

                  {/* Thước 12 tuần: ô của bậc này sáng lên, nên độ dài mỗi
                      chặng đọc được mà không phải đếm số. */}
                  <div className="mtl-leg__ruler" aria-hidden="true">
                    {Array.from({ length: 12 }, (_, week) => (
                      <span
                        className={`mtl-leg__tick${
                          week + 1 >= from && week + 1 <= to ? ' mtl-leg__tick--on' : ''
                        }`}
                        key={week}
                        style={{ '--week': week }}
                      />
                    ))}
                  </div>

                  <p className="mtl-leg__stations">{phase.stations.join(' · ')}</p>
                </div>

                <div className="mtl-leg__mark">
                  <span className="mtl-leg__name">{phase.name}</span>
                  <span className="mtl-leg__target">{phase.target}</span>
                  <span className="mtl-leg__unit">điểm mục tiêu</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
