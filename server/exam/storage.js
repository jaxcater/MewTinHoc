// ============================================================
//  Storage: quản lý file đề trong pool/ và sessions/
//
//   - Ghi atomic (tmp → rename) để API không đọc phải file đang ghi
//   - Claim bằng rename() để 2 học viên nhấn cùng lúc không nhận trùng đề
//   - Đáp án MÃ HOÁ AES-256-GCM trên đĩa (xem crypto.js) vì dethicosan
//     nằm ngay cạnh web root trên VPS
//   - Không bao giờ trả tên file/thư mục thật ra ngoài
// ============================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXAM_ID_RE,
  POOL_DIR,
  POOL_TARGET,
  SESSION_DIR,
  SESSION_TTL_MS,
  TMP_DIR,
  ensureDirs,
} from './config.js';
import { readSealedFile, sealJson } from './crypto.js';
import { gradeExam } from './grading.js';

/** Tên file trong pool: ict-<uuid>.dat (mã hoá) hoặc .json (bản cũ) */
const POOL_FILE_RE = /^(ict|cs)-([0-9a-f-]{36})\.(dat|json)$/i;

/** Đuôi file mã hoá */
const SEALED_EXT = '.dat';

/** Ghi buffer atomic: ghi ra tmp rồi rename (cùng filesystem → atomic) */
function writeBufferAtomic(targetPath, buffer) {
  ensureDirs();
  const tmpPath = path.join(TMP_DIR, `${crypto.randomUUID()}.tmp`);
  fs.writeFileSync(tmpPath, buffer, { mode: 0o600 });
  fs.renameSync(tmpPath, targetPath);
}

/** Đọc file đề đã mã hoá; fallback đọc JSON thô cho dữ liệu cũ */
function readExamFile(filePath) {
  const sealed = readSealedFile(filePath);
  if (sealed) return sealed;

  // Bản cũ (JSON thô) — chỉ để tương thích, worker sẽ sinh lại dần
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Liệt kê file đề trong pool, nhóm theo định hướng */
export function listPool() {
  ensureDirs();
  const result = { ict: [], cs: [] };
  let entries = [];
  try {
    entries = fs.readdirSync(POOL_DIR);
  } catch {
    return result;
  }
  for (const name of entries) {
    const match = name.match(POOL_FILE_RE);
    if (!match) continue;
    const track = match[1].toLowerCase();
    result[track].push({
      file: name,
      examId: match[2].toLowerCase(),
      path: path.join(POOL_DIR, name),
      sealed: match[3].toLowerCase() === 'dat',
    });
  }
  return result;
}

/** Đếm số đề còn trong kho theo từng định hướng (chỉ dùng nội bộ) */
export function countPool() {
  const pool = listPool();
  return {
    ict: pool.ict.length,
    cs: pool.cs.length,
    total: pool.ict.length + pool.cs.length,
  };
}

/** Kho có đang thiếu đề so với mục tiêu không */
export function needsRefill() {
  const counts = countPool();
  return {
    counts,
    needIct: Math.max(0, POOL_TARGET.ict - counts.ict),
    needCs: Math.max(0, POOL_TARGET.cs - counts.cs),
  };
}

/**
 * Ghi 1 đề vào pool (mã hoá).
 * @param {{publicExam: object, keyData: object}} exam
 */
export function saveExamToPool({ publicExam, keyData }) {
  const track = publicExam.track;
  const fileName = `${track}-${publicExam.examId}${SEALED_EXT}`;
  const targetPath = path.join(POOL_DIR, fileName);
  // Gộp chung 1 file để claim chỉ cần 1 lần rename (nguyên tử).
  writeBufferAtomic(targetPath, sealJson({ publicExam, keyData }));
  return fileName;
}

/**
 * Rút 1 đề khỏi pool theo định hướng.
 * Dùng rename() để đảm bảo chỉ 1 request thắng trong trường hợp đồng thời.
 * @returns {{examId: string, publicExam: object} | null}
 */
export function claimExam(track) {
  if (track !== 'ict' && track !== 'cs') return null;
  const pool = listPool();
  const candidates = pool[track];

  // Xáo thứ tự để không phải luôn lấy đề đầu tiên (giảm khả năng đoán)
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const candidate of candidates) {
    const sessionPath = path.join(SESSION_DIR, `${candidate.examId}${SEALED_EXT}`);
    try {
      // rename nguyên tử: nếu 2 process cùng rename, chỉ 1 thành công
      fs.renameSync(candidate.path, sessionPath);
      // Xoá cờ nộp bài cũ nếu examId trùng (cực hiếm với UUID, nhưng chắc chắn)
      try {
        fs.unlinkSync(`${sessionPath}.submitted`);
      } catch {
        /* không có cờ */
      }
    } catch {
      continue; // người khác đã lấy mất → thử đề kế tiếp
    }

    const payload = readExamFile(sessionPath);
    if (!payload?.publicExam) {
      // File hỏng: dọn luôn để không kẹt kho
      try {
        fs.unlinkSync(sessionPath);
      } catch {
        /* ignore */
      }
      continue;
    }

    return {
      examId: payload.publicExam.examId,
      publicExam: payload.publicExam,
      claimedAt: Date.now(),
    };
  }

  return null;
}

/** Đường dẫn session của 1 examId, đã chặn path traversal */
function sessionPath(examId) {
  if (!EXAM_ID_RE.test(String(examId || ''))) return null;
  const candidate = path.join(SESSION_DIR, `${examId}${SEALED_EXT}`);
  const resolved = path.resolve(candidate);
  const root = path.resolve(SESSION_DIR);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

/** Đọc payload session (có đáp án) theo examId */
export function readSession(examId) {
  const target = sessionPath(examId);
  if (!target) return null;
  const sealed = readExamFile(target);
  if (sealed) return sealed;

  // Fallback: session cũ dạng .json thô
  const legacy = path.join(SESSION_DIR, `${examId}.json`);
  if (fs.existsSync(legacy)) {
    try {
      return JSON.parse(fs.readFileSync(legacy, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Đánh dấu session đã nộp bài — NGUYÊN TỬ.
 *
 * Dùng file cờ mở bằng cờ 'wx' (O_CREAT|O_EXCL): hệ điều hành đảm bảo chỉ
 * MỘT tiến trình tạo được file. Nhờ vậy kể cả khi chạy PM2 cluster nhiều
 * instance, cũng không thể có 2 lần nộp cùng lúc được chấp nhận.
 *
 * @returns {boolean} true nếu đây là lần nộp đầu tiên
 */
export function markSessionSubmitted(examId) {
  const target = sessionPath(examId);
  if (!target) return false;

  const payload = readSession(examId);
  if (!payload) return false;

  const flagPath = `${target}.submitted`;
  let flagHandle;
  try {
    flagHandle = fs.openSync(flagPath, 'wx', 0o600);
    fs.writeSync(flagHandle, new Date().toISOString());
  } catch (err) {
    if (err.code === 'EEXIST') return false; // đã có người nộp trước
    // Không tạo được cờ (quyền/đĩa) → từ chối an toàn, không cho nộp
    console.warn(`[exam] Không tạo được cờ nộp bài cho ${examId}: ${err.message}`);
    return false;
  } finally {
    if (flagHandle !== undefined) {
      try {
        fs.closeSync(flagHandle);
      } catch {
        /* ignore */
      }
    }
  }

  // Đã giữ được cờ → ghi mốc thời gian vào payload để tra cứu về sau.
  // Nếu bước này lỗi, cờ vẫn còn nên đề vẫn bị coi là đã nộp (an toàn).
  try {
    writeBufferAtomic(
      target,
      sealJson({ ...payload, submittedAt: new Date().toISOString() }),
    );
  } catch (err) {
    console.warn(`[exam] Không ghi được mốc nộp bài: ${err.message}`);
  }

  return true;
}

/** Session đã được nộp bài chưa */
export function isSessionSubmitted(examId) {
  const target = sessionPath(examId);
  if (!target) return false;
  if (fs.existsSync(`${target}.submitted`)) return true;
  const payload = readSession(examId);
  return Boolean(payload?.submittedAt);
}

/**
 * Chấm bài nộp và trả kết quả (kèm đáp án + giải thích).
 */
export function gradeSubmission(examId, answers) {
  const payload = readSession(examId);
  if (!payload?.keyData || !payload?.publicExam) {
    return { ok: false, code: 'EXAM_NOT_FOUND' };
  }
  const result = gradeExam(payload.publicExam, payload.keyData, answers);
  return {
    ok: true,
    result,
    publicExam: payload.publicExam,
    keyData: payload.keyData,
  };
}

/** Xoá session cũ để không phình đĩa (chạy định kỳ trong worker) */
export function pruneSessions() {
  ensureDirs();
  const now = Date.now();
  let removed = 0;
  let entries = [];
  try {
    entries = fs.readdirSync(SESSION_DIR);
  } catch {
    return 0;
  }
  for (const name of entries) {
    const filePath = path.join(SESSION_DIR, name);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > SESSION_TTL_MS) {
        fs.unlinkSync(filePath);
        removed += 1;
        // Xoá cả cờ nộp bài đi kèm, nếu không sẽ tồn đọng
        try {
          fs.unlinkSync(`${filePath}.submitted`);
        } catch {
          /* không có cờ */
        }
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}

/** Dọn file tmp mồ côi (do crash giữa lúc ghi) */
export function pruneTmp() {
  ensureDirs();
  let entries = [];
  try {
    entries = fs.readdirSync(TMP_DIR);
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of entries) {
    try {
      fs.unlinkSync(path.join(TMP_DIR, name));
      removed += 1;
    } catch {
      /* ignore */
    }
  }
  return removed;
}

/**
 * Xoá TOÀN BỘ kho đề (dùng khi đổi ma trận hoặc cập nhật dữ liệu nguồn).
 * Chỉ gọi từ CLI worker với cờ --reset, không bao giờ từ API.
 */
export function clearPool() {
  const pool = listPool();
  let removed = 0;
  for (const item of [...pool.ict, ...pool.cs]) {
    try {
      fs.unlinkSync(item.path);
      removed += 1;
    } catch {
      /* ignore */
    }
  }
  return removed;
}
