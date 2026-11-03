// ============================================================
//  Tab "Gen đề thi thử": chọn định hướng → nhấn gen → làm bài 50'
//  Đề được lấy từ API (server), KHÔNG chứa đáp án cho tới khi nộp.
// ============================================================
import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  RefreshCw,
  Clock,
  BrainCircuit,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { claimExam } from '../../lib/examApi.js';
import ExamRoom from './ExamRoom.jsx';
import './exam-room.css';

const TRACK_OPTIONS = [
  {
    id: 'ict',
    label: 'Tin học ứng dụng',
    short: 'ICT',
    desc: '2 câu đúng/sai cuối lấy từ chuyên đề Tin học ứng dụng',
  },
  {
    id: 'cs',
    label: 'Khoa học máy tính',
    short: 'CS',
    desc: '2 câu đúng/sai cuối lấy từ chuyên đề Khoa học máy tính',
  },
];

export default function GenExamTab({ onRecordExamResult }) {
  const [track, setTrack] = useState(() => {
    const saved = localStorage.getItem('tinhoc_selected_track');
    return saved === 'cs' || saved === 'ict' ? saved : 'ict';
  });
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setErrorCode('');
    setExam(null);
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
  };

  // ---------- Đang làm bài ----------
  if (exam) {
    return <ExamRoom exam={exam} onSubmitted={handleSubmitted} onExit={handleExit} />;
  }

  // ---------- Màn hình chọn & gen ----------
  return (
    <div className="exam-room">
      <div className="exam-intro">
        <div className="exam-intro__head">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(251, 191, 36, 0.2)',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-amber-dark)',
              width: 'fit-content',
              marginBottom: '0.6rem',
            }}
          >
            <BrainCircuit size={14} />
            <span>Đề thi thử chuẩn cấu trúc Bộ GD&amp;ĐT</span>
          </div>
          <h2>Tạo đề thi thử của riêng bạn</h2>
          <p>
            Hệ thống lắp ráp đề từ ngân hàng câu hỏi đã được kiểm duyệt theo đúng ma trận
            cấu trúc đề tốt nghiệp THPT. Mỗi lần tạo là một đề mới, chỉ khác nhau ở 2 câu
            đúng/sai định hướng cuối đề.
          </p>
        </div>

        <div className="exam-intro__grid">
          <div className="exam-intro__cell">
            <span>Phần I</span>
            <strong>24 câu · 6,0đ</strong>
          </div>
          <div className="exam-intro__cell">
            <span>Phần II</span>
            <strong>4 câu · 4,0đ</strong>
          </div>
          <div className="exam-intro__cell">
            <span>Thời gian</span>
            <strong>50 phút</strong>
          </div>
          <div className="exam-intro__cell">
            <span>Tổng điểm</span>
            <strong>10,00đ</strong>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              color: 'var(--color-text-deep)',
              marginBottom: '0.6rem',
            }}
          >
            <Sliders size={16} color="var(--color-primary)" />
            <span>Chọn định hướng đề thi</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.65rem',
            }}
          >
            {TRACK_OPTIONS.map((option) => {
              const active = track === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleTrackChange(option.id)}
                  aria-pressed={active}
                  style={{
                    textAlign: 'left',
                    padding: '0.85rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    border: active
                      ? '2px solid var(--color-primary)'
                      : '1.5px solid var(--color-border)',
                    background: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: active ? 'var(--color-primary-hover)' : 'var(--color-text-deep)',
                    }}
                  >
                    <GraduationCap size={15} />
                    {option.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      lineHeight: 1.5,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {option.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="exam-alert" data-tone="error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {errorCode === 'POOL_EMPTY' && (
          <div className="exam-alert" data-tone="info">
            <Clock size={16} />
            <span>
              Hệ thống đang chuẩn bị thêm đề mới. Bạn quay lại sau khoảng{' '}
              <strong>10 phút</strong> nhé — đề sẽ sẵn sàng ngay khi bạn quay lại.
            </span>
          </div>
        )}

        <button
          type="button"
          className="btn-primary-glow"
          style={{ width: '100%', justifyContent: 'center', padding: '0.95rem' }}
          onClick={handleGenerate}
          disabled={loading}
          id="btn-gen-de"
        >
          {loading ? (
            <>
              <RefreshCw size={18} style={{ animation: 'examSpin 1s linear infinite' }} />
              <span>Đang chuẩn bị đề...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Gen đề &amp; bắt đầu làm bài</span>
            </>
          )}
        </button>

        {loading && (
          <div className="exam-loading">
            <div className="exam-loading__spinner" />
            <p>Đang lắp ráp đề theo ma trận chuẩn...</p>
          </div>
        )}

        <div className="exam-alert" data-tone="info">
          <Clock size={16} />
          <span>
            Sau khi bắt đầu, bạn có <strong>50 phút</strong> để hoàn thành. Hết giờ bài sẽ
            được nộp tự động. Đáp án và giải thích chỉ hiện ra sau khi nộp bài.
          </span>
        </div>
      </div>
    </div>
  );
}
