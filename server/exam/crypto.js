// ============================================================
//  Mã hoá đáp án trên đĩa (AES-256-GCM)
//
//  Vì sao cần: bố cục production đặt dethicosan/ NGAY CẠNH web root
//  (/www/wwwroot/dethicosan). Chỉ một dòng `location` sai trong nginx,
//  hoặc một symlink, hoặc ai đó mở nhầm thư mục là toàn bộ đáp án bị tải về.
//  Lớp mã hoá này khiến file trên đĩa vô dụng nếu không có khoá.
//
//  Khoá lấy theo thứ tự:
//    1. EXAM_KEY_SECRET (biến môi trường, khuyến nghị cho production)
//    2. File dethicosan/.key-secret (tự sinh 32 byte ngẫu nhiên, chmod 600)
//
//  File .key-secret nằm CÙNG thư mục với dữ liệu nên nếu kẻ tấn công đọc
//  được cả thư mục thì lớp này vô hiệu — nó chống lộ đường dẫn/cấu hình sai,
//  không chống được truy cập filesystem. Vẫn phải chặn nginx đúng cách.
// ============================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { POOL_DIR, SECRET_FILE, SESSION_DIR, ensureDirs } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAGIC = 'MTH1'; // nhận diện file đã mã hoá

let cachedKey = null;

/**
 * Lấy (hoặc tạo) khoá 32 byte.
 *
 * QUY TẮC AN TOÀN: chỉ TẠO khoá mới khi thư mục kho đề chưa có đề nào.
 * Nếu đã có đề mà không đọc được khoá, ném lỗi thay vì lặng lẽ sinh khoá
 * mới — vì khoá mới khiến toàn bộ đề cũ không giải mã được, và
 * claimExam() trước đây xoá luôn file hỏng → mất sạch kho.
 */
function getKey() {
  if (cachedKey) return cachedKey;

  const fromEnv = process.env.EXAM_KEY_SECRET?.trim();
  if (fromEnv) {
    // Cho phép truyền chuỗi bất kỳ, hash về đúng 32 byte
    cachedKey = crypto.createHash('sha256').update(fromEnv, 'utf8').digest();
    return cachedKey;
  }

  ensureDirs();
  let readError = null;
  try {
    const existing = fs.readFileSync(SECRET_FILE);
    if (existing.length === 32) {
      cachedKey = existing;
      return cachedKey;
    }
    readError = new Error(`độ dài ${existing.length} byte, cần 32`);
  } catch (err) {
    readError = err;
  }

  // Chưa có đề nào trong kho → an toàn để tạo khoá mới
  const poolHasExams = listSealedFiles().length > 0;
  if (poolHasExams) {
    throw new Error(
      `Không đọc được khoá mã hoá đáp án (${readError.message}) nhưng kho đã có đề. ` +
        'Từ chối sinh khoá mới để không làm hỏng dữ liệu cũ. ' +
        `Hãy sửa quyền/khôi phục ${SECRET_FILE} hoặc đặt EXAM_KEY_SECRET.`,
    );
  }

  const generated = crypto.randomBytes(32);
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  cachedKey = generated;
  return cachedKey;
}

/** Đếm nhanh số file đề đã mã hoá đang có (không đọc nội dung) */
function listSealedFiles() {
  const dirs = [POOL_DIR, SESSION_DIR];
  const found = [];
  for (const dir of dirs) {
    try {
      for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.dat')) found.push(name);
      }
    } catch {
      /* thư mục chưa có */
    }
  }
  return found;
}


/**
 * Mã hoá object thành buffer: MAGIC | iv | tag | ciphertext
 */
export function sealJson(data) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from(MAGIC, 'ascii'), iv, tag, ciphertext]);
}

/**
 * Giải mã buffer về object. Trả null nếu file không phải định dạng của mình
 * hoặc khoá sai — để nơi gọi coi như "không đọc được" chứ không crash.
 */
export function openJson(buffer) {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length < MAGIC.length + IV_BYTES + TAG_BYTES) {
      return null;
    }
    if (buffer.subarray(0, MAGIC.length).toString('ascii') !== MAGIC) return null;

    const iv = buffer.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
    const tag = buffer.subarray(
      MAGIC.length + IV_BYTES,
      MAGIC.length + IV_BYTES + TAG_BYTES,
    );
    const ciphertext = buffer.subarray(MAGIC.length + IV_BYTES + TAG_BYTES);

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    return null;
  }
}

/** Ghi object đã mã hoá ra file (dùng với writeJsonAtomic) */
export function sealJsonToFile(targetPath, data) {
  const buffer = sealJson(data);
  fs.writeFileSync(targetPath, buffer, { mode: 0o600 });
}

/** Đọc file đã mã hoá, trả null nếu hỏng/không đúng khoá */
export function readSealedFile(filePath) {
  try {
    return openJson(fs.readFileSync(filePath));
  } catch {
    return null;
  }
}

/**
 * Kiểm tra khoá hiện tại có giải mã được dữ liệu trên đĩa không.
 *
 * Dùng để phân biệt "1 file hỏng" với "khoá sai". Nếu khoá sai thì
 * mọi file đều hỏng cùng lúc — lúc đó TUYỆT ĐỐI không được cách ly/xoá
 * hàng loạt, mà phải dừng lại và báo lỗi cấu hình.
 *
 * @returns {'ok'|'bad-key'|'no-data'}
 */
export function keyHealthCheck() {
  const candidates = [];
  for (const dir of [POOL_DIR, SESSION_DIR]) {
    try {
      for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.dat')) candidates.push(path.join(dir, name));
      }
    } catch {
      /* thư mục chưa có */
    }
  }
  if (candidates.length === 0) return 'no-data';

  // Thử tối đa 5 file là đủ để kết luận. File không đọc được vì quyền
  // (EACCES) KHÔNG được tính là "khoá sai" — đó là lỗi quyền, không phải
  // lỗi khoá. Nếu tính sai, hệ thống sẽ chặn phát đề oan.
  let unreadable = 0;
  let checked = 0;
  for (const file of candidates.slice(0, 5)) {
    let buffer;
    try {
      buffer = fs.readFileSync(file);
    } catch (err) {
      if (err?.code === 'EACCES' || err?.code === 'EPERM') unreadable += 1;
      continue;
    }
    checked += 1;
    if (openJson(buffer)) return 'ok';
  }

  // Không đọc được file nào: nếu tất cả là lỗi quyền thì đây không phải
  // vấn đề khoá — trả 'no-data' để không chặn phát đề.
  if (checked === 0 && unreadable > 0) return 'no-data';
  return 'bad-key';
}

export const _internal = { MAGIC, ALGORITHM };
