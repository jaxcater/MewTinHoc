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

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw createError(
      'Không kết nối được máy chủ. Kiểm tra đường truyền rồi thử lại.',
      AI_ERROR.NETWORK,
      0,
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw createError(
      'Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.',
      AI_ERROR.SERVER,
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
