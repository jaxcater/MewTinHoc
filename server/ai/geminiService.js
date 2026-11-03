// ============================================================
//  Dịch vụ "Đánh giá của AI" — gọi Google Gemini (AI Studio)
//
//  Khoá API CHỈ nằm trên máy chủ (GEMINI_API_KEY trong .env.local).
//  Trình duyệt không bao giờ thấy khoá, không gọi thẳng Google.
//
//  Luồng:
//    client  →  POST /api/ai/review  { prompt }
//    server  →  Gemini generateContent (JSON mode + responseSchema)
//    server  →  { ok, review }  đã chuẩn hoá
//
//  Lưu ý vận hành: Google đổi vòng đời model khá nhanh (gemini-2.5-flash
//  đã bị khoá với khoá API mới) và các model mới thường trả 503 khi quá
//  tải. Vì vậy ở đây có sẵn danh sách model dự phòng + thử lại.
// ============================================================
import { readEnv, hasEnv } from '../envLoader.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Model chính — đổi được bằng GEMINI_MODEL trong .env.local */
const DEFAULT_MODEL = 'gemini-3.5-flash';

/** Model thử tiếp khi model chính báo 503/429 (Google quá tải theo từng model) */
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];

/** Mỗi lần gọi tối đa 24 giây; cả request tối đa ~52 giây */
const ATTEMPT_TIMEOUT_MS = 24_000;
const TOTAL_DEADLINE_MS = 52_000;

/**
 * Khoá AI Studio có hai dạng:
 *   - dạng cũ:  AIza… (39 ký tự)
 *   - dạng mới: AQ.Ab8… (khoá rút gọn của Google AI Studio)
 * Chỉ dùng để cảnh báo sớm, không chặn request.
 */
const KEY_SHAPE = /^(AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_.-]{20,})$/;

/** Trạng thái cấu hình — không lộ giá trị khoá */
export function geminiStatus() {
  const key = readEnv('GEMINI_API_KEY');
  const model = readEnv('GEMINI_MODEL', DEFAULT_MODEL);
  return {
    configured: hasEnv('GEMINI_API_KEY'),
    model,
    fallbacks: FALLBACK_MODELS.filter((item) => item !== model),
    keyLooksValid: KEY_SHAPE.test(key),
  };
}

/**
 * Schema JSON mà Gemini phải trả về.
 * responseSchema giúp model không trả về markdown/code fence hay văn xuôi.
 */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    scoreRead: { type: 'STRING' },
    priorities: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          topicCode: { type: 'STRING' },
          topicName: { type: 'STRING' },
          why: { type: 'STRING' },
          actions: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['topicCode', 'topicName', 'why', 'actions'],
      },
    },
    nextHour: { type: 'ARRAY', items: { type: 'STRING' } },
    quickCheck: { type: 'STRING' },
    encouragement: { type: 'STRING' },
  },
  required: ['headline', 'scoreRead', 'priorities', 'nextHour', 'quickCheck'],
};

/* ------------------------------------------------------------------
   Chuẩn hoá kết quả — không tin tưởng model 100%
   ------------------------------------------------------------------ */

const clip = (value, max) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const cleanList = (value, max, itemMax) =>
  (Array.isArray(value) ? value : [])
    .map((item) => clip(item, itemMax))
    .filter(Boolean)
    .slice(0, max);

function normalizeReview(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};

  const priorities = (Array.isArray(source.priorities) ? source.priorities : [])
    .map((item) => ({
      topicCode: clip(item?.topicCode, 12) || 'C?',
      topicName: clip(item?.topicName, 120),
      why: clip(item?.why, 320),
      actions: cleanList(item?.actions, 4, 200),
    }))
    .filter((item) => item.topicName && item.actions.length)
    .slice(0, 3);

  return {
    headline: clip(source.headline, 160),
    scoreRead: clip(source.scoreRead, 900),
    priorities,
    nextHour: cleanList(source.nextHour, 6, 220),
    quickCheck: clip(source.quickCheck, 900),
    encouragement: clip(source.encouragement, 200),
  };
}

/** Gỡ code fence nếu model lỡ bọc JSON trong ```json ... ``` */
function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    // Thử lấy khối {...} lớn nhất
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/* ------------------------------------------------------------------
   Lỗi có mã — middleware dùng mã để chọn HTTP status
   ------------------------------------------------------------------ */

function createError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

/* ------------------------------------------------------------------
   Một lần gọi Gemini → trả về { kind, ... } thay vì ném sớm,
   để vòng lặp bên ngoài biết có nên thử lại / đổi model không.
   kind: 'ok' | 'busy' (503/429) | 'timeout' | 'network' | 'fatal'
   ------------------------------------------------------------------ */

async function generateOnce({ model, apiKey, system, prompt, deadline, signal }) {
  const remaining = deadline - Date.now();
  if (remaining < 2_500) return { kind: 'timeout', model };

  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent`;

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.55,
      topP: 0.9,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
    // Nội dung học tập, không cần bộ lọc chặt nhất; vẫn giữ mức mặc định an toàn
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  let response;
  const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
  // Gộp tín hiệu huỷ chung + timeout, không phụ thuộc AbortSignal.any (Node < 20)
  const local = new AbortController();
  const timer = setTimeout(() => local.abort(new Error('timeout')), timeoutMs);
  const onParentAbort = () => local.abort(new Error('cancelled'));
  if (signal) {
    if (signal.aborted) local.abort(new Error('cancelled'));
    else signal.addEventListener('abort', onParentAbort, { once: true });
  }

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: local.signal,
    });
  } catch (err) {
    if (signal?.aborted) return { kind: 'network', model, cancelled: true };
    if (local.signal.reason?.message === 'timeout') return { kind: 'timeout', model };
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return { kind: 'timeout', model };
    }
    return { kind: 'network', model };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onParentAbort);
  }

  const text = await response.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  const apiMessage = data?.error?.message || '';
  const apiStatus = data?.error?.status || '';

  if (!response.ok) {
    if (response.status === 400 && /API key not valid/i.test(apiMessage)) {
      return { kind: 'fatal', model, code: 'AI_BAD_KEY' };
    }
    if (response.status === 404) {
      // Model đã bị gỡ với khoá này → đổi model khác là xong
      return { kind: 'busy', model, code: 'AI_BAD_MODEL', apiMessage };
    }
    if (response.status === 503 || response.status === 429 || response.status === 500) {
      return { kind: 'busy', model, code: 'AI_UPSTREAM_ERROR', apiMessage };
    }
    if (apiStatus === 'UNAVAILABLE' || apiStatus === 'RESOURCE_EXHAUSTED') {
      return { kind: 'busy', model, code: 'AI_UPSTREAM_ERROR', apiMessage };
    }
    return { kind: 'fatal', model, code: 'AI_UPSTREAM_ERROR', apiMessage };
  }

  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason || '';
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    return { kind: 'fatal', model, code: 'AI_BLOCKED' };
  }

  const answerText =
    candidate?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim() || '';

  if (!answerText) {
    return { kind: 'busy', model, code: 'AI_EMPTY' };
  }

  const parsed = extractJson(answerText);
  if (!parsed) {
    return { kind: 'busy', model, code: 'AI_BAD_JSON' };
  }

  const review = normalizeReview(parsed);
  if (!review.scoreRead) {
    return { kind: 'busy', model, code: 'AI_INCOMPLETE' };
  }

  return {
    kind: 'ok',
    model,
    review,
    meta: {
      model,
      finishReason,
      generatedAt: new Date().toISOString(),
      usage: data?.usageMetadata || null,
    },
  };
}

/* ------------------------------------------------------------------
   Lỗi hiển thị cho học viên — luôn nói được phải làm gì tiếp
   ------------------------------------------------------------------ */

const MESSAGES = {
  AI_NOT_CONFIGURED:
    'Máy chủ chưa có GEMINI_API_KEY. Thêm khoá vào .env.local rồi khởi động lại server.',
  AI_BAD_KEY: 'GEMINI_API_KEY không hợp lệ hoặc đã bị thu hồi. Tạo khoá mới ở AI Studio rồi cập nhật .env.local.',
  AI_BAD_MODEL:
    'Không model nào trong danh sách còn dùng được với khoá này. Để trống GEMINI_MODEL trong .env.local (mặc định gemini-3.5-flash).',
  AI_BUSY:
    'Google đang quá tải model này. Bạn bấm "Đánh giá lại" sau khoảng 30 giây nhé — log vẫn còn nguyên và bạn không mất lượt nào.',
  AI_TIMEOUT: 'AI phản hồi quá lâu. Bạn thử lại sau ít giây nhé.',
  AI_NETWORK: 'Không kết nối được tới máy chủ AI. Kiểm tra đường truyền rồi thử lại.',
  AI_BLOCKED: 'AI từ chối nội dung này. Bạn thử tạo đề khác rồi đánh giá lại nhé.',
  AI_EMPTY: 'AI trả về nội dung rỗng. Bạn thử lại giúp mình nhé.',
  AI_BAD_JSON: 'AI trả về định dạng lạ. Bạn bấm đánh giá lại giúp mình nhé.',
  AI_INCOMPLETE: 'AI trả về thiếu nội dung đánh giá. Bạn thử lại giúp mình nhé.',
};

const STATUS_FOR = {
  AI_NOT_CONFIGURED: 503,
  AI_BAD_KEY: 502,
  AI_BAD_MODEL: 502,
  AI_BUSY: 503,
  AI_TIMEOUT: 504,
  AI_NETWORK: 502,
  AI_BLOCKED: 422,
};

/**
 * Gọi Gemini, chạy song song có nhịp (hedged requests).
 *
 * Model mới của Google hay trả 503 khi quá tải, và chờ lần lượt từng model
 * sẽ khiến học viên đợi gần 1 phút. Vì vậy: bắn model chính ngay, sau 6 giây
 * không có kết quả thì bắn thêm model kế tiếp, lấy phản hồi thành công đầu
 * tiên rồi huỷ các nhánh còn lại.
 *
 * @param {{system: string, prompt: string}} input
 * @returns {Promise<object>} review đã chuẩn hoá, kèm meta
 */
export async function requestAiReview({ system, prompt }) {
  const status = geminiStatus();
  if (!status.configured) {
    throw createError(MESSAGES.AI_NOT_CONFIGURED, 'AI_NOT_CONFIGURED', 503);
  }

  const apiKey = readEnv('GEMINI_API_KEY');
  const deadline = Date.now() + TOTAL_DEADLINE_MS;

  // Model chính trước, rồi lần lượt các model dự phòng.
  // Hai vòng: Google trả 503 theo từng đợt ngắn, nên vòng 2 thường đã qua cơn.
  const plan = [status.model, ...status.fallbacks, status.model, ...status.fallbacks];
  const HEDGE_DELAY_MS = 6_000;

  const tried = [];
  let lastBusy = null;
  let sawTimeout = false;
  let sawNetwork = false;
  let fatalError = null;

  const controller = new AbortController();
  const abortAll = () => controller.abort();

  /** Bắn 1 nhánh; trả về kết quả hoặc null nếu nhánh này thất bại */
  const launch = (model) => {
    tried.push(model);
    return generateOnce({
      model,
      apiKey,
      system,
      prompt,
      deadline,
      signal: controller.signal,
    }).catch(() => null);
  };

  try {
    const pending = new Map(); // promise → thứ tự nhánh

    for (let index = 0; index < plan.length; index += 1) {
      const model = plan[index];
      if (Date.now() > deadline - 2_500) break;

      const task = launch(model).then((result) => ({ model, result }));
      pending.set(task, model);

      // Chờ phản hồi đầu tiên; nếu quá HEDGE_DELAY_MS thì bắn thêm nhánh kế
      // và tiếp tục chờ — nhánh nào xong trước được dùng.
      const settled = await Promise.race([
        ...pending.keys(),
        new Promise((resolve) => setTimeout(() => resolve(null), HEDGE_DELAY_MS)),
      ]);

      // Hết thời gian chờ mà chưa có nhánh nào xong → bắn thêm model kế tiếp
      if (settled === null) continue;

      pending.delete(settled);
      const { result } = settled;
      if (!result) continue;

      if (result.kind === 'ok') {
        abortAll();
        return {
          ...result.review,
          meta: { ...result.meta, attempts: tried.length, tried },
        };
      }
      if (result.kind === 'fatal') {
        fatalError = result;
        abortAll();
        break;
      }
      if (result.kind === 'timeout') sawTimeout = true;
      if (result.kind === 'network') sawNetwork = true;
      if (result.kind === 'busy') lastBusy = result;
    }

    // Chờ nốt các nhánh còn treo (nếu có) trước khi kết luận thất bại
    if (pending.size) {
      const remaining = await Promise.race([
        Promise.race([...pending.keys()]),
        new Promise((resolve) => setTimeout(() => resolve(null), Math.max(1_000, deadline - Date.now()))),
      ]);
      if (remaining?.result?.kind === 'ok') {
        abortAll();
        return {
          ...remaining.result.review,
          meta: { ...remaining.result.meta, attempts: tried.length, tried },
        };
      }
      if (remaining?.result?.kind === 'fatal') fatalError = remaining.result;
      if (remaining?.result?.kind === 'busy') lastBusy = remaining.result;
      if (remaining?.result?.kind === 'timeout') sawTimeout = true;
      if (remaining?.result?.kind === 'network') sawNetwork = true;
    }
  } finally {
    abortAll();
  }

  if (fatalError) {
    const code = fatalError.code || 'AI_UPSTREAM_ERROR';
    throw createError(
      MESSAGES[code] ||
        (fatalError.apiMessage
          ? `AI từ chối yêu cầu: ${clip(fatalError.apiMessage, 200)}`
          : 'Dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.'),
      code,
      STATUS_FOR[code] || 502,
    );
  }
  if (lastBusy?.code === 'AI_BAD_MODEL') {
    throw createError(MESSAGES.AI_BAD_MODEL, 'AI_BAD_MODEL', 502);
  }
  if (lastBusy?.code === 'AI_EMPTY' || lastBusy?.code === 'AI_BAD_JSON' || lastBusy?.code === 'AI_INCOMPLETE') {
    throw createError(MESSAGES[lastBusy.code], lastBusy.code, 502);
  }
  if (sawTimeout && !lastBusy) {
    throw createError(MESSAGES.AI_TIMEOUT, 'AI_TIMEOUT', 504);
  }
  if (sawNetwork && !lastBusy) {
    throw createError(MESSAGES.AI_NETWORK, 'AI_NETWORK', 502);
  }
  throw createError(MESSAGES.AI_BUSY, 'AI_BUSY', 503);
}
