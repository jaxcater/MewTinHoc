import React, { useState } from 'react';
import {
  Sparkles,
  BrainCircuit,
  Sliders,
  Send,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TRACK_TYPES } from '../data/roadmap';

export default function AiExamTab({ user, progress }) {
  const [direction, setDirection] = useState(() => {
    const saved = localStorage.getItem('tinhoc_selected_track');
    return [TRACK_TYPES.CS, TRACK_TYPES.ICT].includes(saved) ? saved : TRACK_TYPES.ICT;
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedExam, setGeneratedExam] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tinhoc_generated_exam');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    if (generatedExam) {
      sessionStorage.setItem('tinhoc_generated_exam', JSON.stringify(generatedExam));
    }
  }, [generatedExam]);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: `Xin chào ${user?.name || 'bạn'}! Tôi là Trợ Lý Gia Sư AI môn Tin Học THPTQG. Hãy tạo đề thi thử theo năng lực hoặc đặt bất kỳ câu hỏi nào về lý thuyết Python, SQL hay Mạng máy tính nhé!`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const generationStepsText = [
    'Phân tích ma trận đề thi tốt nghiệp THPT năm 2025 của Bộ GD&ĐT...',
    'Tạo câu hỏi phân hóa lập trình Python và bẫy cú pháp cắt xâu...',
    'Thiết kế 4 ý trắc nghiệm Đúng/Sai cho chuyên đề CSDL quan hệ SQL...',
    'Kiểm duyệt độ chính xác đáp án và tạo thang chấm điểm bằng AI...',
    'Đề thi thử đã sẵn sàng!'
  ];

  const handleGenerateAiExam = () => {
    setIsGenerating(true);
    setGenerationStep(0);
    setGeneratedExam(null);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev >= 3) {
          clearInterval(stepInterval);
          setIsGenerating(false);
          setGeneratedExam({
            title: `Đề thi thử ${direction === TRACK_TYPES.CS ? 'Khoa học máy tính (CS)' : 'Tin học ứng dụng (ICT)'}`,
            direction,
            sections: { multipleChoice: 24, commonTrueFalse: 2, directionTrueFalse: 2 },
            questions: 28,
            difficulty: 'Chuẩn cấu trúc',
            estimatedScore: null
          });
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#EA580C', '#FBBF24', '#7C2D12']
          });
          return 4;
        }
        return prev + 1;
      });
    }, 600);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const newChat = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(newChat);
    setInputMessage('');

    // AI Mentor smart response
    setTimeout(() => {
      let reply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('having') || lower.includes('where')) {
        reply = `💡 Trong SQL: Mệnh đề WHERE được thực thi trước để lọc từng dòng dữ liệu cá thể; mệnh đề HAVING thực thi sau khi đã gom nhóm (GROUP BY) để lọc trên các giá trị hàm tổng hợp như COUNT(), SUM(), AVG(). Vì vậy bạn KHÔNG thể dùng COUNT(*) trong WHERE mà bắt buộc phải dùng HAVING nhé!`;
      } else if (lower.includes('slice') || lower.includes('cắt xâu') || lower.includes('python')) {
        reply = `🐍 Cú pháp cắt xâu trong Python là s[start:stop:step]. Bẫy lớn nhất trong đề THPTQG là cận 'stop' luôn không bao gồm trong kết quả (lấy đến stop - 1). Ngoài ra s[::-1] sẽ đảo ngược xâu cực nhanh!`;
      } else if (lower.includes('streak') || lower.includes('điểm danh')) {
        reply = `🔥 Hãy chăm chỉ bấm 'Điểm danh' mỗi ngày tại Trang Chủ nhé! Nếu qua 1 ngày không học và điểm danh, chuỗi streak sẽ bị mất và trở về 0 theo đúng cơ chế rèn luyện kỷ luật.`;
      } else {
        reply = `✨ Nhận định rất hay! Dựa trên ma trận đề thi 2025, câu hỏi này thuộc mức độ Vận dụng. Bạn nên chú ý đến cấu trúc đề mới: Phần II trắc nghiệm Đúng/Sai nếu đúng cả 4 ý mới được trọn vẹn 1 điểm của câu hỏi!`;
      }

      setChatMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    }, 700);
  };

  return (
    <div className="ai-exam-container">
      {/* Banner */}
      <div className="ai-banner-card">
        <div className="ai-banner-content">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.4)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber)', marginBottom: '0.6rem' }}>
            <BrainCircuit size={14} />
            <span>AI Đánh Giá Năng Lực & Dự Đoán Điểm Số 2025</span>
          </div>
          <h2>Tạo Bài Thi Thử Cá Nhân Hóa & Đánh Giá Bằng AI</h2>
          <p>
            Hệ thống AI phân tích điểm mạnh, điểm yếu và tự động lắp ráp bộ đề thi trắc nghiệm chuẩn cấu trúc 3 phần mới nhất của Bộ GD&ĐT để bạn bứt phá phong độ.
          </p>
        </div>

        <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--color-amber), var(--color-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-deep)', boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4)', flexShrink: 0 }}>
          <Sparkles size={44} />
        </div>
      </div>

      {/* Generator & Configuration Row */}
      <div className="ai-generator-grid">
        {/* Left Card: Exam Generator Settings */}
        <div className="config-card">
          <div className="config-group-title">
            <Sliders size={18} color="var(--color-primary)" />
            <span>1. Tùy Chọn Ma Trận Đề Thi Thử AI</span>
          </div>

          <div className="ai-direction-control">
            <div>
              <div className="ai-direction-label">Định hướng đề thi</div>
              <div className="ai-direction-description">
                Chọn định hướng cho 2 câu đúng/sai cuối đề
              </div>
            </div>
            <div className="ai-direction-switch" role="group" aria-label="Chọn định hướng đề thi">
              <button
                type="button"
                className={direction === TRACK_TYPES.CS ? 'active' : ''}
                aria-pressed={direction === TRACK_TYPES.CS}
                onClick={() => {
                  setDirection(TRACK_TYPES.CS);
                  localStorage.setItem('tinhoc_selected_track', TRACK_TYPES.CS);
                }}
              >Khoa học máy tính</button>
              <button
                type="button"
                className={direction === TRACK_TYPES.ICT ? 'active' : ''}
                aria-pressed={direction === TRACK_TYPES.ICT}
                onClick={() => {
                  setDirection(TRACK_TYPES.ICT);
                  localStorage.setItem('tinhoc_selected_track', TRACK_TYPES.ICT);
                }}
              >Tin học ứng dụng</button>
            </div>
          </div>

          <div className="ai-exam-structure" aria-label="Cấu trúc đề thi">
            <div><strong>24</strong><span> câu trắc nghiệm</span></div>
            <div><strong>2</strong><span> câu đúng/sai chung</span></div>
            <div><strong>2</strong><span> câu đúng/sai theo định hướng</span></div>
          </div>

          {/* Generate Button */}
          <button
            className="btn-primary-glow"
            style={{ width: '100%', justifyContent: 'center', padding: '0.9rem' }}
            onClick={handleGenerateAiExam}
            disabled={isGenerating}
            id="btn-tao-de-ai"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Đang Khởi Tạo Đề Thi Với AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Khởi Tạo Đề Thi Thử Bằng AI</span>
              </>
            )}
          </button>

          {/* Loading Animation Steps */}
          {isGenerating && (
            <div style={{ background: '#FFFDF9', border: '1px dashed var(--color-primary)', padding: '0.85rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-deep)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }}></span>
                <span>{generationStepsText[generationStep]}</span>
              </div>
            </div>
          )}

          {/* Generated Exam Success Box */}
          {generatedExam && (
            <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16A34A', fontWeight: 800, fontSize: '0.9rem' }}>
                <CheckCircle size={18} />
                <span>Đề thi đã khởi tạo thành công!</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-deep)' }}>
                {generatedExam.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Quy mô: <strong>{generatedExam.questions} câu hỏi</strong> • Cấp độ: <strong>{generatedExam.difficulty}</strong>
              </div>
              <button
                className="btn-primary-glow"
                style={{ justifyContent: 'center', padding: '0.65rem' }}
                onClick={() => alert('Chuyển sang chế độ phòng thi giải đề AI!')}
              >
                <span>Bắt đầu giải đề AI ngay</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Learner performance metrics, shared with the home page */}
        <div className="ai-report-card">
          <div className="config-group-title">
            <TrendingUp size={18} color="var(--color-primary)" />
            <span>Báo cáo kết quả học tập</span>
          </div>

          <div className="ai-home-metrics">
            <div className="ai-home-metric">
              <span>Đề thi đã hoàn thành</span>
              <strong>{progress?.total_exams ?? user?.totalExamsTaken ?? 0}</strong>
            </div>
            <div className="ai-home-metric">
              <span>Điểm trung bình</span>
              <strong>{Number(progress?.avg_score ?? user?.avgScore ?? 0).toFixed(1)}<small>/10</small></strong>
            </div>
            <div className="ai-home-metric">
              <span>Độ chính xác câu hỏi</span>
              <strong>{Number(progress?.accuracy ?? (parseFloat(user?.accuracy) || 0)).toFixed(1)}<small>%</small></strong>
            </div>
          </div>

          {/* AI Mentor Interactive Chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-deep)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={16} color="var(--color-primary)" />
              <span>Hỏi đáp giải thích câu hỏi cùng AI Mentor:</span>
            </div>

            <div style={{ height: '180px', overflowY: 'auto', background: '#FFFDF9', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user' ? 'var(--color-deep)' : '#FFF1D6',
                    color: msg.sender === 'user' ? '#FFFFFF' : 'var(--color-deep)',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '12px',
                    maxWidth: '85%',
                    fontSize: '0.8rem',
                    lineHeight: 1.4
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Hỏi AI: 'Giải thích sự khác nhau giữa WHERE và HAVING'..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  background: '#FFFFFF'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.55rem 1rem',
                  background: 'var(--color-primary)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
