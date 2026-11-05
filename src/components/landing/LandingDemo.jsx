import React, { useCallback, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { CAPABILITIES, SAMPLE_QUESTION } from './landingContent';
import useReveal from './useReveal';

const KEYS = ['A', 'B', 'C', 'D'];

/**
 * 03 · Trình diễn sản phẩm: một câu hỏi thật, chấm ngay.
 *
 * "Một việc sống": người xem trả lời đúng câu hỏi thật lấy từ ngân hàng đề của
 * sản phẩm (src/data/questions/chuong1.js) và nhận lời giải thích thật. Đây là
 * cách chứng minh sản phẩm làm gì, mạnh hơn mọi câu quảng cáo.
 *
 * Mục này cố tình KHÔNG có tiêu đề: nó tiếp nối trực tiếp mục lộ trình phía
 * trên, và bản thân khung câu hỏi đã tự nói nó là gì. Không có bảng điểm giả
 * bên cạnh, vì một câu trả lời không thể tạo ra điểm của cả đề 24 + 4 câu.
 *
 * Bàn phím: mỗi lựa chọn là <button> thật, điều hướng bằng Tab và chọn bằng
 * Enter/Space theo đúng thứ tự đọc. Chọn xong khoá lại để không đổi đáp án.
 */
export default function LandingDemo() {
  const sectionRef = useReveal();
  const [picked, setPicked] = useState(null);
  const [answered, setAnswered] = useState(false);

  const choose = useCallback(
    (index) => {
      if (answered) return;
      setPicked(index);
      setAnswered(true);
    },
    [answered]
  );

  const reset = useCallback(() => {
    setPicked(null);
    setAnswered(false);
  }, []);

  const isRight = picked === SAMPLE_QUESTION.answer;

  return (
    <section id="thu-suc" className="mtl-section mtl-section--demo" aria-labelledby="demo-heading" ref={sectionRef}>
      <div className="mtl-shell">
        <div className="mtl-section__head">
          <div data-reveal><span className="mtl-eyebrow">02 / HỌC BẰNG CÁCH THỬ</span>
            <h2 className="mtl-h2" id="demo-heading">Một câu hỏi.<br />Một điều hiểu rõ hơn.</h2></div>
          <p className="mtl-p" data-reveal style={{ '--i': 1 }}>Chạm vào đáp án bạn chọn. Xem giải thích ngay tại đây, trước khi bắt đầu hành trình của mình.</p>
        </div>
        <div className="mtl-demo__grid">
          <div className="mtl-quiz" data-reveal style={{ '--i': 0 }}>
            <div className="mtl-quiz__top">
              <span className="mtl-quiz__station">{SAMPLE_QUESTION.station}</span>
              <span className="mtl-quiz__count">
                Câu {SAMPLE_QUESTION.index} / {SAMPLE_QUESTION.total}
              </span>
            </div>

            <p className="mtl-quiz__prompt" id="sample-question">
              {SAMPLE_QUESTION.prompt}
            </p>

            <div className="mtl-quiz__options" role="group" aria-labelledby="sample-question">
              {SAMPLE_QUESTION.options.map((option, index) => {
                const correct = index === SAMPLE_QUESTION.answer;
                let stateClass = '';
                if (answered) {
                  if (correct) stateClass = ' mtl-option--right';
                  else if (index === picked) stateClass = ' mtl-option--wrong';
                  else stateClass = ' mtl-option--dim';
                }
                return (
                  <button
                    type="button"
                    key={option}
                    className={`mtl-option${stateClass}`}
                    onClick={() => choose(index)}
                    disabled={answered}
                    aria-pressed={picked === index}
                  >
                    <span className="mtl-option__key" aria-hidden="true">
                      {answered && correct ? <Check size={14} /> : KEYS[index]}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="mtl-explain" role="status">
                <div className="mtl-explain__label">
                  <Sparkles size={13} aria-hidden="true" />
                  {isRight ? 'Chính xác' : `Chưa đúng. Đáp án đúng là ${KEYS[SAMPLE_QUESTION.answer]}`}
                </div>
                <p className="mtl-explain__text">{SAMPLE_QUESTION.explanation}</p>
                <button type="button" className="mtl-link mtl-explain__again" onClick={reset}>
                  Làm lại câu này
                </button>
              </div>
            )}
          </div>

          {/* Cột phải: nhận xét của AI viết trên chính câu vừa trả lời · thứ
              duy nhất ở đây nói được điều gì đó đúng về một câu trả lời. */}
          <div className="mtl-demo__side" data-reveal style={{ '--i': 1 }}>
            <div className="mtl-ai-note">
              <div className="mtl-ai-note__head">
                <Sparkles size={14} aria-hidden="true" />
                Nhận xét minh hoạ
              </div>
              <p className="mtl-ai-note__text">
                {answered
                  ? isRight
                    ? 'Bạn phân biệt đúng AI hẹp với AI tổng quát. Phần này nằm trong nhóm nhận biết, nên giữ nhịp đọc kỹ từ khoá "nhiệm vụ cụ thể".'
                    : 'Hai phương án A và D mô tả AI tổng quát. Khi gặp câu về ANI, hãy tìm cụm "nhiệm vụ cụ thể" hoặc "phạm vi được huấn luyện".'
                  : 'Chọn một đáp án để xem nhận xét. AI sẽ chỉ ra vì sao đúng hoặc sai, và nhắc lại dạng câu này có thể ra ở đâu.'}
              </p>
            </div>

            <div className="mtl-caps">
              {CAPABILITIES.map((cap) => (
                <div className="mtl-cap" key={cap.id}>
                  <span className="mtl-cap__name">{cap.name}</span>
                  <p className="mtl-cap__detail">{cap.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
