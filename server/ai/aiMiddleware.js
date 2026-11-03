// ============================================================
//  HTTP middleware cho /api/ai/*
//
//  Endpoint:
//    GET  /api/ai/status          → đã cấu hình khoá chưa (không lộ khoá)
//    POST /api/ai/review          → { prompt } → đánh giá của AI
//
//  Bảo vệ:
//    - Khoá Gemini chỉ nằm trên server
//    - Rate limit theo user/IP (in-memory) để không đốt hạn mức
//    - Chặn body quá lớn, chặn prompt rỗng
// ============================================================
import { applySecurityHeaders } from '../securityHeaders.js';
import { geminiStatus, requestAiReview } from './geminiService.js';
import { identifyCaller } from '../exam/auth.js';
import { AI_SYSTEM_INSTRUCTION } from './systemInstruction.js';

const MAX_BODY_BYTES = 96 * 1024; // log đầy đủ + prompt ~ 10–20KB, dư rộng
const MIN_PROMPT_CHARS = 120;
const MAX_PROMPT_CHARS = 60_000;

/** Giới hạn riêng cho tính năng AI — chặt hơn API đề vì tốn hạn mức */
const AI_LIMIT = {
  minIntervalMs: 15_000, // 1 lần / 15 giây / user
  maxPerHour: 12,
  anonMinIntervalMs: 45_000,
  anonMaxPerHour: 4,
};

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.end(JSON.stringify(data));
}

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

/* ------------------------------------------------------------------
   Rate limit (in-memory, đủ cho 1 process PM2)
   ------------------------------------------------------------------ */

const buckets = new Map(); // key → { lastAt, windowStart, count }

function checkLimit(key, { minIntervalMs, maxPerHour }) {
  const now = Date.now();
  const bucket = buckets.get(key) || { lastAt: 0, windowStart: now, count: 0 };

  if (now - bucket.windowStart >= 60 * 60 * 1000) {
    bucket.windowStart = now;
    bucket.count = 0;
  }

  const elapsed = now - bucket.lastAt;
  if (elapsed < minIntervalMs) {
    return {
      allowed: false,
      code: 'TOO_FAST',
      retryAfterSeconds: Math.ceil((minIntervalMs - elapsed) / 1000),
      message: 'Bạn vừa gửi đánh giá. Đợi ít giây rồi thử lại nhé.',
    };
  }

  if (bucket.count >= maxPerHour) {
    return {
      allowed: false,
      code: 'HOURLY_LIMIT',
      retryAfterSeconds: Math.ceil((bucket.windowStart + 60 * 60 * 1000 - now) / 1000),
      message: 'Bạn đã đạt giới hạn đánh giá trong giờ này. Thử lại sau ít phút nhé.',
    };
  }

  bucket.lastAt = now;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 5000) {
    const cutoff = now - 60 * 60 * 1000;
    for (const [k, v] of buckets) {
      if (v.lastAt < cutoff) buckets.delete(k);
    }
  }

  /**
   * Hoàn lại lượt khi lỗi KHÔNG do người học (Google 503, timeout, thiếu khoá…).
   * Nếu không hoàn, một lần Google quá tải sẽ khoá nút "Đánh giá lại" 15 giây
   * và trừ oan hạn mức trong giờ.
   */
  const refund = () => {
    const current = buckets.get(key);
    if (!current) return;
    current.count = Math.max(0, current.count - 1);
    current.lastAt = 0; // cho phép bấm lại ngay
  };

  return { allowed: true, refund };
}

/* ------------------------------------------------------------------
   Middleware
   ------------------------------------------------------------------ */

export async function aiMiddleware(req, res, next) {
  applySecurityHeaders(res, req);

  const url = (req.url?.split('?')[0] || '').replace(/^\/api\/ai/, '') || '/';
  const method = req.method?.toUpperCase();

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    // ---------------- STATUS ----------------
    if (url === '/status') {
      if (method !== 'GET') {
        return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Chỉ hỗ trợ GET' });
      }
      const status = geminiStatus();
      return sendJson(res, 200, {
        ok: true,
        configured: status.configured,
        model: status.model,
        fallbacks: status.fallbacks,
        // Gợi ý đúng lỗi cấu hình mà không lộ khoá
        hint: status.configured
          ? status.keyLooksValid
            ? ''
            : 'Khoá đã có nhưng trông không giống khoá Gemini (AIza… hoặc AQ.…). Kiểm tra lại xem có dán thừa dấu cách hoặc thiếu ký tự không.'
          : 'Chưa có GEMINI_API_KEY. Thêm khoá vào .env.local rồi khởi động lại server.',
      });
    }

    // ---------------- REVIEW ----------------
    if (url === '/review') {
      if (method !== 'POST') {
        return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Chỉ hỗ trợ POST' });
      }

      const body = await parseJsonBody(req);
      const prompt = String(body?.prompt || '').trim();

      if (prompt.length < MIN_PROMPT_CHARS) {
        return sendJson(res, 400, {
          ok: false,
          code: 'PROMPT_TOO_SHORT',
          message: 'Nội dung gửi cho AI quá ngắn. Hãy nộp bài trước rồi đánh giá lại.',
        });
      }
      if (prompt.length > MAX_PROMPT_CHARS) {
        return sendJson(res, 413, {
          ok: false,
          code: 'PROMPT_TOO_LONG',
          message: 'Nội dung gửi cho AI quá dài. Bạn dùng nút "Tải file log" để lấy bản đầy đủ nhé.',
        });
      }

      // Chưa cấu hình khoá → trả lỗi rõ ràng để UI hướng dẫn học viên
      if (!geminiStatus().configured) {
        return sendJson(res, 503, {
          ok: false,
          code: 'AI_NOT_CONFIGURED',
          message:
            'Tính năng đánh giá AI chưa được bật trên máy chủ này. Bạn vẫn dùng được nút "Copy prompt" để dán vào Google AI Studio.',
        });
      }

      const caller = await identifyCaller(req);
      const limit = checkLimit(
        `ai:${caller.userId}`,
        caller.isAnonymous
          ? {
              minIntervalMs: AI_LIMIT.anonMinIntervalMs,
              maxPerHour: AI_LIMIT.anonMaxPerHour,
            }
          : AI_LIMIT,
      );

      if (!limit.allowed) {
        if (limit.retryAfterSeconds) {
          res.setHeader('Retry-After', String(limit.retryAfterSeconds));
        }
        return sendJson(res, 429, {
          ok: false,
          code: limit.code,
          message: limit.message,
        });
      }

      let review;
      try {
        review = await requestAiReview({
          system: AI_SYSTEM_INSTRUCTION,
          prompt,
        });
      } catch (err) {
        // Lỗi từ phía Google / cấu hình máy chủ → không tính vào hạn mức người học
        const notTheirFault = !['AI_BLOCKED'].includes(err?.code);
        if (notTheirFault && typeof limit.refund === 'function') limit.refund();
        throw err;
      }

      return sendJson(res, 200, { ok: true, review });
    }
    if (typeof next === 'function') return next();
    return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Endpoint không tồn tại' });
  } catch (err) {
    const statusCode = Number(err?.statusCode) || 500;
    if (statusCode >= 500) console.error('[ai] Lỗi xử lý API:', err);

    // Lỗi 502/503/504 do upstream: trả nguyên câu đã viết cho người học
    const isKnownUpstream = ['AI_NOT_CONFIGURED', 'AI_TIMEOUT', 'AI_NETWORK', 'AI_BAD_KEY', 'AI_BAD_MODEL', 'AI_BUSY', 'AI_QUOTA_DAY', 'AI_RATE_LIMITED', 'AI_UPSTREAM_ERROR', 'AI_EMPTY', 'AI_BAD_JSON', 'AI_INCOMPLETE', 'AI_BLOCKED'].includes(err?.code);

    return sendJson(res, statusCode, {
      ok: false,
      code: err?.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message:
        isKnownUpstream || err?.statusCode
          ? err.message || 'Không xử lý được yêu cầu.'
          : 'Lỗi máy chủ nội bộ.',
    });
  }
}
