import React from 'react';
import useReveal from './useReveal';
import { AI_EXAM } from './landingContent';

/**
 * 04 · Tạo đề ngẫu nhiên & chấm phân hoá.
 *
 * Mục này quảng bá chức năng AI của sản phẩm (tab "Tạo bài thi thử & Đánh giá
 * bằng AI"). Toàn bộ nội dung lấy từ sản phẩm thật:
 *   - 24 câu trắc nghiệm + 4 câu Đúng/Sai trong 50 phút: EXAM_PARTS
 *   - bốn bước sinh đề: generationStepsText trong src/components/AiExamTab.jsx
 *   - thang điểm lũy tiến 0,25 → 1,0: CS_EXAM_STRUCTURE trong roadmap
 *
 * Hình bên cạnh là một mảnh giao diện thật: bốn bước sinh đề chạy so le khi mục
 * này vào khung nhìn, để thấy rằng đề được dựng chứ không phải lấy sẵn.
 *
 * Không có nút "Tạo một đề thử" ở đây: landing chỉ gây ấn tượng, muốn dựng đề
 * thật thì phải đăng nhập.
 */
export default function LandingExam() {
  const sectionRef = useReveal({ threshold: 0.2 });

  return (
    <section
      className="mtl-section mtl-section--exam"
      aria-labelledby="exam-heading"
      ref={sectionRef}
    >
      <div className="mtl-shell">
        <div className="mtl-exam">
          <div className="mtl-exam__copy" data-reveal style={{ '--i': 0 }}>
            <span className="mtl-eyebrow">04 / THI THỬ, HIỂU ĐIỂM YẾU</span>
            <h2 className="mtl-h2" id="exam-heading">
              Tạo đề ngẫu nhiên &amp; chấm phân hoá
            </h2>
            <p className="mtl-p">
              Mỗi lần tạo là một đề mới từ ngân hàng câu hỏi theo ma trận: 24 câu trắc nghiệm
              và 4 câu Đúng/Sai trong 50 phút. Sau khi nộp, xem giải thích, điểm yếu và nhận xét AI để biết nên ôn gì tiếp.
            </p>

            <div className="mtl-exam__outputs">
              {AI_EXAM.outputs.map((output) => (
                <div className="mtl-exam__output" key={output.label}>
                  <span className="mtl-exam__output-value">{output.value}</span>
                  <span className="mtl-exam__output-label">{output.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mtl-exam__visual" data-ui data-reveal style={{ '--i': 1 }}>
          <ol className="mtl-exam__steps">
            {AI_EXAM.steps.map((step, index) => (
              <li className="mtl-exam__step" key={step} style={{ '--d': `${index * 90}ms` }}>
                <span className="mtl-exam__step-mark" aria-hidden="true" />
                <span className="mtl-exam__step-text">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mtl-score-demo">
            <div className="mtl-score-demo__head"><strong>Mỗi ý đúng đều có giá trị.</strong><span>Thang điểm Đúng/Sai</span></div>
            {[0.1, 0.25, 0.5, 1].map((score, index) => (
              <div className="mtl-score-demo__row" key={score} style={{ '--score': score, '--i': index }}>
                <span>{index + 1} ý đúng</span><span className="mtl-score-demo__track" aria-hidden="true"><i /></span><strong>{score.toLocaleString('vi-VN')}đ</strong>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
