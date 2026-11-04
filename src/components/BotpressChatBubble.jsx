import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  X,
  Settings,
  RefreshCw,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  Lock
} from 'lucide-react';
import bubbleChatImg from '../../img/BubbleChat.png';
import { supabase } from '../supabase.js';
import DemoLockedView from './demo/DemoLockedView';
import { isLockedForDemo, DEMO_FEATURE } from '../lib/demoAccess';

// Hàm render inline markdown: **bold**, *italic*, `code`
function renderInlineMarkdown(text, isUser = false) {
  if (!text) return '';
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={keyIdx++} className="chat-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={keyIdx++} className="chat-strong">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={keyIdx++} className="chat-em">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Cấu trúc lại tin nhắn! TAO CODE CẤM ĐỤNG!
// (Đã bổ sung code block ``` và ordered list — bot trả markdown thật nên cần.)
function FormattedMessage({ text, isUser = false }) {
  if (!text) return null;
  if (isUser) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  }

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let currentListType = 'none';
  let listStart = 1;
  let elKey = 0;

  const flushList = () => {
    if (currentList.length === 0) return;
    const items = currentList.map((item, idx) => (
      <li key={idx} className="chat-bullet-item">
        <span className="chat-bullet-icon">{currentListType === 'ol' ? `${listStart + idx}.` : '•'}</span>
        <span className="chat-bullet-text">{renderInlineMarkdown(item, isUser)}</span>
      </li>
    ));
    elements.push(
      <ul key={elKey++} className={currentListType === 'ol' ? 'chat-bullet-list chat-ordered-list' : 'chat-bullet-list'}>
        {items}
      </ul>
    );
    currentList = [];
    // Reset kiểu list: nếu không, list bị ngắt bởi code block sẽ dùng lại
    // listStart cũ và mọi mục đều hiện "1.".
    currentListType = 'none';
  };

  // Gom nhiều dòng code thành 1 khối <pre> duy nhất, giữ nguyên khoảng trắng.
  // Botpress thường thụt lề cả khối theo fence, nên phải bỏ phần thụt lề chung
  // (dedent) — nếu không code sẽ bị lệch sang phải.
  const pushCodeBlock = (codeLines, lang) => {
    const nonEmpty = codeLines.filter((l) => l.trim());
    const commonIndent = nonEmpty.length
      ? Math.min(...nonEmpty.map((l) => l.match(/^[ \t]*/)[0].length))
      : 0;
    const dedented = commonIndent > 0
      ? codeLines.map((l) => (l.trim() ? l.slice(commonIndent) : ''))
      : codeLines.map((l) => (l.trim() ? l : ''));

    // Bỏ dòng trống ở đầu/cuối khối code
    while (dedented.length && !dedented[0].trim()) dedented.shift();
    while (dedented.length && !dedented[dedented.length - 1].trim()) dedented.pop();

    elements.push(
      <div key={elKey++} className="chat-code-block">
        {lang ? <div className="chat-code-lang">{lang}</div> : null}
        <pre className="chat-code-pre">
          <code>{dedented.join('\n')}</code>
        </pre>
      </div>
    );
  };

  let inCodeBlock = false;
  let codeLang = '';
  let codeLines = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // --- Bên trong code block: giữ nguyên từng dòng, không xử lý markdown ---
    if (inCodeBlock) {
      if (trimmed.startsWith('```')) {
        inCodeBlock = false;
        pushCodeBlock(codeLines, codeLang);
        codeLines = [];
        codeLang = '';
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    // --- Mở code block: ``` hoặc ```lang ---
    if (trimmed.startsWith('```')) {
      flushList();
      const afterFence = trimmed.slice(3).trim();
      // Trường hợp ```code``` nằm gọn trên một dòng
      if (afterFence.endsWith('```')) {
        const inlineCode = afterFence.slice(0, -3);
        pushCodeBlock(inlineCode.split('\n'), '');
        continue;
      }
      inCodeBlock = true;
      codeLang = afterFence;
      codeLines = [];
      continue;
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    // Gạch đầu dòng: - hoặc * hoặc •
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      if (currentListType !== 'ul') flushList();
      currentListType = 'ul';
      const itemContent = trimmed.replace(/^[-*•]\s+/, '');
      currentList.push(itemContent);
      continue;
    }

    // Danh sách đánh số: 1. hoặc 1)
    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
        listStart = Number(orderedMatch[1]) || 1;
      }
      currentList.push(orderedMatch[2]);
      continue;
    }

    // Tiêu đề: ### hoặc ## hoặc #
    if (trimmed.startsWith('#')) {
      flushList();
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <div key={elKey++} className="chat-heading">
          {renderInlineMarkdown(headingText, isUser)}
        </div>
      );
      continue;
    }

    // Dòng thông thường / đoạn văn
    flushList();
    elements.push(
      <p key={elKey++} className="chat-paragraph">
        {renderInlineMarkdown(trimmed, isUser)}
      </p>
    );
  }

  // Code block chưa đóng ở cuối tin nhắn — vẫn hiển thị để không mất nội dung
  if (inCodeBlock && codeLines.length > 0) {
    pushCodeBlock(codeLines, codeLang);
  }

  flushList();

  return <div className="botpress-formatted-text">{elements}</div>;
}

export default function BotpressChatBubble({ user, onRequestUpgrade }) {
  const [chatQuota, setChatQuota] = useState(null);
  const quotaExhausted = Boolean(chatQuota?.remaining === 0 && Date.parse(chatQuota.resetAt) > Date.now());
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // Tài khoản Demo không được chat với CamCam.
  const chatLocked = isLockedForDemo(user, DEMO_FEATURE.CHAT);

  // Trạng thái cấu hình từ Backend (được bảo mật, không lộ token)
  const [backendOnline, setBackendOnline] = useState(true);
  const [backendConfig, setBackendConfig] = useState({
    configured: false,
    chatConfigured: false,
    encryptionEnabled: false,
    maskedToken: '(Đang kiểm tra...)',
    maskedBotId: '(Đang kiểm tra...)',
    maskedWebhookId: '(Đang kiểm tra...)'
  });

  // State kiểm tra API /files từ Backend
  const [apiTesting, setApiTesting] = useState(false);
  const [apiResult, setApiResult] = useState(null);

  // State tin nhắn chat
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Xin chào ${user?.name || 'bạn'}! 👋 Tôi là CamCam nhân viên meomeo của website MewTinHoc.Sẵn sàng giải đáp thắc mắc của bạn!!`,
      time: 'Vừa xong'
    }
  ]);

  const messagesEndRef = useRef(null);

  // Hàm gọi API Backend có tính đến base URL
  const fetchBackend = useCallback(async (endpoint, options = {}) => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : base + '/';
    const { data } = await supabase.auth.getSession();
    const headers = new Headers(options.headers);
    if (data?.session?.access_token) headers.set('Authorization', 'Bearer ' + data.session.access_token);
    options = { ...options, headers };
    const primaryUrl = `${cleanBase}api/botpress${endpoint}`;

    try {
      const res = await fetch(primaryUrl, options);
      if (res.status === 404 && cleanBase !== '/') {
        // Fallback về root /api/botpress nếu cần
        return await fetch(`/api/botpress${endpoint}`, options);
      }
      return res;
    } catch {
      return await fetch(`/api/botpress${endpoint}`, options);
    }
  }, []);

  useEffect(() => {
    setChatQuota(null);
    if (!isOpen || chatLocked) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetchBackend('/quota');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setChatQuota(data.quota);
      } catch { /* The next send still enforces the server quota. */ }
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [isOpen, chatLocked, user?.id, fetchBackend]);

  // Kiểm tra trạng thái Backend khi mở component
  const checkBackendStatus = useCallback(async () => {
    try {
      const res = await fetchBackend('/status');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        // Bản deploy tĩnh không có /api/botpress → đừng báo sai là "thiếu
        // BOTPRESS_WEBHOOK_ID" khiến admin đi sửa nhầm chỗ.
        setBackendOnline(false);
        return;
      }
      const data = await res.json();
      setBackendOnline(true);
      setBackendConfig({
        configured: Boolean(data.configured),
        chatConfigured: Boolean(data.chatConfigured),
        encryptionEnabled: Boolean(data.encryptionEnabled),
        maskedToken: data.maskedToken,
        maskedBotId: data.maskedBotId,
        maskedWebhookId: data.maskedWebhookId
      });
    } catch (err) {
      setBackendOnline(false);
      console.warn('[Botpress Frontend] Chưa kết nối được Backend:', err.message);
    }
  }, [fetchBackend]);

  useEffect(() => {
    checkBackendStatus();
  }, [checkBackendStatus]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab]);

  // Chỉ khóa cuộn nền khi chat thực sự chiếm toàn màn hình trên mobile.
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const mobileQuery = window.matchMedia('(max-width: 640px)');
    if (!mobileQuery.matches) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Lệnh curl tham khảo để kiểm tra trên terminal server
  const curlExample = `# Kiểm tra Botpress Cloud Files API từ Terminal Backend:
curl -H "Authorization: bearer $BOTPRESS_TOKEN" -H "x-bot-id: $BOTPRESS_BOT_ID" https://api.botpress.cloud/v1/files`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // Chẩn đoán từng bước kết nối Chat Botpress (config → user → conversation → message → reply)
  const handleDiagnoseChat = async () => {
    setApiTesting(true);
    setApiResult(null);

    try {
      const res = await fetchBackend('/diagnose');
      const data = await res.json().catch(() => null);

      if (!data) {
        setApiResult({ status: 'error', message: `Máy chủ trả về dữ liệu không đọc được (HTTP ${res.status}).` });
      } else if (data.ok) {
        setApiResult({
          status: 'success',
          message: data.message,
          detail: data.reply ? `Bot trả lời: "${data.reply}"` : undefined
        });
      } else {
        setApiResult({
          status: 'error',
          message: `Tắc ở bước "${data.step}": ${data.message}`,
          detail: Array.isArray(data.steps) && data.steps.length
            ? data.steps
                .map((s) => `${s.ok ? '✅' : '❌'} ${s.step}${s.status ? ` (HTTP ${s.status})` : ''}${s.detail ? ` — ${s.detail}` : ''}`)
                .join('\n')
            : undefined
        });
      }
    } catch (err) {
      setApiResult({ status: 'error', message: err.message || 'Không thể kết nối tới máy chủ.' });
    } finally {
      setApiTesting(false);
      checkBackendStatus();
    }
  };

  // Kiểm tra gọi API Botpress Cloud Files thông qua Backend an toàn
  const handleTestBotpressFilesApi = async () => {
    setApiTesting(true);
    setApiResult(null);

    try {
      const res = await fetchBackend('/files');
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.status === 'error') {
        setApiResult({
          status: 'error',
          code: res.status,
          message: data?.message || `Lỗi HTTP ${res.status}: Không thể lấy danh sách files`,
          raw: data
        });
      } else if (data?.status === 'demo') {
        setApiResult({
          status: 'demo',
          message: data.message
        });
      } else {
        setApiResult({
          status: 'success',
          code: 200,
          message: 'Đã kết nối thành công',
          files: data?.files || []
        });
      }
    } catch (err) {
      setApiResult({
        status: 'error',
        message: err.message || 'Không thể kết nối'
      });
    } finally {
      setApiTesting(false);
      checkBackendStatus();
    }
  };

  // Reset phiên hội thoại khi tắt cửa sổ chat hoặc bấm nút làm mới
  const handleResetChat = async () => {
    setConversationId(null);
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: 'Đã làm mới đoạn chat! Bạn có thể đặt câu hỏi mới cho CamCam nhé 😺',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    try {
      await fetchBackend('/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 'student_user' })
      });
    } catch {
      // ignore
    }
  };

  const handleCloseChat = async () => {
    setIsOpen(false);
    // Sau khi tắt cửa sổ chat thì reset memory đoạn tin nhắn mới
    setConversationId(null);
    setMessages([
      {
        id: 1,
        sender: 'bot',
        text: `Xin chào ${user?.name || 'bạn'}! 👋 Tôi là CamCam nhân viên meomeo của website MewTinHoc.Sẵn sàng giải đáp thắc mắc của bạn!!`,
        time: 'Vừa xong'
      }
    ]);
    try {
      await fetchBackend('/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 'student_user' })
      });
    } catch {
      // ignore
    }
  };

  // Xử lý gửi tin nhắn Chat thông qua Backend an toàn và duy trì conversationId
  const handleSendMessage = async (textToSend) => {
    // Chặn tuyệt đối: tài khoản Demo không gửi được tin nhắn cho CamCam.
    if (chatLocked) return;
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping || quotaExhausted) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await fetchBackend('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: user?.id || 'student_user',
          conversationId: conversationId
        })
      });

      // Bản deploy tĩnh (GitHub Pages) trả index.html với HTTP 200 cho mọi
      // đường dẫn, nên phải kiểm tra Content-Type trước khi parse JSON.
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('application/json')) {
        throw new Error('Máy chủ API không tồn tại (bản deploy tĩnh)');
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (!data) {
          throw new Error('Máy chủ trả về dữ liệu không đọc được');
        }
        if (data.quota) setChatQuota(data.quota);
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: data.reply || 'Đã nhận phản hồi từ CamCam.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLive: data.source === 'botpress_live',
            // Mã lỗi kỹ thuật chỉ hiện cho admin, không đập vào mắt học sinh.
            adminNote: user?.isAdmin && data.failure ? (data.hint || data.failure) : null
          }
        ]);
      } else {
        // Giữ lại status + body để báo đúng nguyên nhân, không nuốt lỗi.
        const body = await res.json().catch(() => null);
        if (body?.quota) setChatQuota(body.quota);
        if (body?.code === 'CHAT_DAILY_LIMIT') {
          setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot',
            text: body.error, time: 'Vừa xong' }]);
          return;
        }
        throw new Error(body?.error || `Máy chủ trả về HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[Assistant Chat Error]:', err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Mình chưa gửi được câu hỏi "${text}" tới CamCam.\n\nLý do: ${err.message}\n\nNếu bạn đang chạy bản deploy tĩnh (GitHub Pages) thì sẽ không có máy chủ \`/api/botpress\`, cần chạy \`npm run dev\` hoặc \`npm run server\` trên VPS.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Mascot Button (Mặt con mèo PNG đã xóa nền) */}
      <div className="botpress-floating-bubble-wrap">
        {!isOpen && (
          <button
            className="botpress-mascot-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Mở CamCam AI"
            title="Nhấn để trò chuyện cùng CamCam."
          >
            <div className="botpress-mascot-inner">
              <img
                src={bubbleChatImg}
                alt="CamCam AI"
                className="botpress-mascot-img"
              />
              <span className="botpress-mascot-ping"></span>
              {chatLocked && (
                <span className="botpress-mascot-lock" title="CamCam bị khoá với tài khoản Demo">
                  <Lock size={12} />
                </span>
              )}
            </div>
            {/* Tooltip bong bóng nhỏ nhắn mời chat */}
            <div className="botpress-mascot-tooltip">
              <span>{chatLocked ? 'CamCam khoá với tài khoản Demo 🔒' : 'Hỏi CamCam nè! 😺'}</span>
            </div>
          </button>
        )}
      </div>

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="botpress-chat-window">
          {/* Header */}
          <div className="botpress-header">
            <div className="botpress-header-left">
              <div className="botpress-avatar">
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF' }}>
                  <img src={bubbleChatImg} alt="CamCam" className="botpress-avatar-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <span className="botpress-status-dot"></span>
              </div>
                <div className="botpress-header-info">
                  <div className="botpress-title">
                    <span>{chatLocked ? 'CamCam bị khoá' : 'CamCam giải đáp'}</span>
                  </div>
                  <div className="botpress-subtitle">
                    {chatLocked ? 'Chỉ dành cho tài khoản thật' : 'Trợ lý học tập MewTinHoc'}
                  </div>
                </div>
            </div>

            <div className="botpress-header-actions">
              {/* Nút làm mới đoạn chat vô nghĩa khi CamCam bị khoá */}
              {!chatLocked && (
                <button
                  className="botpress-header-btn"
                  onClick={handleResetChat}
                  title="Bắt đầu đoạn chat mới (xóa ngữ cảnh cũ)"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              {user?.isAdmin && (
                <button
                  className={`botpress-header-btn ${activeTab === 'backend_status' ? 'active' : ''}`}
                  onClick={() => setActiveTab(activeTab === 'backend_status' ? 'chat' : 'backend_status')}
                  title="Công cụ quản trị trợ lý"
                >
                  <Settings size={17} />
                </button>
              )}
              <button
                className="botpress-header-btn"
                onClick={handleCloseChat}
                title="Đóng cửa sổ chat (sẽ reset ngữ cảnh khi mở lại)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tab 1: Backend Security & API Tools */}
          {activeTab === 'backend_status' && (
            <div className="botpress-settings-panel">
              <div className="botpress-settings-header">
                <ShieldCheck size={18} color="#10B981" />
                <strong>Bảo mật Botpress API qua Backend</strong>
              </div>

              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem', fontSize: '0.74rem', color: '#065F46', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Lock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Bảo mật 100%:</strong> Toàn bộ <code>BOTPRESS_TOKEN</code> và <code>BOTPRESS_BOT_ID</code> được xử lý độc quyền ở phía máy chủ (Backend), không hề bị lộ ra trình duyệt hay DevTools Network của người dùng.
                </div>
              </div>

              {/* Thông tin cấu hình hiện tại ở Backend */}
              <div style={{ background: '#FFF', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Chat Botpress:</span>
                  <span style={{ fontWeight: 700, color: backendConfig.chatConfigured ? '#059669' : '#D97706' }}>
                    {backendConfig.chatConfigured
                      ? '🟢 Đã có Webhook ID'
                      : '🟡 Thiếu BOTPRESS_WEBHOOK_ID'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Encryption Key:</span>
                  <span style={{ fontWeight: 700, color: backendConfig.encryptionEnabled ? '#059669' : '#6B7280' }}>
                    {backendConfig.encryptionEnabled ? 'Đã bật' : 'Không dùng'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Webhook ID:</span>
                  <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{backendConfig.maskedWebhookId || '(Chưa thiết lập)'}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Token Files API:</span>
                  <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{backendConfig.maskedToken}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Bot ID:</span>
                  <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{backendConfig.maskedBotId}</code>
                </div>
              </div>

              {/* Hướng dẫn cấu hình Backend */}
              <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                Chat với CamCam chỉ cần <strong>BOTPRESS_WEBHOOK_ID</strong> trong file <strong>.env.local</strong> trên server:
                <pre style={{ background: '#1E1E2E', color: '#A5B4FC', padding: '0.5rem 0.75rem', borderRadius: '6px', marginTop: '0.35rem', fontFamily: 'var(--font-code)', fontSize: '0.7rem' }}>
                  {`BOTPRESS_WEBHOOK_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# Tùy chọn — chỉ khi bot bật Encryption Key:
BOTPRESS_ENCRYPTION_KEY=your_encryption_key
# Tùy chọn — chỉ dùng cho công cụ /files:
BOTPRESS_TOKEN=bp_pat_your_token_here
BOTPRESS_BOT_ID=your_bot_id_here`}
                </pre>
              </div>

              {/* cURL Display Box */}
              <div className="botpress-curl-box">
                <div className="botpress-curl-header">
                  <span># cURL kiểm tra danh sách Files (/v1/files)</span>
                  <button className="botpress-btn-copy" onClick={handleCopyCurl}>
                    {copiedCurl ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    <span>{copiedCurl ? 'Đã chép' : 'Copy cURL'}</span>
                  </button>
                </div>
                <pre className="botpress-curl-code">{curlExample}</pre>
              </div>

              {/* Nút kiểm tra API từ Backend */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="botpress-btn-test"
                  onClick={handleDiagnoseChat}
                  disabled={apiTesting}
                >
                  <RefreshCw size={14} className={apiTesting ? 'spin-icon' : ''} />
                  <span>{apiTesting ? 'Đang kiểm tra...' : 'Chẩn đoán Chat Botpress'}</span>
                </button>

                <button
                  className="botpress-btn-test"
                  onClick={handleTestBotpressFilesApi}
                  disabled={apiTesting}
                >
                  <RefreshCw size={14} className={apiTesting ? 'spin-icon' : ''} />
                  <span>{apiTesting ? 'Đang gọi Backend...' : 'Kiểm tra API /v1/files qua Backend'}</span>
                </button>

                <button
                  className="botpress-btn-back"
                  onClick={() => setActiveTab('chat')}
                >
                  Quay lại Chat
                </button>
              </div>

              {/* Kết quả kiểm tra */}
              {apiResult && (
                <div className={`botpress-test-result ${apiResult.status}`}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                    {apiResult.status === 'success' ? '✅ Thành công' : (apiResult.status === 'demo' ? '💡 Chế độ Demo' : '⚠️ Thông báo:')}
                  </div>
                  <div>{apiResult.message}</div>
                  {apiResult.detail && (
                    <pre style={{ marginTop: '0.4rem', whiteSpace: 'pre-wrap', fontSize: '0.7rem', fontFamily: 'var(--font-code)', background: 'rgba(0,0,0,0.04)', padding: '0.4rem', borderRadius: '4px' }}>
                      {apiResult.detail}
                    </pre>
                  )}
                  {apiResult.files && (
                    <div style={{ fontSize: '0.72rem', marginTop: '0.35rem' }}>
                      Số lượng files tìm thấy trên Botpress: {Array.isArray(apiResult.files) ? apiResult.files.length : 0}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Chat Messages */}
          {activeTab === 'chat' && (
            chatLocked ? (
              <div className="botpress-locked-wrap">
                <DemoLockedView
                  feature="chat"
                  variant="compact"
                  onUpgrade={onRequestUpgrade}
                  upgradeLabel="Đăng nhập Google để chat"
                />
              </div>
            ) : (
            <>
              {!backendOnline && user?.isAdmin && (
                <div className="botpress-demo-banner">
                  <span>
                    Không gọi được <code>/api/botpress</code>: trang đang chạy bản deploy tĩnh (GitHub Pages).
                    Chat chỉ hoạt động khi mở qua máy chủ Node (<code>npm run server</code> trên VPS).
                  </span>
                </div>
              )}

              {backendOnline && !backendConfig.chatConfigured && user?.isAdmin && (
                <div className="botpress-demo-banner">
                  <span>
                    CamCam đang chạy chế độ trả lời mẫu: máy chủ chưa đọc được BOTPRESS_WEBHOOK_ID.
                    Tạo file <code>.env.local</code> cạnh <code>package.json</code> rồi khởi động lại server.
                  </span>
                </div>
              )}

              <div className="botpress-messages-area">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`botpress-msg-bubble ${m.sender === 'user' ? 'user-msg' : 'bot-msg'}`}
                  >
                    {m.sender === 'bot' && (
                      <img
                        src={bubbleChatImg}
                        alt="CamCam"
                        className="botpress-msg-avatar"
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <div className="botpress-msg-content">
                      <div className="botpress-msg-text">
                        <FormattedMessage text={m.text} isUser={m.sender === 'user'} />
                      </div>
                      {m.adminNote && (
                        <div className="botpress-msg-admin-note">
                          <strong>Chẩn đoán (chỉ admin thấy):</strong> {m.adminNote}
                        </div>
                      )}
                      <div className="botpress-msg-time">{m.time}</div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="botpress-msg-bubble bot-msg">
                    <img
                      src={bubbleChatImg}
                      alt="CamCam"
                      className="botpress-msg-avatar"
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div className="botpress-typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div role="status" style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {quotaExhausted
                  ? 'Đã hết 5 lượt chat hôm nay. Hạn mức đặt lại lúc 0 giờ Việt Nam.'
                  : (chatQuota ? 'Còn ' + chatQuota.remaining + '/5 lượt chat hôm nay.' : 'Giới hạn 5 lượt chat mỗi ngày.')}
              </div>
              {/* Input Box */}
              <div className="botpress-input-box">
                <input
                  type="text"
                  placeholder={quotaExhausted ? "Bạn đã hết lượt chat hôm nay" : "Đặt câu hỏi."}
                  disabled={quotaExhausted || isTyping}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  className="botpress-chat-input"
                />
                <button
                  className="botpress-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isTyping || quotaExhausted}
                  title="Gửi câu hỏi"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
            )
          )}
        </div>
      )}
    </>
  );
}
