// ============================================================
//  Client API cho tính năng Gen đề thi thử
//  - Không bao giờ nhận đáp án trước khi nộp bài
//  - Tự gắn Bearer token Supabase nếu đã đăng nhập
//  - Phân loại lỗi rõ ràng để UI hiển thị đúng thông điệp
// ============================================================
import { supabase } from '../supabase.js';

const BASE = '/api/exams';

/** Mã lỗi người dùng có thể gặp */
export const EXAM_ERROR = Object.freeze({
  POOL_EMPTY: 'POOL_EMPTY',
  TOO_FAST: 'TOO_FAST',
  DAILY_LIMIT: 'DAILY_LIMIT',
  ALREADY_SUBMITTED: 'ALREADY_SUBMITTED',
  NETWORK: 'NETWORK',
  SERVER: 'SERVER',
});

/** Lấy access token hiện tại (nếu có) */
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
      EXAM_ERROR.NETWORK,
      0,
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw createError(
      'Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.',
      EXAM_ERROR.SERVER,
      response.status,
    );
  }

  if (!response.ok || !data?.ok) {
    const message =
      data?.message ||
      (response.status >= 500
        ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.'
        : 'Không thể xử lý yêu cầu. Vui lòng thử lại.');
    throw createError(message, data?.code || EXAM_ERROR.SERVER, response.status);
  }

  return data;
}

/**
 * Rút 1 đề theo định hướng.
 * @param {'ict'|'cs'} track
 * @returns {Promise<object>} đề KHÔNG có đáp án
 */
export async function claimExam(track) {
  const data = await postJson('/claim', { track });
  return data.exam;
}

/**
 * Nộp bài và nhận kết quả chấm.
 * @param {string} examId
 * @param {{partI: number[], partII: boolean[][]}} answers
 */
export async function submitExam(examId, answers) {
  const data = await postJson('/submit', { examId, answers });
  return { result: data.result, key: data.key };
}
