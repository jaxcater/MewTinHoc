// ============================================================
//  Cấu hình tính năng "Gen đề thi thử"
//
//  Bố cục production (theo yêu cầu):
//    /www/wwwroot/mewtinhoc      ← repo web (docroot = mewtinhoc/dist)
//    /www/wwwroot/sourcedethi    ← nguồn câu hỏi (.txt hoặc .json)
//    /www/wwwroot/dethicosan     ← kho đề đã sinh (pool/, sessions/, tmp/)
//
//  Vì dethicosan nằm NGAY CẠNH web root, chỉ cần cấu hình nginx trỏ nhầm
//  là toàn bộ đáp án bị tải về được. Nên đáp án KHÔNG được lưu dạng thô:
//  xem server/exam/crypto.js (mã hoá AES-256-GCM).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Thư mục gốc của repo (chứa package.json, src/, server/) */
export const repoRoot = path.resolve(__dirname, '..', '..');

function isDir(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function isFile(target) {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

/** Thư mục này có phải thư mục gốc dữ liệu (chứa sourcedethi/ hoặc dethicosan/) không */
function looksLikeDataRoot(dir) {
  return isDir(path.join(dir, 'sourcedethi')) || isDir(path.join(dir, 'dethicosan'));
}

/**
 * Thư mục gốc chứa sourcedethi/ và dethicosan/.
 *
 * Thứ tự ưu tiên:
 *   1. Biến môi trường EXAM_DATA_ROOT (đặt tường minh là tốt nhất)
 *   2. Thư mục anh em của repo  → /www/wwwroot  (đúng bố cục production)
 *   3. /var/lib/mewtinhoc       (bố cục cũ, vẫn tương thích)
 *   4. Thư mục anh em của repo  (dev trên máy: C:\Users\Jax\Documents)
 */
function resolveDataRoot() {
  const fromEnv = process.env.EXAM_DATA_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const siblingOfRepo = path.resolve(repoRoot, '..');
  if (looksLikeDataRoot(siblingOfRepo)) return siblingOfRepo;

  const legacyVps = '/var/lib/mewtinhoc';
  if (isDir(legacyVps)) return legacyVps;

  return siblingOfRepo;
}

export const DATA_ROOT = resolveDataRoot();
export const SOURCE_DIR = path.join(DATA_ROOT, 'sourcedethi');
export const EXAM_ROOT = path.join(DATA_ROOT, 'dethicosan');
export const POOL_DIR = path.join(EXAM_ROOT, 'pool');
export const SESSION_DIR = path.join(EXAM_ROOT, 'sessions');
export const TMP_DIR = path.join(EXAM_ROOT, 'tmp');

/** File khoá mã hoá đáp án (chỉ tạo khi không có EXAM_KEY_SECRET) */
export const SECRET_FILE = path.join(EXAM_ROOT, '.key-secret');
/** File lock chống 2 worker chạy chồng nhau */
export const LOCK_FILE = path.join(EXAM_ROOT, '.worker.lock');
/** File con trỏ xoay vòng câu hỏi */
export const ROTATION_FILE = path.join(EXAM_ROOT, 'rotation.json');

/** Đuôi file nguồn được chấp nhận, ưu tiên .txt (định dạng mới) */
export const SOURCE_EXTENSIONS = Object.freeze(['.txt', '.json']);

/** Tên file nguồn cho từng chủ đề, không kèm đuôi */
export const SOURCE_BASENAMES = Object.freeze({
  C1: 'C1',
  C2: 'C2',
  C3: 'C3',
  C4: 'C4',
  C5: 'C5',
  C6: 'C6',
  C7: 'C7',
  chung: 'dungsaiChung',
  cs: 'dungsaiCS',
  ict: 'dungsaiICT',
});

/**
 * Ma trận Phần I — Hướng A (bám tỉ lệ phần trăm, tổng đúng 24 câu).
 *   C5 = 7 (29,2%) · C1 = 4 (16,7%) · C2 = 4 (16,7%) · C3 = 2 (8,3%)
 *   C4 = 2 (8,3%)  · C6 = 2 (8,3%)  · C7 = 3 (12,5%)  → 24 câu
 *
 * Đây là ma trận MONG MUỐN. Nếu một chủ đề không đủ câu, builder sẽ
 * tái phân bổ phần thiếu sang chủ đề còn dư (xem builder.js: planPartI),
 * thay vì làm sập cả hệ thống. Nhờ vậy cập nhật dữ liệu nguồn không
 * bao giờ khiến web ngừng ra đề.
 */
export const PART_I_MATRIX = Object.freeze({
  C5: 7,
  C1: 4,
  C2: 4,
  C3: 2,
  C4: 2,
  C6: 2,
  C7: 3,
});

/** Thứ tự chủ đề cố định (dùng cho log + tái phân bổ) */
export const TOPIC_ORDER = Object.freeze(['C5', 'C1', 'C2', 'C7', 'C3', 'C4', 'C6']);

export const PART_I_TOTAL = Object.values(PART_I_MATRIX).reduce((a, b) => a + b, 0);

/** Cấu trúc Phần II */
export const PART_II_COMMON_COUNT = 2; // 2 câu đúng/sai chung
export const PART_II_TRACK_COUNT = 2; // 2 câu đúng/sai theo định hướng
export const PART_II_TOTAL =
  PART_II_COMMON_COUNT + PART_II_TRACK_COUNT;

/** Số ý bắt buộc trong một câu đúng/sai */
export const TF_STATEMENT_COUNT = 4;

/** Số phương án bắt buộc trong một câu trắc nghiệm */
export const MCQ_OPTION_COUNT = 4;

/** Thời gian làm bài (phút) */
export const DURATION_MINUTES = 50;

/** Số đề mục tiêu trong kho, tách riêng từng định hướng */
export const POOL_TARGET = Object.freeze({ ict: 50, cs: 50 });

/** Tổng số đề mục tiêu (chỉ dùng nội bộ worker, KHÔNG trả ra API) */
export const POOL_TOTAL_TARGET = POOL_TARGET.ict + POOL_TARGET.cs; // 100

/** Khi kho cạn: thông điệp cho học viên (không tiết lộ số lượng còn lại) */
export const POOL_EMPTY_MESSAGE = 'Xin hãy đợi 10 phút sau rồi quay lại';

/** Giới hạn chống spam rút đề */
export const RATE_LIMIT = Object.freeze({
  minIntervalMs: 30_000, // 1 đề / 30 giây / user
  maxPerDay: 10, // tối đa 10 đề / ngày / user
});

/** Thang điểm */
export const SCORING = Object.freeze({
  partIPerQuestion: 0.25, // 24 × 0,25 = 6,0đ
  partIITiers: [0, 0.1, 0.25, 0.5, 1], // theo số ý đúng (0,1,2,3,4) = 4,0đ
  maxScore: 10,
});

/** Giữ lại file session để chấm / xem lại, tự dọn sau N ngày */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const EXAM_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tạo & kiểm tra thư mục dữ liệu */
export function ensureDirs() {
  for (const dir of [EXAM_ROOT, POOL_DIR, SESSION_DIR, TMP_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Tìm file nguồn thực tế cho 1 chủ đề.
 * Ưu tiên .txt (định dạng mới), fallback .json (dữ liệu cũ).
 * @returns {string|null} đường dẫn tuyệt đối
 */
export function resolveSourceFile(basename) {
  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = path.join(SOURCE_DIR, `${basename}${ext}`);
    if (isFile(candidate)) return candidate;
  }
  return null;
}

/**
 * Tự kiểm tra bố cục thư mục lúc khởi động.
 * Trả về danh sách cảnh báo để server/exam in ra log 1 lần.
 */
export function describeLayout() {
  const warnings = [];

  if (!isDir(SOURCE_DIR)) {
    warnings.push(`Không thấy thư mục nguồn: ${SOURCE_DIR}`);
  }
  if (!isDir(EXAM_ROOT)) {
    warnings.push(`Chưa có thư mục kho đề: ${EXAM_ROOT} (sẽ tự tạo)`);
  }

  // Cảnh báo nếu kho đề nằm BÊN TRONG repo web: khi đó nginx có thể
  // phục vụ file đáp án nếu cấu hình sai.
  const relative = path.relative(repoRoot, EXAM_ROOT);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    warnings.push(
      `Kho đề đang nằm TRONG repo web (${relative}). ` +
        'Hãy chuyển ra ngoài để tránh bị phục vụ qua HTTP.',
    );
  }

  return {
    dataRoot: DATA_ROOT,
    sourceDir: SOURCE_DIR,
    examRoot: EXAM_ROOT,
    warnings,
  };
}
