// ============================================================
//  Tab "Tạo bài thi thử"
//   - Màn giới thiệu: hero gradient + ma trận 24 câu + chọn định hướng
//   - Cột phụ: 3 chỉ số cộng dồn + log lần làm gần nhất
//   - Vào phòng thi: <ExamRoom /> (tự lo chấm điểm + đánh giá AI)
//
//  Đề luôn lấy từ API (server), KHÔNG chứa đáp án cho tới khi nộp.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Clock,
  AlertTriangle,
  GraduationCap,
  FlipHorizontal2,
  LayoutGrid,
  Trophy,
  Target,
  FileText,
  ClipboardCopy,
  Download,
  History,
  ShieldCheck,
  Check,
  ChevronRight,
  BookOpen,
  Award,
  TrendingUp,
} from 'lucide-react';
import { claimExam } from '../../lib/examApi.js';
import {
  TOPIC_LABELS,
  examLogFileName,
  formatDateTimeVN,
  formatExamLogText,
  clearExamLog,
  readExamLog,
  readAiReview,
} from '../../lib/examLog.js';
import { copyText, downloadTextFile } from '../../lib/clipboard.js';
import CountUpNumber from '../motion/CountUpNumber.jsx';
import ExamRoom from './ExamRoom.jsx';
import '../exam/exam-room.css';
import './gen-exam.css';

/* ------------------------------------------------------------------
   Dữ liệu cố định — khớp server/exam/config.js
   ------------------------------------------------------------------ */

const TRACK_OPTIONS = [
  {
    id: 'ict',
    code: 'ICT',
    label: 'Tin học ứng dụng',
    desc: '2 câu đúng/sai cuối đề lấy từ chuyên đề Tin học ứng dụng: phần mềm, bảng tính, nội dung số.',
  },
  {
    id: 'cs',
    code: 'CS',
    label: 'Khoa học máy tính',
    desc: '2 câu đúng/sai cuối đề lấy từ chuyên đề Khoa học máy tính: thuật toán, dữ liệu, hệ thống.',
  },
];

/** Ma trận Phần I — 7 khúc, đúng số câu thật của hệ thống */
const MATRIX_SEGMENTS = [
  { code: 'C5', count: 7, color: '#FBBF24' },
  { code: 'C1', count: 4, color: '#F97316' },
  { code: 'C2', count: 4, color: '#FB923C' },
  { code: 'C7', count: 3, color: '#FDBA74' },
  { code: 'C3', count: 2, color: '#FCD9A8' },
  { code: 'C4', count: 2, color: '#FDE8C8' },
  { code: 'C6', count: 2, color: '#FFF3DE' },
];

const SPECS = [
  { label: 'Phần I', value: '24 câu · 6,0đ' },
  { label: 'Phần II', value: '4 câu · 4,0đ' },
  { label: 'Thời gian', value: '50 phút' },
  { label: 'Tổng điểm', value: '10,00đ' },
];

/** Chuyển động vào trang: so le từ trên xuống */
const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: delay } },
});

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export default function GenExamTab({ onRecordExamResult, progress, userId }) {
  const reduceMotion = useReducedMotion();
  const storageUserId = userId || 'guest';

  const [track, setTrack] = useState(() => {
    const saved = localStorage.getItem('tinhoc_selected_track');
    return saved === 'cs' || saved === 'ict' ? saved : 'ict';
  });
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Log lần làm gần nhất + đánh giá AI đã lưu (đọc lại mỗi lần vào tab)
  const [log, setLog] = useState(() => readExamLog(storageUserId));
  const [aiSaved, setAiSaved] = useState(() => readAiReview(storageUserId));
  const [copyState, setCopyState] = useState('idle'); // idle | done | fail

  const refreshLog = useCallback(() => {
    setLog(readExamLog(storageUserId));
    setAiSaved(readAiReview(storageUserId));
  }, [storageUserId]);

  // Đổi tài khoản → nạp lại log của tài khoản đó
  useEffect(() => {
    refreshLog();
  }, [refreshLog]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setErrorCode('');
    // Tạo đề mới = log cũ không còn là "lần gần nhất" nữa
    clearExamLog(storageUserId);
    setLog(null);
    setAiSaved(null);

    try {
      const generated = await claimExam(track);
      setExam(generated);
    } catch (err) {
      setError(err.message || 'Không thể tạo đề. Vui lòng thử lại.');
      setErrorCode(err.code || '');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackChange = (nextTrack) => {
    setTrack(nextTrack);
    localStorage.setItem('tinhoc_selected_track', nextTrack);
  };

  const handleSubmitted = (result) => {
    onRecordExamResult?.(result.totalScore, result.accuracy);
  };

  const handleExit = () => {
    setExam(null);
    setError('');
    setErrorCode('');
    refreshLog();
  };

  /* ---------------- Copy / tải log (dùng ở cột phụ) ---------------- */

  const handleCopyLog = async () => {
    if (!log) return;
    const ok = await copyText(formatExamLogText(log, { detail: true }));
    setCopyState(ok ? 'done' : 'fail');
    setTimeout(() => setCopyState('idle'), 2400);
  };

  const handleDownloadLog = () => {
    if (!log) return;
    downloadTextFile(formatExamLogText(log, { detail: true }), examLogFileName(log));
  };

  /* ---------------- Chỉ số cộng dồn ---------------- */
  const stats = useMemo(
    () => [
      {
        key: 'exams',
        label: 'Đề thi đã hoàn thành',
        value: Number(progress?.total_exams) || 0,
        decimals: 0,
        suffix: '',
        foot: progress?.xp_total ? `${progress.xp_total} XP tích luỹ` : 'Bắt đầu từ đề đầu tiên',
        icon: BookOpen,
        tint: '#FEF3C7',
        accent: '#D97706',
      },
      {
        key: 'avg',
        label: 'Điểm trung bình',
        value: Number(progress?.avg_score) || 0,
        decimals: 1,
        suffix: '/10',
        foot: 'Trung bình mọi đề đã nộp',
        icon: Award,
        tint: '#DCFCE7',
        accent: '#16A34A',
      },
      {
        key: 'acc',
        label: 'Độ chính xác câu hỏi',
        value: Number(progress?.accuracy) || 0,
        decimals: 1,
        suffix: '%',
        foot: 'Tính trên 40 ý mỗi đề',
        icon: TrendingUp,
        tint: '#FEE2E2',
        accent: '#DC2626',
      },
    ],
    [progress?.total_exams, progress?.avg_score, progress?.accuracy, progress?.xp_total],
  );

  /* ---------------- Đang làm bài ---------------- */
  if (exam) {
    return (
      <ExamRoom
        exam={exam}
        userId={storageUserId}
        progress={progress}
        onSubmitted={handleSubmitted}
        onExit={handleExit}
      />
    );
  }

  /* ---------------- Màn giới thiệu ---------------- */
  const motionProps = reduceMotion
    ? {}
    : { initial: 'hidden', animate: 'visible', variants: stagger(0.05) };

  return (
    <div className="gx">
      <div className="gx__grid">
        {/* ================= CỘT CHÍNH ================= */}
        <div className="gx__main">
          <motion.section
            className="gx-hero"
            {...motionProps}
            aria-labelledby="gx-hero-title"
          >
            <span className="gx-hero__dots" aria-hidden="true" />
            <span className="gx-hero__orb gx-hero__orb--1" aria-hidden="true" />
            <span className="gx-hero__orb gx-hero__orb--2" aria-hidden="true" />
            <span className="gx-hero__orb gx-hero__orb--3" aria-hidden="true" />
            <span className="gx-hero__wash" aria-hidden="true" />

            <div className="gx-hero__meta">
              <span className="gx-chip gx-chip--solid">
                <ShieldCheck size={13} />
                Chuẩn cấu trúc Bộ GD&amp;ĐT
              </span>
              <span className="gx-chip">
                <Sparkles size={13} />
                Đề mới mỗi lần tạo
              </span>
            </div>

            <h1 id="gx-hero-title">Tạo đề thi thử của riêng bạn</h1>
            <p className="gx-hero__lead">
              Đề được lắp từ ngân hàng câu hỏi đã kiểm duyệt, xoay vòng theo ma trận nên mỗi lần
              làm là một đề khác nhau. Hai câu đúng/sai cuối đề đổi theo định hướng bạn chọn.
            </p>

            {/* --- Ma trận 24 câu --- */}
            <div className="gx-matrix">
              <div className="gx-matrix__head">
                <span className="gx-matrix__title">Ma trận Phần I</span>
                <span className="gx-matrix__total">24 câu · 7 chủ đề</span>
              </div>
              <div
                className="gx-matrix__bar"
                role="img"
                aria-label={MATRIX_SEGMENTS.map(
                  (segment) => `${segment.code} ${segment.count} câu`,
                ).join(', ')}
              >
                {MATRIX_SEGMENTS.map((segment, index) => (
                  <span
                    key={segment.code}
                    className="gx-matrix__seg"
                    style={{
                      flexGrow: segment.count,
                      background: segment.color,
                      animationDelay: `${60 + index * 60}ms`,
                    }}
                  />
                ))}
              </div>
              <div className="gx-matrix__legend">
                {MATRIX_SEGMENTS.map((segment) => (
                  <span className="gx-matrix__item" key={segment.code}>
                    <span
                      className="gx-matrix__swatch"
                      style={{ background: segment.color }}
                      aria-hidden="true"
                    />
                    <span className="gx-matrix__code">{segment.code}</span>
                    {segment.count}
                  </span>
                ))}
              </div>
            </div>

            {/* --- 4 ô thông số --- */}
            <div className="gx-specs">
              {SPECS.map((spec) => (
                <div className="gx-spec" key={spec.label}>
                  <span>{spec.label}</span>
                  <strong>{spec.value}</strong>
                </div>
              ))}
            </div>
          </motion.section>

          {/* --- 3 chỉ số cộng dồn (giống trang chủ) --- */}
          <motion.div
            className="gx-stats"
            aria-label="Tiến độ tích luỹ của bạn"
            {...(reduceMotion
              ? {}
              : {
                  initial: 'hidden',
                  animate: 'visible',
                  variants: stagger(0.1),
                })}
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  className="gx-stat"
                  key={stat.key}
                  style={{ '--stat-accent': stat.accent, '--stat-tint': stat.tint }}
                  variants={
                    reduceMotion
                      ? undefined
                      : {
                          hidden: { opacity: 0, y: 14 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: 0.42,
                              ease: [0.23, 1, 0.32, 1],
                            },
                          },
                        }
                  }
                >
                  <span className="gx-stat__icon" aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <span className="gx-stat__value">
                    <CountUpNumber end={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                  </span>
                  <span className="gx-stat__label">{stat.label}</span>
                  <span className="gx-stat__foot">{stat.foot}</span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* --- Cấu hình + nút gen --- */}
          <motion.section
            className="gx-panel"
            aria-labelledby="gx-config-title"
            {...(reduceMotion
              ? {}
              : { initial: 'hidden', animate: 'visible', variants: FADE_UP, transition: { duration: 0.42, delay: 0.12, ease: [0.23, 1, 0.32, 1] } })}
          >
            <div className="gx-panel__head">
              <h2 className="gx-panel__title" id="gx-config-title">
                <LayoutGrid size={16} color="#EA580C" />
                Chọn định hướng đề thi
              </h2>
              <span className="gx-panel__hint">Ảnh hưởng 2 câu Đúng/Sai cuối</span>
            </div>

            <div className="gx-tracks" role="group" aria-labelledby="gx-config-title">
              {TRACK_OPTIONS.map((option) => {
                const active = track === option.id;
                return (
                  <button
                    type="button"
                    key={option.id}
                    className="gx-track"
                    onClick={() => handleTrackChange(option.id)}
                    aria-pressed={active}
                  >
                    <span className="gx-track__check" aria-hidden="true">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className="gx-track__top">
                      <span className="gx-track__code">{option.code}</span>
                      <GraduationCap size={15} color={active ? '#C2410C' : '#8C7B71'} />
                    </span>
                    <span className="gx-track__label">{option.label}</span>
                    <span className="gx-track__desc">{option.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* --- Lỗi --- */}
            {error && (
              <div className="gx-alert gx-alert--error" role="alert" style={{ marginTop: '0.9rem' }}>
                <AlertTriangle size={16} style={{ flex: 'none', marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {errorCode === 'POOL_EMPTY' && (
              <div className="gx-alert gx-alert--info" style={{ marginTop: '0.65rem' }}>
                <Clock size={16} style={{ flex: 'none', marginTop: 1 }} />
                <span>
                  Hệ thống đang chuẩn bị thêm đề mới. Bạn quay lại sau khoảng{' '}
                  <strong>10 phút</strong> nhé — đề sẽ sẵn sàng ngay khi bạn quay lại.
                </span>
              </div>
            )}

            {/* --- Nút gen --- */}
            <div className="gx-cta-wrap">
              <button
                type="button"
                className="gx-cta"
                onClick={handleGenerate}
                disabled={loading}
                id="btn-gen-de"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={19} className="gx-cta__spinner" />
                    <span>Đang chuẩn bị đề…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={19} />
                    <span>Gen đề &amp; bắt đầu làm bài</span>
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>

            <p className="gx-cta-note">
              <Clock size={14} style={{ flex: 'none', marginTop: 2 }} />
              <span>
                Sau khi bắt đầu, bạn có <strong>50 phút</strong> để hoàn thành. Hết giờ bài được nộp
                tự động. Đáp án và giải thích chỉ hiện ra sau khi nộp bài.
              </span>
            </p>
          </motion.section>
        </div>

        {/* ================= CỘT PHỤ ================= */}
        <aside className="gx__rail" aria-label="Log lần làm gần nhất và cách hệ thống lắp đề">
          {/* --- Log lần làm gần nhất --- */}
          <section className="gx-panel" aria-labelledby="gx-log-title">
            <div className="gx-panel__head">
              <h2 className="gx-panel__title" id="gx-log-title">
                <History size={16} color="#EA580C" />
                Log điểm yếu
              </h2>
              <span className="gx-panel__hint">Lần làm gần nhất</span>
            </div>

            {log ? (
              <>
                <div className="gx-log__top">
                  <span className="gx-log__score">
                    {log.score.toFixed(2)}
                    <small>/{log.maxScore}</small>
                  </span>
                  <span className="gx-log__when">{formatDateTimeVN(log.submittedAt)}</span>
                </div>
                <p className="gx-log__line">
                  Đúng {log.correctItems}/{log.gradedItems} ý · độ chính xác {log.accuracy}% ·{' '}
                  {log.trackLabel}
                </p>

                <div className="gx-log__rows">
                  {(log.partI?.topics || [])
                    .filter((topic) => topic.wrong > 0)
                    .slice(0, 5)
                    .map((topic) => (
                      <React.Fragment key={topic.code}>
                        <span className="gx-log__code">{topic.code}</span>
                        <span className="gx-log__name">{TOPIC_LABELS[topic.code] || topic.name}</span>
                        <span className="gx-log__count">−{topic.wrong}</span>
                        <div className="gx-log__track">
                          <div
                            className="gx-log__fill"
                            style={{
                              width: `${Math.round((topic.wrong / Math.max(topic.total, 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </React.Fragment>
                    ))}
                  {(log.partI?.topics || []).every((topic) => topic.wrong === 0) && (
                    <span className="gx-log__name" style={{ gridColumn: '1 / -1' }}>
                      Phần I không sai câu nào.
                    </span>
                  )}
                </div>

                {log.partII?.statementsWrong > 0 && (
                  <p className="gx-log__line" style={{ marginBottom: '0.8rem' }}>
                    Phần II sai {log.partII.statementsWrong}/{log.partII.statementsTotal} ý
                    {log.partII.groups
                      ?.filter((group) => group.wrong > 0)
                      .map((group) => ` · ${group.label} −${group.wrong}`)
                      .join('')}
                  </p>
                )}

                <div className="gx-log__actions">
                  <button type="button" className="gx-btn" onClick={handleCopyLog}>
                    {copyState === 'done' ? (
                      <>
                        <Check size={14} /> Đã copy
                      </>
                    ) : copyState === 'fail' ? (
                      <>
                        <AlertTriangle size={14} /> Thử lại
                      </>
                    ) : (
                      <>
                        <ClipboardCopy size={14} /> Copy prompt
                      </>
                    )}
                  </button>
                  <button type="button" className="gx-btn" onClick={handleDownloadLog}>
                    <Download size={14} /> Tải .txt
                  </button>
                </div>

                {aiSaved?.review && (
                  <p className="gx-cta-note" style={{ marginTop: '0.7rem' }}>
                    <Sparkles size={14} color="#D97706" style={{ flex: 'none', marginTop: 2 }} />
                    <span>
                      Đã có đánh giá AI cho lần làm này. Mở lại bài vừa nộp để xem chi tiết.
                    </span>
                  </p>
                )}
              </>
            ) : (
              <div className="gx-log__empty">
                <FileText size={26} color="#D4B79A" />
                <p>
                  Chưa có log. Log được tạo tự động sau khi bạn nộp bài và chỉ giữ{' '}
                  <strong>lần làm gần nhất</strong> — tạo đề mới sẽ xoá log cũ.
                </p>
              </div>
            )}
          </section>

          {/* --- Cách hệ thống lắp đề --- */}
          <section className="gx-panel" aria-labelledby="gx-facts-title">
            <div className="gx-panel__head">
              <h2 className="gx-panel__title" id="gx-facts-title">
                <Target size={16} color="#EA580C" />
                Đề được lắp thế nào
              </h2>
            </div>
            <ul className="gx-facts">
              <li>
                <FlipHorizontal2 size={14} color="#C2410C" style={{ flex: 'none', marginTop: 2 }} />
                <span>
                  <strong>Đảo phương án</strong> mỗi câu, nên không thể đoán đáp án theo vị trí A/B/C/D.
                </span>
              </li>
              <li>
                <LayoutGrid size={14} color="#C2410C" style={{ flex: 'none', marginTop: 2 }} />
                <span>
                  <strong>Xoay vòng câu hỏi</strong> theo từng chủ đề — đề liên tiếp không lặp lại
                  cùng một bộ câu.
                </span>
              </li>
              <li>
                <Trophy size={14} color="#C2410C" style={{ flex: 'none', marginTop: 2 }} />
                <span>
                  Phần II chấm <strong>luỹ tiến theo số ý đúng</strong>: 1 ý 0,1đ · 2 ý 0,25đ · 3 ý
                  0,5đ · đủ 4 ý mới trọn 1,0đ.
                </span>
              </li>
              <li>
                <ShieldCheck size={14} color="#C2410C" style={{ flex: 'none', marginTop: 2 }} />
                <span>
                  Đáp án nằm trên máy chủ và chỉ trả về <strong>sau khi nộp</strong>, mỗi đề chấm
                  đúng một lần.
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
