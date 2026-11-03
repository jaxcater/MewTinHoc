// ============================================================
//  Khối "Đánh giá của AI" — hiện ngay trên màn kết quả sau khi nộp
//
//  Trạng thái:
//    idle      → nút gọi AI + giải thích
//    loading   → chờ Gemini trả về
//    done      → hiện đánh giá đã chuẩn hoá
//    error     → thông điệp cụ thể + nút thử lại
//    unavailable → máy chủ chưa có khoá; chỉ còn nút copy prompt dán tay
// ============================================================
import React from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ClipboardCopy,
  Check,
  Target,
  ListChecks,
  HelpCircle,
  WifiOff,
  ArrowRight,
} from 'lucide-react';

export default function AiReviewPanel({
  status,
  review,
  errorMessage,
  copied,
  configured,
  generatedAt,
  onRun,
  onCopy,
  onRetry,
}) {
  const busy = status === 'loading';

  return (
    <section className="gx-ai" aria-labelledby="gx-ai-title">
      <span className="gx-ai__glow" aria-hidden="true" />

      <div className="gx-ai__head">
        <Sparkles size={17} color="#D97706" />
        <h2 className="gx-ai__title" id="gx-ai-title">
          Đánh giá của AI
        </h2>
        {review && <span className="gx-ai__badge">Gemini</span>}
      </div>

      {/* ---------- Chưa chạy lần nào ---------- */}
      {status === 'idle' && (
        <>
          <p className="gx-ai__pitch">
            Gửi log lần làm này — gồm nguyên văn những câu bạn đã sai — cho AI. AI sẽ chỉ ra lỗ
            hổng theo từng chủ đề và 3 việc cụ thể bạn nên làm trong 30 phút tới.
          </p>
          <button
            type="button"
            className="gx-btn gx-btn--primary gx-btn--wide"
            onClick={onRun}
            disabled={!configured}
          >
            <Sparkles size={16} />
            Phân tích bài làm bằng AI
            <ArrowRight size={15} />
          </button>
          {!configured && (
            <p className="gx-cta-note" style={{ marginTop: '0.7rem' }}>
              <WifiOff size={14} style={{ flex: 'none', marginTop: 2 }} />
              <span>
                Máy chủ chưa cấu hình khoá AI. Dùng <strong>Copy prompt</strong> ở trên rồi dán vào
                Google AI Studio là bạn vẫn có đánh giá tương tự.
              </span>
            </p>
          )}
        </>
      )}

      {/* ---------- Đang chờ ---------- */}
      {busy && (
        <div className="gx-ai__state" role="status" aria-live="polite">
          <span className="gx-ai__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>AI đang đọc log và soạn nhận xét… thường mất 10–25 giây.</span>
        </div>
      )}

      {/* ---------- Lỗi ---------- */}
      {status === 'error' && (
        <>
          <div className="gx-alert gx-alert--error" role="alert">
            <AlertTriangle size={16} style={{ flex: 'none', marginTop: 1 }} />
            <span>{errorMessage || 'Không lấy được đánh giá. Vui lòng thử lại.'}</span>
          </div>
          <div className="gx-ai__foot" style={{ borderTop: 'none', paddingTop: '0.6rem' }}>
            <button type="button" className="gx-btn" onClick={onRetry}>
              <RefreshCw size={14} /> Thử lại
            </button>
            <button type="button" className="gx-btn" onClick={onCopy}>
              {copied ? (
                <>
                  <Check size={14} /> Đã copy
                </>
              ) : (
                <>
                  <ClipboardCopy size={14} /> Copy prompt
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ---------- Có kết quả ---------- */}
      {status === 'done' && review && (
        <div className="gx-ai__review">
          {review.headline && <p className="gx-ai__headline">{review.headline}</p>}
          {review.scoreRead && <p className="gx-ai__read">{review.scoreRead}</p>}

          {review.priorities?.length > 0 && (
            <div>
              <h3 className="gx-ai__section-title">
                <Target size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                Ôn ngay theo thứ tự này
              </h3>
              {review.priorities.map((item, index) => (
                <div className="gx-prio" key={`${item.topicCode}-${index}`}>
                  <div className="gx-prio__head">
                    <span className="gx-prio__rank">{index + 1}</span>
                    <span className="gx-prio__name">
                      {item.topicCode} · {item.topicName}
                    </span>
                  </div>
                  {item.why && <p className="gx-prio__why">{item.why}</p>}
                  {item.actions?.length > 0 && (
                    <ul className="gx-prio__actions">
                      {item.actions.map((action, actionIndex) => (
                        <li key={actionIndex}>{action}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {review.nextHour?.length > 0 && (
            <div>
              <h3 className="gx-ai__section-title">
                <ListChecks size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                Lịch ôn 60 phút tới
              </h3>
              <ol className="gx-ai__list">
                {review.nextHour.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            </div>
          )}

          {review.quickCheck && (
            <div>
              <h3 className="gx-ai__section-title">
                <HelpCircle size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                Kiểm tra nhanh
              </h3>
              <div className="gx-ai__check">{review.quickCheck}</div>
            </div>
          )}

          {review.encouragement && <p className="gx-ai__close">{review.encouragement}</p>}

          <div className="gx-ai__foot" style={{ marginTop: '0.1rem', borderTop: 'none', paddingTop: 0 }}>
            <button type="button" className="gx-btn" onClick={onCopy}>
              {copied ? (
                <>
                  <Check size={14} /> Đã copy
                </>
              ) : (
                <>
                  <ClipboardCopy size={14} /> Copy prompt
                </>
              )}
            </button>
            <button type="button" className="gx-btn" onClick={onRetry} disabled={busy}>
              <RefreshCw size={14} /> Đánh giá lại
            </button>
            {generatedAt && (
              <span className="gx-ai__stamp">
                AI tạo lúc {new Date(generatedAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
