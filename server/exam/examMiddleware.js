// ============================================================
//  HTTP middleware cho /api/exams/*
//  Đặt TRƯỚC static handler trong server.js (nếu không mọi POST sẽ
//  rơi vào SPA fallback và trả về index.html).
//
//  Endpoint:
//    POST /api/exams/claim   { track }        → 1 đề KHÔNG có đáp án
//    POST /api/exams/submit  { examId, answers } → kết quả + đáp án + giải thích
//
//  Không có endpoint trả số lượng đề còn lại (yêu cầu ẩn tình hình kho).
// ============================================================
import { applySecurityHeaders } from '../securityHeaders.js';
import { EXAM_ID_RE } from './config.js';
import { requestExam, submitAnswers } from './examService.js';
import { gradeSubmission } from './storage.js';
import { isValidAnswerPayload } from './grading.js';
import { identifyCaller, ANON_LIMIT } from './auth.js';

const MAX_BODY_BYTES = 64 * 1024; // đủ cho 40 câu trả lời
const MAX_TRACK_CHARS = 8;

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

export async function examMiddleware(req, res, next) {
  applySecurityHeaders(res, req);

  const url = (req.url?.split('?')[0] || '').replace(/^\/api\/exams/, '') || '/';
  const method = req.method?.toUpperCase();

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    // ---------------- CLAIM ----------------
    if (url === '/claim') {
      if (method !== 'POST') {
        return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Chỉ hỗ trợ POST' });
      }

      const body = await parseJsonBody(req);
      const track = String(body?.track || '').trim().toLowerCase().slice(0, MAX_TRACK_CHARS);
      if (track !== 'ict' && track !== 'cs') {
        return sendJson(res, 400, {
          ok: false,
          code: 'INVALID_TRACK',
          message: 'Định hướng không hợp lệ',
        });
      }

      const caller = await identifyCaller(req);
      const outcome = await requestExam({
        userId: caller.userId,
        track,
        limits: caller.isAnonymous ? ANON_LIMIT : undefined,
      });

      if (!outcome.ok) {
        if (outcome.retryAfterSeconds) {
          res.setHeader('Retry-After', String(outcome.retryAfterSeconds));
        }
        return sendJson(res, outcome.status || 400, {
          ok: false,
          code: outcome.code,
          message: outcome.message,
        });
      }

      // KHÔNG kèm bất kỳ thông tin nào về số lượng đề còn lại
      return sendJson(res, 200, { ok: true, exam: outcome.exam });
    }

    // ---------------- SUBMIT ----------------
    if (url === '/submit') {
      if (method !== 'POST') {
        return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Chỉ hỗ trợ POST' });
      }

      const body = await parseJsonBody(req);
      const examId = String(body?.examId || '').trim();
      if (!EXAM_ID_RE.test(examId)) {
        return sendJson(res, 400, { ok: false, code: 'INVALID_EXAM_ID', message: 'Mã đề không hợp lệ' });
      }

      const answers = body?.answers;
      // Validate shape TRƯỚC khi chấm để session không bị "khoá" bởi payload hỏng
      const probe = gradeSubmission(examId, answers);
      if (!probe.ok) {
        return sendJson(res, 404, {
          ok: false,
          code: probe.code,
          message: 'Không tìm thấy đề thi. Đề có thể đã hết hạn.',
        });
      }

      if (!isValidAnswerPayload(answers, probe.publicExam)) {
        return sendJson(res, 400, {
          ok: false,
          code: 'INVALID_ANSWERS',
          message: 'Dữ liệu bài làm không hợp lệ',
        });
      }

      const submitted = submitAnswers({ examId, answers });

      if (!submitted.ok) {
        return sendJson(res, submitted.status || 400, {
          ok: false,
          code: submitted.code,
          message: submitted.message,
        });
      }

      // Trả kết quả chấm + đáp án + giải thích (chỉ sau khi đã nộp)
      return sendJson(res, 200, {
        ok: true,
        result: submitted.result,
        key: {
          partI: submitted.keyData.partI,
          partII: submitted.keyData.partII,
        },
      });
    }

    // ---------------- HEALTH (chỉ admin) ----------------
    // Cho phép admin tự kiểm tra hệ thống có sẵn sàng không, mà KHÔNG
    // tiết lộ số đề đang chờ (yêu cầu ẩn tình hình kho với học viên).
    if (url === '/health') {
      const token = req.headers['x-exam-admin-token'];
      const expected = process.env.EXAM_ADMIN_TOKEN;
      if (!expected || token !== expected) {
        // Trả 404 thay vì 403 để không lộ sự tồn tại của endpoint
        return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Endpoint không tồn tại' });
      }
      const { verifyReadiness } = await import('./examService.js');
      const health = await verifyReadiness();
      return sendJson(res, health.ok ? 200 : 503, {
        ok: health.ok,
        problems: health.problems,
        warnings: health.warnings,
      });
    }

    // ---------------- Không khớp route ----------------
    if (typeof next === 'function') return next();
    return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', message: 'Endpoint không tồn tại' });
  } catch (err) {
    const statusCode = Number(err?.statusCode) || 500;
    if (statusCode >= 500) console.error('[exam] Lỗi xử lý API:', err);
    return sendJson(res, statusCode, {
      ok: false,
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
      message: statusCode >= 500 ? 'Lỗi máy chủ nội bộ' : err.message,
    });
  }
}
