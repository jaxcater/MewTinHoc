// ============================================================
//  Client API cho "Đánh giá của AI"
//  - Không bao giờ chứa khoá Gemini: mọi lời gọi đều qua /api/ai
//  - Tự gắn Bearer token Supabase để server rate-limit theo tài khoản
// ============================================================
import { supabase } from '../supabase.js';

const BASE = '/api/ai';

export const AI_ERROR = Object.freeze({
  NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
  TOO_FAST: 'TOO_FAST',
  HOURLY_LIMIT: 'HOURLY_LIMIT',
  BUSY: 'AI_BUSY',
  QUOTA_DAY: 'AI_QUOTA_DAY',
  RATE_LIMITED: 'AI_RATE_LIMITED',
  NETWORK: 'AI_NETWORK',
  SERVER: 'AI_SERVER',
});

async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

function createError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

async function postJson(path, body) {
  const token = await getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Server tự bỏ cuộc sau ~52s; client chờ thêm một nhịp rồi mới cắt.
  // Không có timeout thì khi nginx giữ kết nối, nút quay mãi không bao giờ báo lỗi.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75_000);

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw createError(
        'AI phản hồi quá lâu nên đã dừng chờ. Bạn bấm "Thử lại" nhé — log vẫn còn nguyên.',
        AI_ERROR.NETWORK,
        0,
      );
    }
    throw createError(
      'Không kết nối được máy chủ. Kiểm tra đường truyền rồi thử lại.',
      AI_ERROR.NETWORK,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text().catch(() => '');

  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Không phải JSON = trang lỗi HTML của nginx/Cloudflare (thường gặp đúng lúc
    // máy chủ đang khởi động lại sau deploy). Báo đúng bản chất thay vì
    // "dữ liệu không hợp lệ" khiến học viên tưởng log của mình hỏng.
    throw createError(
      response.status === 502 || response.status === 503 || response.status === 504
        ? 'Máy chủ đang khởi động lại. Bạn đợi khoảng 30 giây rồi bấm "Thử lại" nhé.'
        : `Máy chủ trả về trang lỗi (mã ${response.status}). Bạn bấm "Thử lại" giúp mình nhé.`,      AI_ERROR.SERVER,
      response.status,
    );
  }

  if (!response.ok || !data?.ok) {
    throw createError(
      data?.message || 'Không lấy được đánh giá. Vui lòng thử lại.',
      data?.code || AI_ERROR.SERVER,
      response.status,
    );
  }

  return data;
}

/**
 * Kiểm tra máy chủ đã cấu hình khoá AI chưa (không cần đăng nhập).
 * @returns {Promise<{configured: boolean, model: string, hint: string}>}
 */
export async function fetchAiStatus() {
  try {
    const response = await fetch(`${BASE}/status`);
    if (!response.ok) return { configured: false, model: '', hint: '' };
    const data = await response.json();
    return {
      configured: Boolean(data?.configured),
      model: data?.model || '',
      fallbacks: Array.isArray(data?.fallbacks) ? data.fallbacks : [],
      hint: data?.hint || '',
    };
  } catch {
    // Mất mạng / dev server chưa chạy → coi như chưa cấu hình, UI vẫn cho copy prompt
    return { configured: false, model: '', fallbacks: [], hint: '' };
  }
}

/**
 * Gửi log cho AI và nhận đánh giá.
 * @param {string} prompt nội dung đã dựng bằng buildAiPrompt()
 * @returns {Promise<object>} review đã chuẩn hoá
 */
export async function requestAiReview(prompt) {
  const data = await postJson('/review', { prompt });
  return data.review;
}
