// ============================================================
//  Service: điều phối nghiệp vụ cho API endpoint
//   - Nạp pool câu hỏi 1 lần, cache trong RAM (300KB, đổi rất ít)
//   - Rate limit theo user (in-memory, pm2 fork 1 process là đủ)
//   - Sinh bù đồng bộ khi kho cạn (chế độ "warn" vẫn báo lỗi nếu không sinh được)
// ============================================================
import { buildExam, describePool, planPartI } from './builder.js';
import { loadQuestionPool } from './questionPool.js';
import {
  PART_II_COMMON_COUNT,
  PART_II_TRACK_COUNT,
  PART_I_TOTAL,
  POOL_EMPTY_MESSAGE,
  POOL_TARGET,
  RATE_LIMIT,
  describeLayout,
  ensureDirs,
} from './config.js';
import {
  claimExam,
  countPool,
  gradeSubmission,
  markSessionSubmitted,
  saveExamToPool,
} from './storage.js';

let poolCache = null;
let poolLoading = null;

/** Nạp pool 1 lần (tránh đọc lại 10 file JSON mỗi request) */
export async function getPool({ forceReload = false } = {}) {
  if (forceReload) {
    poolCache = null;
    poolLoading = null;
  }
  if (poolCache) return poolCache;
  if (!poolLoading) {
    poolLoading = loadQuestionPool()
      .then((pool) => {
        poolCache = pool;
        const layout = describeLayout();
        console.log(
          `[exam] Dữ liệu: ${layout.sourceDir}` +
            `\n[exam] Kho đề:  ${layout.examRoot}` +
            `\n[exam] Đã nạp pool câu hỏi:\n${describePool(pool)}`,
        );
        if (layout.warnings.length) {
          layout.warnings.forEach((warning) => console.warn(`[exam] ⚠ ${warning}`));
        }
        if (pool.stats.missing.length) {
          console.warn(
            `[exam] ⚠ Thiếu file nguồn: ${pool.stats.missing.join(', ')}`,
          );
        }
        const rejected = pool.stats.files.filter((file) => file.rejected > 0);
        if (rejected.length) {
          console.warn(
            '[exam] ⚠ Số bản ghi bị loại (sai định dạng): ' +
              rejected
                .map((file) => `${file.file}: ${file.rejected}/${file.records}`)
                .join(', '),
          );
        }
        return pool;
      })
      .finally(() => {
        poolLoading = null;
      });
  }
  return poolLoading;
}

/**
 * Kiểm tra pool có đủ câu cho MA TRẬN MONG MUỐN không.
 * Thiếu câu KHÔNG phải lỗi chặn: builder sẽ tái phân bổ. Chỉ chặn khi
 * tổng số câu không đủ 24.
 */
export function validatePool(pool) {
  const problems = [];
  const warnings = [];

  const totalMcq = Object.values(pool.mcq || {}).reduce(
    (sum, list) => sum + list.length,
    0,
  );
  if (totalMcq < PART_I_TOTAL) {
    problems.push(
      `Tổng câu trắc nghiệm chỉ có ${totalMcq}, cần tối thiểu ${PART_I_TOTAL} để lắp Phần I`,
    );
  }

  const { plan, reallocated } = planPartI(pool);
  if (reallocated.length) {
    warnings.push(
      'Ma trận sẽ được tái phân bổ: ' + reallocated.join('; '),
    );
  }

  if ((pool.tf.chung?.length || 0) < PART_II_COMMON_COUNT) {
    problems.push(
      `Đúng/Sai chung cần ${PART_II_COMMON_COUNT} câu, có ${pool.tf.chung?.length || 0}`,
    );
  }
  if ((pool.tf.cs?.length || 0) < PART_II_TRACK_COUNT) {
    problems.push(
      `Đúng/Sai CS cần ${PART_II_TRACK_COUNT} câu, có ${pool.tf.cs?.length || 0}`,
    );
  }
  if ((pool.tf.ict?.length || 0) < PART_II_TRACK_COUNT) {
    problems.push(
      `Đúng/Sai ICT cần ${PART_II_TRACK_COUNT} câu, có ${pool.tf.ict?.length || 0}`,
    );
  }

  return { problems, warnings, plan };
}

/** Sinh 1 đề và ghi vào pool. Ném lỗi nếu pool câu hỏi không đủ. */
export async function generateOneExam(track) {
  const pool = await getPool();
  const { problems } = validatePool(pool);
  if (problems.length > 0) {
    throw new Error('Kho câu hỏi không đủ: ' + problems.join('; '));
  }
  const built = buildExam(pool, track);
  saveExamToPool(built);
  return built.publicExam.examId;
}

/**
 * Sinh bù cho đủ mục tiêu từng định hướng.
 * @returns {{created: number, failed: number, counts: object}}
 */
export async function refillPool() {
  ensureDirs();
  const before = countPool();
  const needIct = Math.max(0, POOL_TARGET.ict - before.ict);
  const needCs = Math.max(0, POOL_TARGET.cs - before.cs);

  let created = 0;
  let failed = 0;

  for (const [track, need] of [['ict', needIct], ['cs', needCs]]) {
    for (let i = 0; i < need; i += 1) {
      try {
        await generateOneExam(track);
        created += 1;
      } catch (err) {
        failed += 1;
        console.error(`[exam] Sinh đề ${track} thất bại: ${err.message}`);
        // Lỗi dữ liệu thì dừng luôn, không spam log 15 lần
        break;
      }
    }
  }

  return { created, failed, counts: countPool() };
}

/**
 * Tự kiểm tra sức khoẻ hệ thống — dùng cho endpoint /api/exams/health (admin)
 * và cho lệnh `npm run exam:check`.
 *
 * Không trả bất kỳ thông tin nào về học viên hay số đề đang chờ; chỉ
 * kiểm tra pipeline có hoạt động được không.
 */
export async function verifyReadiness() {
  const problems = [];
  const warnings = [];

  let pool;
  try {
    pool = await getPool({ forceReload: true });
  } catch (err) {
    return {
      ok: false,
      problems: [`Không nạp được kho câu hỏi: ${err.message}`],
      warnings: [],
    };
  }

  const validation = validatePool(pool);
  problems.push(...validation.problems);
  warnings.push(...validation.warnings);

  // Thử dựng 1 đề từng hướng — đây là phép thử thật sự, không chỉ đếm
  for (const track of ['ict', 'cs']) {
    try {
      const { publicExam } = buildExam(pool, track);
      if (publicExam.partI.length !== PART_I_TOTAL) {
        problems.push(
          `${track.toUpperCase()}: Phần I có ${publicExam.partI.length} câu, cần ${PART_I_TOTAL}`,
        );
      }
      if (publicExam.partII.length !== PART_II_COMMON_COUNT + PART_II_TRACK_COUNT) {
        problems.push(
          `${track.toUpperCase()}: Phần II có ${publicExam.partII.length} câu`,
        );
      }
    } catch (err) {
      problems.push(`${track.toUpperCase()}: không dựng được đề — ${err.message}`);
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    warnings,
    stats: pool.stats,
    layout: describeLayout(),
  };
}

// ---------- Rate limit (in-memory) ----------
const rateBuckets = new Map(); // userId → { lastAt, dayKey, dayCount }

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** @returns {{allowed: boolean, retryAfterSeconds?: number, reason?: string}} */
function checkRateLimit(userId, limits = RATE_LIMIT) {
  const key = String(userId || 'anon');
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { lastAt: 0, dayKey: todayKey(), dayCount: 0 };

  const day = todayKey();
  if (bucket.dayKey !== day) {
    bucket.dayKey = day;
    bucket.dayCount = 0;
  }

  const elapsed = now - bucket.lastAt;
  if (elapsed < limits.minIntervalMs) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((limits.minIntervalMs - elapsed) / 1000),
      reason: 'TOO_FAST',
    };
  }
  if (bucket.dayCount >= limits.maxPerDay) {
    return { allowed: false, reason: 'DAILY_LIMIT' };
  }

  bucket.lastAt = now;
  bucket.dayCount += 1;
  rateBuckets.set(key, bucket);

  // Dọn bucket cũ để Map không phình vô hạn
  if (rateBuckets.size > 5000) {
    const cutoff = now - 24 * 60 * 60 * 1000;
    for (const [k, v] of rateBuckets) {
      if (v.lastAt < cutoff) rateBuckets.delete(k);
    }
  }

  return { allowed: true };
}

/**
 * Rút 1 đề cho học viên.
 * Chế độ "warn" (theo yêu cầu): kho rỗng thì thử sinh bù đồng bộ 1 lần,
 * nếu vẫn không được mới báo "Xin hãy đợi 10 phút sau rồi quay lại".
 * API không trả về số lượng đề còn lại.
 */
export async function requestExam({ userId, track, limits }) {
  if (track !== 'ict' && track !== 'cs') {
    return { ok: false, status: 400, code: 'INVALID_TRACK', message: 'Định hướng không hợp lệ' };
  }

  const limit = checkRateLimit(userId, limits || RATE_LIMIT);
  if (!limit.allowed) {
    return {
      ok: false,
      status: 429,
      code: limit.reason,
      message:
        limit.reason === 'TOO_FAST'
          ? 'Bạn vừa tạo đề. Vui lòng đợi ít giây rồi thử lại.'
          : 'Bạn đã đạt giới hạn số đề trong ngày. Hãy ôn lại đề đã làm nhé!',
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  let claimed = claimExam(track);
  if (!claimed) {
    // Kho cạn → sinh đồng bộ 1 đề để học viên không bị chặn oan
    try {
      await generateOneExam(track);
      claimed = claimExam(track);
    } catch (err) {
      console.error('[exam] Sinh đề đồng bộ thất bại:', err.message);
    }
  }

  if (!claimed) {
    return {
      ok: false,
      status: 503,
      code: 'POOL_EMPTY',
      message: POOL_EMPTY_MESSAGE,
    };
  }

  return { ok: true, exam: claimed.publicExam };
}

/** Nộp bài và chấm điểm. Mỗi đề chỉ chấm 1 lần. */
export function submitAnswers({ examId, answers }) {
  const graded = gradeSubmission(examId, answers);
  if (!graded.ok) {
    return {
      ok: false,
      status: 404,
      code: graded.code,
      message: 'Không tìm thấy đề thi. Đề có thể đã hết hạn.',
    };
  }

  // Đánh dấu TRƯỚC khi trả đáp án, và dựa vào giá trị trả về để quyết định.
  // markSessionSubmitted() là thao tác ghi nguyên tử trên file; nếu 2 request
  // nộp cùng lúc, chỉ một lần thấy session chưa có submittedAt → lần kia bị
  // chặn. Không dùng isSessionSubmitted() trước đó vì sẽ có khe TOCTOU.
  if (!markSessionSubmitted(examId)) {
    return {
      ok: false,
      status: 409,
      code: 'ALREADY_SUBMITTED',
      message: 'Đề này đã được nộp bài trước đó.',
    };
  }

  return {
    ok: true,
    result: graded.result,
    publicExam: graded.publicExam,
    keyData: graded.keyData,
  };
}
