// ============================================================
//  Phòng thi thử: hiển thị đề, làm bài 50 phút, chấm điểm
//   - Đề nhận từ API KHÔNG có đáp án
//   - Đáp án + giải thích chỉ hiện sau khi nộp
//   - Sau khi nộp: dựng log điểm yếu, hiện bảng điểm yếu + đánh giá AI
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Send,
  RotateCcw,
  Check,
  X,
  BookOpen,
  ClipboardCopy,
  Download,
  History,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitExam } from '../../lib/examApi.js';
import {
  buildExamLog,
  saveExamLog,
  readExamLog,
  readAiReview,
  saveAiReview,
  buildAiPrompt,
  AI_SYSTEM_INSTRUCTION,
  formatExamLogText,
  examLogFileName,
  formatDateTimeVN,
  percentOf,
  TOPIC_LABELS,
} from '../../lib/examLog.js';
import { copyText, downloadTextFile } from '../../lib/clipboard.js';
import { fetchAiStatus, requestAiReview } from '../../lib/aiReviewApi.js';
import useCountdown from './useCountdown.js';
import AiReviewPanel from './AiReviewPanel.jsx';
import './exam-room.css';
import './gen-exam.css';

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

/** Nhận xét theo mức điểm */
function verdictFor(score) {
  if (score >= 8) return 'Xuất sắc — bạn đã sẵn sàng cho kỳ thi.';
  if (score >= 6.5) return 'Khá vững — chỉ cần bịt nốt vài lỗ hổng nhỏ.';
  if (score >= 5) return 'Trung bình — ôn lại đúng phần còn yếu là lên điểm nhanh.';
  return 'Cần ôn lại — đọc kỹ phần giải thích bên dưới rồi làm lại đề mới.';
}

export default function ExamRoom({ exam, onSubmitted, onExit, userId, progress }) {
  const storageUserId = userId || 'guest';

  const [activePart, setActivePart] = useState('partI');
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [tfAnswers, setTfAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);

  // Log điểm yếu của lần nộp này
  const [log, setLog] = useState(() => readExamLog(storageUserId));
  const [copied, setCopied] = useState(false);

  // Đánh giá AI
  const [aiStatus, setAiStatus] = useState('idle'); // idle | loading | done | error
  const [aiReview, setAiReview] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiConfigured, setAiConfigured] = useState(true);

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

  const countdown = useCountdown(
    exam.durationMinutes || 50,
    () => submitRef.current?.(),
    !isSubmitted,
  );

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

      // Số phút đã dùng = tổng thời gian − thời gian còn lại
      const totalMs = (exam.durationMinutes || 50) * 60 * 1000;
      const elapsedMinutes = Math.max(
        0,
        Math.round((totalMs - Math.max(0, totalMs - countdown.remainingMs)) / 60000),
      );

      try {
        const data = await submitExam(exam.examId, payload);
        setResult(data.result);
        onSubmitted?.(data.result);

        // Dựng + lưu log điểm yếu của chính lần nộp này
        const builtLog = buildExamLog({
          exam,
          result: data.result,
          cumulative: progress,
          elapsedMinutes,
        });
        saveExamLog(storageUserId, builtLog);
        setLog(builtLog);

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
    [exam, mcqAnswers, tfAnswers, isSubmitted, submitting, onSubmitted, progress, storageUserId, countdown.remainingMs],
  );

  useEffect(() => {
    submitRef.current = () => doSubmit(true);
  }, [doSubmit]);

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

  // Máy chủ đã cấu hình khoá AI chưa + đánh giá AI đã có cho log này
  useEffect(() => {
    if (!isSubmitted) return undefined;
    let cancelled = false;

    fetchAiStatus().then((status) => {
      if (!cancelled) setAiConfigured(status.configured);
    });

    const saved = readAiReview(storageUserId);
    if (saved?.review) {
      setAiReview(saved.review);
      setAiStatus('done');
    }

    return () => {
      cancelled = true;
    };
  }, [isSubmitted, storageUserId]);

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
    const unanswered = totalMcq - answeredMcq + (totalTfStatements - answeredTf);
    if (unanswered > 0) {
      const ok = window.confirm(
        `Bạn còn ${unanswered} ý chưa trả lời. Vẫn nộp bài?`,
      );
      if (!ok) return;
    }
    doSubmit(false);
  };

  /* ---------------- Đánh giá AI ---------------- */

  const currentLog = log || readExamLog(storageUserId);

  const handleRunAi = useCallback(async () => {
    if (!currentLog) return;
    setAiStatus('loading');
    setAiError('');
    try {
      const review = await requestAiReview(buildAiPrompt(currentLog));
      setAiReview(review);
      setAiStatus('done');
      saveAiReview(storageUserId, review);
    } catch (err) {
      setAiStatus('error');
      setAiError(err.message || 'Không lấy được đánh giá từ AI.');
    }
  }, [currentLog, storageUserId]);

  const handleCopyPrompt = useCallback(async () => {
    if (!currentLog) return;
    // Prompt dán tay gồm cả chỉ dẫn hệ thống để AI Studio hiểu đúng yêu cầu
    const text = `${AI_SYSTEM_INSTRUCTION}\n\n${buildAiPrompt(currentLog)}`;
    const ok = await copyText(text);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2400);
  }, [currentLog]);

  const handleDownloadLog = useCallback(() => {
    if (!currentLog) return;
    downloadTextFile(
      formatExamLogText(currentLog, { detail: true }),
      examLogFileName(currentLog),
    );
  }, [currentLog]);

  // ---------- Kết quả ----------
  if (isSubmitted) {
    const scorePct = Math.max(0, Math.min(1, result.totalScore / (result.maxScore || 10)));
    // Chu vi vòng tròn r=58 → 2πr ≈ 364.42. Đặt offset inline để không phụ thuộc
    // phép nhân đơn vị trong calc() trên trình duyệt cũ.
    const ringCircumference = 2 * Math.PI * 58;
    const ringOffset = ringCircumference * (1 - scorePct);
    const weakTopics = (currentLog?.partI?.topics || [])
      .filter((topic) => topic.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong);
    const weakTf = (currentLog?.partII?.groups || []).filter((group) => group.wrong > 0);

    return (
      <div className="exam-room">
        {/* ---------- Thẻ điểm ---------- */}
        <div className="exam-result">
          <div className="exam-result__top">
            <div
              className="exam-result__ring"
              role="img"
              aria-label={`Điểm ${result.totalScore.toFixed(2)} trên ${result.maxScore || 10}`}
            >
              <svg viewBox="0 0 132 132" aria-hidden="true">
                <circle className="exam-result__ring-track" cx="66" cy="66" r="58" />
                <circle
                  className="exam-result__ring-arc"
                  cx="66"
                  cy="66"
                  r="58"
                  style={{
                    strokeDasharray: ringCircumference,
                    strokeDashoffset: ringOffset,
                  }}
                />
              </svg>
              <span className="exam-result__ring-label">
                {result.totalScore.toFixed(2)}
                <small>/{result.maxScore || 10}</small>
              </span>
            </div>

            <div className="exam-result__summary">
              <strong>{verdictFor(result.totalScore)}</strong>
              <span>
                Đúng {result.correctItems}/{result.gradedItems} ý · Độ chính xác{' '}
                {result.accuracy}% · {TRACK_LABEL[exam.track] || exam.track}
              </span>
              {currentLog?.weakest?.length > 0 && (
                <span className="exam-result__priority">
                  Ưu tiên ôn lại:{' '}
                  <strong>{currentLog.weakest.map((topic) => topic.code).join(' · ')}</strong>
                </span>
              )}
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
            <div className="exam-result__stat">
              <span>Cộng dồn tài khoản</span>
              <strong>
                {Number(progress?.total_exams) || 0} đề ·{' '}
                {(Number(progress?.avg_score) || 0).toFixed(1)}/10
              </strong>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="exam-alert" data-tone="info">
            <Clock size={16} />
            <span>{submitError}</span>
          </div>
        )}

        {/* ---------- Đánh giá của AI ---------- */}
        <AiReviewPanel
          status={aiStatus}
          review={aiReview}
          errorMessage={aiError}
          copied={copied}
          configured={aiConfigured}
          generatedAt={aiReview?.meta?.generatedAt}
          onRun={handleRunAi}
          onRetry={handleRunAi}
          onCopy={handleCopyPrompt}
        />

        {/* ---------- Điểm yếu lần này ---------- */}
        <section className="exam-weak" aria-labelledby="exam-weak-title">
          <div className="exam-weak__head">
            <h2 className="exam-weak__title" id="exam-weak-title">
              <History size={16} color="#EA580C" />
              Điểm yếu lần này
            </h2>
            <span className="exam-weak__stamp">
              {currentLog ? formatDateTimeVN(currentLog.submittedAt) : ''}
            </span>
          </div>

          {weakTopics.length === 0 && weakTf.length === 0 ? (
            <p className="exam-weak__perfect">
              Không sai câu nào — phần I và phần II đều trọn vẹn. Thử đề khác để kiểm tra độ ổn
              định nhé.
            </p>
          ) : (
            <>
              <div className="exam-weak__rows">
                {weakTopics.map((topic) => (
                  <div className="exam-weak__row" key={topic.code}>
                    <span className="exam-weak__code">{topic.code}</span>
                    <span className="exam-weak__name">
                      {TOPIC_LABELS[topic.code] || topic.name}
                      {topic.wrongNos?.length > 0 && (
                        <em>câu {topic.wrongNos.join(', ')}</em>
                      )}
                    </span>
                    <span className="exam-weak__track" aria-hidden="true">
                      <span
                        className="exam-weak__fill"
                        style={{ width: `${percentOf(topic.wrong, topic.total)}%` }}
                      />
                    </span>
                    <span className="exam-weak__count">
                      {topic.wrong}/{topic.total}
                    </span>
                  </div>
                ))}
                {weakTf.map((group) => (
                  <div className="exam-weak__row" key={group.key}>
                    <span className="exam-weak__code">P2</span>
                    <span className="exam-weak__name">{group.label}</span>
                    <span className="exam-weak__track" aria-hidden="true">
                      <span
                        className="exam-weak__fill"
                        style={{ width: `${percentOf(group.wrong, group.total)}%` }}
                      />
                    </span>
                    <span className="exam-weak__count">
                      {group.wrong}/{group.total}
                    </span>
                  </div>
                ))}
              </div>

              <div className="exam-weak__actions">
                <button type="button" className="gx-btn" onClick={handleCopyPrompt}>
                  {copied ? (
                    <>
                      <Check size={14} /> Đã copy
                    </>
                  ) : (
                    <>
                      <ClipboardCopy size={14} /> Copy prompt cho AI
                    </>
                  )}
                </button>
                <button type="button" className="gx-btn" onClick={handleDownloadLog}>
                  <Download size={14} /> Tải file log
                </button>
              </div>
            </>
          )}
        </section>

        {/* ---------- Chuyển phần ---------- */}
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
                  <article
                    className="exam-q"
                    key={question.no}
                    data-answered="true"
                    data-result={detail.isCorrect ? 'correct' : 'wrong'}
                  >
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
                  <article
                    className="exam-q"
                    key={question.no}
                    data-answered="true"
                    data-result={detail.correctStatementCount === 4 ? 'correct' : 'wrong'}
                  >
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
                        const state = statementDetail.isCorrect ? 'full' : 'none';
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
            <button type="button" className="gx-btn gx-btn--primary" onClick={onExit}>
              <RotateCcw size={16} />
              <span>Tạo đề mới</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------- Đang làm bài ----------
  const answeredRatio = (answeredMcq + answeredTf) / (totalMcq + totalTfStatements);

  return (
    <div className="exam-room">
      <div className="exam-room__bar">
        <span
          className="exam-room__bar-progress"
          style={{ transform: `scaleX(${Math.max(0, Math.min(1, answeredRatio))})` }}
          aria-hidden="true"
        />
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
          className="gx-btn gx-btn--primary"
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
