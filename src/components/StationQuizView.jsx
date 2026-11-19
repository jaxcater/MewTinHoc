import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Check,
  Lightbulb
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EASINGS } from '../variants';
import './station-quiz.css';

// Hiển thị đoạn mã theo từng dòng (có số dòng); blocks: [{ lang, lines: [] }]
function CodeBlocks({ blocks }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="sq-code-grid">
      {blocks.map((block, blockIdx) => (
        <div key={blockIdx} className="sq-code-box">
          <div className="sq-code-lang">{block.lang}</div>
          <pre className="sq-code-pre">
            {(block.lines || []).map((line, lineIdx) => (
              <div key={lineIdx} className="sq-code-line">
                <span className="sq-code-ln">{lineIdx + 1}</span>
                <span className="sq-code-txt">{line || ' '}</span>
              </div>
            ))}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default function StationQuizView({
  quizData,
  stationTitle = 'Chủ đề ôn tập',
  stationCode = 'Chủ đề',
  onComplete,
  onSubmitResult,
}) {
  const prefersReducedMotion = useReducedMotion();
  const [quizVersion, setQuizVersion] = useState(0);
  const shuffle = (items, version = 0) => {
    const copied = [...items];
    const offset = copied.length ? version % copied.length : 0;
    return copied.slice(offset).concat(copied.slice(0, offset)).sort(() => Math.random() - 0.5);
  };
  const mcqList = useMemo(() => shuffle(quizData?.mcq || [], quizVersion), [quizData, quizVersion]);
  const tfList = useMemo(() => shuffle((quizData?.tf || []).map((question) => ({
    ...question,
    items: shuffle(question.items || [], quizVersion)
  })), quizVersion), [quizData, quizVersion]);

  // Tab: 'mcq' (Phần I) hoặc 'tf' (Phần II)
  const [activePart, setActivePart] = useState('mcq');

  // Answers state
  // mcqAnswers: { [questionIndex]: selectedOptionIndex (0-3) }
  const [mcqAnswers, setMcqAnswers] = useState({});

  // tfAnswers: { [qIndex]: { [itemIndex]: boolean (true/false) } }
  const [tfAnswers, setTfAnswers] = useState({});

  // Submitted & result state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  // Jump to specific question
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [currentTfIndex, setCurrentTfIndex] = useState(0);

  // Count answered items
  const answeredMcqCount = Object.keys(mcqAnswers).length;
  const answeredTfCount = Object.values(tfAnswers).reduce(
    (acc, qObj) => acc + Object.keys(qObj || {}).length,
    0
  );
  const totalTfItems = tfList.reduce((acc, q) => acc + (q.items?.length || 0), 0);
  const totalItems = mcqList.length + totalTfItems;
  const totalAnswered = answeredMcqCount + answeredTfCount;
  const progressRatio = totalItems > 0 ? Math.min(1, totalAnswered / totalItems) : 0;

  // Handle MCQ selection
  const handleSelectMcq = (qIdx, optIdx) => {
    if (isSubmitted) return;
    setCurrentMcqIndex(qIdx);
    setMcqAnswers((prev) => ({
      ...prev,
      [qIdx]: optIdx
    }));
  };

  // Handle TF selection
  const handleSelectTf = (qIdx, itemIdx, val) => {
    if (isSubmitted) return;
    setCurrentTfIndex(qIdx);
    setTfAnswers((prev) => ({
      ...prev,
      [qIdx]: {
        ...(prev[qIdx] || {}),
        [itemIdx]: val
      }
    }));
  };

  // Calculate score and submit
  const handleSubmit = () => {
    let correctCount = 0;
    const wrongMcq = [];
    const wrongTf = [];

    // Grade MCQ (1 point each)
    mcqList.forEach((q, idx) => {
      const userAns = mcqAnswers[idx];
      if (userAns === q.ans) {
        correctCount++;
      } else {
        wrongMcq.push({
          index: idx,
          question: q,
          userAns
        });
      }
    });

    // Grade TF (1 point per sub-item)
    tfList.forEach((q, qIdx) => {
      const qAns = tfAnswers[qIdx] || {};
      q.items.forEach((item, itemIdx) => {
        const userVal = qAns[itemIdx];
        if (userVal === item.ans) {
          correctCount++;
        } else {
          wrongTf.push({
            qIndex: qIdx,
            itemIndex: itemIdx,
            item,
            userVal
          });
        }
      });
    });

    const score10 = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) / 10 : 0;

    const res = {
      correctCount,
      totalItems,
      score10,
      accuracy: totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0,
      wrongMcq,
      wrongTf
    };

    setScoreResult(res);
    setIsSubmitted(true);
    onSubmitResult?.(res);

    if (res.accuracy >= 80 && !prefersReducedMotion) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#EAB308', '#F97316', '#3B82F6'],
        disableForReducedMotion: true
      });
    }

    if (res.accuracy >= 80 && onComplete) {
      onComplete(res);
    }
  };

  // Reset
  const handleReset = () => {
    setQuizVersion((version) => version + 1);
    setMcqAnswers({});
    setTfAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);
    setCurrentMcqIndex(0);
    setCurrentTfIndex(0);
  };

  return (
    <div className="station-quiz-view">
      {/* 1. Header Toolbar */}
      <div className="station-quiz-header">
        <span
          className="station-quiz-progress-bar"
          style={{ transform: `scaleX(${progressRatio})` }}
          aria-hidden="true"
        />
        <div className="station-quiz-title-wrap">
          <div className="station-quiz-code">{stationCode}</div>
          <div>
            <div className="station-quiz-title">{stationTitle}</div>
            <div className="station-quiz-subtitle">
              Phần I: {mcqList.length} câu trắc nghiệm
              {tfList.length > 0 ? ` • Phần II: ${tfList.length} câu Đúng/Sai (${totalTfItems} ý)` : ''}
              {` • Tổng ${totalItems} ý chấm điểm`}
            </div>
          </div>
        </div>

        {/* Tab switch Part I vs Part II */}
        <div className="station-quiz-tabs" role="tablist" aria-label="Phần câu hỏi">
          <button
            type="button"
            role="tab"
            aria-selected={activePart === 'mcq'}
            onClick={() => setActivePart('mcq')}
            className={`station-quiz-tab-btn${activePart === 'mcq' ? ' is-active' : ''}`}
          >
            <span>Phần I: Trắc nghiệm ({mcqList.length})</span>
            <span className="station-quiz-tab-count">
              {answeredMcqCount}/{mcqList.length}
            </span>
          </button>

          {tfList.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activePart === 'tf'}
              onClick={() => setActivePart('tf')}
              className={`station-quiz-tab-btn is-tf${activePart === 'tf' ? ' is-active' : ''}`}
            >
              <span>Phần II: Đúng / Sai ({tfList.length})</span>
              <span className="station-quiz-tab-count">
                {answeredTfCount}/{totalTfItems}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Score Banner (When Submitted) */}
      {isSubmitted && scoreResult && (
        <motion.div
          className={`station-quiz-score${scoreResult.accuracy >= 80 ? ' is-pass' : ''}`}
          initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASINGS.emilOut }}
        >
          <div className="station-quiz-score-main">
            <div
              className={`station-quiz-score-badge ${
                scoreResult.score10 >= 8 ? 'is-high' : scoreResult.score10 >= 5 ? 'is-mid' : 'is-low'
              }`}
            >
              {scoreResult.score10.toFixed(1)}
            </div>
            <div>
              <div className="station-quiz-score-heading">
                {scoreResult.accuracy >= 80
                  ? 'Hoàn thành chủ đề! Bạn đã đạt từ 80%'
                  : 'Chưa đạt 80% — hãy xem lại lời giải và thử lại nhé'}
              </div>
              <div className="station-quiz-score-meta">
                Đúng: <strong>{scoreResult.correctCount}/{scoreResult.totalItems} ý</strong> (Độ chính xác {scoreResult.accuracy}%)
                {' • '}
                {scoreResult.wrongMcq.length + scoreResult.wrongTf.length === 0
                  ? 'Không sai câu nào'
                  : `Còn sai ${scoreResult.wrongMcq.length + scoreResult.wrongTf.length} câu/ý`}
              </div>
            </div>
          </div>

          <button type="button" onClick={handleReset} className="station-quiz-reset-btn">
            <RotateCcw size={15} />
            <span>Làm lại từ đầu</span>
          </button>
        </motion.div>
      )}

      {/* 3. Main Question Container & Sidebar Navigator */}
      <div className="station-quiz-body">
        {/* Left: Questions Scroll Area */}
        <div className="station-quiz-questions">
          {activePart === 'mcq' || tfList.length === 0 ? (
            /* =================== PHẦN I: TRẮC NGHIỆM =================== */
            <div className="station-quiz-list">
              {mcqList.map((q, idx) => {
                const userChoice = mcqAnswers[idx];
                const isCorrect = userChoice === q.ans;
                const isAnswered = userChoice !== undefined;

                const cardStateClass = isSubmitted
                  ? isCorrect
                    ? 'is-correct'
                    : 'is-wrong'
                  : isAnswered
                  ? 'is-answered'
                  : '';

                return (
                  <article key={q.id || idx} id={`mcq_card_${idx}`} className={`sq-card ${cardStateClass}`}>
                    {/* Header câu hỏi */}
                    <div className="sq-card-head">
                      <div className="sq-card-head-left">
                        <span className="sq-no-badge">Câu {idx + 1}</span>
                        <span className="sq-type-label">Trắc nghiệm 4 lựa chọn (0.25đ)</span>
                      </div>

                      {isSubmitted && (
                        <div className={`sq-result-tag ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                          {isCorrect ? (
                            <>
                              <CheckCircle size={15} />
                              <span>Đúng (+0.25đ)</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={15} />
                              <span>Sai (0đ)</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nội dung câu hỏi */}
                    <div className="sq-stem">
                      {q.q}
                      <CodeBlocks blocks={q.code} />
                      {q.qAfter && <div>{q.qAfter}</div>}
                    </div>

                    {/* 4 phương án A, B, C, D */}
                    <div className="sq-options" role="group" aria-label={`Các phương án câu ${idx + 1}`}>
                      {q.opts.map((opt, optIdx) => {
                        const letter = 'ABCD'[optIdx];
                        const isSelected = userChoice === optIdx;
                        const isThisCorrect = q.ans === optIdx;

                        let optClass = '';
                        if (isSubmitted) {
                          if (isThisCorrect) optClass = 'is-correct';
                          else if (isSelected && !isThisCorrect) optClass = 'is-wrong';
                        } else if (isSelected) {
                          optClass = 'is-selected';
                        }

                        return (
                          <button
                            type="button"
                            key={optIdx}
                            disabled={isSubmitted}
                            aria-pressed={isSelected}
                            onClick={() => handleSelectMcq(idx, optIdx)}
                            className={`sq-option ${optClass}`}
                          >
                            <span className="sq-option-letter">{letter}</span>
                            <span className="sq-option-text">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Giải thích sau khi nộp bài */}
                    {isSubmitted && (
                      <div className="sq-explain">
                        <Lightbulb size={18} className="sq-explain-icon" />
                        <div>
                          <strong>Đáp án đúng: {'ABCD'[q.ans]}.</strong> {q.exp}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            /* =================== PHẦN II: ĐÚNG / SAI =================== */
            <div className="station-quiz-list">
              {tfList.map((q, qIdx) => {
                const currentAnswers = tfAnswers[qIdx] || {};

                return (
                  <article key={q.id || qIdx} id={`tf_card_${qIdx}`} className="sq-card">
                    {/* Header câu hỏi Đúng/Sai */}
                    <div className="sq-card-head">
                      <div className="sq-card-head-left">
                        <span className="sq-no-badge is-tf">Câu {qIdx + 1} (Phần II)</span>
                        <span className="sq-type-label">Đúng/Sai (Mỗi ý 0.25đ • Đúng cả 4 ý đạt 1.0đ)</span>
                      </div>
                    </div>

                    {/* Ngữ cảnh */}
                    <div className="sq-tf-ctx">
                      {q.ctx}
                      <CodeBlocks blocks={q.code} />
                      {q.ctxAfter && <div>{q.ctxAfter}</div>}
                    </div>

                    {/* Danh sách 4 mệnh đề a, b, c, d */}
                    <div className="sq-tf-items">
                      {q.items.map((item, itemIdx) => {
                        const letter = 'abcd'[itemIdx];
                        const userVal = currentAnswers[itemIdx];
                        const isCorrect = userVal === item.ans;

                        const itemState = isSubmitted
                          ? isCorrect
                            ? 'is-correct'
                            : 'is-wrong'
                          : userVal !== undefined
                          ? 'is-answered'
                          : '';

                        return (
                          <div key={itemIdx} className={`sq-tf-item ${itemState}`}>
                            <div className="sq-tf-row">
                              <div className="sq-tf-text">
                                <span className="sq-tf-letter">{letter})</span>
                                {item.s}
                              </div>

                              {/* Nút bấm chọn Đúng / Sai */}
                              <div className="sq-tf-actions" role="group" aria-label={`Mệnh đề ${letter}`}>
                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  aria-pressed={userVal === true}
                                  onClick={() => handleSelectTf(qIdx, itemIdx, true)}
                                  className={`sq-tf-btn${userVal === true ? ' is-true-active' : ''}`}
                                >
                                  ĐÚNG
                                </button>

                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  aria-pressed={userVal === false}
                                  onClick={() => handleSelectTf(qIdx, itemIdx, false)}
                                  className={`sq-tf-btn${userVal === false ? ' is-false-active' : ''}`}
                                >
                                  SAI
                                </button>
                              </div>
                            </div>

                            {/* Lời giải thích khi nộp bài */}
                            {isSubmitted && (
                              <div className={`sq-tf-explain ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                                {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                <span>
                                  Đáp án chuẩn: <strong>{item.ans ? 'ĐÚNG' : 'SAI'}</strong>. {item.exp}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Palette Navigator & Submit Action */}
        <aside className="station-quiz-navigator" aria-label="Điều hướng câu hỏi">
          <div className="sq-nav-palettes">
            <div className="sq-nav-heading">Danh sách câu hỏi</div>

            {/* MCQ Palette */}
            <div className="sq-nav-group">
              <div className="sq-nav-label">
                Phần I: Trắc nghiệm ({answeredMcqCount}/{mcqList.length})
              </div>
              <div className="sq-nav-grid-mcq">
                {mcqList.map((_, idx) => {
                  const isDone = mcqAnswers[idx] !== undefined;
                  const isCur = activePart === 'mcq' && currentMcqIndex === idx;

                  return (
                    <button
                      type="button"
                      key={idx}
                      aria-current={isCur ? 'step' : undefined}
                      onClick={() => {
                        setActivePart('mcq');
                        setCurrentMcqIndex(idx);
                        requestAnimationFrame(() => {
                          document.getElementById(`mcq_card_${idx}`)?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
                        });
                      }}
                      className={`sq-nav-num${isDone ? ' is-done' : ''}${isCur ? ' is-current' : ''}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TF Palette */}
            {tfList.length > 0 && (
              <div className="sq-nav-group">
                <div className="sq-nav-label">
                  Phần II: Đúng / Sai ({answeredTfCount}/{totalTfItems} ý)
                </div>
                <div className="sq-nav-grid-tf">
                  {tfList.map((q, idx) => {
                    const qAns = tfAnswers[idx] || {};
                    const isFull = Object.keys(qAns).length === (q.items?.length || 4);
                    const isCur = activePart === 'tf' && currentTfIndex === idx;

                    return (
                      <button
                        type="button"
                        key={idx}
                        aria-current={isCur ? 'step' : undefined}
                        onClick={() => {
                          setActivePart('tf');
                          setCurrentTfIndex(idx);
                          requestAnimationFrame(() => {
                            document.getElementById(`tf_card_${idx}`)?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
                          });
                        }}
                        className={`sq-nav-num is-tf${isFull ? ' is-done' : ''}${isCur ? ' is-current' : ''}`}
                      >
                        C{idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Submit Button */}
          <div className="sq-nav-footer">
            <div className="sq-nav-status">
              Đã làm: <strong>{totalAnswered}/{totalItems} ý</strong>
            </div>

            {!isSubmitted ? (
              <button type="button" onClick={handleSubmit} className="sq-submit-btn">
                <Check size={16} />
                <span>Nộp bài &amp; Chấm điểm</span>
              </button>
            ) : (
              <button type="button" onClick={handleReset} className="sq-submit-btn is-secondary">
                <RotateCcw size={16} />
                <span>Làm lại từ đầu</span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
