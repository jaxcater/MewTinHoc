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
import { SECRET_FILE, ensureDirs } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const MAGIC = 'MTH1'; // nhận diện file đã mã hoá

let cachedKey = null;

/** Lấy (hoặc tạo) khoá 32 byte */
function getKey() {
  if (cachedKey) return cachedKey;

  const fromEnv = process.env.EXAM_KEY_SECRET?.trim();
  if (fromEnv) {
    // Cho phép truyền chuỗi bất kỳ, hash về đúng 32 byte
    cachedKey = crypto.createHash('sha256').update(fromEnv, 'utf8').digest();
    return cachedKey;
  }

  ensureDirs();
  try {
    const existing = fs.readFileSync(SECRET_FILE);
    if (existing.length === 32) {
      cachedKey = existing;
      return cachedKey;
    }
  } catch {
    /* chưa có -> tạo mới */
  }

  const generated = crypto.randomBytes(32);
  try {
    fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  } catch (err) {
    console.warn(`[exam] Không ghi được file khoá: ${err.message}`);
  }
  cachedKey = generated;
  return cachedKey;
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

export const _internal = { MAGIC, ALGORITHM };
