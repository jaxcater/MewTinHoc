import crypto from 'node:crypto';
import { identifyChatCaller } from './exam/auth.js';
import { chatQuota } from './chatQuota.js';
import { getBotpressConfig, listBotpressFiles, processChatMessage, resetSession, diagnoseBotpressChat } from './botpressService.js';
import { applySecurityHeaders } from './securityHeaders.js';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_MESSAGE_CHARS = 4000;
const CHAT_COOKIE = 'mewtinhoc_chat_session';

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    let rejected = false;

    req.on('data', (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejected = true;
        reject(Object.assign(new Error('Payload quá lớn'), { statusCode: 413 }));
        req.resume();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(Object.assign(new Error('JSON không hợp lệ'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

function getChatSession(req, res) {
  const existing = getCookie(req, CHAT_COOKIE);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;

  const sessionId = crypto.randomUUID();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${CHAT_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`);
  return sessionId;
}

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function botpressMiddleware(req, res, next) {
  applySecurityHeaders(res, req);
  const url = req.url?.split('?')[0] || '';
  const method = req.method?.toUpperCase();
  const allowedOrigin = process.env.BOTPRESS_ALLOWED_ORIGIN || '';
  const requestOrigin = req.headers.origin;

  if (allowedOrigin && requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    if (!allowedOrigin || requestOrigin === allowedOrigin) {
      res.statusCode = 204;
      res.end();
    } else {
      sendJson(res, 403, { error: 'Origin không được phép' });
    }
    return;
  }

  try {
    if (url === '/status' || url === '/api/botpress/status') {
      const config = getBotpressConfig();
      return sendJson(res, 200, {
        success: true,
        configured: config.isConfigured,
        chatConfigured: config.chatConfigured,
        encryptionEnabled: config.encryptionEnabled,
        envSources: config.envSources,
        maskedToken: config.maskedToken,
        maskedBotId: config.maskedBotId,
        maskedWebhookId: config.maskedWebhookId
      });
    }

    if (url === '/quota' || url === '/api/botpress/quota') {
      if (method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
      const caller = await identifyChatCaller(req);
      return sendJson(res, 200, { quota: chatQuota.status(caller.userId, caller) });
    }

    if (url === '/files' || url === '/api/botpress/files') {
      if (method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
      const result = await listBotpressFiles();
      return sendJson(res, result.status === 'error' ? 500 : 200, result);
    }

    // Chẩn đoán từng bước kết nối Botpress Chat (chỉ trả thông tin đã che bí mật)
    if (url === '/diagnose' || url === '/api/botpress/diagnose') {
      if (method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
      const result = await diagnoseBotpressChat();
      return sendJson(res, 200, result);
    }

    if (url === '/chat' || url === '/api/botpress/chat') {
      if (method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });
      const body = await parseJsonBody(req);
      const message = cleanString(body.message || body.text, MAX_MESSAGE_CHARS);
      if (!message) return sendJson(res, 400, { error: 'Tin nhắn không được để trống' });
      const caller = await identifyChatCaller(req);
      const reservation = chatQuota.consume(caller.userId, caller);
      if (!reservation.allowed) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((Date.parse(reservation.quota.resetAt) - Date.now()) / 1000))));
        return sendJson(res, 429, {
          code: 'CHAT_DAILY_LIMIT',
          error: 'Bạn đã dùng hết 5 lượt chat hôm nay. Hạn mức đặt lại lúc 0 giờ Việt Nam.',
          quota: reservation.quota,
        });
      }
      const userId = getChatSession(req, res);
      // conversationId luôn lấy từ phiên phía server (cookie) — không tin giá
      // trị client gửi lên, tránh việc chèn conversation của người khác.
      const chatRes = await processChatMessage({ message, userId, conversationId: null });
      return sendJson(res, 200, { ...chatRes, quota: reservation.quota });
    }

    if (url === '/reset' || url === '/api/botpress/reset') {
      if (method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });
      const userId = getChatSession(req, res);
      resetSession(userId);
      return sendJson(res, 200, { success: true, message: 'Đã reset ngữ cảnh hội thoại' });
    }

    if (typeof next === 'function') return next();
    return sendJson(res, 404, { error: 'Botpress endpoint not found' });
  } catch (err) {
    const statusCode = Number(err?.statusCode) || 500;
    if (statusCode >= 500) console.error('[Botpress Middleware Error]:', err);
    return sendJson(res, statusCode, {
      error: statusCode >= 500 ? 'Lỗi máy chủ nội bộ khi xử lý Botpress API' : err.message
    });
  }
}
