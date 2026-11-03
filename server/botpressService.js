import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@botpress/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Đọc biến môi trường từ .env.local và .env mà không làm lộ ra client
function loadBackendEnv() {
  const envVars = { ...process.env };
  const envFiles = ['.env.local', '.evn.local', '.env'];

  for (const file of envFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!envVars[key]) {
              envVars[key] = val;
            }
          }
        }
      } catch (err) {
        console.warn(`[Botpress Backend] Không thể đọc file ${file}:`, err.message);
      }
    }
  }

  return envVars;
}

// Kiểm tra một giá trị env có phải là placeholder chưa điền hay không
function isRealValue(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('$')) return false;
  if (/^(your|placeholder|changeme|todo)/i.test(trimmed)) return false;
  if (trimmed === 'your_default_webhook_url') return false;
  return true;
}

// Lấy cấu hình Botpress bí mật từ Backend
export function getBotpressConfig() {
  const env = loadBackendEnv();
  const token = env.BOTPRESS_TOKEN || env.VITE_BOTPRESS_TOKEN || '';
  const botId = env.BOTPRESS_BOT_ID || env.VITE_BOTPRESS_BOT_ID || '';
  const webhookId = env.BOTPRESS_WEBHOOK_ID || '';
  const encryptionKey = env.BOTPRESS_ENCRYPTION_KEY || '';

  // Chat Botpress chỉ cần WEBHOOK_ID. ENCRYPTION_KEY chỉ bắt buộc khi bot
  // có bật "Encryption key" trong Botpress Cloud > Chat > Settings.
  const chatConfigured = isRealValue(webhookId);
  const encryptionEnabled = isRealValue(encryptionKey);
  const isConfigured = chatConfigured && encryptionEnabled;

  return {
    token,
    botId,
    webhookId,
    encryptionKey,
    isConfigured,
    chatConfigured,
    encryptionEnabled,
    maskedToken: token && token !== '$YOUR_BOTPRESS_TOKEN' ? `${token.slice(0, 7)}...${token.slice(-4)}` : '(Tùy chọn cho Chat)',
    maskedBotId: botId && botId !== '$YOUR_BOT_ID' ? `${botId.slice(0, 6)}...${botId.slice(-4)}` : '(Tùy chọn)',
    maskedWebhookId: webhookId ? `${webhookId.slice(0, 8)}...${webhookId.slice(-6)}` : '(Chưa thiết lập)',
    maskedEncryptionKey: encryptionKey ? `${encryptionKey.slice(0, 6)}...${encryptionKey.slice(-4)}` : '(Chưa thiết lập)'
  };
}

// Khởi tạo Botpress Client an toàn ở phía Server
export function getBotpressClient() {
  const { token, botId } = getBotpressConfig();
  if (!token || token === '$YOUR_BOTPRESS_TOKEN' || !botId || botId === '$YOUR_BOT_ID') {
    return null;
  }
  return new Client({ token, botId });
}

// Ký JSON Web Token (HS256) cho header x-user-key khi Botpress cài đặt Encryption Key
function signUserKey(userId, encryptionKey) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: userId, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  const signature = crypto.createHmac('sha256', encryptionKey).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// Gọi API lấy danh sách Files từ Botpress Cloud: https://api.botpress.cloud/v1/files
export async function listBotpressFiles() {
  const { token, botId } = getBotpressConfig();

  if (!token || token === '$YOUR_BOTPRESS_TOKEN' || !botId || botId === '$YOUR_BOT_ID') {
    return {
      status: 'demo',
      message: 'Tính năng xem files quản trị cần BOTPRESS_TOKEN trong .env.local. (Chat với CamCam hiện đã hoạt động bình thường qua Webhook ID).',
      files: []
    };
  }

  try {
    const client = getBotpressClient();
    if (client) {
      const response = await client.listFiles({});
      return {
        status: 'success',
        files: response.files || response || []
      };
    }

    const res = await fetch('https://api.botpress.cloud/v1/files', {
      method: 'GET',
      headers: {
        'Authorization': `bearer ${token}`,
        'x-bot-id': botId
      }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || `Lỗi HTTP ${res.status}: ${res.statusText}`);
    }

    return {
      status: 'success',
      files: data?.files || data || []
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.message || 'Lỗi kết nối Botpress Cloud Files API từ backend'
    };
  }
}

// Botpress Chat API trả HTTP 200 kèm body lỗi dạng
// { id: "err_...", code: 404, type: "ResourceNotFound", message: "..." }
// Nếu chỉ kiểm tra res.ok thì lỗi bị nuốt hoàn toàn — phải kiểm tra cả body.
function isBotpressErrorBody(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.id === 'string' && data.id.startsWith('err_')) return true;
  if (typeof data.type === 'string' && /Error|NotFound|Unauthorized|Forbidden/i.test(data.type)) return true;
  return false;
}

// Gọi Botpress Chat API và coi body lỗi là thất bại thật sự.
async function botpressFetch(url, options = {}) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, data, error: data?.message || `HTTP ${res.status}` };
  }
  if (isBotpressErrorBody(data)) {
    return { ok: false, status: res.status, data, error: data?.message || 'Botpress trả lỗi không rõ lý do' };
  }
  return { ok: true, status: res.status, data };
}

// Chẩn đoán kết nối Botpress Chat theo từng bước để biết chính xác tắc ở đâu.
// Trả về bước nào fail + HTTP status + thông báo lỗi thật từ Botpress.
export async function diagnoseBotpressChat() {
  const { chatConfigured, webhookId, encryptionEnabled, encryptionKey } = getBotpressConfig();
  const steps = [];

  if (!chatConfigured) {
    return {
      ok: false,
      step: 'config',
      message: 'Chưa có BOTPRESS_WEBHOOK_ID trong .env.local. Chat sẽ chỉ trả lời mẫu.',
      steps
    };
  }

  const bpUserUuid = crypto.randomUUID();
  const userKey = encryptionEnabled && encryptionKey ? signUserKey(bpUserUuid, encryptionKey) : bpUserUuid;

  // Bước 1 — get-or-create user
  try {
    const r = await botpressFetch(`https://chat.botpress.cloud/${webhookId}/users/get-or-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-key': userKey },
      body: JSON.stringify({ name: 'diagnose_user' })
    });
    steps.push({ step: 'createUser', ok: r.ok, status: r.status, detail: r.ok ? undefined : r.error });
    if (!r.ok) {
      return {
        ok: false,
        step: 'createUser',
        message: `Không tạo được user trên Botpress: ${r.error}`,
        steps
      };
    }
  } catch (err) {
    steps.push({ step: 'createUser', ok: false, detail: err.message });
    return {
      ok: false,
      step: 'createUser',
      message: `Không gọi được chat.botpress.cloud: ${err.message}`,
      steps
    };
  }

  // Bước 2 — tạo conversation
  let conversationId = null;
  try {
    const r = await botpressFetch(`https://chat.botpress.cloud/${webhookId}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-key': userKey },
      body: JSON.stringify({})
    });
    conversationId = r.data?.conversation?.id || null;
    steps.push({ step: 'createConversation', ok: r.ok && Boolean(conversationId), status: r.status, detail: r.ok ? undefined : r.error });
    if (!r.ok || !conversationId) {
      return {
        ok: false,
        step: 'createConversation',
        message: `Không tạo được conversation: ${r.error || 'Botpress không trả về conversation.id'}`,
        steps
      };
    }
  } catch (err) {
    steps.push({ step: 'createConversation', ok: false, detail: err.message });
    return { ok: false, step: 'createConversation', message: err.message, steps };
  }

  // Bước 3 — gửi message thử
  try {
    const r = await botpressFetch(`https://chat.botpress.cloud/${webhookId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-key': userKey },
      body: JSON.stringify({ conversationId, payload: { type: 'text', text: 'ping' } })
    });
    steps.push({ step: 'sendMessage', ok: r.ok, status: r.status, detail: r.ok ? undefined : r.error });
    if (!r.ok) {
      return {
        ok: false,
        step: 'sendMessage',
        message: `Gửi tin nhắn thất bại: ${r.error}`,
        conversationId,
        steps
      };
    }
  } catch (err) {
    steps.push({ step: 'sendMessage', ok: false, detail: err.message });
    return { ok: false, step: 'sendMessage', message: err.message, steps };
  }

  // Bước 4 — chờ bot trả lời (tối đa ~18s)
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const r = await botpressFetch(
        `https://chat.botpress.cloud/${webhookId}/conversations/${conversationId}/messages`,
        { method: 'GET', headers: { 'x-user-key': userKey } }
      );
      if (!r.ok) continue;
      const botMsgs = (r.data?.messages || []).filter(
        (m) => m.userId !== bpUserUuid && typeof m.payload?.text === 'string' && m.payload.text.trim()
      );
      if (botMsgs.length > 0) {
        const reply = botMsgs[botMsgs.length - 1].payload.text;
        steps.push({ step: 'awaitReply', ok: true, reply: reply.slice(0, 200) });
        return {
          ok: true,
          message: 'Botpress Chat hoạt động bình thường.',
          reply,
          conversationId,
          steps
        };
      }
    } catch {
      // tiếp tục poll
    }
  }

  steps.push({ step: 'awaitReply', ok: false });
  return {
    ok: false,
    step: 'awaitReply',
    message:
      'Gửi tin thành công nhưng bot không phản hồi. Kiểm tra: (1) bot CamCam đã được public/Published, (2) luồng hội thoại có trigger "Conversation Started"/"User Message", (3) Integration Chat đã bật cho bot.',
    conversationId,
    steps
  };
}

// Cấu trúc: userId -> { bpUserUuid, userKey, botpressUserId, conversationId }
const userSessions = new Map();

// Reset phiên khi người dùng tắt cửa sổ chat
export function resetSession(userId = 'student_user') {
  userSessions.delete(userId);
  return { success: true };
}

// Lấy hoặc tạo mới phiên hội thoại (Đảm bảo giữ nguyên conversationId trong suốt cuộc trò chuyện)
async function getOrCreateSession({ userId = 'student_user', conversationId = null, forceNew = false }) {
  const { chatConfigured, webhookId, encryptionKey, encryptionEnabled } = getBotpressConfig();
  if (!chatConfigured) return null;

  if (forceNew) {
    userSessions.delete(userId);
  }

  let session = userSessions.get(userId);
  let lastBotpressError = null;

  // 1. Tạo UUID ổn định cho User (Botpress yêu cầu tối thiểu 28 ký tự)
  let bpUserUuid = session?.bpUserUuid;
  if (!bpUserUuid) {
    bpUserUuid = crypto.randomUUID();
  }

  const userKey = encryptionEnabled && encryptionKey
    ? signUserKey(bpUserUuid, encryptionKey)
    : bpUserUuid;

  // 2. Đăng ký người dùng trên Botpress Cloud qua get-or-create
  let botpressUserId = session?.botpressUserId;
  if (!botpressUserId) {
    try {
      const r = await botpressFetch(`https://chat.botpress.cloud/${webhookId}/users/get-or-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-key': userKey
        },
        body: JSON.stringify({ name: userId || 'HocVien' })
      });
      botpressUserId = r.ok ? (r.data?.user?.id || bpUserUuid) : bpUserUuid;
      if (!r.ok) console.warn('[Botpress getOrCreateUser Failed]:', r.error);
    } catch (err) {
      console.warn('[Botpress getOrCreateUser Warning]:', err.message);
      botpressUserId = bpUserUuid;
    }
  }

  // 3. Giữ nguyên conversationId nếu đang trong cùng 1 phiên chat
  let activeConvId = conversationId || session?.conversationId;
  if (!activeConvId) {
    try {
      const r = await botpressFetch(`https://chat.botpress.cloud/${webhookId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-key': userKey
        },
        body: JSON.stringify({})
      });
      activeConvId = r.ok ? (r.data?.conversation?.id || null) : null;
      if (!r.ok) {
        console.warn('[Botpress createConversation Failed]:', r.error);
        lastBotpressError = r.error;
      }
    } catch (err) {
      console.warn('[Botpress createConversation Warning]:', err.message);
      lastBotpressError = err.message;
    }
  }

  session = {
    bpUserUuid,
    userKey,
    botpressUserId,
    conversationId: activeConvId,
    lastError: lastBotpressError
  };
  userSessions.set(userId, session);
  return session;
}

// Xử lý gửi tin nhắn Chat qua Botpress Backend có duy trì ngữ cảnh
export async function processChatMessage({ message, userId = 'student_user', conversationId = null }) {
  const { chatConfigured, webhookId } = getBotpressConfig();
  const text = (message || '').trim();

  if (!text) {
    return { error: 'Tin nhắn không được để trống' };
  }

  let currentSession = null;
  // Lý do cụ thể khiến Botpress không trả lời, để前端/Admin thấy ngay
  let failure = chatConfigured ? null : 'missing_webhook_id';

  // 1. Gọi trực tiếp Botpress Chat API với Webhook ID và x-user-key
  if (chatConfigured) {
    try {
      currentSession = await getOrCreateSession({ userId, conversationId });

      if (!currentSession?.conversationId) {
        failure = currentSession?.lastError
          ? `cannot_create_conversation: ${currentSession.lastError}`
          : 'cannot_create_conversation';
        failure = failure.slice(0, 200);
      } else {
        // Chụp lại danh sách message hiện có trước khi gửi, để không nhận nhầm
        // câu trả lời cũ còn nằm trong conversation.
        const baselineIds = new Set();
        try {
          const baseRes = await fetch(
            `https://chat.botpress.cloud/${webhookId}/conversations/${currentSession.conversationId}/messages`,
            { method: 'GET', headers: { 'x-user-key': currentSession.userKey } }
          );
          if (baseRes.ok) {
            const baseData = await baseRes.json();
            for (const m of baseData?.messages || []) baselineIds.add(m.id);
          }
        } catch {
          // Không chặn luồng gửi tin chỉ vì bước chụp baseline lỗi
        }

        // Gửi tin nhắn của học sinh (createMessage)
        const sendResult = await botpressFetch(`https://chat.botpress.cloud/${webhookId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-key': currentSession.userKey
          },
          body: JSON.stringify({
            conversationId: currentSession.conversationId,
            payload: {
              type: 'text',
              text
            }
          })
        });

        if (!sendResult.ok) {
          console.warn('[Botpress sendMessage Failed]:', sendResult.status, sendResult.error);
          failure = sendResult.status === 401 || sendResult.status === 403
            ? 'webhook_unauthorized'
            : `send_failed: ${sendResult.error}`.slice(0, 160);
        } else {
          const myMsgId = sendResult.data?.message?.id;
          if (myMsgId) baselineIds.add(myMsgId);

          // Thăm dò (polling) nhận câu trả lời thực tế từ bot CamCam (tối đa ~24s)
          let lastPollError = null;
          for (let attempt = 0; attempt < 20; attempt++) {
            await new Promise((r) => setTimeout(r, 1200));

            const listResult = await botpressFetch(
              `https://chat.botpress.cloud/${webhookId}/conversations/${currentSession.conversationId}/messages`,
              {
                method: 'GET',
                headers: { 'x-user-key': currentSession.userKey }
              }
            );

            if (!listResult.ok) {
              lastPollError = `poll_failed: ${listResult.error}`.slice(0, 160);
              continue;
            }

            const msgs = listResult.data?.messages || [];

            // Chỉ lấy tin nhắn MỚI (không nằm trong baseline) và không phải của chính user.
            // Lấy tin mới nhất để không dính câu trả lời cũ.
            const botMsgs = msgs
              .filter(
                (m) =>
                  !baselineIds.has(m.id) &&
                  m.id !== myMsgId &&
                  m.userId !== currentSession.botpressUserId &&
                  m.userId !== currentSession.bpUserUuid &&
                  typeof m.payload?.text === 'string' &&
                  m.payload.text.trim()
              )
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const botMsg = botMsgs[botMsgs.length - 1];
            if (botMsg) {
              return {
                reply: botMsg.payload.text,
                source: 'botpress_live',
                botName: 'CamCam',
                conversationId: currentSession.conversationId
              };
            }
          }

          failure = lastPollError || 'bot_no_reply';
        }
      }
    } catch (err) {
      console.warn('[Botpress Chat API Warning]:', err.message);
      failure = `exception_${err?.message || 'unknown'}`.slice(0, 120);
    }
  }

  // 2. Chế độ dự phòng chỉ kích hoạt nếu Botpress Cloud không phản hồi
  const lower = text.toLowerCase();
  let reply = '';

  if (lower.includes('python') || lower.includes('thuật toán') || lower.includes('for') || lower.includes('while')) {
    reply = `Trong Python ôn thi THPTQG, cần lưu ý:
1. Hàm \`range(start, stop, step)\`: Cận \`stop\` luôn không lấy (nửa khoảng mở).
2. Danh sách (List) thao tác chỉ mục từ 0 đến N-1. Cẩn thận lỗi \`IndexError\`.
3. Cấu trúc hàm \`def\` và biến cục bộ/toàn cục (\`global\`).`;
  } else if (lower.includes('sql') || lower.includes('csdl') || lower.includes('join') || lower.includes('where')) {
    reply = `Về CSDL & SQL:
1. \`WHERE\` dùng lọc dòng trước khi gom nhóm (\`GROUP BY\`).
2. \`HAVING\` dùng lọc dữ liệu sau khi gom nhóm (với các hàm tổng hợp như \`COUNT\`, \`SUM\`, \`AVG\`).
3. Khóa chính (Primary Key) định danh duy nhất mỗi bản ghi và không được phép null.`;
  } else if (lower.includes('cấu trúc') || lower.includes('đề thi') || lower.includes('ma trận') || lower.includes('2025')) {
    reply = `Cấu trúc đề thi Tin học THPTQG mới của Bộ GD&ĐT:
- Phần I: 24 câu trắc nghiệm 4 lựa chọn (6.0 điểm).
- Phần II: 4 câu trắc nghiệm Đúng/Sai đa ý phân hóa cao (4.0 điểm).
- Tổng điểm 10.0, thời gian 50 phút.`;
  } else if (lower.includes('mạng') || lower.includes('ip') || lower.includes('tcp') || lower.includes('internet')) {
    reply = `Chuyên đề Mạng máy tính & Internet:
- Địa chỉ IPv4 gồm 32 bit (4 octet), IPv6 gồm 128 bit.
- Giao thức HTTP (cổng 80), HTTPS (cổng 443 mã hóa SSL/TLS).
- Phân biệt thiết bị: Switch (tầng 2 - MAC), Router (tầng 3 - IP).`;
  } else {
    // Không khớp chủ đề nào: phải nói thật là AI chưa trả lời được,
    // thay vì chào hỏi vòng vo khiến người dùng tưởng bot hoạt động bình thường.
    reply = failure
      ? `CamCam chưa kết nối được tới Botpress Cloud nên hiện chỉ trả lời được các câu hỏi mẫu về Python, CSDL/SQL, Mạng máy tính và cấu trúc đề thi. Bạn thử hỏi một trong các chủ đề đó nhé!\n\nMã lỗi kỹ thuật: \`${failure}\``
      : `Chào bạn! Mình là CamCam AI 😺. Bạn có câu hỏi nào về môn Tin học THPTQG (Python, CSDL SQL, Mạng máy tính) hãy gửi cho mình nhé!`;
  }

  return {
    reply,
    source: 'backend_fallback',
    failure,
    conversationId: currentSession?.conversationId
  };
}
