// ============================================================
//  Phòng thi thử: hiển thị đề, làm bài 50 phút, chấm điểm
//   - Đề nhận từ API KHÔNG có đáp án
//   - Đáp án + giải thích chỉ hiện sau khi nộp
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Send, RotateCcw, Check, X, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitExam } from '../../lib/examApi.js';
import useCountdown from './useCountdown.js';
import './exam-room.css';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const TRACK_LABEL = {
  ict: 'Tin học ứng dụng (ICT)',
  cs: 'Khoa học máy tính (CS)',
};

/** Tách các đoạn code inline trong câu hỏi để render bằng <code> */
function renderRichText(text) {
  const parts = String(text || '').split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export default function ExamRoom({ exam, onSubmitted, onExit }) {
  const [activePart, setActivePart] = useState('partI');
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [tfAnswers, setTfAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);

  // Giữ tham chiếu mới nhất để tránh stale closure trong countdown
  const submitRef = useRef(null);

  const totalMcq = exam.partI.length;
  const totalTf = exam.partII.length;

  const answeredMcq = Object.keys(mcqAnswers).length;
  const answeredTf = useMemo(
    () =>
      Object.values(tfAnswers).reduce(
        (sum, row) => sum + Object.keys(row || {}).length,
        0,
      ),
    [tfAnswers],
  );
  const totalTfStatements = totalTf * 4;

  const isSubmitted = Boolean(result);

  const doSubmit = useCallback(
    async (auto = false) => {
      if (isSubmitted || submitting) return;
      setSubmitting(true);
      setSubmitError('');

      const payload = {
        partI: exam.partI.map((_, index) =>
          Number.isInteger(mcqAnswers[index]) ? mcqAnswers[index] : null,
        ),
        partII: exam.partII.map((_, index) => {
          const row = tfAnswers[index] || {};
          return [0, 1, 2, 3].map((statementIndex) =>
            typeof row[statementIndex] === 'boolean' ? row[statementIndex] : null,
          );
        }),
      };

      try {
        const data = await submitExam(exam.examId, payload);
        setResult(data.result);
        onSubmitted?.(data.result);

        if (data.result.totalScore >= 8) {
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#EA580C', '#FBBF24', '#16A34A', '#7C2D12'],
          });
        }
        if (auto) {
          setSubmitError('Đã hết giờ làm bài. Bài của bạn được nộp tự động.');
        }
      } catch (err) {
        setSubmitError(err.message || 'Không nộp được bài. Vui lòng thử lại.');
      } finally {
        setSubmitting(false);
      }
    },
    [exam, mcqAnswers, tfAnswers, isSubmitted, submitting, onSubmitted],
  );

  useEffect(() => {
    submitRef.current = () => doSubmit(true);
  }, [doSubmit]);

  const countdown = useCountdown(
    exam.durationMinutes || 50,
    () => submitRef.current?.(),
    !isSubmitted,
  );

  // Cảnh báo khi rời trang giữa lúc làm bài
  useEffect(() => {
    if (isSubmitted) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isSubmitted]);

  const handleSelectMcq = (questionIndex, optionIndex) => {
    if (isSubmitted) return;
    setMcqAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSelectTf = (questionIndex, statementIndex, value) => {
    if (isSubmitted) return;
    setTfAnswers((prev) => ({
      ...prev,
      [questionIndex]: {
        ...(prev[questionIndex] || {}),
        [statementIndex]: value,
      },
    }));
  };

  const confirmSubmit = () => {
    const unanswered =
      totalMcq - answeredMcq + (totalTfStatements - answeredTf);
    if (unanswered > 0) {
      const ok = window.confirm(
        `Bạn còn ${unanswered} ý chưa trả lời. Vẫn nộp bài?`,
      );
      if (!ok) return;
    }
    doSubmit(false);
  };

  // ---------- Kết quả ----------
  if (isSubmitted) {
    return (
      <div className="exam-room">
        <div className="exam-result">
          <div className="exam-result__top">
            <div className="exam-result__score">
              {result.totalScore.toFixed(2)}
              <small>/10</small>
            </div>
            <div className="exam-result__summary">
              <strong>
                {result.totalScore >= 8
                  ? '🎉 Xuất sắc! Bạn đã sẵn sàng cho kỳ thi.'
                  : result.totalScore >= 5
                    ? '💪 Khá tốt! Ôn thêm phần còn yếu nhé.'
                    : '📚 Cần ôn lại — xem kỹ phần giải thích bên dưới.'}
              </strong>
              <span>
                Đúng {result.correctItems}/{result.gradedItems} ý · Độ chính xác{' '}
                {result.accuracy}% · {TRACK_LABEL[exam.track] || exam.track}
              </span>
            </div>
          </div>

          <div className="exam-result__breakdown">
            <div className="exam-result__stat">
              <span>Phần I</span>
              <strong>
                {result.partI.correct}/{result.partI.total} · {result.partI.score.toFixed(2)}đ
              </strong>
            </div>
            <div className="exam-result__stat">
              <span>Phần II</span>
              <strong>{result.partII.score.toFixed(2)}đ / 4,00đ</strong>
            </div>
            <div className="exam-result__stat">
              <span>Thời gian còn lại</span>
              <strong>{countdown.label}</strong>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="exam-alert" data-tone="info">
            <Clock size={16} />
            <span>{submitError}</span>
          </div>
        )}

        <div className="exam-room__parts">
          <button
            type="button"
            className="exam-room__part-btn"
            aria-selected={activePart === 'partI'}
            onClick={() => setActivePart('partI')}
          >
            Phần I · Trắc nghiệm ({result.partI.correct}/{result.partI.total})
          </button>
          <button
            type="button"
            className="exam-room__part-btn"
            aria-selected={activePart === 'partII'}
            onClick={() => setActivePart('partII')}
          >
            Phần II · Đúng/Sai
          </button>
        </div>

        <div className="exam-room__questions">
          {activePart === 'partI'
            ? exam.partI.map((question, index) => {
                const detail = result.partI.details[index];
                const chosen = mcqAnswers[index];
                return (
                  <article className="exam-q" key={question.no} data-answered="true">
                    <div className="exam-q__head">
                      <span className="exam-q__no">Câu {question.no}</span>
                      {question.topic && <span className="exam-q__topic">{question.topic}</span>}
                      <span
                        className="exam-q__topic"
                        style={{
                          background: detail.isCorrect ? '#DCFCE7' : '#FEE2E2',
                          color: detail.isCorrect ? '#166534' : '#991B1B',
                          marginLeft: 'auto',
                        }}
                      >
                        {detail.isCorrect ? 'Đúng' : 'Sai'}
                      </span>
                    </div>
                    <p className="exam-q__stem">{renderRichText(question.stem)}</p>
                    {question.options.map((option, optionIndex) => {
                      let state;
                      if (optionIndex === detail.correctAnswer) state = 'correct';
                      else if (optionIndex === chosen) state = 'wrong';
                      return (
                        <div
                          key={optionIndex}
                          className="exam-opt"
                          data-state={state}
                          data-selected={optionIndex === chosen}
                        >
                          <span className="exam-opt__badge">{OPTION_LABELS[optionIndex]}</span>
                          <span>{renderRichText(option)}</span>
                        </div>
                      );
                    })}
                    {detail.exp && (
                      <div className="exam-explain">
                        <strong>Đáp án {OPTION_LABELS[detail.correctAnswer]}.</strong>{' '}
                        {renderRichText(detail.exp)}
                      </div>
                    )}
                  </article>
                );
              })
            : exam.partII.map((question, index) => {
                const detail = result.partII.details[index];
                return (
                  <article className="exam-q" key={question.no} data-answered="true">
                    <div className="exam-q__head">
                      <span className="exam-q__no">Câu {index + 21}</span>
                      <span
                        className="exam-q__topic"
                        style={{
                          background:
                            detail.correctStatementCount === 4 ? '#DCFCE7' : '#FEF3C7',
                          color: detail.correctStatementCount === 4 ? '#166534' : '#92400E',
                          marginLeft: 'auto',
                        }}
                      >
                        {detail.correctStatementCount}/4 ý · {detail.earned.toFixed(2)}đ
                      </span>
                    </div>
                    <p className="exam-q__scenario">{renderRichText(question.scenario)}</p>
                    <div className="exam-tf">
                      {question.statements.map((statement, statementIndex) => {
                        const statementDetail = detail.statements[statementIndex];
                        const chosen = (tfAnswers[index] || {})[statementIndex];
                        const state =
                          statementDetail.isCorrect
                            ? chosen === statementDetail.correct
                              ? 'full'
                              : 'none'
                            : 'none';
                        return (
                          <div className="exam-tf__row" key={statement.key} data-state={state}>
                            <span className="exam-tf__key">{statement.key}</span>
                            <span className="exam-tf__text">{renderRichText(statement.text)}</span>
                            <span className="exam-tf__choices">
                              <button type="button" className="exam-tf__btn" disabled data-value="true"
                                data-selected={chosen === true}>ĐÚNG</button>
                              <button type="button" className="exam-tf__btn" disabled data-value="false"
                                data-selected={chosen === false}>SAI</button>
                            </span>
                            <div className="exam-tf__answer">
                              <strong>
                                {statementDetail.isCorrect ? '✓ Bạn đúng' : '✗ Bạn sai'} · Đáp án:{' '}
                                {statementDetail.correct ? 'ĐÚNG' : 'SAI'}
                              </strong>
                              {statementDetail.exp ? ' — ' + statementDetail.exp : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
        </div>

        {onExit && (
          <div className="exam-room__actions">
            <div className="exam-room__progress-text">
              Điểm cuối cùng: <strong>{result.totalScore.toFixed(2)}/10</strong>
            </div>
            <button type="button" className="btn-primary-glow" onClick={onExit}>
              <RotateCcw size={16} />
              <span>Tạo đề mới</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------- Đang làm bài ----------
  return (
    <div className="exam-room">
      <div className="exam-room__bar">
        <div className="exam-room__bar-left">
          <div className="exam-room__title">
            <strong>Đề thi thử Tin học THPTQG</strong>
            <span>
              {TRACK_LABEL[exam.track] || exam.track} · {exam.partI.length + exam.partII.length} câu
            </span>
          </div>
          <span className="exam-room__track-chip">
            <BookOpen size={12} />
            50 phút
          </span>
        </div>
        <div className="exam-room__bar-right">
          <span className="exam-room__timer" data-urgent={countdown.isUrgent}>
            <Clock size={16} />
            {countdown.label}
          </span>
        </div>
      </div>

      <div className="exam-room__parts">
        <button
          type="button"
          className="exam-room__part-btn"
          aria-selected={activePart === 'partI'}
          onClick={() => setActivePart('partI')}
        >
          Phần I · Trắc nghiệm ({answeredMcq}/{totalMcq})
        </button>
        <button
          type="button"
          className="exam-room__part-btn"
          aria-selected={activePart === 'partII'}
          onClick={() => setActivePart('partII')}
        >
          Phần II · Đúng/Sai ({answeredTf}/{totalTfStatements})
        </button>
      </div>

      <div className="exam-room__questions">
        {activePart === 'partI'
          ? exam.partI.map((question, index) => (
              <article
                className="exam-q"
                key={question.no}
                data-answered={Number.isInteger(mcqAnswers[index])}
              >
                <div className="exam-q__head">
                  <span className="exam-q__no">Câu {question.no}</span>
                  {question.topic && <span className="exam-q__topic">{question.topic}</span>}
                </div>
                <p className="exam-q__stem">{renderRichText(question.stem)}</p>
                {question.options.map((option, optionIndex) => (
                  <button
                    type="button"
                    key={optionIndex}
                    className="exam-opt"
                    data-selected={mcqAnswers[index] === optionIndex}
                    onClick={() => handleSelectMcq(index, optionIndex)}
                  >
                    <span className="exam-opt__badge">{OPTION_LABELS[optionIndex]}</span>
                    <span>{renderRichText(option)}</span>
                  </button>
                ))}
              </article>
            ))
          : exam.partII.map((question, index) => (
              <article
                className="exam-q"
                key={question.no}
                data-answered={Object.keys(tfAnswers[index] || {}).length === 4}
              >
                <div className="exam-q__head">
                  <span className="exam-q__no">Câu {index + 21}</span>
                  <span className="exam-q__topic">Đúng / Sai</span>
                </div>
                <p className="exam-q__scenario">{renderRichText(question.scenario)}</p>
                <div className="exam-tf">
                  {question.statements.map((statement, statementIndex) => {
                    const chosen = (tfAnswers[index] || {})[statementIndex];
                    return (
                      <div className="exam-tf__row" key={statement.key}>
                        <span className="exam-tf__key">{statement.key}</span>
                        <span className="exam-tf__text">{renderRichText(statement.text)}</span>
                        <span className="exam-tf__choices">
                          <button
                            type="button"
                            className="exam-tf__btn"
                            data-value="true"
                            data-selected={chosen === true}
                            onClick={() => handleSelectTf(index, statementIndex, true)}
                          >
                            ĐÚNG
                          </button>
                          <button
                            type="button"
                            className="exam-tf__btn"
                            data-value="false"
                            data-selected={chosen === false}
                            onClick={() => handleSelectTf(index, statementIndex, false)}
                          >
                            SAI
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
      </div>

      {submitError && (
        <div className="exam-alert" data-tone="error">
          <X size={16} />
          <span>{submitError}</span>
        </div>
      )}

      <div className="exam-room__actions">
        <div className="exam-room__progress-text">
          Đã trả lời <strong>{answeredMcq + answeredTf}</strong> /{' '}
          {totalMcq + totalTfStatements} ý
        </div>
        <button
          type="button"
          className="btn-primary-glow"
          onClick={confirmSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Check size={16} />
              <span>Đang chấm điểm...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Nộp bài &amp; xem đáp án</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
